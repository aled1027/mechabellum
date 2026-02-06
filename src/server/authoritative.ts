import type { DataBundle } from "../data/schemas.js";
import { GridModel } from "../grid/grid.js";
import { FixedTimestepLoop } from "../core/fixedTimestep.js";
import { RngService } from "../core/rng.js";
import type { SimEvent, SimInput, SimState, UnitInstance } from "../sim/types.js";

export interface MatchConfig {
  tickMs: number;
  maxTicks: number;
}

export class ServerAuthoritativeSim {
  private readonly grid = new GridModel();
  private readonly loop: FixedTimestepLoop;
  private readonly rngService: RngService;
  private state: SimState;
  private readonly events: SimEvent[] = [];
  private readonly config: MatchConfig;

  constructor(private readonly data: DataBundle, seed: number, config?: Partial<MatchConfig>) {
    this.config = {
      tickMs: 50,
      maxTicks: 1800,
      ...config
    };
    this.loop = new FixedTimestepLoop(this.config.tickMs);
    this.rngService = new RngService(seed);
    this.state = { tick: 0, units: [] };
  }

  applyInput(input: SimInput): void {
    this.rngService.setRoundSeed(input.round);
    const units: UnitInstance[] = [];
    for (const placement of input.placements) {
      const definition = this.data.units.find((unit) => unit.id === placement.unitId);
      if (!definition) {
        continue;
      }
      units.push({
        id: `${placement.side}-${placement.unitId}-${placement.position.x}-${placement.position.y}`,
        definitionId: definition.id,
        side: placement.side,
        position: placement.position,
        orientation: placement.orientation,
        hp: definition.stats.hp
      });
    }
    this.state.units = units;
  }

  step(): void {
    const updates = (deltaMs: number, tick: number) => {
      this.state.tick = tick;
      this.events.push({
        tick,
        type: "tick",
        payload: { deltaMs, unitCount: this.state.units.length }
      });
      for (const unit of this.state.units) {
        unit.position = {
          x: Math.min(GridModel.width - 1, unit.position.x + 1),
          y: unit.position.y
        };
      }
    };

    this.loop.advance(this.config.tickMs, updates);
  }

  run(): void {
    const updates = (deltaMs: number, tick: number) => {
      this.state.tick = tick;
      this.events.push({
        tick,
        type: "tick",
        payload: { deltaMs, unitCount: this.state.units.length }
      });
      for (const unit of this.state.units) {
        unit.position = {
          x: Math.min(GridModel.width - 1, unit.position.x + 1),
          y: unit.position.y
        };
      }
    };

    this.loop.runTicks(this.config.maxTicks, updates);
  }

  getState(): SimState {
    return this.state;
  }

  getEvents(): SimEvent[] {
    return this.events;
  }
}
