import type { DataBundle, UnitDefinition } from "../data/schemas.js";
import type { GridPosition, Orientation } from "../grid/grid.js";
import { GridModel } from "../grid/grid.js";
import type { RngService } from "../core/rng.js";
import type { SimEvent, SimInput, SimState, UnitInstance } from "./types.js";
import { applyTechModifiers, applyUpgradeModifiers } from "../game/upgrades.js";
import { buildSquadOffsets } from "./formation.js";
import { findPath } from "./pathing.js";
import { selectTarget } from "./targeting.js";
import { rollHit, applyDamage } from "./damage.js";
import {
  addStatusEffect,
  getArmorMultiplier,
  getMoveSpeedMultiplier,
  hasStatus,
  tickStatusEffects
} from "./status.js";
import { updateProjectiles } from "./projectiles.js";

export interface CombatConfig {
  tickMs: number;
  retargetCooldownMs: number;
  blockedRetargetMs: number;
  wreckageDurationMs: number;
  saturationAccuracyPenalty: number;
  saturationMinAccuracyMultiplier: number;
}

const distance = (a: GridPosition, b: GridPosition): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const normalize = (vector: GridPosition): GridPosition => {
  const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y) || 1;
  return { x: vector.x / mag, y: vector.y / mag };
};

const classPriority = (unit: UnitInstance): number => {
  if (unit.class === "giant") {
    return 3;
  }
  if (unit.class === "air") {
    return 2;
  }
  return 1;
};

const clonePosition = (position: GridPosition): GridPosition => ({ x: position.x, y: position.y });

export class CombatSimulator {
  private readonly config: CombatConfig;
  private readonly grid = new GridModel();
  private readonly events: SimEvent[] = [];
  private state: SimState;
  private readonly tps: number;

  constructor(
    private readonly data: DataBundle,
    private readonly rngService: RngService,
    config?: Partial<CombatConfig>
  ) {
    this.config = {
      tickMs: 50,
      retargetCooldownMs: 1500,
      blockedRetargetMs: 3000,
      wreckageDurationMs: 5000,
      saturationAccuracyPenalty: 0.1,
      saturationMinAccuracyMultiplier: 0.5,
      ...config
    };
    this.tps = 1000 / this.config.tickMs;
    this.state = { tick: 0, units: [], projectiles: [], wreckage: [] };
  }

  init(input: SimInput): void {
    this.rngService.setRoundSeed(input.round);
    const units: UnitInstance[] = [];

    for (const placement of input.placements) {
      const definition = this.data.units.find((unit) => unit.id === placement.unitId);
      if (!definition) {
        continue;
      }
      const facing = this.grid.orientFacing(placement.side, placement.orientation);
      const offsets = buildSquadOffsets(
        definition.stats.squadSize,
        definition.stats.collisionSize,
        facing
      );
      const level = Math.max(0, Math.min(3, placement.level ?? 0));
      const techs = placement.techs ?? [];
      offsets.forEach((offset, index) => {
        const id = `${placement.side}-${definition.id}-${placement.position.x}-${placement.position.y}-${index}`;
        units.push(
          this.buildUnit(
            definition,
            placement.position,
            facing,
            id,
            offset,
            placement.side,
            level,
            techs
          )
        );
      });
    }

    this.state = { tick: 0, units, projectiles: [], wreckage: [] };
  }

  private buildUnit(
    definition: UnitDefinition,
    position: GridPosition,
    orientation: Orientation,
    id: string,
    offset: GridPosition,
    side: UnitInstance["side"],
    level: number,
    techIds: string[]
  ): UnitInstance {
    const upgraded = applyUpgradeModifiers(definition.stats, level as 0 | 1 | 2 | 3);
    const techs = techIds
      .map((techId) => this.data.techs.find((tech) => tech.id === techId))
      .filter((tech): tech is NonNullable<typeof tech> => Boolean(tech));
    const finalStats = applyTechModifiers(upgraded, techs);

    return {
      id,
      definitionId: definition.id,
      side,
      class: definition.class,
      position: { x: position.x + offset.x, y: position.y + offset.y },
      orientation,
      hp: finalStats.hp,
      shield: finalStats.shield,
      stats: {
        maxHp: finalStats.hp,
        armor: finalStats.armor,
        maxShield: finalStats.shield,
        damage: finalStats.damage,
        attackType: finalStats.attackType,
        attackSpeed: finalStats.attackSpeed,
        range: finalStats.range,
        projectileSpeed: finalStats.projectileSpeed,
        turnSpeed: finalStats.turnSpeed,
        moveSpeed: finalStats.moveSpeed,
        collisionSize: finalStats.collisionSize,
        targeting: finalStats.targeting,
        squadSize: finalStats.squadSize,
        accuracy: finalStats.accuracy,
        aoeRadius: finalStats.aoeRadius,
        homing: finalStats.homing,
        resistances: finalStats.resistances,
        onHitEffects: finalStats.onHitEffects.map((effect) => ({
          type: effect.type,
          durationTicks: Math.round(effect.duration * this.tps),
          magnitude: effect.magnitude
        }))
      },
      attackCooldown: 0,
      retargetCooldown: 0,
      blockedTicks: 0,
      statusEffects: []
    };
  }

  step(tick: number): void {
    this.state.tick = tick;
    this.events.push({ tick, type: "tick", payload: { unitCount: this.state.units.length } });

    this.updateCooldowns();
    this.updateMovement();
    this.updateTargeting();
    this.updateFiring(tick);
    this.state.projectiles = updateProjectiles(
      this.state.projectiles,
      this.state.units,
      this.events,
      tick
    );
    this.updateStatus(tick);
    this.cleanupDead(tick);
    this.updateWreckage();
  }

  private updateCooldowns(): void {
    for (const unit of this.state.units) {
      unit.attackCooldown = Math.max(0, unit.attackCooldown - 1);
      unit.retargetCooldown = Math.max(0, unit.retargetCooldown - 1);
    }
  }

  private updateMovement(): void {
    for (const unit of this.sortedUnits()) {
      if (hasStatus(unit, "stun") || hasStatus(unit, "emp")) {
        continue;
      }
      const target = unit.targetId
        ? this.state.units.find((candidate) => candidate.id === unit.targetId)
        : undefined;
      const inRange = target && distance(unit.position, target.position) <= unit.stats.range;
      if (inRange) {
        continue;
      }
      const moveSpeed = unit.stats.moveSpeed * getMoveSpeedMultiplier(unit);
      if (moveSpeed <= 0) {
        continue;
      }

      const goal = target ? this.snapToGrid(target.position) : this.findClosestEnemyTile(unit);
      if (goal) {
        const path = findPath(this.snapToGrid(unit.position), goal, (pos) =>
          this.isBlocked(pos, unit)
        );
        unit.path = path;
      }

      if (!unit.path || unit.path.length <= 1) {
        continue;
      }

      const next = unit.path[1];
      const step = moveSpeed / this.tps;
      const toNext = distance(unit.position, next);
      const desired =
        toNext <= step
          ? { x: next.x, y: next.y }
          : {
              x: unit.position.x + ((next.x - unit.position.x) / toNext) * step,
              y: unit.position.y + ((next.y - unit.position.y) / toNext) * step
            };

      const blocked = this.collides(unit, desired);
      if (blocked) {
        unit.blockedTicks += 1;
        continue;
      }

      unit.blockedTicks = 0;
      unit.position = desired;
      if (toNext <= step) {
        unit.path = unit.path.slice(1);
      }
    }
  }

  private updateTargeting(): void {
    const blockedThreshold = Math.round((this.config.blockedRetargetMs / 1000) * this.tps);
    for (const unit of this.sortedUnits()) {
      if (unit.blockedTicks >= blockedThreshold) {
        unit.targetId = undefined;
        unit.retargetCooldown = 0;
        unit.blockedTicks = 0;
      }
      const current = unit.targetId
        ? this.state.units.find((candidate) => candidate.id === unit.targetId)
        : undefined;
      const valid = current && current.hp > 0 && current.side !== unit.side;
      if (valid && unit.retargetCooldown > 0) {
        continue;
      }
      const candidates = this.state.units.filter(
        (candidate) => candidate.side !== unit.side && candidate.hp > 0
      );
      const chosen = candidates.length ? selectTarget(unit, candidates) : undefined;
      unit.targetId = chosen?.id;
      if (chosen) {
        unit.retargetCooldown = Math.round((this.config.retargetCooldownMs / 1000) * this.tps);
      }
    }
  }

  private updateFiring(tick: number): void {
    const rng = this.rngService.stream(`fire-${tick}`);
    const targetCounts = new Map<string, number>();
    for (const unit of this.state.units) {
      if (!unit.targetId) {
        continue;
      }
      targetCounts.set(unit.targetId, (targetCounts.get(unit.targetId) ?? 0) + 1);
    }

    for (const unit of this.sortedUnits()) {
      if (hasStatus(unit, "stun") || hasStatus(unit, "emp")) {
        continue;
      }
      if (unit.attackCooldown > 0) {
        continue;
      }
      const target = unit.targetId
        ? this.state.units.find((candidate) => candidate.id === unit.targetId)
        : undefined;
      if (!target || target.hp <= 0) {
        continue;
      }
      const dist = distance(unit.position, target.position);
      if (dist > unit.stats.range) {
        continue;
      }
      const saturationCount = targetCounts.get(target.id) ?? 1;
      const saturationMultiplier = Math.max(
        this.config.saturationMinAccuracyMultiplier,
        1 - this.config.saturationAccuracyPenalty * (saturationCount - 1)
      );
      const accuracy = unit.stats.accuracy * saturationMultiplier;
      const hit = rollHit(unit, rng, accuracy);
      if (!hit) {
        this.events.push({
          tick,
          type: "miss",
          payload: { sourceId: unit.id, targetId: target.id }
        });
      } else if (unit.stats.projectileSpeed > 0) {
        const direction = normalize({
          x: target.position.x - unit.position.x,
          y: target.position.y - unit.position.y
        });
        const travelTicks = Math.max(1, Math.ceil(dist / unit.stats.projectileSpeed));
        this.state.projectiles.push({
          id: `${unit.id}-${tick}-proj`,
          sourceId: unit.id,
          targetId: target.id,
          position: clonePosition(unit.position),
          velocity: direction,
          speed: unit.stats.projectileSpeed / this.tps,
          damage: unit.stats.damage,
          attackType: unit.stats.attackType,
          aoeRadius: unit.stats.aoeRadius,
          homing: unit.stats.homing,
          remainingTicks: travelTicks,
          onHitEffects: unit.stats.onHitEffects
        });
      } else {
        applyDamage(
          target,
          unit.stats.damage,
          unit.stats.attackType,
          this.events,
          tick,
          getArmorMultiplier(target)
        );
        for (const effect of unit.stats.onHitEffects) {
          addStatusEffect(target, effect, unit.id, this.events, tick);
        }
      }

      unit.attackCooldown = Math.max(1, Math.round(this.tps / unit.stats.attackSpeed));
      this.events.push({
        tick,
        type: "attack",
        payload: { sourceId: unit.id, targetId: target.id }
      });
    }
  }

  private updateStatus(tick: number): void {
    for (const unit of this.state.units) {
      tickStatusEffects(unit, this.events, tick);
    }
  }

  private cleanupDead(tick: number): void {
    const survivors: UnitInstance[] = [];
    for (const unit of this.state.units) {
      if (unit.hp > 0) {
        survivors.push(unit);
        continue;
      }
      this.events.push({ tick, type: "death", payload: { unitId: unit.id } });
      this.state.wreckage.push({
        id: `wreck-${unit.id}-${tick}`,
        position: clonePosition(unit.position),
        radius: unit.stats.collisionSize,
        remainingTicks: Math.round((this.config.wreckageDurationMs / 1000) * this.tps)
      });
    }
    this.state.units = survivors;
  }

  private updateWreckage(): void {
    for (const wreck of this.state.wreckage) {
      wreck.remainingTicks = Math.max(0, wreck.remainingTicks - 1);
    }
    this.state.wreckage = this.state.wreckage.filter((wreck) => wreck.remainingTicks > 0);
  }

  private collides(unit: UnitInstance, desired: GridPosition): boolean {
    if (unit.class === "air") {
      return false;
    }
    for (const other of this.state.units) {
      if (other.id === unit.id || other.class === "air") {
        continue;
      }
      const dist = distance(desired, other.position);
      const overlap = dist < unit.stats.collisionSize + other.stats.collisionSize;
      if (!overlap) {
        continue;
      }
      return true;
    }

    for (const wreck of this.state.wreckage) {
      const dist = distance(desired, wreck.position);
      if (dist < unit.stats.collisionSize + wreck.radius) {
        return true;
      }
    }

    return false;
  }

  private isBlocked(position: GridPosition, unit: UnitInstance): boolean {
    if (!this.grid.isInBounds(position)) {
      return true;
    }
    if (unit.class === "air") {
      return false;
    }
    for (const other of this.state.units) {
      if (other.id === unit.id || other.class === "air") {
        continue;
      }
      const tile = this.snapToGrid(other.position);
      if (tile.x === position.x && tile.y === position.y) {
        return true;
      }
    }
    for (const wreck of this.state.wreckage) {
      const tile = this.snapToGrid(wreck.position);
      if (tile.x === position.x && tile.y === position.y) {
        return true;
      }
    }
    return false;
  }

  private snapToGrid(position: GridPosition): GridPosition {
    return { x: Math.round(position.x), y: Math.round(position.y) };
  }

  private findClosestEnemyTile(unit: UnitInstance): GridPosition | undefined {
    let best: UnitInstance | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const enemy of this.state.units) {
      if (enemy.side === unit.side) {
        continue;
      }
      const dist = distance(unit.position, enemy.position);
      if (dist < bestDistance) {
        bestDistance = dist;
        best = enemy;
      }
    }
    return best ? this.snapToGrid(best.position) : undefined;
  }

  private sortedUnits(): UnitInstance[] {
    return [...this.state.units].sort((a, b) => {
      const priorityDelta = classPriority(b) - classPriority(a);
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
      return a.id.localeCompare(b.id);
    });
  }

  getState(): SimState {
    return this.state;
  }

  getEvents(): SimEvent[] {
    return this.events;
  }
}
