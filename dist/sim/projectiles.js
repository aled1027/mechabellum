import { applyDamage } from "./damage.js";
import { addStatusEffect, getArmorMultiplier } from "./status.js";
const distance = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};
const normalize = (vector) => {
  const mag = Math.sqrt(vector.x * vector.x + vector.y * vector.y) || 1;
  return { x: vector.x / mag, y: vector.y / mag };
};
export const updateProjectiles = (projectiles, units, events, tick) => {
  const next = [];
  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  for (const projectile of projectiles) {
    projectile.remainingTicks = Math.max(0, projectile.remainingTicks - 1);
    if (projectile.remainingTicks <= 0) {
      continue;
    }
    let target;
    if (projectile.targetId) {
      target = unitMap.get(projectile.targetId);
    }
    if (projectile.homing && target) {
      const direction = normalize({
        x: target.position.x - projectile.position.x,
        y: target.position.y - projectile.position.y
      });
      projectile.velocity = direction;
    }
    projectile.position = {
      x: projectile.position.x + projectile.velocity.x * projectile.speed,
      y: projectile.position.y + projectile.velocity.y * projectile.speed
    };
    const hitTarget = target && distance(projectile.position, target.position) <= 0.4;
    if (hitTarget || projectile.remainingTicks <= 0) {
      const impactedUnits =
        projectile.aoeRadius > 0
          ? units.filter(
              (unit) => distance(unit.position, projectile.position) <= projectile.aoeRadius
            )
          : target
            ? [target]
            : [];
      for (const impacted of impactedUnits) {
        applyDamage(
          impacted,
          projectile.damage,
          projectile.attackType,
          events,
          tick,
          getArmorMultiplier(impacted)
        );
        for (const effect of projectile.onHitEffects) {
          addStatusEffect(impacted, effect, projectile.sourceId, events, tick);
        }
      }
      events.push({
        tick,
        type: "projectile_impact",
        payload: { projectileId: projectile.id, impacted: impactedUnits.map((unit) => unit.id) }
      });
      continue;
    }
    next.push(projectile);
  }
  return next;
};
