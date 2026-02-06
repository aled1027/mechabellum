import { z } from "zod";

export const AttackTypeSchema = z.enum(["kinetic", "explosive", "energy", "flame", "emp"]);
export const TargetingFlagsSchema = z.enum(["ground", "air", "both"]);
export const UnitClassSchema = z.enum(["squad", "giant", "air"]);
export const StatusEffectTypeSchema = z.enum(["emp", "stun", "burn", "slow", "mark"]);

export const OnHitEffectSchema = z.object({
  type: StatusEffectTypeSchema,
  duration: z.number().positive(),
  magnitude: z.number().default(1)
});

export const UnitStatsSchema = z.object({
  hp: z.number().positive(),
  armor: z.number().nonnegative().default(0),
  shield: z.number().nonnegative().default(0),
  damage: z.number().nonnegative(),
  attackType: AttackTypeSchema,
  attackSpeed: z.number().positive(),
  range: z.number().nonnegative(),
  projectileSpeed: z.number().nonnegative().default(0),
  turnSpeed: z.number().nonnegative().default(0),
  moveSpeed: z.number().nonnegative(),
  collisionSize: z.number().positive(),
  targeting: TargetingFlagsSchema.default("ground"),
  squadSize: z.number().int().positive().default(1),
  accuracy: z.number().min(0).max(1).default(1),
  aoeRadius: z.number().nonnegative().default(0),
  homing: z.boolean().default(false),
  resistances: z.record(AttackTypeSchema, z.number()).default({}),
  onHitEffects: z.array(OnHitEffectSchema).default([])
});

export const UnitSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tier: z.number().int().min(1).max(3),
  role: z.string().min(1),
  class: UnitClassSchema,
  cost: z.number().int().nonnegative(),
  stats: UnitStatsSchema,
  tags: z.array(z.string()).default([])
});

export const TechSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  branch: z.string().min(1).optional(),
  cost: z.number().int().nonnegative().optional(),
  maxLevel: z.number().int().min(1).max(3).default(1),
  modifiers: z.record(z.string(), z.number()).default({})
});

export const TriggerSchema = z.enum([
  "round_start",
  "round_end",
  "planning_start",
  "planning_end",
  "combat_start",
  "combat_end",
  "unit_death",
  "unit_spawn",
  "damage_taken"
]);

export const EffectKindSchema = z.enum(["credits", "unit-stat"]);

export const EffectSchema = z.object({
  kind: EffectKindSchema,
  amount: z.number(),
  stat: z.string().optional(),
  mode: z.enum(["add", "mul"]).default("add"),
  targetTag: z.string().optional(),
  targetClass: UnitClassSchema.optional()
});

export const CardSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rarity: z.enum(["common", "rare", "epic", "legendary"]),
  description: z.string().min(1),
  type: z.enum(["instant", "timed", "triggered"]),
  trigger: TriggerSchema.optional(),
  durationMs: z.number().positive().optional(),
  cooldownGroup: z.string().optional(),
  cooldownRounds: z.number().int().nonnegative().optional(),
  cost: z.number().int().nonnegative().optional(),
  effects: z.array(EffectSchema).default([])
});

export const SpecialistPassiveSchema = z.object({
  trigger: TriggerSchema,
  effects: z.array(EffectSchema).default([])
});

export const SpecialistActiveSchema = z.object({
  trigger: TriggerSchema,
  cooldownMs: z.number().int().nonnegative().default(0),
  maxActivationsPerRound: z.number().int().min(1).default(1),
  effects: z.array(EffectSchema).default([])
});

export const SpecialistLevelSchema = z.object({
  level: z.number().int().min(1).max(3),
  unlockRound: z.number().int().positive(),
  passives: z.array(SpecialistPassiveSchema).default([]),
  active: SpecialistActiveSchema.optional()
});

export const SpecialistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  class: z.enum(["elite", "supply", "tactical"]),
  levels: z.array(SpecialistLevelSchema)
});

export const DataBundleSchema = z.object({
  units: z.array(UnitSchema),
  techs: z.array(TechSchema),
  cards: z.array(CardSchema),
  specialists: z.array(SpecialistSchema)
});

export type AttackType = z.infer<typeof AttackTypeSchema>;
export type TargetingFlags = z.infer<typeof TargetingFlagsSchema>;
export type UnitClass = z.infer<typeof UnitClassSchema>;
export type StatusEffectType = z.infer<typeof StatusEffectTypeSchema>;
export type TriggerType = z.infer<typeof TriggerSchema>;
export type EffectKind = z.infer<typeof EffectKindSchema>;
export type EffectDefinition = z.infer<typeof EffectSchema>;
export type CardDefinition = z.infer<typeof CardSchema>;
export type SpecialistDefinition = z.infer<typeof SpecialistSchema>;
export type UnitDefinition = z.infer<typeof UnitSchema>;
export type TechDefinition = z.infer<typeof TechSchema>;
export type DataBundle = z.infer<typeof DataBundleSchema>;
