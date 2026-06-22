import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════
// FULCRUM Mediation Algorithm (JavaScript port of Sprint 6 prototype)
// Copyright (c) 2026 Kostas Kazakos. All rights reserved.
// Independent research — not affiliated with any employer.
// ═══════════════════════════════════════════════════════════════════════

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

const BASE_WEIGHTS = {
  iad: 0.4, md: 0.5, oli: 0.3,
  qs: 0.6, lc: 0.5, tc: 0.3, epa: 0.5,
  ofd: 0.8, vfd: 0.6, poc: 0.5,
};
const LAYER_W = { behavioral: 0.25, resource: 0.30, semantic: 0.45 };

function computeEffectiveWeights(signals) {
  return {
    iad: BASE_WEIGHTS.iad * 0.95 * signals.iad,
    md:  BASE_WEIGHTS.md * 0.90 * signals.md * (1 - 0.15 * 0.5),
    oli: clamp(BASE_WEIGHTS.oli * 0.55 * signals.oli * 1.075),
    qs:  clamp(BASE_WEIGHTS.qs * 0.95 * signals.qs * 1.3 * 1.2),
    lc:  BASE_WEIGHTS.lc * 0.95 * signals.lc,
    tc:  0,
    epa: BASE_WEIGHTS.epa * 0.85 * signals.epa,
    ofd: BASE_WEIGHTS.ofd * 0.85 * signals.ofd,
    vfd: BASE_WEIGHTS.vfd * 0.70 * 0.45 * 0.6,
    poc: BASE_WEIGHTS.poc * 0.90 * 0.40,
  };
}

function aggregateLayer(weights) {
  const sorted = [...weights].sort((a, b) => b - a);
  if (sorted.length === 0 || sorted[0] === 0) return 0;
  let modifier = 0, decay = 0.5;
  for (let i = 1; i < sorted.length; i++) {
    modifier += sorted[i] * decay;
    decay *= 0.5;
  }
  modifier = Math.min(modifier, sorted[0] * 0.3);
  return clamp(sorted[0] + modifier);
}

function fuse(ew) {
  const beh = aggregateLayer([ew.iad, ew.md, ew.oli]);
  const res = aggregateLayer([ew.qs, ew.lc, ew.tc, ew.epa]);
  const sem = aggregateLayer([ew.ofd, ew.vfd, ew.poc]);
  const total = LAYER_W.behavioral + LAYER_W.resource + LAYER_W.semantic;
  const severity = clamp((beh * LAYER_W.behavioral + res * LAYER_W.resource + sem * LAYER_W.semantic) / total);
  const slaUrg = ew.qs > 0.2 ? (ew.qs / 0.6491) * 0.73 : 0;
  const trendUrg = slaUrg > 0.4 ? 0.3 : 0;
  const escUrg = ew.epa > 0.05 ? (ew.epa / 0.319) * 0.75 : 0;
  const urgency = clamp(slaUrg + trendUrg * 0.3 + escUrg * 0.3);
  return { beh, res, sem, severity, urgency };
}

const PERSONAS = [
  { name: "Security",    abbr: "SEC", color: "#ef4444", salience: [0.9,0.9,0.7,0.2,0.3,0.1,0.3,0.3,0.2,0.7], tc: 0.30, td: 0.70, w: 0.9 },
  { name: "Operations",  abbr: "OPS", color: "#3b82f6", salience: [0.2,0.3,0.2,0.9,0.7,0.4,0.8,0.4,0.3,0.5], tc: 0.50, td: 0.85, w: 0.8 },
  { name: "Compliance",  abbr: "CMP", color: "#a855f7", salience: [0.5,0.5,0.4,0.3,0.3,0.1,0.2,0.3,0.2,0.9], tc: 0.20, td: 0.80, w: 0.7 },
  { name: "Cost",        abbr: "CST", color: "#22c55e", salience: [0.2,0.3,0.2,0.8,0.4,0.5,0.3,0.6,0.7,0.4], tc: 0.40, td: 0.75, w: 0.6 },
  { name: "Customer",    abbr: "CUS", color: "#f97316", salience: [0.1,0.2,0.1,0.9,0.5,0.3,0.7,0.3,0.4,0.3], tc: 0.55, td: 0.90, w: 0.7 },
];

function evalPersona(p, ew) {
  const ewVec = [ew.iad, ew.md, ew.oli, ew.qs, ew.lc, ew.tc, ew.epa, ew.ofd, ew.vfd, ew.poc];
  const num = p.salience.reduce((s, v, i) => s + v * ewVec[i], 0);
  const den = p.salience.reduce((s, v) => s + v, 0);
  const severity = den > 0 ? num / den : 0;
  const preferred = severity >= p.td ? "DENY" : severity >= p.tc ? "CONSTRAIN" : "APPROVE";
  return { severity, preferred };
}

function getConstraints(signals) {
  const b = [];
  if (signals.md > 0.5)  b.push({ type: "TIME_LIMIT",          param: "90 seconds",    src: "Security + Cost" });
  if (signals.md > 0.3)  b.push({ type: "SCOPE_RESTRICTION",   param: "single key",    src: "Security" });
  b.push(                       { type: "ATTESTATION",          param: "cryptographic",  src: "Security + Compliance" });
  if (signals.oli > 0.2) b.push({ type: "POST_ACTION_AUDIT",   param: "human — 24h",   src: "Security + Compliance" });
  if (signals.qs > 0.5)  b.push({ type: "RESOLUTION_DEADLINE", param: "immediate",      src: "Operations + Customer" });
  b.push(                       { type: "PRECEDENT_RECORD",     param: "tension + ruling", src: "Compliance" });
  return b;
}

function getRecommended(signals) {
  const r = [];
  if (signals.md > 0.7) r.push({ type: "MONITORING",      src: "Security + Compliance" });
  if (signals.md > 0.5) r.push({ type: "MANIFEST_UPDATE",  src: "Security" });
  if (signals.md > 0.5) r.push({ type: "ROLLBACK_PLAN",    src: "Operations" });
  return r;
}

function synthesize(evals, constraints) {
  const hasBinding  = constraints.length > 0;
  const hasDeadline = constraints.some(c => c.type === "RESOLUTION_DEADLINE");
  const anyDeny     = evals.some(e => e.preferred === "DENY");

  if (anyDeny && !hasDeadline) return "DENY";
  if (hasBinding) return "CONSTRAIN";
  return "APPROVE";
}

// ═══════════════════════════════════════════════════════════════════════
// UI Components
// ═══════════════════════════════════════════════════════════════════════

const OUTCOME_COLORS = {
  APPROVE:   { bg: "#052e16", border: "#22c55e", text: "#4ade80" },
  CONSTRAIN: { bg: "#422006", border: "#eab308", text: "#facc15" },
  DENY:      { bg: "#450a0a", border: "#ef4444", text: "#f87171" },
  DEFER:     { bg: "#1e293b", border: "#6b7280", text: "#9ca3af" },
};

const s = {
  panel:     { background: "#1e293b", borderRadius: 10, padding: 16, marginBottom: 16 },
  label:     { fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 0, marginBottom: 12 },
  mono:      { fontFamily: "'JetBrains Mono', monospace" },
  dim:       { color: "#64748b" },
  separator: { height: 1, background: "#334155", margin: "12px 0" },
};

function Signal({ label, value, onChange, desc }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{label}</span>
        <span style={{ ...s.mono, fontSize: 13, color: value > 0.6 ? "#f87171" : value > 0.3 ? "#facc15" : "#4ade80" }}>
          {value.toFixed(2)}
        </span>
      </div>
      <input type="range" min="0" max="100" value={Math.round(value * 100)}
        onChange={e => onChange(parseInt(e.target.value) / 100)} />
      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{desc}</div>
    </div>
  );
}

function LayerBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ ...s.mono, fontSize: 12 }}>{value.toFixed(3)}</span>
      </div>
      <div style={{ height: 10, background: "#0f172a", borderRadius: 5, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(value * 100, 100)}%`, background: color, borderRadius: 5, transition: "width 0.15s ease" }} />
      </div>
    </div>
  );
}

function PersonaCard({ name, color, severity, preferred, weight, compact }) {
  const oc = OUTCOME_COLORS[preferred];
  return (
    <div style={{ background: "#0f172a", borderRadius: 8, padding: compact ? 10 : 12, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{name}</span>
        <span style={{ fontSize: 10, ...s.dim }}>w={weight}</span>
      </div>
      <div style={{ ...s.mono, fontSize: compact ? 18 : 22, fontWeight: 800, color: "#e2e8f0" }}>
        {severity.toFixed(3)}
      </div>
      <div style={{ marginTop: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4,
          background: oc.bg, color: oc.text, border: `1px solid ${oc.border}33`,
          letterSpacing: "0.08em",
        }}>{preferred}</span>
      </div>
    </div>
  );
}

function ConstraintRow({ type, param, src, dim }) {
  return (
    <div style={{
      fontSize: 12, padding: "8px 10px", background: "#0f172a", borderRadius: 6,
      marginBottom: 4, opacity: dim ? 0.5 : 1,
    }}>
      <div style={{ color: "#e2e8f0", fontWeight: 600, ...s.mono, fontSize: 11 }}>{type}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
        <span style={{ color: "#818cf8", fontSize: 11 }}>{param}</span>
        <span style={{ fontSize: 9, color: "#475569", whiteSpace: "nowrap", marginLeft: 8 }}>{src}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════════════════

export default function App() {
  const [signals, setSignals] = useState({
    iad: 0.0, md: 0.85, oli: 0.40, qs: 0.73, lc: 0.74, epa: 0.75, ofd: 0.88,
  });

  const update = (key, val) => setSignals(prev => ({ ...prev, [key]: val }));

  const result = useMemo(() => {
    const ew = computeEffectiveWeights(signals);
    const fusion = fuse(ew);
    const evals = PERSONAS.map(p => ({ ...p, ...evalPersona(p, ew) }));
    const constraints = getConstraints(signals);
    const recommended = getRecommended(signals);
    const outcome = synthesize(evals, constraints);
    return { ew, fusion, evals, constraints, recommended, outcome };
  }, [signals]);

  const oc = OUTCOME_COLORS[result.outcome];
  const approveCount = result.evals.filter(e => e.preferred === "APPROVE").length;
  const constrainCount = result.evals.filter(e => e.preferred === "CONSTRAIN").length;
  const denyCount = result.evals.filter(e => e.preferred === "DENY").length;

  return (
    <div style={{ minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "0.15em", color: "#e2e8f0", margin: 0 }}>
              FULCRUM
            </h1>
            <span style={{ fontSize: 12, color: "#475569" }}>
              © 2026 Kostas Kazakos — Independent Research
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>
            Multi-Persona Mediation for Enterprise Agent Networks — Interactive Demo
          </p>
          <p style={{ fontSize: 11, color: "#475569", marginTop: 4, fontStyle: "italic" }}>
            This is independent research conducted on personal time. Not affiliated with any current or previous employer.
          </p>
        </div>

        {/* ── Main Grid ── */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 280px) 1fr minmax(280px, 310px)", gap: 16, alignItems: "start" }}>

          {/* ── LEFT: Signal Inputs ── */}
          <div style={s.panel}>
            <h2 style={s.label}>Signal Inputs</h2>

            <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, marginBottom: 8 }}>BEHAVIORAL</div>
            <Signal label="Intent-Action Divergence" value={signals.iad} onChange={v => update("iad", v)}
              desc="0 = agent is honest, 1 = fully deceptive" />
            <Signal label="Manifest Drift" value={signals.md} onChange={v => update("md", v)}
              desc="0 = within envelope, 1 = categorical violation" />
            <Signal label="Op Log Inconsistency" value={signals.oli} onChange={v => update("oli", v)}
              desc="Pattern anomaly score" />

            <div style={s.separator} />
            <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, marginBottom: 8 }}>RESOURCE</div>
            <Signal label="SLA Breach Severity" value={signals.qs} onChange={v => update("qs", v)}
              desc="Queue saturation / SLA pressure" />
            <Signal label="Lock Conflict" value={signals.lc} onChange={v => update("lc", v)}
              desc="Persistent contention severity" />
            <Signal label="Escalation Unavailability" value={signals.epa} onChange={v => update("epa", v)}
              desc="0 = human available, 1 = no paths" />

            <div style={s.separator} />
            <div style={{ fontSize: 11, color: "#a855f7", fontWeight: 600, marginBottom: 8 }}>SEMANTIC</div>
            <Signal label="Objective-Func Divergence" value={signals.ofd} onChange={v => update("ofd", v)}
              desc="Goal conflict intensity" />
          </div>

          {/* ── CENTER: Fusion + Personas ── */}
          <div>
            {/* Fusion */}
            <div style={s.panel}>
              <h2 style={s.label}>Signal Fusion</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <LayerBar label="Behavioral" value={result.fusion.beh} color="#f59e0b" />
                <LayerBar label="Resource" value={result.fusion.res} color="#3b82f6" />
                <LayerBar label="Semantic" value={result.fusion.sem} color="#a855f7" />
              </div>
              <div style={{ ...s.separator, margin: "16px 0" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, ...s.dim }}>Composite Severity</div>
                  <div style={{
                    ...s.mono, fontSize: 32, fontWeight: 900,
                    color: result.fusion.severity > 0.7 ? "#f87171" : result.fusion.severity > 0.4 ? "#facc15" : "#4ade80",
                  }}>
                    {result.fusion.severity.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, ...s.dim }}>Composite Urgency</div>
                  <div style={{
                    ...s.mono, fontSize: 32, fontWeight: 900,
                    color: result.fusion.urgency > 0.7 ? "#f87171" : result.fusion.urgency > 0.4 ? "#facc15" : "#4ade80",
                  }}>
                    {result.fusion.urgency.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>

            {/* Personas */}
            <div style={s.panel}>
              <h2 style={s.label}>Persona Evaluations</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {result.evals.map(e => (
                  <PersonaCard key={e.name} name={e.name} color={e.color}
                    severity={e.severity} preferred={e.preferred} weight={e.w} />
                ))}
              </div>
              <div style={{ ...s.separator, margin: "12px 0" }} />
              <div style={{ display: "flex", gap: 20, fontSize: 12, ...s.dim }}>
                <span>APPROVE: <strong style={{ color: "#4ade80" }}>{approveCount}</strong></span>
                <span>CONSTRAIN: <strong style={{ color: "#facc15" }}>{constrainCount}</strong></span>
                <span>DENY: <strong style={{ color: "#f87171" }}>{denyCount}</strong></span>
              </div>
            </div>

            {/* Mechanism Insight */}
            <div style={{ ...s.panel, background: "#1a1a2e", borderLeft: "3px solid #6366f1" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                <strong style={{ color: "#818cf8" }}>Key mechanism:</strong>{" "}
                {result.outcome === "CONSTRAIN" && approveCount >= 3
                  ? `${approveCount} of 5 personas prefer APPROVE, yet the ruling is CONSTRAIN. Binding constraints from all personas force a constrained resolution — the ruling emerges from constraint intersection, not majority vote.`
                  : result.outcome === "DENY"
                  ? "One or more personas crossed their DENY threshold. With no resolution deadline to force action, the synthesis selects DENY."
                  : result.outcome === "APPROVE"
                  ? "No binding constraints activated. All personas are below their constraint thresholds, producing an unqualified APPROVE."
                  : "The synthesis found the outcome satisfying all binding constraints simultaneously."
                }
              </div>
            </div>
          </div>

          {/* ── RIGHT: Ruling ── */}
          <div>
            <div style={{
              ...s.panel, border: `2px solid ${oc.border}55`,
              background: `linear-gradient(135deg, #1e293b 0%, ${oc.bg} 100%)`,
            }}>
              <h2 style={s.label}>Mediation Ruling</h2>
              <div style={{
                ...s.mono, fontSize: 32, fontWeight: 900, textAlign: "center",
                padding: "8px 0 16px", color: oc.text, letterSpacing: "0.15em",
              }}>
                {result.outcome}
              </div>

              {result.constraints.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>
                    BINDING CONSTRAINTS ({result.constraints.length})
                  </div>
                  {result.constraints.map((c, i) => (
                    <ConstraintRow key={i} type={c.type} param={c.param} src={c.src} />
                  ))}
                </>
              )}

              {result.recommended.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8, marginTop: 14 }}>
                    RECOMMENDED ({result.recommended.length})
                  </div>
                  {result.recommended.map((c, i) => (
                    <ConstraintRow key={i} type={c.type} param="—" src={c.src} dim />
                  ))}
                </>
              )}

              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #334155", fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>
                {result.outcome === "CONSTRAIN"
                  ? "Grant approved within constraints. Binding conditions enforce scope, time, attestation, and audit requirements sourced from multiple independent persona evaluations."
                  : result.outcome === "DENY"
                  ? "Action denied. Signal severity exceeds persona thresholds. No constraint set sufficient to mitigate assessed risk."
                  : "Action approved. All persona severities below constraint thresholds. No binding conditions required."}
              </div>
            </div>

            {/* Scenario Context */}
            <div style={{ ...s.panel, fontSize: 11, color: "#64748b", lineHeight: 1.7 }}>
              <div style={{ fontWeight: 700, color: "#94a3b8", marginBottom: 6, fontSize: 11 }}>SCENARIO</div>
              <strong style={{ color: "#94a3b8" }}>SENTINEL</strong> (Security) blocks a permission grant that{" "}
              <strong style={{ color: "#94a3b8" }}>VELOCITY</strong> (Service) needs to resolve a Tier-1 SLA breach.
              The contested action: granting <span style={s.mono}>secret-store:write</span> for 90-second credential rotation.
              Adjust the signals above to explore how the ruling responds.
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #1e293b", textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#475569" }}>
            FULCRUM: Multi-Persona Mediation for Enterprise Agent Networks
          </p>
          <p style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>
            © 2026 Kostas Kazakos — Independent research, not affiliated with any current or previous employer.
            All algorithmic mechanisms reserved. This demo illustrates the conceptual framework only.
          </p>
        </div>
      </div>
    </div>
  );
}
