# FULCRUM

**Multi-Persona Mediation for Enterprise Agent Networks**

---

FULCRUM is a governance architecture for resolving conflicts between autonomous AI agents in enterprise environments. When agents with competing objectives reach a deadlock — each operating correctly within its mandate — FULCRUM detects the tension, evaluates it against multiple stakeholder perspectives, and produces a structured ruling with auditable rationale.

## The Problem

Enterprise multi-agent systems are deploying faster than the governance infrastructure to manage them. Orchestration frameworks coordinate agents toward shared goals. But what happens when agents' goals are not shared — when they genuinely conflict?

A Security agent blocks a permission grant that a Service agent needs to resolve an SLA breach. Both are correct. Neither will yield. No human is available. No static rule handles the situation without creating worse problems downstream.

This is not a coordination failure. It's a **mediation problem** — and no existing framework solves it.

## The Approach

FULCRUM introduces **multi-persona constraint-satisfaction synthesis**:

1. **Signal ingestion** across three layers — behavioral (what agents declare vs. what they do), resource (SLA pressure, contention, escalation availability), and semantic (goal alignment, policy conflicts).

2. **Tension detection** via compound triggers — stable conflict across exchange rounds, with harm-threshold override for urgent situations.

3. **Multi-persona evaluation** — the tension is independently assessed by multiple stakeholder personas (security, operations, compliance, cost, customer-impact). Each persona produces binding constraints grounded in observed signals.

4. **Constraint-satisfaction synthesis** — the ruling is the resolution that satisfies all personas' binding constraints simultaneously. Not a vote. Not a debate. Not a negotiation. The intersection of independently-produced constraint sets.

The result: rulings that no single perspective would produce, but that every perspective finds acceptable. Defensible, consistent, and auditable.

## Key Properties

- **Binding rulings** with operator-override pathway
- **Deterministic synthesis** — same inputs always produce the same ruling
- **Signal-grounded constraints** — every constraint traces to observed evidence
- **Auditable rationale** — full chain from ruling to persona evaluations to underlying signals
- **Adversarial robustness** — constraints limit damage even under undetectable agent compromise

## Documentation

- **[Whitepaper](whitepaper/FULCRUM_whitepaper.md)** — Strategic framework and conceptual architecture
- **[Grounding Scenario](scenario/scenario_security_vs_procurement.md)** — The SENTINEL-VELOCITY conflict used as worked example throughout

## Status

Architecture specified. Reference prototype implemented. Evaluation framework defined. Six scenario variants stress-tested including compromised-agent and three-way conflict cases.

## Strategic Context

As of mid-2026, fewer than 1 in 10 enterprises have integrated cross-agent governance. The EU AI Act (enforceable August 2026) classifies multi-agent orchestration in high-impact sectors as high-risk. The governance gap is real, recognized, and regulatory.

FULCRUM defines agentic mediation as an infrastructure category — orthogonal to orchestration, complementary to policy enforcement, and necessary for any enterprise deploying autonomous agents at scale.

## License

This repository contains conceptual framework documentation only. Algorithmic mechanisms and implementation details are maintained separately. See [LICENSE](LICENSE) for terms.

---

*FULCRUM is independent research by Konstantinos Kazakos during his personal time. For inquiries, contact the author at kgkazakos@gmail.com.*
