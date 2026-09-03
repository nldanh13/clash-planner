/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% reproducible base layouts from seeds.
 */

export class PRNG {
  private state: number;
  private readonly initialSeed: number;

  constructor(seed?: number | string) {
    if (typeof seed === "string") {
      this.initialSeed = PRNG.hashString(seed);
    } else if (typeof seed === "number" && Number.isFinite(seed)) {
      this.initialSeed = Math.floor(Math.abs(seed)) >>> 0;
    } else {
      this.initialSeed = Math.floor(Math.random() * 0x7fffffff) >>> 0;
    }
    this.state = this.initialSeed;
  }

  private static hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  public getSeed(): number {
    return this.initialSeed;
  }

  /**
   * Returns a pseudo-random float in [0, 1)
   */
  public next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max] inclusive
   */
  public nextInt(min: number, max: number): number {
    if (min >= max) return min;
    const range = max - min + 1;
    return min + Math.floor(this.next() * range);
  }

  /**
   * Selects a random element from an array
   */
  public choice<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error("PRNG: Cannot choose from an empty array");
    }
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  /**
   * Shuffles an array in-place or returns a copy
   */
  public shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * Creates a child PRNG with a derived seed
   */
  public fork(delta: number = 1): PRNG {
    const nextSeed = (this.initialSeed + Math.imul(delta, 1013904223)) >>> 0;
    return new PRNG(nextSeed);
  }
}
