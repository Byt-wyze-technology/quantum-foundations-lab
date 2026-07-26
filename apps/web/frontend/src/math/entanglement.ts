/**
 * Bell states, density matrices, partial trace and entanglement measures.
 *
 * Mirrors `quantum_foundations/core/entanglement.py` (§5.7).
 *
 * For a pure two-qubit state everything follows from one number. Writing the
 * state as a 2×2 matrix M across the qubit cut, the concurrence is
 *
 *     C = 2|det M| = 2|α₀₀α₁₁ − α₀₁α₁₀|
 *
 * and the Schmidt coefficients are λ± with λ±² = (1 ± √(1 − C²))/2. So the
 * reduced purity is exactly 1 − C²/2: one for a product state, ½ for a Bell
 * pair, and nothing in between needs a numerical eigen-solver that might
 * wobble as a slider moves.
 */

import {
  type Complex,
  complex,
  conjugate,
  magnitude,
  magnitudeSquared,
  multiply,
  scale,
} from "./complex";
import type { Matrix } from "./gates";
import { type MeasurementAxis, axisEigenstates } from "./measurement";
import { type BlochVector, type StateVector, innerProduct } from "./states";
import { tensorProduct } from "./tensor";

const SQRT_HALF = Math.SQRT1_2;

export const bellPhiPlus = (): StateVector => [
  complex(SQRT_HALF),
  complex(0),
  complex(0),
  complex(SQRT_HALF),
];

export const bellPhiMinus = (): StateVector => [
  complex(SQRT_HALF),
  complex(0),
  complex(0),
  complex(-SQRT_HALF),
];

export const bellPsiPlus = (): StateVector => [
  complex(0),
  complex(SQRT_HALF),
  complex(SQRT_HALF),
  complex(0),
];

/** The singlet, used for the EPR correlations of §8.11. */
export const bellPsiMinus = (): StateVector => [
  complex(0),
  complex(SQRT_HALF),
  complex(-SQRT_HALF),
  complex(0),
];

export type BellName = "phi_plus" | "phi_minus" | "psi_plus" | "psi_minus";

export const BELL_STATES: Record<BellName, () => StateVector> = {
  phi_plus: bellPhiPlus,
  phi_minus: bellPhiMinus,
  psi_plus: bellPsiPlus,
  psi_minus: bellPsiMinus,
};

export const BELL_LABELS: Record<BellName, string> = {
  phi_plus: "Φ⁺",
  phi_minus: "Φ⁻",
  psi_plus: "Ψ⁺",
  psi_minus: "Ψ⁻",
};

/** ρ = |ψ⟩⟨ψ|. */
export const densityMatrix = (state: StateVector): Matrix =>
  state.map((row) => state.map((column) => multiply(row, conjugate(column))));

/** Read the bit belonging to `qubit`, with q₀ most significant. */
const bitAt = (index: number, qubit: number, qubitCount: number): number =>
  (index >> (qubitCount - 1 - qubit)) & 1;

/** Build an index from a per-qubit bit assignment, q₀ most significant. */
const composeIndex = (bits: number[], qubitCount: number): number =>
  bits.reduce((index, bit, qubit) => index | (bit << (qubitCount - 1 - qubit)), 0);

/**
 * Trace out every qubit not listed in `keep`.
 *
 * `keep` is read in the q₀-leading convention of §5.4; kept qubits appear in
 * ascending order in the result.
 */
export const partialTrace = (rho: Matrix, keep: number[], qubitCount: number): Matrix => {
  const kept = [...new Set(keep)].sort((a, b) => a - b);
  if (kept.length === 0) throw new Error("At least one qubit must be kept by a partial trace.");
  for (const qubit of kept) {
    if (qubit < 0 || qubit >= qubitCount) {
      throw new Error(`Qubit ${qubit} is outside the range 0 to ${qubitCount - 1}.`);
    }
  }
  const traced = Array.from({ length: qubitCount }, (_, qubit) => qubit).filter(
    (qubit) => !kept.includes(qubit),
  );
  const keptDimension = 2 ** kept.length;
  const tracedDimension = 2 ** traced.length;

  const result: Matrix = Array.from({ length: keptDimension }, () =>
    Array.from({ length: keptDimension }, () => complex(0)),
  );

  for (let row = 0; row < keptDimension; row += 1) {
    for (let column = 0; column < keptDimension; column += 1) {
      let total = complex(0);
      for (let hidden = 0; hidden < tracedDimension; hidden += 1) {
        const rowBits = new Array<number>(qubitCount).fill(0);
        const columnBits = new Array<number>(qubitCount).fill(0);
        kept.forEach((qubit, position) => {
          rowBits[qubit] = bitAt(row, position, kept.length);
          columnBits[qubit] = bitAt(column, position, kept.length);
        });
        traced.forEach((qubit, position) => {
          const bit = bitAt(hidden, position, traced.length);
          rowBits[qubit] = bit;
          columnBits[qubit] = bit;
        });
        const value = rho[composeIndex(rowBits, qubitCount)]![composeIndex(columnBits, qubitCount)]!;
        total = { re: total.re + value.re, im: total.im + value.im };
      }
      result[row]![column] = total;
    }
  }
  return result;
};

export const reducedDensityMatrix = (
  state: StateVector,
  keep: number[],
  qubitCount: number,
): Matrix => partialTrace(densityMatrix(state), keep, qubitCount);

/** Tr(ρ²) — one for a pure state, ½ for a maximally mixed qubit. */
export const purity = (rho: Matrix): number => {
  let total = 0;
  for (let row = 0; row < rho.length; row += 1) {
    for (let column = 0; column < rho.length; column += 1) {
      // (ρ²)ᵢᵢ summed is Σᵢⱼ ρᵢⱼ ρⱼᵢ, and the imaginary parts cancel.
      total += multiply(rho[row]![column]!, rho[column]![row]!).re;
    }
  }
  return total;
};

export const trace = (rho: Matrix): number =>
  rho.reduce((total, row, index) => total + row[index]!.re, 0);

/**
 * Bloch coordinates of a one-qubit density matrix, from ρ = (I + r·σ)/2.
 *
 * The length of r is the honest picture of how pure the subsystem is: one on
 * the surface for a pure state, zero at the centre for a maximally mixed one.
 * Drawing that shortened arrow is how §21's rule — never depict entangled
 * qubits as independent pure states — is kept without simply refusing to draw.
 */
export const blochVectorOfDensityMatrix = (rho: Matrix): BlochVector => ({
  x: 2 * rho[0]![1]!.re,
  y: -2 * rho[0]![1]!.im,
  z: rho[0]![0]!.re - rho[1]![1]!.re,
});

export const blochLength = (vector: BlochVector): number =>
  Math.hypot(vector.x, vector.y, vector.z);

/**
 * Concurrence of a pure two-qubit state: 0 for a product state, 1 for a Bell
 * pair.
 */
export const concurrenceTwoQubit = (state: StateVector): number => {
  if (state.length !== 4) {
    throw new Error("Concurrence is defined here for two-qubit states.");
  }
  const [a00, a01, a10, a11] = state as [Complex, Complex, Complex, Complex];
  const determinant = {
    re: multiply(a00, a11).re - multiply(a01, a10).re,
    im: multiply(a00, a11).im - multiply(a01, a10).im,
  };
  return Math.min(1, Math.max(0, 2 * magnitude(determinant)));
};

/** Schmidt coefficients across the qubit cut, descending. */
export const schmidtCoefficients = (state: StateVector): [number, number] => {
  const concurrence = concurrenceTwoQubit(state);
  const root = Math.sqrt(Math.max(0, 1 - concurrence ** 2));
  return [Math.sqrt((1 + root) / 2), Math.sqrt((1 - root) / 2)];
};

/** Reduced purity of either half: exactly 1 − C²/2. */
export const reducedPurity = (state: StateVector): number =>
  1 - concurrenceTwoQubit(state) ** 2 / 2;

/** True when the state factorises into two independent single-qubit states. */
export const isProductState = (state: StateVector, atol = 1e-9): boolean => {
  if (state.length === 2) return true;
  return concurrenceTwoQubit(state) <= atol;
};

/**
 * Joint outcome correlations for the computational basis.
 *
 * ⟨Z⊗Z⟩ together with the two single-qubit averages is what makes the
 * difference between "correlated" and "entangled" visible: a Bell pair and a
 * classical coin-flip pair share ⟨Z⊗Z⟩ = 1, and differ in every other basis.
 */
export const correlationTable = (state: StateVector): {
  joint: number[][];
  zz: number;
  marginalA: number;
  marginalB: number;
} => {
  const probabilities = state.map((amplitude) => magnitude(amplitude) ** 2);
  const joint = [
    [probabilities[0]!, probabilities[1]!],
    [probabilities[2]!, probabilities[3]!],
  ];
  const zz =
    probabilities[0]! - probabilities[1]! - probabilities[2]! + probabilities[3]!;
  const marginalA = probabilities[0]! + probabilities[1]! - probabilities[2]! - probabilities[3]!;
  const marginalB = probabilities[0]! - probabilities[1]! + probabilities[2]! - probabilities[3]!;
  return { joint, zz, marginalA, marginalB };
};

/* --- EPR correlations (§8.11) -------------------------------------------- */

export type SpinOutcome = 1 | -1;
export type JointOutcomeKey = "++" | "+-" | "-+" | "--";

export const JOINT_OUTCOME_KEYS: JointOutcomeKey[] = ["++", "+-", "-+", "--"];

const outcomeKey = (alice: SpinOutcome, bob: SpinOutcome): JointOutcomeKey =>
  `${alice > 0 ? "+" : "-"}${bob > 0 ? "+" : "-"}` as JointOutcomeKey;

/**
 * Probabilities of the four joint outcomes when Alice measures along `axisA`
 * and Bob along `axisB`.
 *
 * Computed from the analytic eigenstates of σ_n rather than by numerical
 * diagonalisation, so the correlation curve stays smooth as the dials turn.
 */
export const jointSpinProbabilities = (
  state: StateVector,
  axisA: MeasurementAxis,
  axisB: MeasurementAxis,
): Record<JointOutcomeKey, number> => {
  if (state.length !== 4) throw new Error("Joint spin measurement needs a two-qubit state.");
  const alice = axisEigenstates(axisA);
  const bob = axisEigenstates(axisB);
  const result = { "++": 0, "+-": 0, "-+": 0, "--": 0 } as Record<JointOutcomeKey, number>;
  for (const [aSign, aState] of [
    [1, alice.plus],
    [-1, alice.minus],
  ] as const) {
    for (const [bSign, bState] of [
      [1, bob.plus],
      [-1, bob.minus],
    ] as const) {
      const joint = tensorProduct(aState, bState);
      result[outcomeKey(aSign, bSign)] = magnitudeSquared(innerProduct(joint, state));
    }
  }
  return result;
};

/** E(a, b) — the average product of the two ±1 outcomes. */
export const correlation = (
  state: StateVector,
  axisA: MeasurementAxis,
  axisB: MeasurementAxis,
): number => {
  const joint = jointSpinProbabilities(state, axisA, axisB);
  return joint["++"] - joint["+-"] - joint["-+"] + joint["--"];
};

/**
 * Each observer's own outcome distribution.
 *
 * This is what makes no-signalling checkable rather than merely asserted:
 * Alice's marginal is 50/50 for every choice of `axisB`, so nothing Bob does
 * changes what she sees (§8.11, §21).
 */
export const marginalProbabilities = (
  state: StateVector,
  axisA: MeasurementAxis,
  axisB: MeasurementAxis,
): { alice: { plus: number; minus: number }; bob: { plus: number; minus: number } } => {
  const joint = jointSpinProbabilities(state, axisA, axisB);
  return {
    alice: { plus: joint["++"] + joint["+-"], minus: joint["-+"] + joint["--"] },
    bob: { plus: joint["++"] + joint["-+"], minus: joint["+-"] + joint["--"] },
  };
};

/** The closed form for the singlet: E(θ) = −cos θ. */
export const singletCorrelation = (theta: number): number => -Math.cos(theta);

/** S = E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′). */
export const chshValue = (
  state: StateVector,
  a: MeasurementAxis,
  aPrime: MeasurementAxis,
  b: MeasurementAxis,
  bPrime: MeasurementAxis,
): number =>
  correlation(state, a, b) +
  correlation(state, a, bPrime) +
  correlation(state, aPrime, b) -
  correlation(state, aPrime, bPrime);

/** The classical local-hidden-variable bound on |S|. */
export const CHSH_CLASSICAL_BOUND = 2;

/** The Tsirelson bound, 2√2 — the largest |S| quantum mechanics permits. */
export const CHSH_QUANTUM_BOUND = 2 * Math.SQRT2;

/** Tally independent trials of the Alice/Bob experiment, one fresh pair each. */
export const sampleJointMeasurements = (
  state: StateVector,
  axisA: MeasurementAxis,
  axisB: MeasurementAxis,
  shots: number,
  random: () => number,
): Record<JointOutcomeKey, number> => {
  const joint = jointSpinProbabilities(state, axisA, axisB);
  const cumulative: number[] = [];
  let running = 0;
  for (const key of JOINT_OUTCOME_KEYS) {
    running += joint[key];
    cumulative.push(running);
  }
  const counts = { "++": 0, "+-": 0, "-+": 0, "--": 0 } as Record<JointOutcomeKey, number>;
  for (let shot = 0; shot < shots; shot += 1) {
    const draw = random() * running;
    let index = JOINT_OUTCOME_KEYS.length - 1;
    for (let candidate = 0; candidate < cumulative.length; candidate += 1) {
      if (draw < cumulative[candidate]!) {
        index = candidate;
        break;
      }
    }
    counts[JOINT_OUTCOME_KEYS[index]!] += 1;
  }
  return counts;
};

/** An axis in the x–z plane, which is where the EPR dials live. */
export const planarAxis = (theta: number): MeasurementAxis => ({ theta, phi: 0 });

/** A partially entangled state, for the preset list of §9. */
export const partiallyEntangled = (weight = 0.9): StateVector => [
  complex(Math.sqrt(weight)),
  complex(0),
  complex(0),
  complex(Math.sqrt(1 - weight)),
];

/** Scale every entry of a density matrix, for display normalisation. */
export const scaleMatrixEntries = (rho: Matrix, factor: number): Matrix =>
  rho.map((row) => row.map((value) => scale(value, factor)));
