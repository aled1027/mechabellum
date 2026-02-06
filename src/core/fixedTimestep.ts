export type FixedUpdate = (deltaMs: number, tick: number) => void;

export class FixedTimestepLoop {
  private readonly stepMs: number;
  private accumulator = 0;
  private tick = 0;

  constructor(stepMs: number) {
    if (stepMs <= 0) {
      throw new Error("stepMs must be > 0");
    }
    this.stepMs = stepMs;
  }

  advance(deltaMs: number, onUpdate: FixedUpdate): void {
    this.accumulator += deltaMs;
    while (this.accumulator >= this.stepMs) {
      this.tick += 1;
      onUpdate(this.stepMs, this.tick);
      this.accumulator -= this.stepMs;
    }
  }

  runTicks(ticks: number, onUpdate: FixedUpdate): void {
    for (let i = 0; i < ticks; i += 1) {
      this.tick += 1;
      onUpdate(this.stepMs, this.tick);
    }
  }

  getTick(): number {
    return this.tick;
  }

  getStepMs(): number {
    return this.stepMs;
  }
}
