# MECHABELLUM — Expanded Internal Game Design Document

_A Tactical Auto-Battler of Mech Warfare_

---

## Purpose of This Document

This document represents an **internal, long-form design reference** for Mechabellum. It expands upon the imagined public-facing GDD by detailing unit behaviors, hidden systems, balance intent, and live-ops planning. It is intended for use by:

- Game designers
- Balance and systems designers
- Engineers implementing combat logic
- Live-ops and content planning teams

Numbers are illustrative unless otherwise stated. Design intent takes precedence over raw values.

---

# 1. Core Design Philosophy (Internal)

**Primary Goal:**
Create a deterministic, skill-expressive auto-battler where _prediction, adaptation, and positioning_ matter more than mechanical execution.

**Foundational Truth:**

> Players should lose because they made the wrong decision — not because the game behaved unpredictably.

Key internal rules:

- No unit should be universally correct.
- No strategy should be dominant for more than one patch cycle.
- Spectacle must never compromise readability.

---

# 2. Core Game Loop (Implementation Notes)

The game loop remains:

1. Planning Phase
2. Combat Phase (Fully Automated)
3. Damage & Resolution
4. Economy Update

**Engineering Constraints:**

- Browser-first delivery using a JavaScript game engine (WebGL/WebGPU).
- Combat simulation must be deterministic given identical inputs.
- Planning decisions are the _only_ network-authoritative inputs.
- Combat simulation runs server-side and streams results.
- Optional: compile simulation hot paths to WASM when performance demands it.

---

# 3. Unit Design — Complete Roster (Internal Detail)

## 3.1 Shared Unit Stat Framework

All units are defined using a shared stat schema:

- HP
- Armor (flat reduction)
- Attack Damage
- Attack Type (Kinetic, Explosive, Energy, Flame, EMP)
- Attack Speed
- Range
- Projectile Speed
- Turn Speed
- Move Speed
- Collision Size
- Targeting Flags (Ground / Air / Both)
- Squad Size (if applicable)

Only a subset of these values are surfaced to players; clarity is conveyed through role and visuals.

---

## 3.2 Tier 1 — Light Units

### Crawler — Swarm Screen

- **Role:** Expendable frontline
- **Behavior:** Rush nearest target; clumps naturally
- **Design Intent:** Time-buying and aggro manipulation

**Tech Paths:**

- Armor Plating
- Self-Replication
- EMP Payload
- Speed Overdrive

---

### Fang — Melee Disruptor

- **Role:** Backline punishment
- **Behavior:** Targets furthest viable enemy
- **Design Intent:** Punish greedy positioning

**Tech Paths:**

- Jump Jets
- Bleed Blades
- Reactive Armor
- Targeting Override

---

### Mustang — Light Skirmisher

- **Role:** Flexible early DPS
- **Behavior:** Kites melee, frequent retargeting
- **Design Intent:** Versatility without dominance

**Tech Paths:**

- Armor-Piercing Ammo
- Afterburners
- Flak Rounds
- Target Sync

---

## 3.3 Tier 2 — Medium Units

### Arclight — Chain Control

- **Role:** Anti-swarm, formation punish
- **Behavior:** Chain lightning with falloff

**Tech Paths:**

- Extended Chains
- Anti-Air Capacitors
- Overcharge Mode
- EMP Arc

---

### Marksman — Precision Sniper

- **Role:** Giant killer
- **Behavior:** High-HP target priority
- **Design Intent:** Enforce counter clarity

**Tech Paths:**

- Armor-Piercing Rounds
- Anti-Air Optics
- Thermal Targeting
- Focus Fire Protocol

---

### Sledgehammer — Artillery

- **Role:** AoE saturation
- **Behavior:** Predictive missile fire

**Tech Paths:**

- Cluster Warheads
- Homing Guidance
- Napalm Payload
- Rapid Reload

---

### Steel Ball — Disruptor Tank

- **Role:** Tempo control
- **Behavior:** Fast engage, low DPS

**Tech Paths:**

- Magnetic Pull
- Kinetic Discharge

---

### Stormcaller — Rocket Battery

- **Role:** Pre-engagement pressure

**Tech Paths:**

- Saturation Barrage
- Smart Targeting
- Incendiary Payloads
- Rapid Deployment

---

### Hound — Mobile Harasser

- **Role:** Chase and isolation

**Tech Paths:**

- Pack Tactics
- Armor Shred
- Stealth Start

---

## 3.4 Tier 3 — Heavy Units

### Scorpion — Long-Range Execution

- **Role:** Anti-giant artillery

---

### Vulcan — Anti-Swarm Anchor

- **Role:** Swarm suppression

---

### Rhino — Siege Breaker

- **Role:** Center pressure

**Tech Paths:**

- Siege Ram
- Shockwave Stomp
- Armor Overload
- Target Override

---

### Hacker — Tech Disruption

- **Role:** Counter-investment

---

### Tarantula — Zone Control

- **Role:** Area denial

**Tech Paths:**

- AA Turrets
- EMP Mines
- Auto-Repair Drones

---

## 3.5 Giants

### Fortress — Battlefield Anchor

- **Role:** Commitment piece

---

### Melting Point — Beam Executioner

- **Role:** Single-target annihilation

---

### Sandworm — Ambush Disruptor

- **Role:** Formation breaker

---

### Raiden — Alpha Strike

- **Role:** Opening burst

---

### Overlord — Air Carrier

- **Role:** Sustained air pressure

---

### War Factory — Attrition Engine

- **Role:** Long-fight dominance

---

## 3.6 Air Units

- Wasp — Light harassment
- Phoenix — Revive mechanic
- Phantom Ray — Cloaked approach
- Wraith — Apex air control

---

## 3.7 Rare (Card-Only) Units

- Sabertooth — Elite sniper
- Typhoon — Massive AoE air
- Fire Badger — Hybrid bruiser
- Farseer — Vision manipulation
- Larva — Random Giant evolution

---

# 4. Hidden Combat Systems

## 4.1 Targeting & Aggro

- Weighted by distance and turn speed
- Slow retargeting favors positioning foresight

## 4.2 Damage Resolution Order

1. Hit check
2. Armor reduction
3. Shields
4. HP
5. On-hit effects

## 4.3 Target Saturation

- Accuracy penalties when over-focusing
- Encourages fire distribution

## 4.4 Collision & Wreckage

- Giants block movement
- Temporary wrecks affect pathing

---

# 5. Specialists, Skills & Reinforcements

## 5.1 Specialist Rules

- Max 3 active specialists
- Tiered locks prevent stacking abuse

## 5.2 Skill Timing Windows

- Combat start
- Mid-combat thresholds
- Reactive triggers (Center HP)

---

# 6. Balance Patch Notes (Example)

## Patch 1.2 — Meta Stabilization Update

**Goals:**

- Reduce over-performance of swarm openings
- Improve viability of mid-tier units
- Increase counterplay clarity vs air dominance

### Unit Changes

**Crawler**

- Self-Replication tech spawn chance reduced by 20%
- Collision size slightly increased (improves AoE effectiveness)

**Vulcan**

- Base range reduced slightly
- Extended Fuel Lines tech range bonus increased

**Marksman**

- Focus Fire Protocol now has diminishing returns beyond 4 units

**Phoenix**

- Revive HP reduced by 15%

**War Factory**

- Spawn interval reduced
- Initial unit spawn delayed by 3 seconds

### Specialist Adjustments

**Elite Specialist**

- Level 2 recruitment cost increased slightly

**Supply Specialist**

- Bonus unchanged (baseline reference point)

### Reinforcement Cards

- EMP-based skills appear less frequently in early rounds

---

# 7. Balance Implementation Plan

## Phase 1 — Data Collection (Week 0–2)

- Monitor unit pick rates
- Track win rates by specialist
- Identify tech over-centralization

## Phase 2 — Soft Adjustments (Week 3)

- Cost tuning
- Tech efficiency changes
- Reinforcement frequency weighting

## Phase 3 — Hard Interventions (Week 5)

- Mechanical changes if needed
- Behavior adjustments
- Targeting logic tweaks

## Phase 4 — Validation (Week 6)

- High-MMR testing
- Tournament replay review
- Regression testing for edge cases

---

# 8. Live Balance Philosophy

Rules for balance changes:

- Never delete a unit’s identity
- Prefer cost and availability changes over stat nukes
- One dominant strategy per patch cycle maximum

Success is measured by:

- Diverse late-game compositions
- Multiple viable opening strategies
- No single specialist exceeding acceptable win-rate thresholds

---

# 9. Final Internal Design Statement

> Mechabellum is not about solving the game.
> It is about staying correct longer than your opponent while both of you adapt in real time.

---

# 10. Board, Placement & Round Structure (Missing Implementation Details)

## 10.1 Board Layout

- **Grid:** 12×8 logical tiles (implementation may use world coordinates).
- **Sides:** Players each own a 12×4 deployment zone; no overlapping placement.
- **Blocked Tiles:** None by default; future modifiers may add terrain.
- **Spawn Points:** Units spawn centered on their placed tile and inherit formation orientation.

## 10.2 Placement Rules

- **Placement Limit:** Max 8 total placements per round (units or upgrades).
- **Unit Cap:** 20 squads, 8 giants, 16 air squads (hard caps; overflow prevented).
- **Squad Formation:** Squad-based units occupy a single tile; squad members fan within 1–1.5 tile radius.
- **Collision Priority:** Giants > Medium > Light > Air (air ignores ground collision).
- **Rotation:** Placement allows 0/90/180/270 orientation; affects initial facing and formation offsets.

## 10.3 Round Timing

- **Planning Phase:** 30–60s (configurable, tournament uses fixed 45s).
- **Combat Phase:** Simulated until one side eliminated or 90s timeout.
- **Timeout Rule:** If both sides remain at timeout, compare total HP %; higher wins.

---

# 11. Economy & Shop (Missing)

## 11.1 Resource Types

- **Credits:** Primary currency for buying units, upgrades, and tech.
- **Supply:** Soft cap for total army value; exceeding triggers escalating costs.

## 11.2 Income Formula (Baseline)

- **Base Income:** 20 credits/round.
- **Win Bonus:** +6 credits.
- **Loss Streak:** +2 credits per consecutive loss (max +8).
- **Interest:** +10% of unused credits (cap 10).

## 11.3 Shop Flow

- Shop presents **3 unit offers**, **2 tech offers**, **2 reinforcement cards** each round.
- **Reroll:** 5 credits; cannot be used more than twice per round.
- **Lock:** Carry over 1 unit offer to next round (costs 2 credits).

---

# 12. Unit Upgrades & Tech System (Missing)

## 12.1 Upgrade Tiers

- **Level 1:** +20% HP, +10% damage.
- **Level 2:** +30% HP, +15% damage, +5% attack speed.
- **Level 3:** +40% HP, +20% damage, +10% attack speed.

## 12.2 Tech Rules

- Each unit can equip **max 2 techs**.
- Techs are **mutually exclusive** within a branch (e.g., Armor Plating vs Speed Overdrive).
- Techs are **purchased per squad**, not global.

---

# 13. Reinforcement Cards (Missing)

## 13.1 Card Types

- **Instant:** One-time effects (e.g., EMP Burst, Nano-Repair).
- **Timed:** Lasts for X seconds (e.g., Shield Field).
- **Triggered:** Activate on conditions (e.g., First Giant death).

## 13.2 Card Limits

- 2 cards per round maximum, shared cooldown bucket.
- Cards have rarity tiers influencing appearance weighting.

---

# 14. Specialists (Missing Definitions)

## 14.1 Specialist Classes

- **Elite:** Enhances unit leveling and elite techs.
- **Supply:** Focused on economy and shop manipulation.
- **Tactical:** Improves cards and tactical positioning bonuses.

## 14.2 Specialist Progression

- **Level 1:** Passive ability unlocked at round 1.
- **Level 2:** Additional passive at round 5.
- **Level 3:** Active skill at round 8.

---

# 15. Status Effects & Damage Types (Missing)

## 15.1 Status Effects

- **EMP:** Disables abilities/tech for 4s.
- **Stun:** Stops movement and attack for 2s.
- **Burn:** Damage over time, reduces armor by 20% while active.
- **Slow:** -40% move speed, -20% turn speed.
- **Mark:** Increases incoming damage by 15%.

## 15.2 Damage Type Interactions

- **Kinetic:** Reduced by armor.
- **Explosive:** +20% vs squads; -10% vs giants.
- **Energy:** Ignores 30% armor.
- **Flame:** Applies burn; reduced by shields.
- **EMP:** Minimal damage; high disruption effect.

---

# 16. AI & Targeting (Missing Implementation Notes)

- **Target Selection:** Weighted score = (distance _ 0.5) + (HP% _ 0.3) + (threat \* 0.2).
- **Retarget Cooldown:** 1.5s baseline, affected by tech.
- **Pathing:** A\* on grid, collision avoidance by priority class.
- **Fallback Behavior:** If blocked for >3s, unit shifts target to nearest open tile.

---

# 17. UI/UX & Replay (Missing)

## 17.1 HUD

- Round timer, credits, shop offers, card tray, specialist panel, and unit detail panel.
- Combat overlays show damage numbers only on focus (minimize clutter).

## 17.2 Replay System

- Deterministic input recording: store planning actions only.
- Replay viewer supports timeline scrub and 0.25x–2x speed.

---

# 18. Networking & Determinism (Missing)

- **Authoritative Server:** Accepts planning inputs; simulates combat and streams results.
- **Lockstep:** Inputs must be submitted before phase lock; late inputs are discarded.
- **Seeded RNG:** All random elements use seeded RNG stored per round.

---

# 19. Content Pipeline (Missing)

- **Data-Driven Units:** All stats and techs stored in JSON/YAML tables.
- **Balance Hotfix:** Server-side overrides for unit stats and card weights.
- **Unit Visualization:** Prefabs reference animation, VFX, SFX in a manifest.

---

# 20. Game Modes (Missing)

- **Ranked 1v1:** Primary mode with MMR.
- **Casual 1v1:** No rating changes.
- **Tutorial:** Scripted scenario teaching placement, techs, and cards.
- **Sandbox:** Unlimited credits; test compositions.

---

# 21. Combat Simulation Specification (Missing)

## 21.1 Simulation Rate

- **Tick Rate:** 20 ticks per second (50ms fixed update).
- **Render Interpolation:** Client interpolates between authoritative ticks.

## 21.2 Update Order (Per Tick)

1. Resolve queued ability triggers.
2. Update movement/rotation.
3. Acquire/validate targets.
4. Fire weapons (projectile spawn).
5. Resolve projectile impacts.
6. Apply status effects and death cleanup.

## 21.3 RNG Usage

- One seeded RNG stream per round.
- Substreams per system: targeting, hit checks, card effects, tech procs.

## 21.4 Tie-Breakers

- If simultaneous lethal damage: higher total remaining HP% wins.
- If still tied: compare total unit value; higher wins.

---

# 22. Full Unit Data Tables (Missing)

- **Baseline Stats:** HP, armor, damage, range, speed, costs for every unit.
- **Per-Tech Deltas:** Exact stat modifications per tech.
- **Unlock Requirements:** Tier unlock rounds and specialist locks.

---

# 23. Specialist & Card Catalogs (Missing)

- **Specialist Abilities:** Exact effects, activation timing, and scaling per level.
- **Card List:** Name, type, duration, radius, targets, and effect strength.
- **Availability Weights:** Per-round weight tables by rarity tier.

---

# 24. Economy Tuning Sheet (Missing)

- **Per-Round Income Curve:** Base + bonus by round.
- **Unit Costs:** Unit cost table and per-level upgrade costs.
- **Supply Scaling:** Formula for cost increase beyond supply threshold.

---

# 25. Progression & Meta (Missing)

- **Unlock Flow:** When units, specialists, and cards become available.
- **Onboarding:** Tutorial sequence and milestone rewards.
- **Account Progress:** XP curve and cosmetics unlocks.

---

# 26. Camera & Controls (Missing)

- **Camera:** Min/max zoom, pan speed, edge scroll thresholds.
- **Input Bindings:** Placement rotate, cancel, quick-buy, and card hotkeys.
- **Spectator Mode:** Free camera with timeline scrub.

---

# 27. UI Wireframes & UX Specs (Missing)

- **Shop Layout:** Unit grid, tech panel, card tray, and reroll/lock controls.
- **Unit Detail Panel:** Stats, tech slots, upgrade tiers, and targeting flags.
- **Post-Round:** Damage summary, economy breakdown, and round recap.

---

# 28. Audio/VFX Guidelines (Missing)

- **Audio Events:** Fire, impact, death, card activation, UI clicks.
- **Loudness Targets:** Relative priorities (giants > artillery > light).
- **VFX Budget:** Max concurrent effects, readability constraints.

---

# 29. Animation State Machines (Missing)

- **States:** Idle, Move, Attack, Hit, Death, Ability.
- **Blend Rules:** Move↔Attack blends, cancel windows.
- **Sync:** Attack animation sync to projectile spawn.

---

# 30. Networking Implementation (Missing)

- **Input Validation:** Server checks placement bounds and credit costs.
- **Latency Handling:** Client predicts placement UI only; combat is authoritative.
- **Reconnect:** Client resyncs to current round state.
- **Replay Payload:** Inputs + RNG seed per round.

---

# 31. Data Schema Definitions (Missing)

- **Unit Schema:** Stats, techs, cost, tags, visuals.
- **Tech Schema:** Requirements, stat deltas, VFX/SFX.
- **Card Schema:** Type, trigger, duration, targets, effects.
- **Specialist Schema:** Levels, passives, actives, cooldown.

---

# 32. QA & Test Plan (Missing)

- **Deterministic Tests:** Replay checksum validation.
- **Regression:** Unit behavior snapshots per patch.
- **Balance Testing:** Controlled comps and round-by-round comparisons.

---

# 33. Analytics & Telemetry (Missing)

- **Core Events:** Unit pick, tech pick, card usage, win/loss.
- **Economy Events:** Credit spend, rerolls, lock usage.
- **Combat Events:** Damage dealt, time to kill, survival rate.

---

# 34. Localization & Accessibility (Missing)

- **Localization:** Text keys for all UI, tooltips, and unit names.
- **Accessibility:** Colorblind palettes, font size options, reduced VFX mode.
