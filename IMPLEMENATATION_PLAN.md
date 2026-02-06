# Mechabellum Implementation Plan

This plan translates the internal GDD into an actionable delivery roadmap. It focuses on deterministic combat, data-driven systems, and staged content rollout. Sections reference GDD headings for traceability.

---

## 1. Delivery Phases & Milestones

### Phase 0 — Foundations (Weeks 0–2)

**Goal:** Establish the technical backbone for deterministic combat and data-driven content.

- **Core Engine Setup**
  - Browser-first client using a JavaScript game engine (WebGL/WebGPU) and deterministic sim rules.
  - Fixed-timestep simulation loop (20 TPS, 50ms) with strict update order. (GDD §21.1–21.2)
  - Deterministic RNG service with per-round seed and substreams. (GDD §21.3)
  - Server-authoritative simulation skeleton and client render interpolation. (GDD §18, §21.1)
  - Optional WASM build for simulation hot paths if profiling shows need.

- **Data Infrastructure**
  - Define data schemas for Units, Techs, Cards, Specialists. (GDD §31)
  - Loaders with validation + defaults; hot-reload support in dev.
  - Server-side balance override capability. (GDD §19)

- **Board & Placement**
  - Grid model (12×8), deployment zones, orientation handling. (GDD §10)
  - Placement validation (caps, tile ownership, credit checks). (GDD §10.2, §30)

**Milestone:** Run a headless deterministic match with placeholder units and log a stable replay checksum.

---

### Phase 1 — Combat Core (Weeks 3–6)

**Goal:** Implement complete combat simulation with movement, targeting, projectiles, and status effects.

- **Unit Stat Framework** (GDD §3.1)
  - HP, armor, damage, attack type, speed, range, collision size, flags.
  - Squad formation scatter and facing orientation rules.

- **Targeting & Aggro** (GDD §4.1, §16)
  - Weighted targeting score; retarget cooldowns.
  - Priority class collision and fallback behavior.

- **Movement & Pathing** (GDD §16)
  - A\* on grid; collision avoidance by class.
  - Wreckage as temporary obstacles. (GDD §4.4)

- **Weapon & Damage Resolution** (GDD §4.2, §21.2)
  - Hit check → armor → shields → HP → on-hit effects.
  - Damage type interactions (kinetic/explosive/energy/flame/EMP). (GDD §15.2)

- **Status Effects** (GDD §15.1)
  - EMP, stun, burn, slow, mark: durations, stacking, UI indicators.

- **Projectile System**
  - Travel time, impacts, AoE logic, homing support for later techs.

**Milestone:** Full combat between two medium-sized armies resolves deterministically with consistent outcomes across runs.

---

### Phase 2 — Economy, Shop, and Progression Loop (Weeks 7–9)

**Goal:** Implement the planning phase systems and full loop from round to round.

- **Economy System** (GDD §11)
  - Base income, win bonus, loss streak, interest cap.
  - Supply cap and cost scaling.

- **Shop Pipeline** (GDD §11.3)
  - 3 unit offers, 2 tech offers, 2 reinforcement cards.
  - Reroll limits and lock feature.

- **Unit Upgrades & Tech** (GDD §12)
  - Level 1–3 upgrade stat curves.
  - Tech selection and exclusivity per branch; max 2 techs per squad.

- **Round Timing & Phase Lock** (GDD §10.3, §18)
  - Planning timer, late input rejection, combat timeout logic.

**Milestone:** End-to-end playable loop with shop, purchases, upgrades, and deterministic combat.

---

### Phase 3 — Specialists, Cards, and Advanced Systems (Weeks 10–13)

**Goal:** Add strategic layers (specialists and reinforcement cards) and complete combat interactions.

- **Specialist System** (GDD §5, §14)
  - Class selection, level unlocks at rounds 1/5/8.
  - Passive and active triggers; max 3 active specialists.

- **Reinforcement Cards** (GDD §13)
  - Card catalog, rarity weights, cooldown buckets.
  - Instant, timed, triggered effects.

- **AI Improvements**
  - Target saturation penalties to discourage over-focus. (GDD §4.3)
  - Giant collision priority and path blocking behavior.

**Milestone:** Strategy depth with specialists/cards enabled; combat coverage for all core systems.

---

### Phase 4 — Content Rollout & Balance Pass (Weeks 14–18)

**Goal:** Populate full unit roster and perform balance tuning with telemetry.

- **Unit Roster Integration** (GDD §3)
  - Tier 1–3 units, giants, air units, rare units.
  - Add per-unit behavior overrides (e.g., chain lightning, revive, cloaking).

- **Tech & Card Catalog Completion** (GDD §23)
  - Implement all tech branches and unique effects.
  - Implement card list with triggers and scaling values.

- **Balance Pipeline** (GDD §7, §8)
  - Internal tuning sheets, patch workflow, and override deploys.
  - High-MMR testing harness with replay validation.

**Milestone:** Feature-complete roster with stable balance and reproducible replays.

---

### Phase 5 — UI/UX, Replay, and Networking Harden (Weeks 19–22)

**Goal:** Finalize player-facing experience and harden networked determinism.

- **HUD & Planning UI** (GDD §17, §27)
  - Shop layout, unit panel, specialist panel, timers.

- **Replay System** (GDD §17.2, §18, §30)
  - Record planning inputs + RNG seed per round.
  - Timeline scrub and speed controls.

- **Networking** (GDD §18, §30)
  - Server authoritative combat streaming.
  - Reconnect and resync support.

**Milestone:** UX-complete build with replay and stable networked play.

---

### Phase 6 — QA, Analytics, and Release Prep (Weeks 23–26)

**Goal:** Ensure stability, measurable telemetry, and shipping readiness.

- **QA & Test Plan** (GDD §32)
  - Deterministic checksum regression suite.
  - Unit behavior snapshots per patch.

- **Analytics & Telemetry** (GDD §33)
  - Pick rates, tech choices, card usage, economy patterns.

- **Accessibility & Localization** (GDD §34)
  - Text keys, colorblind palettes, VFX reduction.

**Milestone:** Release candidate with complete analytics and QA sign-off.

---

## 2. System-by-System Implementation Detail

### 2.1 Combat Simulation

- **Simulation Loop**
  - Fixed tick (50ms).
  - Update order: triggers → movement/rotation → targeting → firing → impacts → status/deaths. (GDD §21.2)

- **Determinism Rules**
  - All random outcomes from seeded RNG stream.
  - All decisions based on ordered, stable lists (id-based ordering).

- **Timeout Resolution**
  - Compare total HP%, then unit value for tiebreak. (GDD §10.3, §21.4)

### 2.2 Targeting & AI

- **Target score** = (distance _ 0.5) + (HP% _ 0.3) + (threat \* 0.2).
- **Retarget cooldown** default 1.5s, modified by techs.
- **Fallback** after 3s blocked -> retarget nearest open tile.

### 2.3 Damage Model

- Damage pipeline: hit check → armor → shields → HP → on-hit effects.
- Damage type modifiers (kinetic, explosive, energy, flame, EMP).
- Status effects apply after hit; burn reduces armor by 20%.

### 2.4 Economy & Shop

- Income formula + supply scaling.
- Shop offers generated via weighted tables.
- Rerolls tracked with per-round cap.

### 2.5 Content Pipeline

- JSON/YAML tables for all unit stats, techs, cards, specialists.
- Versioned schema migrations.
- Server-side hotfix overrides.

---

## 3. Backend Implementation (Cloudflare-First)

### 3.1 Architecture

- **Cloudflare Workers** for API, auth hooks, and matchmaking entrypoints.
- **Durable Objects** as authoritative match rooms (lockstep input queue, RNG seed, combat stream coordination).
- **WebSockets** from clients to Durable Objects for real-time inputs and state updates.
- **D1** for accounts, MMR, match history, and replay metadata.
- **R2** for replay payload storage (inputs + RNG seed + version) and large telemetry batches.
- **KV** for balance overrides, feature flags, and configuration snapshots.

### 3.2 Match Flow

1. Client requests match via Worker (queues by mode/region).
2. Worker assigns/creates a Durable Object room.
3. Clients connect via WebSocket to the room.
4. Room enforces phase locks and input validation.
5. Room drives deterministic simulation ticks and streams results.
6. Room writes replay metadata to D1 and payloads to R2.

### 3.3 Persistence & Data

- **D1 Tables**: users, ratings, matches, match_participants, replays.
- **Replay payloads** stored as compressed JSON in R2.
- **Balance overrides** pulled from KV with versioning; cached in DO.

### 3.4 Security & Reliability

- Validate placement bounds, credit costs, and turn timers server-side.
- Use id-based deterministic ordering for inputs.
- Include build/version hash in replay payload for compatibility.

---

## 4. Risks & Mitigations

| Risk                                    | Impact                  | Mitigation                                                                  |
| --------------------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| Determinism drift between server/client | Desync, replay mismatch | Strict fixed-step sim, deterministic iteration order, replay checksum tests |
| Balance volatility                      | Meta instability        | Phased balance plan, high-MMR testing, server hotfix overrides              |
| Content scale                           | Slow delivery           | Data-driven design, prefab manifest pipeline                                |
| Network latency                         | Input delays            | Phase locks, local UI prediction only                                       |
| Durable Object scaling limits           | Queue delays            | Shard by mode/region, keep rooms ephemeral                                  |

---

## 5. Acceptance Criteria

- Deterministic replays with matching checksums across multiple runs.
- Full game loop: planning → combat → economy → shop → repeat.
- Complete unit roster with techs and cards implemented.
- UI/UX feature parity with design requirements.
- Telemetry reporting core events and balance metrics.

---

## 5. Deliverables Checklist

- [ ] Data schemas + loaders
- [ ] Deterministic sim + RNG
- [ ] Combat (movement, targeting, damage, status)
- [ ] Economy + shop + upgrades
- [ ] Specialists + reinforcement cards
- [ ] Full unit roster + tech catalog
- [ ] Replay system
- [ ] Networked authoritative server
- [ ] QA + analytics + localization/accessibility

---

## 6. Reference Mapping to GDD

- **Core loop & determinism:** §2, §18, §21
- **Units & combat:** §3–4, §15–16
- **Economy & shop:** §11–12
- **Specialists & cards:** §5, §13–14
- **UI/UX & replay:** §17, §27
- **Networking:** §18, §30
- **Pipeline & QA:** §19, §32–33
