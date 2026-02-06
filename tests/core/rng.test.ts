import { describe, expect, it } from "vitest";
import { DeterministicRng, RngService } from "../../src/core/rng.js";

describe("DeterministicRng", () => {
  it("repeats sequence for the same seed", () => {
    const first = new DeterministicRng(123);
    const second = new DeterministicRng(123);
    const firstSeq = [first.nextUint32(), first.nextUint32(), first.nextUint32()];
    const secondSeq = [second.nextUint32(), second.nextUint32(), second.nextUint32()];
    expect(firstSeq).toEqual(secondSeq);
  });

  it("validates ranges", () => {
    const rng = new DeterministicRng(1);
    expect(() => rng.nextInt(0)).toThrow("maxExclusive must be > 0");
    expect(() => rng.nextRange(5, 5)).toThrow("maxExclusive must be > minInclusive");
  });

  it("forks deterministically", () => {
    const rng = new DeterministicRng(42);
    const forkA = rng.fork("alpha");
    const forkB = rng.fork("alpha");
    expect(forkA.nextUint32()).toEqual(forkB.nextUint32());
  });
});

describe("RngService", () => {
  it("produces deterministic streams per round", () => {
    const service = new RngService(99);
    service.setRoundSeed(3);
    const a = service.stream("attack").nextUint32();
    const b = service.stream("attack").nextUint32();
    expect(a).toEqual(b);
  });

  it("changes streams across rounds", () => {
    const service = new RngService(99);
    service.setRoundSeed(1);
    const first = service.stream("attack").nextUint32();
    service.setRoundSeed(2);
    const second = service.stream("attack").nextUint32();
    expect(first).not.toEqual(second);
  });
});
