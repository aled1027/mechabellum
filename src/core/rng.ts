export interface RngStream {
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
  nextRange(minInclusive: number, maxExclusive: number): number;
}

const UINT32_MAX = 0xffffffff;

const fnv1a = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

export class DeterministicRng implements RngStream {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  nextUint32(): number {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }

  nextFloat(): number {
    return this.nextUint32() / (UINT32_MAX + 1);
  }

  nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      throw new Error("maxExclusive must be > 0");
    }
    return Math.floor(this.nextFloat() * maxExclusive);
  }

  nextRange(minInclusive: number, maxExclusive: number): number {
    if (maxExclusive <= minInclusive) {
      throw new Error("maxExclusive must be > minInclusive");
    }
    return minInclusive + this.nextInt(maxExclusive - minInclusive);
  }

  fork(key: string): DeterministicRng {
    const keyHash = fnv1a(key);
    return new DeterministicRng((this.state ^ keyHash) >>> 0);
  }

  static fromString(seed: string): DeterministicRng {
    return new DeterministicRng(fnv1a(seed));
  }
}

export const computeRoundSeed = (baseSeed: number, round: number): number => {
  return (baseSeed ^ (round * 0x9e3779b9)) >>> 0;
};

export class RngService {
  private roundSeed: number;
  private readonly baseSeed: number;

  constructor(baseSeed: number) {
    this.baseSeed = baseSeed >>> 0;
    this.roundSeed = this.baseSeed;
  }

  setRoundSeed(round: number): void {
    this.roundSeed = computeRoundSeed(this.baseSeed, round);
  }

  stream(name: string): DeterministicRng {
    const streamSeed = (this.roundSeed ^ fnv1a(name)) >>> 0;
    return new DeterministicRng(streamSeed);
  }
}
