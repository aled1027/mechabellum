# Engine Selection (Phase 0)

## Decision
**Renderer:** PixiJS 8 (WebGL-first, WebGPU-capable roadmap)

### Rationale
- Lightweight 2D renderer with mature ecosystem.
- Deterministic simulation is authored separately from rendering, so PixiJS is used only for presentation.
- Works in browsers and can be paired with headless simulation on server.

### Constraints
- Simulation logic must remain pure TypeScript without relying on engine time deltas.
- Rendering only consumes interpolated snapshots from the server-authoritative sim.

## Follow-up
- Prototype a PixiJS scene once combat core is stable.
- Re-evaluate if WebGPU-only rendering is required.
