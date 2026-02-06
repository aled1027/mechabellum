export class FixedTimestepLoop {
    stepMs;
    accumulator = 0;
    tick = 0;
    constructor(stepMs) {
        if (stepMs <= 0) {
            throw new Error("stepMs must be > 0");
        }
        this.stepMs = stepMs;
    }
    advance(deltaMs, onUpdate) {
        this.accumulator += deltaMs;
        while (this.accumulator >= this.stepMs) {
            this.tick += 1;
            onUpdate(this.stepMs, this.tick);
            this.accumulator -= this.stepMs;
        }
    }
    runTicks(ticks, onUpdate) {
        for (let i = 0; i < ticks; i += 1) {
            this.tick += 1;
            onUpdate(this.stepMs, this.tick);
        }
    }
    getTick() {
        return this.tick;
    }
    getStepMs() {
        return this.stepMs;
    }
}
