/**
 * Hermitian observables for one qubit.
 *
 * Mirrors `quantum_foundations/core/observables.py` (§5.6). Observables are
 * kept separate from gates: a gate is unitary and evolves a state, an
 * observable is Hermitian and says what a device can read.
 *
 * Every 2×2 Hermitian matrix can be written
 *
 *     A = c₀I + r·σ,   c₀ = tr(A)/2,   r ∈ ℝ³
 *
 * so its eigenvalues are c₀ ± |r| and its eigenvectors are those of σ_n̂ with
 * n̂ = r/|r|. That gives an exact spectrum in closed form — no numerical
 * diagonalisation, and no eigenvector that wobbles as a slider moves.
 */

import { type Complex, magnitudeSquared } from "./complex";
import { type Matrix, X, Y, Z, addMatrices, identityMatrix, scaleMatrix } from "./gates";
import { type MeasurementAxis, axisEigenstates } from "./measurement";
import { type StateVector, innerProduct } from "./states";

export type HermitianDecomposition = {
  /** The identity component, c₀ = tr(A)/2. */
  offset: number;
  /** The Pauli components (r_x, r_y, r_z). */
  vector: { x: number; y: number; z: number };
  /** |r| — zero exactly when A is a multiple of the identity. */
  length: number;
};

export const decomposeHermitian = (matrix: Matrix): HermitianDecomposition => {
  const a = matrix[0]![0]!;
  const b = matrix[0]![1]!;
  const c = matrix[1]![0]!;
  const d = matrix[1]![1]!;
  const offset = (a.re + d.re) / 2;
  const vector = {
    x: (b.re + c.re) / 2,
    y: (b.im - c.im) / -2,
    z: (a.re - d.re) / 2,
  };
  return { offset, vector, length: Math.hypot(vector.x, vector.y, vector.z) };
};

export type ObservableOutcome = {
  eigenvalue: number;
  probability: number;
  eigenstate: StateVector;
  /** The Bloch direction the eigenstate points along, for drawing. */
  axis: MeasurementAxis;
};

const axisFromVector = (vector: { x: number; y: number; z: number }): MeasurementAxis => {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  const theta = Math.acos(Math.min(1, Math.max(-1, vector.z / length)));
  const phi = Math.atan2(vector.y, vector.x);
  return { theta, phi: phi < 0 ? phi + 2 * Math.PI : phi };
};

/**
 * The possible readings of `observable` on `state`, with their probabilities
 * and the states that give each reading with certainty.
 *
 * A degenerate observable (a multiple of the identity) has one outcome, which
 * every state returns with certainty.
 */
export const observableOutcomes = (
  observable: Matrix,
  state: StateVector,
): ObservableOutcome[] => {
  const { offset, vector, length } = decomposeHermitian(observable);
  if (length < 1e-12) {
    return [
      {
        eigenvalue: offset,
        probability: 1,
        eigenstate: state,
        axis: { theta: 0, phi: 0 },
      },
    ];
  }
  const axis = axisFromVector(vector);
  const { plus, minus } = axisEigenstates(axis);
  const plusProbability = magnitudeSquared(innerProduct(plus, state));
  const minusProbability = magnitudeSquared(innerProduct(minus, state));
  const total = plusProbability + minusProbability;
  return [
    {
      eigenvalue: offset + length,
      probability: plusProbability / total,
      eigenstate: plus,
      axis,
    },
    {
      eigenvalue: offset - length,
      probability: minusProbability / total,
      eigenstate: minus,
      axis: axisFromVector({ x: -vector.x, y: -vector.y, z: -vector.z }),
    },
  ];
};

/** ⟨A⟩ = ⟨ψ|A|ψ⟩ = Σ pᵢ λᵢ. */
export const expectationValue = (observable: Matrix, state: StateVector): number =>
  observableOutcomes(observable, state).reduce(
    (total, outcome) => total + outcome.eigenvalue * outcome.probability,
    0,
  );

/** (ΔA)² = ⟨A²⟩ − ⟨A⟩², clamped at zero against floating-point noise. */
export const variance = (observable: Matrix, state: StateVector): number => {
  const outcomes = observableOutcomes(observable, state);
  const mean = outcomes.reduce((total, o) => total + o.eigenvalue * o.probability, 0);
  const meanOfSquare = outcomes.reduce(
    (total, o) => total + o.eigenvalue ** 2 * o.probability,
    0,
  );
  return Math.max(0, meanOfSquare - mean ** 2);
};

/** σ_n = n_x X + n_y Y + n_z Z for a unit vector n. */
export const spinObservable = (direction: { x: number; y: number; z: number }): Matrix =>
  addMatrices(
    addMatrices(scaleMatrix(X, direction.x), scaleMatrix(Y, direction.y)),
    scaleMatrix(Z, direction.z),
  );

export const isHermitianMatrix = (matrix: Matrix, atol = 1e-10): boolean => {
  const conjugateEqual = (left: Complex, right: Complex) =>
    Math.abs(left.re - right.re) <= atol && Math.abs(left.im + right.im) <= atol;
  return (
    Math.abs(matrix[0]![0]!.im) <= atol &&
    Math.abs(matrix[1]![1]!.im) <= atol &&
    conjugateEqual(matrix[0]![1]!, matrix[1]![0]!)
  );
};

export const IDENTITY_2 = identityMatrix(2);
