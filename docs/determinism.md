# Deterministic Simulation Rules

1. Fixed timestep: 20 TPS (50ms) for all authoritative simulation.
2. No floating-point nondeterminism: clamp/round values at system boundaries, use stable ordering.
3. All random outcomes sourced from seeded `RngService` streams.
4. Iterate entity lists in stable, id-sorted order.
5. Simulation updates follow strict ordering: triggers → movement/rotation → targeting → firing → impacts → status/deaths.
6. Replay inputs and RNG seeds must be sufficient to reproduce outcomes.
