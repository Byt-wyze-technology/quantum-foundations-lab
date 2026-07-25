/**
 * Unitary gates, rotation constructors and gate application.
 *
 * Mirrors `quantum_foundations/core/gates.py` (§5.3), including the qubit
 * ordering of §5.4: q₀ is the most significant bit of a basis label, so the
 * bit for qubit *q* of an *n*-qubit index sits at position (n − 1 − q), and
 * `controlled` places the control on the leading qubit.
 */

import {
  type Complex,
  add,
  complex,
  magnitude,
  multiply,
  scale,
  subtract,
} from "./complex";
import type { StateVector } from "./states";
import { UNITARY_ATOL } from "./tolerances";

export type Matrix = Complex[][];

const c = (re: number, im = 0): Complex => complex(re, im);
const SQRT_HALF = Math.SQRT1_2;

export const I: Matrix = [
  [c(1), c(0)],
  [c(0), c(1)],
];
export const X: Matrix = [
  [c(0), c(1)],
  [c(1), c(0)],
];
export const Y: Matrix = [
  [c(0), c(0, -1)],
  [c(0, 1), c(0)],
];
export const Z: Matrix = [
  [c(1), c(0)],
  [c(0), c(-1)],
];
export const H: Matrix = [
  [c(SQRT_HALF), c(SQRT_HALF)],
  [c(SQRT_HALF), c(-SQRT_HALF)],
];
export const S: Matrix = [
  [c(1), c(0)],
  [c(0), c(0, 1)],
];
export const SDG: Matrix = [
  [c(1), c(0)],
  [c(0), c(0, -1)],
];
export const T: Matrix = [
  [c(1), c(0)],
  [c(0), c(SQRT_HALF, SQRT_HALF)],
];
export const TDG: Matrix = [
  [c(1), c(0)],
  [c(0), c(SQRT_HALF, -SQRT_HALF)],
];

export const CNOT: Matrix = [
  [c(1), c(0), c(0), c(0)],
  [c(0), c(1), c(0), c(0)],
  [c(0), c(0), c(0), c(1)],
  [c(0), c(0), c(1), c(0)],
];
export const CZ: Matrix = [
  [c(1), c(0), c(0), c(0)],
  [c(0), c(1), c(0), c(0)],
  [c(0), c(0), c(1), c(0)],
  [c(0), c(0), c(0), c(-1)],
];
export const SWAP: Matrix = [
  [c(1), c(0), c(0), c(0)],
  [c(0), c(0), c(1), c(0)],
  [c(0), c(1), c(0), c(0)],
  [c(0), c(0), c(0), c(1)],
];

export const rx = (theta: number): Matrix => {
  const cos = Math.cos(theta / 2);
  const sin = Math.sin(theta / 2);
  return [
    [c(cos), c(0, -sin)],
    [c(0, -sin), c(cos)],
  ];
};

export const ry = (theta: number): Matrix => {
  const cos = Math.cos(theta / 2);
  const sin = Math.sin(theta / 2);
  return [
    [c(cos), c(-sin)],
    [c(sin), c(cos)],
  ];
};

export const rz = (theta: number): Matrix => [
  [c(Math.cos(theta / 2), -Math.sin(theta / 2)), c(0)],
  [c(0), c(Math.cos(theta / 2), Math.sin(theta / 2))],
];

/** diag(1, e^{iφ}) — differs from `rz` by an unobservable global phase. */
export const phaseGate = (phi: number): Matrix => [
  [c(1), c(0)],
  [c(0), c(Math.cos(phi), Math.sin(phi))],
];

/** Add one control qubit on the most significant position. */
export const controlled = (unitary: Matrix): Matrix => {
  const dimension = unitary.length;
  const size = 2 * dimension;
  const result: Matrix = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => c(row === column ? 1 : 0)),
  );
  for (let row = 0; row < dimension; row += 1) {
    for (let column = 0; column < dimension; column += 1) {
      result[dimension + row]![dimension + column] = unitary[row]![column]!;
    }
  }
  return result;
};

export const dagger = (matrix: Matrix): Matrix =>
  matrix[0]!.map((_, column) =>
    matrix.map((row) => ({ re: row[column]!.re, im: -row[column]!.im })),
  );

export const matrixMultiply = (left: Matrix, right: Matrix): Matrix =>
  left.map((row) =>
    right[0]!.map((_, column) =>
      row.reduce(
        (total, value, index) => add(total, multiply(value, right[index]![column]!)),
        c(0),
      ),
    ),
  );

export const identityMatrix = (dimension: number): Matrix =>
  Array.from({ length: dimension }, (_, row) =>
    Array.from({ length: dimension }, (_, column) => c(row === column ? 1 : 0)),
  );

/** ‖U†U − I‖, the residual reported by the NON_UNITARY_OPERATOR error of §13. */
export const unitaryResidual = (matrix: Matrix): number => {
  const product = matrixMultiply(dagger(matrix), matrix);
  const identity = identityMatrix(matrix.length);
  let total = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      total += magnitude(subtract(product[row]![column]!, identity[row]![column]!)) ** 2;
    }
  }
  return Math.sqrt(total);
};

export const isUnitary = (matrix: Matrix, atol = UNITARY_ATOL): boolean =>
  unitaryResidual(matrix) <= atol;

export const isHermitian = (matrix: Matrix, atol = 1e-10): boolean => {
  for (let row = 0; row < matrix.length; row += 1) {
    for (let column = 0; column < matrix.length; column += 1) {
      const value = matrix[row]![column]!;
      const mirrored = matrix[column]![row]!;
      if (Math.abs(value.re - mirrored.re) > atol) return false;
      if (Math.abs(value.im + mirrored.im) > atol) return false;
    }
  }
  return true;
};

/** Read the bit belonging to `qubit`, with q₀ most significant. */
export const bitOf = (index: number, qubit: number, qubitCount: number): number =>
  (index >> (qubitCount - 1 - qubit)) & 1;

/** Return `index` with the bit belonging to `qubit` set to `value`. */
export const withBit = (
  index: number,
  qubit: number,
  qubitCount: number,
  value: number,
): number => {
  const position = qubitCount - 1 - qubit;
  return value === 1 ? index | (1 << position) : index & ~(1 << position);
};

/**
 * Apply `gate` to `targets` of a `qubitCount`-qubit state.
 *
 * Targets are listed in the gate's own qubit order, so for CNOT the first
 * target is the control. A non-unitary matrix is rejected rather than applied
 * (§8.5): the interface reports the problem instead of ever displaying a state
 * whose probabilities fail to sum to one.
 */
export const applyGate = (
  state: StateVector,
  gate: Matrix,
  targets: number[],
  qubitCount: number,
): StateVector => {
  const gateQubits = Math.log2(gate.length);
  if (!Number.isInteger(gateQubits)) throw new Error("A gate matrix must have a power-of-two size.");
  if (targets.length !== gateQubits) {
    throw new Error(`A ${gateQubits}-qubit gate requires ${gateQubits} targets.`);
  }
  if (new Set(targets).size !== targets.length) {
    throw new Error("A gate cannot address the same qubit more than once.");
  }
  for (const target of targets) {
    if (target < 0 || target >= qubitCount) {
      throw new Error(`Target qubit ${target} is outside the range 0 to ${qubitCount - 1}.`);
    }
  }
  if (state.length !== 2 ** qubitCount) {
    throw new Error(`A ${qubitCount}-qubit state must have ${2 ** qubitCount} amplitudes.`);
  }
  if (!isUnitary(gate)) {
    throw new Error("The supplied matrix does not satisfy U†U = I within tolerance.");
  }

  const result: StateVector = state.map(() => c(0));
  const columns = 2 ** gateQubits;

  for (let out = 0; out < state.length; out += 1) {
    // Gather the target bits of `out`, first target most significant.
    let row = 0;
    for (let position = 0; position < gateQubits; position += 1) {
      row = (row << 1) | bitOf(out, targets[position]!, qubitCount);
    }
    let total = c(0);
    for (let column = 0; column < columns; column += 1) {
      const coefficient = gate[row]![column]!;
      if (coefficient.re === 0 && coefficient.im === 0) continue;
      let source = out;
      for (let position = 0; position < gateQubits; position += 1) {
        const bit = (column >> (gateQubits - 1 - position)) & 1;
        source = withBit(source, targets[position]!, qubitCount, bit);
      }
      total = add(total, multiply(coefficient, state[source]!));
    }
    result[out] = total;
  }
  return result;
};

/** Apply a matrix directly to a state of matching dimension. */
export const applyMatrix = (matrix: Matrix, state: StateVector): StateVector =>
  matrix.map((row) =>
    row.reduce((total, value, index) => add(total, multiply(value, state[index]!)), c(0)),
  );

export const scaleMatrix = (matrix: Matrix, factor: number): Matrix =>
  matrix.map((row) => row.map((value) => scale(value, factor)));

export const addMatrices = (left: Matrix, right: Matrix): Matrix =>
  left.map((row, index) => row.map((value, column) => add(value, right[index]![column]!)));

/** Kronecker product, left-most operand most significant. */
export const tensorMatrices = (left: Matrix, right: Matrix): Matrix => {
  const rows = left.length * right.length;
  const columns = left[0]!.length * right[0]!.length;
  const result: Matrix = Array.from({ length: rows }, () =>
    Array.from({ length: columns }, () => c(0)),
  );
  for (let a = 0; a < left.length; a += 1) {
    for (let b = 0; b < left[0]!.length; b += 1) {
      for (let x = 0; x < right.length; x += 1) {
        for (let y = 0; y < right[0]!.length; y += 1) {
          result[a * right.length + x]![b * right[0]!.length + y] = multiply(
            left[a]![b]!,
            right[x]![y]!,
          );
        }
      }
    }
  }
  return result;
};

export type GateName =
  | "I"
  | "X"
  | "Y"
  | "Z"
  | "H"
  | "S"
  | "SDG"
  | "T"
  | "TDG"
  | "CNOT"
  | "CZ"
  | "SWAP"
  | "RX"
  | "RY"
  | "RZ"
  | "PHASE";

export const NAMED_GATES: Record<string, Matrix> = {
  I,
  X,
  Y,
  Z,
  H,
  S,
  SDG,
  T,
  TDG,
  CNOT,
  CZ,
  SWAP,
};

export const PARAMETRIC_GATES: Record<string, (angle: number) => Matrix> = {
  RX: rx,
  RY: ry,
  RZ: rz,
  PHASE: phaseGate,
};

export const gateMatrix = (name: GateName, parameters?: Record<string, number>): Matrix => {
  const fixed = NAMED_GATES[name];
  if (fixed) return fixed;
  const constructor = PARAMETRIC_GATES[name];
  if (constructor) {
    const angle = parameters?.theta ?? parameters?.phi;
    if (angle === undefined) throw new Error(`Gate ${name} requires an angle parameter.`);
    return constructor(angle);
  }
  throw new Error(`Unknown gate ${name}.`);
};

export const gateQubitCount = (name: GateName): number =>
  name in PARAMETRIC_GATES ? 1 : Math.log2(NAMED_GATES[name]!.length);

/** The inverse of a gate, used by the undo button of §8.5. */
export const inverseGate = (matrix: Matrix): Matrix => dagger(matrix);
