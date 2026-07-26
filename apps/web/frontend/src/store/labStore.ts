/**
 * The Explore laboratory's state model.
 *
 * Implements §6. `currentState` is always derived by replaying the circuit
 * from `initialState` rather than being mutated in place: undo becomes a pop,
 * step playback becomes a partial replay, and the displayed state can never
 * drift out of agreement with the displayed circuit. At the 24-operation cap
 * of §17 a full replay is far cheaper than a frame.
 */

import { create } from "zustand";

import {
  type BlochVector,
  type Complex,
  type GateName,
  type MeasurementAxis,
  type RandomSource,
  type StateVector,
  AXIS_Z,
  BELL_STATES,
  MAX_CIRCUIT_DEPTH,
  MAX_SHOTS,
  applyGate,
  axisDistribution,
  basisLabels,
  bellPhiPlus,
  blochVector,
  blochVectorOfDensityMatrix,
  computationalBasisState,
  concurrenceTwoQubit,
  expectationAlongAxis,
  gateMatrix,
  gateQubitCount,
  ket0,
  ket1,
  ketMinus,
  ketMinusI,
  ketPlus,
  ketPlusI,
  measureAlongAxis,
  measureComputational,
  mulberry32,
  partiallyEntangled,
  probabilities,
  purity,
  randomPureQubit,
  reducedDensityMatrix,
  reducedPurity,
  sampleAlongAxis,
  sampleComputational,
  systemRandom,
  tensorProduct,
  varianceAlongAxis,
} from "../math";

export type QubitCount = 1 | 2;

export type QuantumState = {
  qubitCount: QubitCount;
  amplitudes: Complex[];
};

export type GateOperation = {
  id: string;
  gate: GateName;
  targets: number[];
  controls?: number[];
  parameters?: Record<string, number>;
};

export type MeasurementRecord = {
  basis: "X" | "Y" | "Z" | "custom";
  outcome: string;
  probability: number;
  timestamp: number;
};

export type PresetName =
  | "ket0"
  | "ket1"
  | "ketPlus"
  | "ketMinus"
  | "ketPlusI"
  | "ketMinusI"
  | "random"
  | "bellPhiPlus"
  | "bellPhiMinus"
  | "bellPsiPlus"
  | "bellPsiMinus"
  | "product"
  | "partiallyEntangled";

const PRESET_BUILDERS: Record<PresetName, () => StateVector> = {
  ket0,
  ket1,
  ketPlus,
  ketMinus,
  ketPlusI,
  ketMinusI,
  random: () => randomPureQubit(),
  bellPhiPlus: BELL_STATES.phi_plus,
  bellPhiMinus: BELL_STATES.phi_minus,
  bellPsiPlus: BELL_STATES.psi_plus,
  bellPsiMinus: BELL_STATES.psi_minus,
  product: () => tensorProduct(ketPlus(), ket0()),
  partiallyEntangled: () => partiallyEntangled(0.9),
};

export type PresetEntry = { name: PresetName; label: string; description: string };

/** The one-qubit presets of §9. */
export const PRESET_LABELS: PresetEntry[] = [
  { name: "ket0", label: "|0⟩", description: "North pole — always reads 0 in the Z basis" },
  { name: "ket1", label: "|1⟩", description: "South pole — always reads 1 in the Z basis" },
  { name: "ketPlus", label: "|+⟩", description: "+x — even odds in Z, certain in X" },
  { name: "ketMinus", label: "|−⟩", description: "−x — same Z odds as |+⟩, opposite in X" },
  { name: "ketPlusI", label: "|+i⟩", description: "+y — a quarter turn of phase" },
  { name: "ketMinusI", label: "|−i⟩", description: "−y — the opposite quarter turn" },
  { name: "random", label: "Random", description: "A uniformly random pure state" },
];

/** The two-qubit presets of §9. */
export const TWO_QUBIT_PRESETS: PresetEntry[] = [
  {
    name: "product",
    label: "Product",
    description: "|+⟩ ⊗ |0⟩ — two independent qubits, each with its own pure state",
  },
  {
    name: "bellPhiPlus",
    label: "Bell Φ⁺",
    description: "(|00⟩ + |11⟩)/√2 — maximally entangled",
  },
  {
    name: "bellPhiMinus",
    label: "Bell Φ⁻",
    description: "(|00⟩ − |11⟩)/√2 — same probabilities as Φ⁺, opposite phase",
  },
  {
    name: "bellPsiPlus",
    label: "Bell Ψ⁺",
    description: "(|01⟩ + |10⟩)/√2 — anti-correlated in Z",
  },
  {
    name: "bellPsiMinus",
    label: "Bell Ψ⁻",
    description: "(|01⟩ − |10⟩)/√2 — the singlet, used for EPR correlations",
  },
  {
    name: "partiallyEntangled",
    label: "Partly entangled",
    description: "Between the two extremes: neither a product state nor a Bell pair",
  },
];

const toQuantumState = (amplitudes: StateVector, qubitCount: QubitCount): QuantumState => ({
  qubitCount,
  amplitudes,
});

let operationCounter = 0;
const nextOperationId = (): string => {
  operationCounter += 1;
  return `op-${operationCounter}`;
};

/** Replay a circuit from an initial state; the single source of `currentState`. */
export const replayCircuit = (
  initial: QuantumState,
  circuit: GateOperation[],
  upTo = circuit.length,
): QuantumState => {
  let amplitudes = initial.amplitudes;
  for (const operation of circuit.slice(0, upTo)) {
    amplitudes = applyGate(
      amplitudes,
      gateMatrix(operation.gate, operation.parameters),
      operation.targets,
      initial.qubitCount,
    );
  }
  return toQuantumState(amplitudes, initial.qubitCount);
};

export type LabState = {
  initialState: QuantumState;
  currentState: QuantumState;
  circuit: GateOperation[];
  measurementAxis: MeasurementAxis;
  shots: number;
  histogram: Record<string, number>;
  totalShots: number;
  selectedLesson: string;
  animationSpeed: number;
  lastMeasurement: MeasurementRecord | null;
  measurementLog: MeasurementRecord[];
  seed: number | null;
  error: string | null;

  setInitialState: (amplitudes: StateVector) => void;
  applyGate: (gate: GateName, targets: number[], parameters?: Record<string, number>) => void;
  undoGate: () => void;
  resetCircuit: () => void;
  setMeasurementAxis: (axis: MeasurementAxis) => void;
  runSingleMeasurement: () => void;
  runShots: (shots: number) => void;
  resetHistogram: () => void;
  setQubitCount: (qubitCount: QubitCount) => void;
  loadPreset: (preset: PresetName) => void;
  setShots: (shots: number) => void;
  setAnimationSpeed: (speed: number) => void;
  setSelectedLesson: (lesson: string) => void;
  setSeed: (seed: number | null) => void;
  clearError: () => void;
};

const initialOneQubit = toQuantumState(ket0(), 1);

export const useLabStore = create<LabState>((set, get) => ({
  initialState: initialOneQubit,
  currentState: initialOneQubit,
  circuit: [],
  measurementAxis: AXIS_Z,
  shots: 100,
  histogram: {},
  totalShots: 0,
  selectedLesson: "",
  animationSpeed: 1,
  lastMeasurement: null,
  measurementLog: [],
  seed: null,
  error: null,

  setInitialState: (amplitudes) => {
    const qubitCount = Math.log2(amplitudes.length) as QubitCount;
    const initial = toQuantumState(amplitudes, qubitCount);
    set({
      initialState: initial,
      currentState: initial,
      circuit: [],
      histogram: {},
      totalShots: 0,
      lastMeasurement: null,
      error: null,
    });
  },

  applyGate: (gate, targets, parameters) => {
    const { circuit, initialState } = get();
    if (circuit.length >= MAX_CIRCUIT_DEPTH) {
      set({ error: `Circuits are limited to ${MAX_CIRCUIT_DEPTH} operations.` });
      return;
    }
    if (targets.length !== gateQubitCount(gate)) {
      set({ error: `${gate} needs ${gateQubitCount(gate)} target qubit(s).` });
      return;
    }
    const operation: GateOperation = { id: nextOperationId(), gate, targets, parameters };
    try {
      const nextCircuit = [...circuit, operation];
      set({
        circuit: nextCircuit,
        currentState: replayCircuit(initialState, nextCircuit),
        histogram: {},
        totalShots: 0,
        error: null,
      });
    } catch (cause) {
      set({ error: cause instanceof Error ? cause.message : String(cause) });
    }
  },

  undoGate: () => {
    const { circuit, initialState } = get();
    if (circuit.length === 0) return;
    const nextCircuit = circuit.slice(0, -1);
    set({
      circuit: nextCircuit,
      currentState: replayCircuit(initialState, nextCircuit),
      histogram: {},
      totalShots: 0,
      error: null,
    });
  },

  resetCircuit: () => {
    const { initialState } = get();
    set({
      circuit: [],
      currentState: initialState,
      histogram: {},
      totalShots: 0,
      lastMeasurement: null,
      error: null,
    });
  },

  setMeasurementAxis: (axis) => set({ measurementAxis: axis, histogram: {}, totalShots: 0 }),

  runSingleMeasurement: () => {
    const { currentState, measurementAxis, seed, measurementLog } = get();
    const random: RandomSource =
      seed === null ? systemRandom() : mulberry32(seed + measurementLog.length);

    // One qubit can be measured along any axis; two qubits are measured in the
    // computational basis, which is the joint measurement §9 shows.
    const record: MeasurementRecord =
      currentState.qubitCount === 1
        ? (() => {
            const outcome = measureAlongAxis(currentState.amplitudes, measurementAxis, random);
            return {
              basis: basisNameFor(measurementAxis),
              outcome: outcome.label,
              probability: outcome.probability,
              timestamp: Date.now(),
            };
          })()
        : (() => {
            const outcome = measureComputational(currentState.amplitudes, random);
            return {
              basis: "Z" as const,
              outcome: outcome.label,
              probability: outcome.probability,
              timestamp: Date.now(),
            };
          })();

    set({ lastMeasurement: record, measurementLog: [record, ...measurementLog].slice(0, 12) });
  },

  runShots: (shots) => {
    const { currentState, measurementAxis, histogram, totalShots, seed } = get();
    if (shots < 1) {
      set({ error: "The number of shots must be at least 1." });
      return;
    }
    if (totalShots + shots > MAX_SHOTS) {
      set({ error: `At most ${MAX_SHOTS.toLocaleString()} shots may be accumulated.` });
      return;
    }
    const random: RandomSource = seed === null ? systemRandom() : mulberry32(seed + totalShots);
    const batch =
      currentState.qubitCount === 1
        ? sampleAlongAxis(currentState.amplitudes, measurementAxis, shots, random)
        : sampleComputational(currentState.amplitudes, shots, random);
    const merged: Record<string, number> = { ...histogram };
    for (const [label, count] of Object.entries(batch)) {
      merged[label] = (merged[label] ?? 0) + count;
    }
    set({ histogram: merged, totalShots: totalShots + shots, error: null });
  },

  resetHistogram: () => set({ histogram: {}, totalShots: 0, lastMeasurement: null }),

  setQubitCount: (qubitCount) => {
    const { currentState } = get();
    if (currentState.qubitCount === qubitCount) return;
    get().setInitialState(qubitCount === 1 ? ket0() : computationalBasisState("00"));
    // A measurement axis only means something for one qubit; reset it so the
    // control never shows a setting the two-qubit panels are ignoring.
    if (qubitCount === 2) set({ measurementAxis: AXIS_Z });
  },

  loadPreset: (preset) => {
    const build = PRESET_BUILDERS[preset];
    if (!build) return;
    get().setInitialState(build());
  },

  setShots: (shots) => set({ shots: Math.max(1, Math.min(MAX_SHOTS, shots)) }),
  setAnimationSpeed: (animationSpeed) => set({ animationSpeed }),
  setSelectedLesson: (selectedLesson) => set({ selectedLesson }),
  setSeed: (seed) => set({ seed, histogram: {}, totalShots: 0 }),
  clearError: () => set({ error: null }),
}));

const basisNameFor = (axis: MeasurementAxis): MeasurementRecord["basis"] => {
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  if (close(axis.theta, 0)) return "Z";
  if (close(axis.theta, Math.PI / 2) && close(axis.phi, 0)) return "X";
  if (close(axis.theta, Math.PI / 2) && close(axis.phi, Math.PI / 2)) return "Y";
  return "custom";
};

export const axisBasisName = basisNameFor;

/* --- Derived selectors (§6) ---------------------------------------------- */

export const selectProbabilities = (state: LabState): number[] =>
  probabilities(state.currentState.amplitudes);

export const selectBasisLabels = (state: LabState): string[] =>
  basisLabels(state.currentState.qubitCount);

/** A Bloch arrow, only for a genuinely pure one-qubit state (§21). */
export const selectBlochVector = (state: LabState): BlochVector | null =>
  state.currentState.qubitCount === 1 ? blochVector(state.currentState.amplitudes) : null;

/**
 * Bloch vectors of each qubit's reduced state.
 *
 * These are *not* independent pure states. For an entangled pair each vector
 * is short — zero for a Bell pair — and the components that draw them show
 * that shortening rather than normalising it away.
 */
export const selectReducedBlochVectors = (
  state: LabState,
): { a: BlochVector; b: BlochVector } | null => {
  if (state.currentState.qubitCount !== 2) return null;
  const { amplitudes } = state.currentState;
  return {
    a: blochVectorOfDensityMatrix(reducedDensityMatrix(amplitudes, [0], 2)),
    b: blochVectorOfDensityMatrix(reducedDensityMatrix(amplitudes, [1], 2)),
  };
};

/** Purity of each subsystem: 1 when separable, ½ for half a Bell pair. */
export const selectStatePurity = (state: LabState): { a: number; b: number } | null => {
  if (state.currentState.qubitCount !== 2) return null;
  const { amplitudes } = state.currentState;
  return {
    a: purity(reducedDensityMatrix(amplitudes, [0], 2)),
    b: purity(reducedDensityMatrix(amplitudes, [1], 2)),
  };
};

/** Concurrence: 0 for a product state, 1 for a maximally entangled pair. */
export const selectEntanglementMeasure = (state: LabState): number | null =>
  state.currentState.qubitCount === 2
    ? concurrenceTwoQubit(state.currentState.amplitudes)
    : null;

/** Closed-form reduced purity, 1 − C²/2, used to cross-check the trace above. */
export const selectReducedPurity = (state: LabState): number | null =>
  state.currentState.qubitCount === 2 ? reducedPurity(state.currentState.amplitudes) : null;

export const selectExpectationValues = (
  state: LabState,
): { x: number; y: number; z: number; axis: number } | null => {
  if (state.currentState.qubitCount !== 1) return null;
  const vector = blochVector(state.currentState.amplitudes);
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
    axis: expectationAlongAxis(state.currentState.amplitudes, state.measurementAxis),
  };
};

export const selectAxisVariance = (state: LabState): number | null =>
  state.currentState.qubitCount === 1
    ? varianceAlongAxis(state.currentState.amplitudes, state.measurementAxis)
    : null;

export const selectAxisDistribution = (state: LabState) =>
  state.currentState.qubitCount === 1
    ? axisDistribution(state.currentState.amplitudes, state.measurementAxis)
    : null;

/** The default two-qubit starting point, exported for tests and presets. */
export const defaultTwoQubitState = bellPhiPlus;
