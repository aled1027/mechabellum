import { describe, expect, it } from "vitest";
import { FixedTimestepLoop } from "../../src/core/fixedTimestep.js";

describe("FixedTimestepLoop", () => {
  it("advances ticks when the accumulator crosses the step", () => {
    const loop = new FixedTimestepLoop(50);
    const ticks: number[] = [];

    loop.advance(10, (_, tick) => ticks.push(tick));
    expect(ticks).toHaveLength(0);

    loop.advance(40, (_, tick) => ticks.push(tick));
    loop.advance(100, (_, tick) => ticks.push(tick));

    expect(ticks).toEqual([1, 2, 3]);
    expect(loop.getTick()).toBe(3);
  });

  it("runs a fixed number of ticks", () => {
    const loop = new FixedTimestepLoop(20);
    const ticks: number[] = [];
    loop.runTicks(2, (_, tick) => ticks.push(tick));
    expect(ticks).toEqual([1, 2]);
  });

  it("throws for invalid step sizes", () => {
    expect(() => new FixedTimestepLoop(0)).toThrow("stepMs must be > 0");
  });
});
