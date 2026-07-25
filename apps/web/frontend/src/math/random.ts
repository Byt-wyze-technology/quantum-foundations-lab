/**
 * Seeded pseudo-random numbers.
 *
 * §19 requires deterministic seeds so a classroom demonstration can be
 * reproduced exactly. `mulberry32` is small, fast and adequate for sampling
 * teaching statistics; it is not a cryptographic generator and nothing here
 * depends on it being one.
 */

export type RandomSource = () => number;

export const mulberry32 = (seed: number): RandomSource => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/** A source seeded from the clock, for when reproducibility is not requested. */
export const systemRandom = (): RandomSource => Math.random;
