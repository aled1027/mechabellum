import type { DataBundle } from "../data/schemas.js";
import { FixedTimestepLoop } from "../core/fixedTimestep.js";
import { RngService } from "../core/rng.js";
import type { SimEvent, SimInput, SimState } from "../sim/types.js";
import { CombatSimulator } from "../sim/combat.js";

export interface MatchConfig {
  tickMs: number;
  maxTicks: number;
}

export class ServerAuthoritativeSim {
  private readonly loop: FixedTimestepLoop;
  private readonly rngService: RngService;
  private readonly combat: CombatSimulator;
  private readonly config: MatchConfig;

  constructor(
    private readonly data: DataBundle,
    seed: number,
    config?: Partial<MatchConfig>
  ) {
    this.config = {
      tickMs: 50,
      maxTicks: 1800,
      ...config
    };
    this.loop = new FixedTimestepLoop(this.config.tickMs);
    this.rngService = new RngService(seed);
    this.combat = new CombatSimulator(this.data, this.rngService, { tickMs: this.config.tickMs });
  }

  applyInput(input: SimInput): void {
    this.combat.init(input);
  }

  step(): void {
    this.loop.advance(this.config.tickMs, (_, tick) => {
      this.combat.step(tick);
    });
  }

  run(): void {
    this.runTicks(this.config.maxTicks);
  }

  runTicks(ticks: number): void {
    this.loop.runTicks(ticks, (_, tick) => {
      this.combat.step(tick);
    });
  }

  getState(): SimState {
    return this.combat.getState();
  }

  getEvents(): SimEvent[] {
    return this.combat.getEvents();
  }
}
