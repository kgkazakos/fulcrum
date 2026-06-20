# FULCRUM Interactive Demo

**Multi-Persona Mediation for Enterprise Agent Networks**

© 2026 Kostas Kazakos — Independent research, not affiliated with any current or previous employer.

## What This Is

An interactive demonstration of constraint-satisfaction synthesis for multi-agent conflict resolution. Adjust signal values and watch the mediation ruling change in real time.

## Run Locally

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect the GitHub repo to Vercel for automatic deployments.

## What to Try

- **Slide IAD from 0 to 0.5+** — simulates a deceptive agent. Watch the ruling shift toward DENY.
- **Slide SLA Breach Severity to 0** — removes urgency. DENY becomes viable.
- **Slide Manifest Drift to 0** — safety constraints disappear.
- **Slide everything to max** — system shifts to DENY.

The key insight: even when most personas prefer APPROVE, the existence of binding constraints forces the outcome to CONSTRAIN.

## License

All rights reserved. This demo illustrates the FULCRUM conceptual framework. Algorithmic mechanisms and implementation details are maintained separately.
