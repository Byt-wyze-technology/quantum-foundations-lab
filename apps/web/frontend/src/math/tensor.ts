/**
 * Tensor products and computational basis labels.
 *
 * Mirrors `quantum_foundations/core/tensor.py` (§5.4) and uses the same
 * ordering convention: basis labels are written q₀q₁…q_{n-1} with q₀ the most
 * significant displayed bit, and the Kronecker product matches, so
 * `tensorProduct(ket0(), ket1())` equals `computationalBasisState("01")`.
 */

import { type Complex, complex, multiply } from "./complex";
import type { StateVector } from "./states";

/** Kronecker product of two state vectors, left-most operand most significant. */
export const tensorProduct = (left: StateVector, right: StateVector): StateVector => {
  const result: StateVector = [];
  for (const a of left) {
    for (const b of right) {
      result.push(multiply(a, b));
    }
  }
  return result;
};

export const tensorProductAll = (...states: StateVector[]): StateVector => {
  if (states.length === 0) throw new Error("A tensor product requires at least one operand.");
  return states.reduce((accumulated, next) => tensorProduct(accumulated, next));
};

export const computationalBasisState = (bits: string): StateVector => {
  if (bits.length === 0 || [...bits].some((bit) => bit !== "0" && bit !== "1")) {
    throw new Error(`A basis label must be a non-empty string of 0s and 1s; received "${bits}".`);
  }
  const dimension = 2 ** bits.length;
  const index = Number.parseInt(bits, 2);
  return Array.from({ length: dimension }, (_, position): Complex =>
    complex(position === index ? 1 : 0),
  );
};

/** Ordered basis labels for a `qubitCount`-qubit system, q₀ leading. */
export const basisLabels = (qubitCount: number): string[] =>
  Array.from({ length: 2 ** qubitCount }, (_, index) =>
    index.toString(2).padStart(qubitCount, "0"),
  );

/**
 * View a state as a matrix splitting the first `leftQubits` from the rest.
 *
 * The state is a product state across the cut exactly when this matrix has
 * rank one, which is how `isProductState` decides the question.
 */
export const reshapeStateForSubsystems = (
  state: StateVector,
  leftQubits: number,
): Complex[][] => {
  const qubitCount = Math.log2(state.length);
  if (leftQubits < 1 || leftQubits >= qubitCount) {
    throw new Error("The split must leave qubits on both sides.");
  }
  const columns = 2 ** (qubitCount - leftQubits);
  return Array.from({ length: 2 ** leftQubits }, (_, row) =>
    Array.from({ length: columns }, (_, column) => state[row * columns + column]!),
  );
};
