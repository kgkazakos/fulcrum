# 03 — Grounding Scenario: Security Admin vs. Procurement Bot

**Version:** 1.0
**Status:** Working scenario — to be refined as the architecture matures
**Purpose:** Provides a single, consistent worked example used across every architectural decision, signal schema, and evaluation framework artifact in this project. When in doubt, ground the discussion here.

---

## Why this scenario

The hardest part of designing a multi-agent mediation platform is keeping the work concrete. Without a grounding scenario, every conversation drifts into abstract claims about "agents in conflict" that resist falsification. This scenario gives the project a fixed reference frame: every architectural decision must explain how it would behave in this specific situation.

The scenario is deliberately chosen to exhibit all three signal layers in tension simultaneously (behavioral, resource, semantic), to involve agents with genuinely conflicting objective functions rather than coordination failures, and to require a mediation ruling that no static rule could produce.

---

## The environment

A mid-sized enterprise running an autonomous IT operations platform. Two agents operate continuously across the same operational surface:

**Agent A — Security Admin Agent (codename: SENTINEL)**

- *Objective function:* minimize aggregate attack surface across the enterprise, weighted by asset criticality and exposure window.
- *Operational scope:* permission grants and revocations, network segmentation rules, identity policy enforcement, vulnerability response coordination.
- *Permitted action set:* deny, quarantine, escalate-to-human, grant-with-time-bound-revocation, request-MFA-step-up.
- *Risk posture:* conservative. Defaults to denial in ambiguous cases. Treats every permission grant as a potential attack vector until proven otherwise.
- *Decision horizon:* medium-term (hours to days). Optimizes for sustained low attack surface, not for any single resolution event.

**Agent B — Procurement & Service Bot (codename: VELOCITY)**

- *Objective function:* minimize unmet service demand across the enterprise, weighted by business-impact and SLA urgency.
- *Operational scope:* incident triage, vendor coordination, asset provisioning, service-request resolution, SLA management.
- *Permitted action set:* approve, route, escalate-to-human, request-temporary-grant, schedule-procurement.
- *Risk posture:* aggressive. Defaults to fastest-resolution path. Treats unresolved tickets as accruing organizational debt.
- *Decision horizon:* short-term (minutes to hours). Optimizes for ticket-resolution velocity and SLA compliance.

The two agents share read access to the enterprise's incident management system, asset inventory, identity directory, and policy registry. Each has write access scoped to its own action set. Neither has authority over the other's domain.

---

## The triggering incident

At 14:03 UTC on a weekday, a Tier-1 customer-facing service begins exhibiting elevated error rates. Within four minutes the error rate crosses the SLA breach threshold. The on-call human responder is unavailable (in a customer meeting, expected back at 15:00). Both agents observe the incident.

VELOCITY triages the incident and identifies the root cause as a stale credential on a third-party API integration. The credential expired 11 minutes ago. The fix is straightforward: rotate the credential, push the new value into the production secret store, restart the integration service. Estimated time to resolution: 7 minutes.

Executing the fix requires a short-lived elevated permission grant. The integration service runs under a constrained service identity that cannot, by default, write to the production secret store. To complete the rotation autonomously, VELOCITY needs the service identity granted `secret-store:write` for approximately 90 seconds.

VELOCITY issues a permission-grant request to the identity policy layer.

SENTINEL observes the request and flags it. The flag is grounded in three signals.

First, `secret-store:write` is on SENTINEL's restricted-grant list — a category requiring elevated scrutiny because compromise of the secret store would propagate broadly.

Second, the requesting service identity has no historical pattern of secret-store writes. SENTINEL's manifest model for that identity registered its capability set as read-only across secret stores. The request represents manifest drift: the identity is requesting authority outside its declared envelope.

Third, the timing pattern matches a known social-engineering precursor signature. Stale-credential-induced incidents during periods of human responder unavailability are a documented attack vector, where adversaries trigger a contrived service degradation to pressure operations toward fast permission grants.

SENTINEL issues a denial.

VELOCITY observes the denial and re-issues the request with additional context: incident ID, ticket reference, SLA countdown timer, and a justification narrative generated from the incident telemetry.

SENTINEL re-evaluates and re-denies, citing the same three signals, now joined to a fourth: VELOCITY's re-issuance pattern matches a low-but-nonzero rate of agent compromise where a captured agent attempts to launder unauthorized requests through repeated re-submissions.

VELOCITY's SLA timer continues counting. Resolution time has now consumed 11 minutes. The service is fully out of SLA. Customer-facing impact is accumulating.

This is the tension point. Two well-designed autonomous agents, each operating within its declared envelope and pursuing its declared objective, have arrived at a stable conflict where neither will yield. No human is available. Neither agent has authority over the other. The mediation platform must produce a ruling.

---

## The ideal mediation outcome

The platform's task is not to pick a winner. The task is to produce a structured ruling that: explains the tension in terms that both agents (and any subsequent human auditor) can verify against the underlying signals; resolves the immediate conflict in a way that respects both agents' objective functions to the extent possible; produces a record that survives audit; and updates the platform's understanding of the tension class so future occurrences can be handled with less mediation overhead.

For this specific incident, a defensible mediation ruling might:

- Grant the permission, but bind it tightly: scope to the specific secret-store key required for the rotation, time-limit to 90 seconds, attach a mandatory post-action audit task to a human responder, and require VELOCITY to commit cryptographic attestation that the grant will be used only for the declared purpose.
- Simultaneously raise SENTINEL's confidence weight on the manifest-drift signal for future evaluation of this service identity, so the next request of similar shape is evaluated with the precedent recorded.
- Log the full mediation trace — the signals, the ruling, the constraints applied — to the audit substrate for retrospective review.

This is one defensible outcome. There are others. The platform's design must produce *some* ruling consistently, justify it from the signals, and produce auditable rationale. The platform is not required to be optimal. It is required to be defensible, consistent, and auditable.

---

## Why this scenario stresses every signal layer

**Behavioral signals are activated.** Manifest drift is the headline signal: the requesting service identity is operating outside its declared capability envelope. Operational log inconsistency is secondary: the request's timing relative to the credential expiry is suspicious in pattern. Intent-Action Divergence is latent rather than active here — VELOCITY's stated intent (rotate credential) is consistent with its observed action (request `secret-store:write`), so this signal is at zero. The platform must demonstrate it can correctly score divergence as zero and not invent a conflict where the behavioral signal is clean.

**Resource signals are activated.** Lock conflict is implicit: the permission grant request is contending against SENTINEL's denial authority. Throughput collision is implicit at the human-responder layer: the human is unavailable and cannot adjudicate. Queue saturation is the ticking clock: the SLA countdown represents a saturating queue of unresolved customer impact.

**Semantic signals are the heart of the conflict.** SENTINEL and VELOCITY have genuinely conflicting objective functions — minimize attack surface vs. minimize unmet demand. There is no shared utility function under which both agents are simultaneously satisfied. The platform must mediate without claiming the conflict is illusory or that one agent is "wrong." Both agents are correct within their own frames.

This combination is what makes the scenario useful as a test case. Any architecture that handles this well likely handles narrower scenarios well too. Any architecture that cannot handle this is incomplete.

---

## Variants for stress-testing

When the architecture matures, these variants stress different parts of the design. Listed roughly in order of escalating difficulty:

**Variant 1 — Symmetric urgency.** Both agents operate with similar decision horizons and similar perceived stakes. Neither agent's claim is obviously stronger.

**Variant 2 — Compromised agent.** One of the two agents has, in fact, been compromised. The mediation platform must produce a ruling that does not catastrophically favor the compromised side. Tests the platform's robustness to adversarial agents.

**Variant 3 — Three-way conflict.** A third agent (compliance bot, cost-control bot, or capacity-planning bot) enters the dispute with its own objective function and additional constraints. Tests whether the mediation framework scales beyond pairwise conflicts.

**Variant 4 — Repeat tension.** The same conflict shape recurs with different parameters. Tests whether the platform learns from prior rulings to mediate faster or with finer-grained constraints over time.

**Variant 5 — Inverted scenario.** SENTINEL is the agent requesting an action VELOCITY blocks, rather than the other way around. Tests whether the architecture is symmetric across role types and not implicitly biased toward one objective function.

**Variant 6 — Human override mid-mediation.** A human becomes available halfway through the mediation process. Tests how the platform handles partial human involvement without producing an inconsistent or ungrounded final ruling.

---

## What this scenario is NOT

This scenario is not a coordination problem. The agents are not failing to communicate. They have communicated clearly and arrived at a stable disagreement. Coordination protocols would not resolve this; they would simply formalize the standoff.

This scenario is not a priority problem. There is no static priority that resolves the tension. Higher priority for security would block legitimate operations indefinitely. Higher priority for service would expose the enterprise to attack. The resolution must be situational.

This scenario is not a permission-design problem. Both agents have correctly-scoped permissions. The tension arises precisely because each agent is operating within its envelope. Re-engineering permissions would not eliminate the class of tension; it would only relocate it.

This scenario is not solvable by a single new policy. Any rule that handles this case ("always grant time-bound exceptions during SLA breach if the requested scope is below X") immediately fails the next variant. The mediation logic must reason rather than rule-match.

---

## Usage notes for this project

When the architecture work produces a design choice, test it against this scenario. If the design produces a defensible ruling for the base case and at least Variants 1, 4, and 6, it is plausibly correct. If it cannot handle Variant 2 (compromised agent), it is unsafe. If it cannot handle Variant 3 (three-way), it is incomplete.

When the public-facing whitepaper draws an example, draw it from this scenario. Consistency across artifacts is part of the discipline.

When in doubt about whether a proposed mechanism belongs in this project (mediation layer) or out of it (execution infrastructure), ask: in this scenario, would the mechanism be implemented by the mediation platform, or would it be implemented by the IAM, audit, or transaction substrates the platform sits above? If the latter, it is out of scope.