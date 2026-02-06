# MECHABELLUM — Expanded Internal Game Design Document

*A Tactical Auto-Battler of Mech Warfare*

---

## Purpose of This Document

This document represents an **internal, long-form design reference** for Mechabellum. It expands upon the imagined public-facing GDD by detailing unit behaviors, hidden systems, balance intent, and live-ops planning. It is intended for use by:

* Game designers
* Balance and systems designers
* Engineers implementing combat logic
* Live-ops and content planning teams

Numbers are illustrative unless otherwise stated. Design intent takes precedence over raw values.

---

# 1. Core Design Philosophy (Internal)

**Primary Goal:**
Create a deterministic, skill-expressive auto-battler where *prediction, adaptation, and positioning* matter more than mechanical execution.

**Foundational Truth:**

> Players should lose because they made the wrong decision — not because the game behaved unpredictably.

Key internal rules:

* No unit should be universally correct.
* No strategy should be dominant for more than one patch cycle.
* Spectacle must never compromise readability.

---

# 2. Core Game Loop (Implementation Notes)

The game loop remains:

1. Planning Phase
2. Combat Phase (Fully Automated)
3. Damage & Resolution
4. Economy Update

**Engineering Constraints:**

* All combat must be deterministic given identical inputs.
* Planning decisions are the *only* network-authoritative inputs.
* Combat simulation runs server-side and streams results.

---

# 3. Unit Design — Complete Roster (Internal Detail)

## 3.1 Shared Unit Stat Framework

All units are defined using a shared stat schema:

* HP
* Armor (flat reduction)
* Attack Damage
* Attack Type (Kinetic, Explosive, Energy, Flame, EMP)
* Attack Speed
* Range
* Projectile Speed
* Turn Speed
* Move Speed
* Collision Size
* Targeting Flags (Ground / Air / Both)
* Squad Size (if applicable)

Only a subset of these values are surfaced to players; clarity is conveyed through role and visuals.

---

## 3.2 Tier 1 — Light Units

### Crawler — Swarm Screen

* **Role:** Expendable frontline
* **Behavior:** Rush nearest target; clumps naturally
* **Design Intent:** Time-buying and aggro manipulation

**Tech Paths:**

* Armor Plating
* Self-Replication
* EMP Payload
* Speed Overdrive

---

### Fang — Melee Disruptor

* **Role:** Backline punishment
* **Behavior:** Targets furthest viable enemy
* **Design Intent:** Punish greedy positioning

**Tech Paths:**

* Jump Jets
* Bleed Blades
* Reactive Armor
* Targeting Override

---

### Mustang — Light Skirmisher

* **Role:** Flexible early DPS
* **Behavior:** Kites melee, frequent retargeting
* **Design Intent:** Versatility without dominance

**Tech Paths:**

* Armor-Piercing Ammo
* Afterburners
* Flak Rounds
* Target Sync

---

## 3.3 Tier 2 — Medium Units

### Arclight — Chain Control

* **Role:** Anti-swarm, formation punish
* **Behavior:** Chain lightning with falloff

**Tech Paths:**

* Extended Chains
* Anti-Air Capacitors
* Overcharge Mode
* EMP Arc

---

### Marksman — Precision Sniper

* **Role:** Giant killer
* **Behavior:** High-HP target priority
* **Design Intent:** Enforce counter clarity

**Tech Paths:**

* Armor-Piercing Rounds
* Anti-Air Optics
* Thermal Targeting
* Focus Fire Protocol

---

### Sledgehammer — Artillery

* **Role:** AoE saturation
* **Behavior:** Predictive missile fire

**Tech Paths:**

* Cluster Warheads
* Homing Guidance
* Napalm Payload
* Rapid Reload

---

### Steel Ball — Disruptor Tank

* **Role:** Tempo control
* **Behavior:** Fast engage, low DPS

**Tech Paths:**

* Magnetic Pull
* Kinetic Discharge

---

### Stormcaller — Rocket Battery

* **Role:** Pre-engagement pressure

**Tech Paths:**

* Saturation Barrage
* Smart Targeting
* Incendiary Payloads
* Rapid Deployment

---

### Hound — Mobile Harasser

* **Role:** Chase and isolation

**Tech Paths:**

* Pack Tactics
* Armor Shred
* Stealth Start

---

## 3.4 Tier 3 — Heavy Units

### Scorpion — Long-Range Execution

* **Role:** Anti-giant artillery

---

### Vulcan — Anti-Swarm Anchor

* **Role:** Swarm suppression

---

### Rhino — Siege Breaker

* **Role:** Center pressure

**Tech Paths:**

* Siege Ram
* Shockwave Stomp
* Armor Overload
* Target Override

---

### Hacker — Tech Disruption

* **Role:** Counter-investment

---

### Tarantula — Zone Control

* **Role:** Area denial

**Tech Paths:**

* AA Turrets
* EMP Mines
* Auto-Repair Drones

---

## 3.5 Giants

### Fortress — Battlefield Anchor

* **Role:** Commitment piece

---

### Melting Point — Beam Executioner

* **Role:** Single-target annihilation

---

### Sandworm — Ambush Disruptor

* **Role:** Formation breaker

---

### Raiden — Alpha Strike

* **Role:** Opening burst

---

### Overlord — Air Carrier

* **Role:** Sustained air pressure

---

### War Factory — Attrition Engine

* **Role:** Long-fight dominance

---

## 3.6 Air Units

* Wasp — Light harassment
* Phoenix — Revive mechanic
* Phantom Ray — Cloaked approach
* Wraith — Apex air control

---

## 3.7 Rare (Card-Only) Units

* Sabertooth — Elite sniper
* Typhoon — Massive AoE air
* Fire Badger — Hybrid bruiser
* Farseer — Vision manipulation
* Larva — Random Giant evolution

---

# 4. Hidden Combat Systems

## 4.1 Targeting & Aggro

* Weighted by distance and turn speed
* Slow retargeting favors positioning foresight

## 4.2 Damage Resolution Order

1. Hit check
2. Armor reduction
3. Shields
4. HP
5. On-hit effects

## 4.3 Target Saturation

* Accuracy penalties when over-focusing
* Encourages fire distribution

## 4.4 Collision & Wreckage

* Giants block movement
* Temporary wrecks affect pathing

---

# 5. Specialists, Skills & Reinforcements

## 5.1 Specialist Rules

* Max 3 active specialists
* Tiered locks prevent stacking abuse

## 5.2 Skill Timing Windows

* Combat start
* Mid-combat thresholds
* Reactive triggers (Center HP)

---

# 6. Balance Patch Notes (Example)

## Patch 1.2 — Meta Stabilization Update

**Goals:**

* Reduce over-performance of swarm openings
* Improve viability of mid-tier units
* Increase counterplay clarity vs air dominance

### Unit Changes

**Crawler**

* Self-Replication tech spawn chance reduced by 20%
* Collision size slightly increased (improves AoE effectiveness)

**Vulcan**

* Base range reduced slightly
* Extended Fuel Lines tech range bonus increased

**Marksman**

* Focus Fire Protocol now has diminishing returns beyond 4 units

**Phoenix**

* Revive HP reduced by 15%

**War Factory**

* Spawn interval reduced
* Initial unit spawn delayed by 3 seconds

### Specialist Adjustments

**Elite Specialist**

* Level 2 recruitment cost increased slightly

**Supply Specialist**

* Bonus unchanged (baseline reference point)

### Reinforcement Cards

* EMP-based skills appear less frequently in early rounds

---

# 7. Balance Implementation Plan

## Phase 1 — Data Collection (Week 0–2)

* Monitor unit pick rates
* Track win rates by specialist
* Identify tech over-centralization

## Phase 2 — Soft Adjustments (Week 3)

* Cost tuning
* Tech efficiency changes
* Reinforcement frequency weighting

## Phase 3 — Hard Interventions (Week 5)

* Mechanical changes if needed
* Behavior adjustments
* Targeting logic tweaks

## Phase 4 — Validation (Week 6)

* High-MMR testing
* Tournament replay review
* Regression testing for edge cases

---

# 8. Live Balance Philosophy

Rules for balance changes:

* Never delete a unit’s identity
* Prefer cost and availability changes over stat nukes
* One dominant strategy per patch cycle maximum

Success is measured by:

* Diverse late-game compositions
* Multiple viable opening strategies
* No single specialist exceeding acceptable win-rate thresholds

---

# 9. Final Internal Design Statement

> Mechabellum is not about solving the game.
> It is about staying correct longer than your opponent while both of you adapt in real time.

