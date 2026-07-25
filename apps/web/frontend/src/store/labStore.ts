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
  MAX_CIRCUIT_DEPTH,
  MAX_SHOTS,
  applyGate,
  axisDistribution,
  blochVector,
  expectationAlongAxis,
  gateMatrix,
  gateQubitCount,
  ket0,
  ketMinus,
  ketMinusI,
  ketPlus,
  ketPlusI,
  ket1,
  measureAlongAxis,
  mulberry32,
  probabilities,
  randomPureQubit,
  sampleAlongAxis,
  systemRandom,
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
  | "random";

const ONE_QUBIT_PRESETS: Record<PresetName, () => StateVector> = {
  ket0,
  ket1,
  ketPlus,
  ketMinus,
  ketPlusI,
  ketMinusI,
  random: () => randomPureQubit(),
};

export const PRESET_LABELS: { name: PresetName; label: string; description: string }[] = [
  { name: "ket0", label: "|0⟩", description: "North pole — always reads 0 in the Z basis" },
  { name: "ket1", label: "|1⟩", description: "South pole — always reads 1 in the Z basis" },
  { name: "ketPlus", label: "|+⟩", description: "+x — even odds in Z, certain in X" },
  { name: "ketMinus", label: "|−⟩", description: "−x — same Z odds as |+⟩, opposite in X" },
  { name: "ketPlusI", label: "|+i⟩", description: "+y — a quarter turn of phase" },
  { name: "ketMinusI", label: "|−i⟩", description: "−y — the opposite quarter turn" },
  { name: "random", label: "Random", description: "A uniformly random pure state" },
];

const stateOf = (amplitudes: Complex[]): StateVector => amplitudes;

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
  let amplitudes = stateOf(initial.amplitudes);
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
    if (currentState.qubitCount !== 1) return;
    const random: RandomSource = seed === null ? systemRandom() : mulberry32(seed + measurementLog.length);
    const outcome = measureAlongAxis(currentState.amplitudes, measurementAxis, random);
    const record: MeasurementRecord = {
      basis: basisNameFor(measurementAxis),
      outcome: outcome.label,
      probability: outcome.probability,
      timestamp: Date.now(),
    };
    set({
      lastMeasurement: record,
      measurementLog: [record, ...measurementLog].slice(0, 12),
    });
  },

  runShots: (shots) => {
    const { currentState, measurementAxis, histogram, totalShots, seed } = get();
    if (currentState.qubitCount !== 1) return;
    if (shots < 1) {
      set({ error: "The number of shots must be at least 1." });
      return;
    }
    if (totalShots + shots > MAX_SHOTS) {
      set({ error: `At most ${MAX_SHOTS.toLocaleString()} shots may be accumulated.` });
      return;
    }
    const random: RandomSource = seed === null ? systemRandom() : mulberry32(seed + totalShots);
    const batch = sampleAlongAxis(currentState.amplitudes, measurementAxis, shots, random);
    const merged: Record<string, number> = { ...histogram };
    for (const [label, count] of Object.entries(batch)) {
      merged[label] = (merged[label] ?? 0) + count;
    }
    set({ histogram: merged, totalShots: totalShots + shots, error: null });
  },

  resetHistogram: () => set({ histogram: {}, totalShots: 0, lastMeasurement: null }),

  setQubitCount: (qubitCount) => {
    // Two-qubit mode arrives with Phase 4; the guard keeps the control honest
    // until then rather than silently producing an invalid state.
    if (qubitCount === 1) {
      get().setInitialState(ket0());
    }
  },

  loadPreset: (preset) => {
    const build = ONE_QUBIT_PRESETS[preset];
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

export const selectBlochVector = (state: LabState): BlochVector | null =>
  state.currentState.qubitCount === 1 ? blochVector(state.currentState.amplitudes) : null;

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
