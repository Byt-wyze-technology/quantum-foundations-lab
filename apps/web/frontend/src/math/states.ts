/**
 * State vectors, Bloch angles and global phase.
 *
 * A direct mirror of `quantum_foundations/core/states.py` (§5.2). The Python
 * core remains the reference implementation; `tests/integration` checks that
 * the two agree numerically (§21).
 *
 *     |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
 */

import {
  type Complex,
  complex,
  conjugate,
  expI,
  magnitudeSquared,
  multiply,
  normalizeAngle,
  phase,
  scale,
} from "./complex";
import { NORMALIZATION_ATOL } from "./tolerances";

export type StateVector = Complex[];

export type QubitAngles = {
  theta: number;
  phi: number;
};

export type BlochVector = {
  x: number;
  y: number;
  z: number;
};

const SQRT_HALF = Math.SQRT1_2;

export const ket0 = (): StateVector => [complex(1), complex(0)];
export const ket1 = (): StateVector => [complex(0), complex(1)];
export const ketPlus = (): StateVector => [complex(SQRT_HALF), complex(SQRT_HALF)];
export const ketMinus = (): StateVector => [complex(SQRT_HALF), complex(-SQRT_HALF)];
export const ketPlusI = (): StateVector => [complex(SQRT_HALF), complex(0, SQRT_HALF)];
export const ketMinusI = (): StateVector => [complex(SQRT_HALF), complex(0, -SQRT_HALF)];

/** ⟨ψ|ψ⟩, always real for a state vector. */
export const norm = (state: StateVector): number =>
  Math.sqrt(state.reduce((total, amplitude) => total + magnitudeSquared(amplitude), 0));

export const normalizeState = (state: StateVector): StateVector => {
  const length = norm(state);
  if (length === 0) throw new Error("A zero vector cannot be normalised into a quantum state.");
  return state.map((amplitude) => scale(amplitude, 1 / length));
};

export const isNormalized = (state: StateVector, atol = NORMALIZATION_ATOL): boolean =>
  Math.abs(norm(state) - 1) <= atol;

export const qubitCountOf = (state: StateVector): number => Math.log2(state.length);

export const qubitFromAngles = (theta: number, phi: number): StateVector => [
  complex(Math.cos(theta / 2)),
  scale(expI(phi), Math.sin(theta / 2)),
];

/**
 * Recover Bloch angles from a pure one-qubit state.
 *
 * Invariant under global phase. At the poles φ is degenerate and reported as 0.
 */
export const anglesFromQubit = (state: StateVector): QubitAngles => {
  if (state.length !== 2) throw new Error("Bloch angles are defined for one-qubit states.");
  const [alpha, beta] = state as [Complex, Complex];
  const alphaMagnitude = Math.min(1, Math.max(0, Math.sqrt(magnitudeSquared(alpha))));
  const theta = 2 * Math.acos(alphaMagnitude);
  const degenerate = alphaMagnitude < 1e-12 || magnitudeSquared(beta) < 1e-24;
  const phi = degenerate ? 0 : normalizeAngle(phase(beta) - phase(alpha));
  return { theta, phi };
};

/** Cartesian Bloch coordinates of a *pure one-qubit* state (§21). */
export const blochVector = (state: StateVector): BlochVector => {
  const { theta, phi } = anglesFromQubit(state);
  return {
    x: Math.sin(theta) * Math.cos(phi),
    y: Math.sin(theta) * Math.sin(phi),
    z: Math.cos(theta),
  };
};

/** Bloch coordinates from angles, without building the state first. */
export const blochVectorFromAngles = (theta: number, phi: number): BlochVector => ({
  x: Math.sin(theta) * Math.cos(phi),
  y: Math.sin(theta) * Math.sin(phi),
  z: Math.cos(theta),
});

export const probabilities = (state: StateVector): number[] =>
  state.map((amplitude) => magnitudeSquared(amplitude));

/** ⟨left|right⟩ */
export const innerProduct = (left: StateVector, right: StateVector): Complex => {
  if (left.length !== right.length) throw new Error("Cannot overlap states of different lengths.");
  return left.reduce(
    (total, amplitude, index) => {
      const term = multiply(conjugate(amplitude), right[index]!);
      return { re: total.re + term.re, im: total.im + term.im };
    },
    { re: 0, im: 0 },
  );
};

/**
 * Rotate `state` so that ⟨reference|state⟩ is real and non-negative.
 *
 * Keeps an animated Bloch arrow steady when a gate introduces an unobservable
 * phase, and makes two states directly comparable component by component.
 */
export const globalPhaseAlign = (reference: StateVector, state: StateVector): StateVector => {
  const overlap = innerProduct(reference, state);
  if (Math.hypot(overlap.re, overlap.im) < 1e-15) return state;
  const correction = expI(-phase(overlap));
  return state.map((amplitude) => multiply(amplitude, correction));
};

/** True when two normalised states differ only by an unobservable global phase. */
export const equivalentUpToGlobalPhase = (
  left: StateVector,
  right: StateVector,
  atol = 1e-10,
): boolean => {
  if (left.length !== right.length) return false;
  const overlap = innerProduct(left, right);
  return Math.abs(Math.hypot(overlap.re, overlap.im) - 1) <= atol;
};

/** A uniformly random pure one-qubit state, for the "Random pure qubit" preset (§9). */
export const randomPureQubit = (random: () => number = Math.random): StateVector => {
  const theta = Math.acos(1 - 2 * random());
  const phi = 2 * Math.PI * random();
  return qubitFromAngles(theta, phi);
};
