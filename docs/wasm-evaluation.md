# WASM Evaluation (Phase 0)

## Goal

Identify whether any simulation hot paths benefit from WebAssembly.

## Criteria

- Profiled hotspots exceed 4ms per tick on typical mid-range hardware.
- Pure compute kernels (pathfinding, collision resolution, target scoring) are isolated and deterministic.
- No reliance on floating-point differences between JS and WASM without explicit rounding.

## Plan

1. Add profiling hooks once combat core is in place.
2. Benchmark A\* pathing and collision resolution in JS.
3. If hotspots exceed budget, prototype Rust or AssemblyScript versions.

## Decision

Deferred until profiling data is available.
