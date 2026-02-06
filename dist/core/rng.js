const UINT32_MAX = 0xffffffff;
const fnv1a = (input) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};
export class DeterministicRng {
  state;
  constructor(seed) {
    this.state = seed >>> 0;
  }
  nextUint32() {
    // xorshift32
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }
  nextFloat() {
    return this.nextUint32() / (UINT32_MAX + 1);
  }
  nextInt(maxExclusive) {
    if (maxExclusive <= 0) {
      throw new Error("maxExclusive must be > 0");
    }
    return Math.floor(this.nextFloat() * maxExclusive);
  }
  nextRange(minInclusive, maxExclusive) {
    if (maxExclusive <= minInclusive) {
      throw new Error("maxExclusive must be > minInclusive");
    }
    return minInclusive + this.nextInt(maxExclusive - minInclusive);
  }
  fork(key) {
    const keyHash = fnv1a(key);
    return new DeterministicRng((this.state ^ keyHash) >>> 0);
  }
  static fromString(seed) {
    return new DeterministicRng(fnv1a(seed));
  }
}
export class RngService {
  roundSeed;
  baseSeed;
  constructor(baseSeed) {
    this.baseSeed = baseSeed >>> 0;
    this.roundSeed = this.baseSeed;
  }
  setRoundSeed(round) {
    this.roundSeed = (this.baseSeed ^ (round * 0x9e3779b9)) >>> 0;
  }
  stream(name) {
    const streamSeed = (this.roundSeed ^ fnv1a(name)) >>> 0;
    return new DeterministicRng(streamSeed);
  }
}
