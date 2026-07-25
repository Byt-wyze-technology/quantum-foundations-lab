/**
 * Projective measurement, collapse and repeated shots.
 *
 * Mirrors `quantum_foundations/core/measurement.py` (§5.5) and supplies the
 * measurement modes of §8.7: Z, X, Y and an arbitrary axis.
 *
 * The distinction §5.5 insists on is carried by the function names. A
 * *distribution* is what the state predicts; a *single outcome* is one sample
 * with a collapsed state; a *shot tally* is many fresh preparations of the
 * same state. Nothing here measures one collapsed qubit repeatedly and calls
 * the result a distribution.
 */

import { complex, magnitudeSquared, scale } from "./complex";
import { basisLabels } from "./tensor";
import {
  type BlochVector,
  type StateVector,
  blochVector,
  innerProduct,
  probabilities,
  qubitFromAngles,
} from "./states";
import type { RandomSource } from "./random";

export type MeasurementAxis = {
  theta: number;
  phi: number;
};

export const AXIS_Z: MeasurementAxis = { theta: 0, phi: 0 };
export const AXIS_X: MeasurementAxis = { theta: Math.PI / 2, phi: 0 };
export const AXIS_Y: MeasurementAxis = { theta: Math.PI / 2, phi: Math.PI / 2 };

export type BasisName = "Z" | "X" | "Y" | "custom";

export const AXIS_FOR_BASIS: Record<Exclude<BasisName, "custom">, MeasurementAxis> = {
  Z: AXIS_Z,
  X: AXIS_X,
  Y: AXIS_Y,
};

/** Cartesian unit vector for a measurement axis. */
export const axisVector = ({ theta, phi }: MeasurementAxis): BlochVector => ({
  x: Math.sin(theta) * Math.cos(phi),
  y: Math.sin(theta) * Math.sin(phi),
  z: Math.cos(theta),
});

/**
 * The two eigenstates of σ_n, written analytically rather than by numerical
 * diagonalisation:
 *
 *     |+n⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
 *     |−n⟩ = sin(θ/2)|0⟩ − e^{iφ} cos(θ/2)|1⟩
 */
export const axisEigenstates = ({
  theta,
  phi,
}: MeasurementAxis): { plus: StateVector; minus: StateVector } => ({
  plus: qubitFromAngles(theta, phi),
  minus: [
    complex(Math.sin(theta / 2)),
    scale({ re: Math.cos(phi), im: Math.sin(phi) }, -Math.cos(theta / 2)),
  ],
});

export type AxisOutcome = {
  /** +1 or −1, the eigenvalue actually read off the device. */
  eigenvalue: 1 | -1;
  label: "+1" | "−1";
  probability: number;
};

/** What the state predicts for a measurement along `axis`, before any sampling. */
export const axisDistribution = (state: StateVector, axis: MeasurementAxis): AxisOutcome[] => {
  const { plus, minus } = axisEigenstates(axis);
  const plusProbability = magnitudeSquared(innerProduct(plus, state));
  const minusProbability = magnitudeSquared(innerProduct(minus, state));
  const total = plusProbability + minusProbability;
  return [
    { eigenvalue: 1, label: "+1", probability: plusProbability / total },
    { eigenvalue: -1, label: "−1", probability: minusProbability / total },
  ];
};

/** ⟨σ_n⟩ = n · r, the dot product of the axis with the Bloch vector. */
export const expectationAlongAxis = (state: StateVector, axis: MeasurementAxis): number => {
  const n = axisVector(axis);
  const r = blochVector(state);
  return n.x * r.x + n.y * r.y + n.z * r.z;
};

/** (Δσ_n)² = 1 − ⟨σ_n⟩², since σ_n has eigenvalues ±1. */
export const varianceAlongAxis = (state: StateVector, axis: MeasurementAxis): number =>
  Math.max(0, 1 - expectationAlongAxis(state, axis) ** 2);

export type SingleMeasurement = {
  eigenvalue: 1 | -1;
  label: "+1" | "−1";
  probability: number;
  /** The post-measurement state: the eigenstate the system collapsed onto. */
  state: StateVector;
};

/** Measure once along `axis`, sample an outcome, and collapse. */
export const measureAlongAxis = (
  state: StateVector,
  axis: MeasurementAxis,
  random: RandomSource,
): SingleMeasurement => {
  const [plusOutcome, minusOutcome] = axisDistribution(state, axis) as [AxisOutcome, AxisOutcome];
  const { plus, minus } = axisEigenstates(axis);
  const tookPlus = random() < plusOutcome.probability;
  const chosen = tookPlus ? plusOutcome : minusOutcome;
  return {
    eigenvalue: chosen.eigenvalue,
    label: chosen.label,
    probability: chosen.probability,
    state: tookPlus ? plus : minus,
  };
};

/**
 * Tally `shots` independent preparations of the same state measured along `axis`.
 *
 * Every shot is a fresh preparation (§8.7). The state is never mutated.
 */
export const sampleAlongAxis = (
  state: StateVector,
  axis: MeasurementAxis,
  shots: number,
  random: RandomSource,
): Record<string, number> => {
  const [plusOutcome] = axisDistribution(state, axis) as [AxisOutcome, AxisOutcome];
  let plusCount = 0;
  for (let shot = 0; shot < shots; shot += 1) {
    if (random() < plusOutcome.probability) plusCount += 1;
  }
  return { "+1": plusCount, "−1": shots - plusCount };
};

export type ComputationalMeasurement = {
  /** Index of the observed basis state. */
  index: number;
  label: string;
  probability: number;
  state: StateVector;
};

/** Measure every qubit in the computational basis exactly once, and collapse. */
export const measureComputational = (
  state: StateVector,
  random: RandomSource,
): ComputationalMeasurement => {
  const distribution = probabilities(state);
  const draw = random();
  let cumulative = 0;
  let index = distribution.length - 1;
  for (let candidate = 0; candidate < distribution.length; candidate += 1) {
    cumulative += distribution[candidate]!;
    if (draw < cumulative) {
      index = candidate;
      break;
    }
  }
  const collapsed: StateVector = distribution.map((_, position) =>
    complex(position === index ? 1 : 0),
  );
  const qubitCount = Math.log2(state.length);
  return {
    index,
    label: basisLabels(qubitCount)[index]!,
    probability: distribution[index]!,
    state: collapsed,
  };
};

/**
 * Tally `shots` computational-basis measurements of fresh preparations.
 *
 * Sampled shot by shot rather than by a closed-form multinomial: at the
 * 100,000-shot cap of §17 this is still well under a frame, and it keeps the
 * simulation honestly one-draw-per-trial.
 */
export const sampleComputational = (
  state: StateVector,
  shots: number,
  random: RandomSource,
): Record<string, number> => {
  const distribution = probabilities(state);
  const cumulative = distribution.reduce<number[]>((running, probability, index) => {
    running.push((running[index - 1] ?? 0) + probability);
    return running;
  }, []);
  const counts = new Array<number>(distribution.length).fill(0);
  for (let shot = 0; shot < shots; shot += 1) {
    const draw = random();
    let index = cumulative.length - 1;
    for (let candidate = 0; candidate < cumulative.length; candidate += 1) {
      if (draw < cumulative[candidate]!) {
        index = candidate;
        break;
      }
    }
    counts[index] += 1;
  }
  const labels = basisLabels(Math.log2(state.length));
  return Object.fromEntries(labels.map((label, index) => [label, counts[index]!]));
};

/**
 * Rotate a state into the eigenbasis of `axis`.
 *
 * Used when the interface shows computational-basis machinery for a
 * non-computational measurement, so the bars and the histogram describe the
 * same basis.
 */
export const rotateIntoAxisBasis = (
  state: StateVector,
  axis: MeasurementAxis,
): StateVector => {
  const { plus, minus } = axisEigenstates(axis);
  return [innerProduct(plus, state), innerProduct(minus, state)];
};

/** Standard error on an observed frequency, for the uncertainty band of §10. */
export const samplingUncertainty = (probability: number, shots: number): number =>
  shots <= 0 ? 0 : Math.sqrt(Math.max(probability * (1 - probability), 0) / shots);
