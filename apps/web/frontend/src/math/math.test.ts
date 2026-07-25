/**
 * The TypeScript mathematics, checked against the same invariants as the
 * Python core (§15). Numerical agreement between the two implementations is
 * checked separately in `tests/integration`.
 */

import { describe, expect, it } from "vitest";

import {
  AXIS_X,
  AXIS_Y,
  AXIS_Z,
  CNOT,
  H,
  I,
  S,
  SDG,
  SWAP,
  T,
  TDG,
  X,
  Y,
  Z,
  anglesFromQubit,
  applyGate,
  axisDistribution,
  basisLabels,
  blochVector,
  computationalBasisState,
  equivalentUpToGlobalPhase,
  expectationAlongAxis,
  gateMatrix,
  globalPhaseAlign,
  innerProduct,
  isUnitary,
  ket0,
  ket1,
  ketMinus,
  ketMinusI,
  ketPlus,
  ketPlusI,
  matrixMultiply,
  measureAlongAxis,
  mulberry32,
  norm,
  normalizeState,
  probabilities,
  qubitFromAngles,
  rx,
  ry,
  rz,
  sampleAlongAxis,
  sampleComputational,
  tensorProduct,
  varianceAlongAxis,
} from ".";

const CANONICAL = [ket0(), ket1(), ketPlus(), ketMinus(), ketPlusI(), ketMinusI()];

describe("states", () => {
  it("keeps canonical states normalised", () => {
    for (const state of CANONICAL) expect(norm(state)).toBeCloseTo(1, 12);
  });

  it("builds normalised states from angles", () => {
    expect(norm(qubitFromAngles(Math.PI / 3, Math.PI / 5))).toBeCloseTo(1, 12);
  });

  it("treats a global phase as physically irrelevant", () => {
    const shifted = ketPlus().map((amplitude) => ({
      re: amplitude.re * Math.cos(0.7) - amplitude.im * Math.sin(0.7),
      im: amplitude.re * Math.sin(0.7) + amplitude.im * Math.cos(0.7),
    }));
    expect(equivalentUpToGlobalPhase(ketPlus(), shifted)).toBe(true);
    const angles = anglesFromQubit(shifted);
    const original = anglesFromQubit(ketPlus());
    expect(angles.theta).toBeCloseTo(original.theta, 9);
    expect(angles.phi).toBeCloseTo(original.phi, 9);
  });

  it("distinguishes |+⟩ from |−⟩ despite equal Z probabilities", () => {
    expect(probabilities(ketPlus())).toEqual(probabilities(ketMinus()));
    expect(equivalentUpToGlobalPhase(ketPlus(), ketMinus())).toBe(false);
  });

  it.each([
    ["|0⟩", ket0(), { x: 0, y: 0, z: 1 }],
    ["|1⟩", ket1(), { x: 0, y: 0, z: -1 }],
    ["|+⟩", ketPlus(), { x: 1, y: 0, z: 0 }],
    ["|−⟩", ketMinus(), { x: -1, y: 0, z: 0 }],
    ["|+i⟩", ketPlusI(), { x: 0, y: 1, z: 0 }],
    ["|−i⟩", ketMinusI(), { x: 0, y: -1, z: 0 }],
  ])("places %s at the expected Bloch point", (_name, state, expected) => {
    const vector = blochVector(state);
    expect(vector.x).toBeCloseTo(expected.x, 9);
    expect(vector.y).toBeCloseTo(expected.y, 9);
    expect(vector.z).toBeCloseTo(expected.z, 9);
  });

  it("round-trips angles", () => {
    for (const [theta, phi] of [
      [0.9, 1.7],
      [2.4, 5.9],
      [Math.PI / 2, Math.PI],
    ]) {
      const recovered = anglesFromQubit(qubitFromAngles(theta!, phi!));
      expect(recovered.theta).toBeCloseTo(theta!, 9);
      expect(recovered.phi).toBeCloseTo(phi!, 9);
    }
  });

  it("rescales an unnormalised vector", () => {
    const normalised = normalizeState([
      { re: 3, im: 0 },
      { re: 4, im: 0 },
    ]);
    expect(normalised[0]!.re).toBeCloseTo(0.6, 12);
    expect(normalised[1]!.re).toBeCloseTo(0.8, 12);
  });

  it("rejects the zero vector", () => {
    expect(() =>
      normalizeState([
        { re: 0, im: 0 },
        { re: 0, im: 0 },
      ]),
    ).toThrow();
  });

  it("aligns a global phase so the overlap becomes real and positive", () => {
    const shifted = ketPlus().map((amplitude) => ({
      re: -amplitude.im,
      im: amplitude.re,
    }));
    const aligned = globalPhaseAlign(ketPlus(), shifted);
    const overlap = innerProduct(ketPlus(), aligned);
    expect(overlap.im).toBeCloseTo(0, 12);
    expect(overlap.re).toBeGreaterThan(0);
  });
});

describe("gates", () => {
  it.each([
    ["I", I],
    ["X", X],
    ["Y", Y],
    ["Z", Z],
    ["H", H],
    ["S", S],
    ["SDG", SDG],
    ["T", T],
    ["TDG", TDG],
    ["CNOT", CNOT],
    ["SWAP", SWAP],
  ])("%s is unitary", (_name, gate) => {
    expect(isUnitary(gate)).toBe(true);
  });

  it.each([0, 0.3, Math.PI / 2, Math.PI, 2.9])("rotations by %f are unitary", (angle) => {
    expect(isUnitary(rx(angle))).toBe(true);
    expect(isUnitary(ry(angle))).toBe(true);
    expect(isUnitary(rz(angle))).toBe(true);
  });

  it("swaps the basis states under X", () => {
    expect(equivalentUpToGlobalPhase(applyGate(ket0(), X, [0], 1), ket1())).toBe(true);
    expect(equivalentUpToGlobalPhase(applyGate(ket1(), X, [0], 1), ket0())).toBe(true);
  });

  it("turns |0⟩ into an equal superposition under H", () => {
    const result = applyGate(ket0(), H, [0], 1);
    expect(probabilities(result)[0]).toBeCloseTo(0.5, 12);
    expect(probabilities(result)[1]).toBeCloseTo(0.5, 12);
  });

  it("lets Z change the phase without moving the Z-basis bars", () => {
    const rotated = applyGate(ketPlus(), Z, [0], 1);
    expect(probabilities(rotated)[0]).toBeCloseTo(0.5, 12);
    expect(equivalentUpToGlobalPhase(rotated, ketMinus())).toBe(true);
  });

  it("treats the Paulis as π rotations up to global phase", () => {
    expect(equivalentUpToGlobalPhase(applyGate(ket0(), rx(Math.PI), [0], 1), ket1())).toBe(true);
    expect(
      equivalentUpToGlobalPhase(applyGate(ketPlus(), rz(Math.PI), [0], 1), ketMinus()),
    ).toBe(true);
  });

  it("undoes any gate with its inverse", () => {
    const start = qubitFromAngles(1.1, 2.2);
    const forward = applyGate(start, ry(0.83), [0], 1);
    const back = applyGate(forward, ry(-0.83), [0], 1);
    expect(equivalentUpToGlobalPhase(back, start)).toBe(true);
  });

  it("rejects a non-unitary matrix instead of applying it", () => {
    const shear = [
      [
        { re: 1, im: 0 },
        { re: 1, im: 0 },
      ],
      [
        { re: 0, im: 0 },
        { re: 1, im: 0 },
      ],
    ];
    expect(() => applyGate(ket0(), shear, [0], 1)).toThrow(/U†U = I/);
  });

  it("squares S into Z and T into S", () => {
    const sSquared = matrixMultiply(S, S);
    expect(sSquared[1]![1]!.re).toBeCloseTo(-1, 12);
    const tSquared = matrixMultiply(T, T);
    expect(tSquared[1]![1]!.im).toBeCloseTo(1, 12);
  });

  it("resolves gate names and parameters", () => {
    expect(gateMatrix("H")).toEqual(H);
    expect(gateMatrix("RX", { theta: 0.4 })[0]![0]!.re).toBeCloseTo(Math.cos(0.2), 12);
    expect(() => gateMatrix("RZ")).toThrow();
  });
});

describe("two-qubit ordering", () => {
  it("puts the left-most operand in the most significant position", () => {
    const state = tensorProduct(ket0(), ket1());
    expect(state.map((amplitude) => Number(amplitude.re.toFixed(9)))).toEqual([0, 1, 0, 0]);
    expect(state).toEqual(computationalBasisState("01"));
  });

  it("labels the basis with q0 leading", () => {
    expect(basisLabels(1)).toEqual(["0", "1"]);
    expect(basisLabels(2)).toEqual(["00", "01", "10", "11"]);
  });

  it("applies a gate to the requested qubit only", () => {
    expect(applyGate(computationalBasisState("00"), X, [0], 2)).toEqual(
      computationalBasisState("10"),
    );
    expect(applyGate(computationalBasisState("00"), X, [1], 2)).toEqual(
      computationalBasisState("01"),
    );
  });

  it("flips a CNOT target only when the control is set", () => {
    expect(applyGate(computationalBasisState("10"), CNOT, [0, 1], 2)).toEqual(
      computationalBasisState("11"),
    );
    expect(applyGate(computationalBasisState("00"), CNOT, [0, 1], 2)).toEqual(
      computationalBasisState("00"),
    );
  });

  it("builds a Bell pair from H then CNOT", () => {
    let state = applyGate(computationalBasisState("00"), H, [0], 2);
    state = applyGate(state, CNOT, [0, 1], 2);
    const probs = probabilities(state);
    expect(probs[0]).toBeCloseTo(0.5, 12);
    expect(probs[1]).toBeCloseTo(0, 12);
    expect(probs[2]).toBeCloseTo(0, 12);
    expect(probs[3]).toBeCloseTo(0.5, 12);
  });
});

describe("measurement", () => {
  it("predicts certainty for an eigenstate of the chosen axis", () => {
    const [plus, minus] = axisDistribution(ket0(), AXIS_Z);
    expect(plus!.probability).toBeCloseTo(1, 12);
    expect(minus!.probability).toBeCloseTo(0, 12);
  });

  it("predicts even odds for |+⟩ measured along Z", () => {
    const [plus] = axisDistribution(ketPlus(), AXIS_Z);
    expect(plus!.probability).toBeCloseTo(0.5, 12);
  });

  it("separates |+⟩ from |−⟩ in the X basis", () => {
    expect(axisDistribution(ketPlus(), AXIS_X)[0]!.probability).toBeCloseTo(1, 12);
    expect(axisDistribution(ketMinus(), AXIS_X)[0]!.probability).toBeCloseTo(0, 12);
  });

  it("computes expectation values as the dot product with the Bloch vector", () => {
    expect(expectationAlongAxis(ket0(), AXIS_Z)).toBeCloseTo(1, 12);
    expect(expectationAlongAxis(ket1(), AXIS_Z)).toBeCloseTo(-1, 12);
    expect(expectationAlongAxis(ketPlus(), AXIS_Z)).toBeCloseTo(0, 12);
    expect(expectationAlongAxis(ketPlus(), AXIS_X)).toBeCloseTo(1, 12);
    expect(expectationAlongAxis(ketPlusI(), AXIS_Y)).toBeCloseTo(1, 12);
  });

  it("gives zero variance on an eigenstate and one at the equator", () => {
    expect(varianceAlongAxis(ket0(), AXIS_Z)).toBeCloseTo(0, 12);
    expect(varianceAlongAxis(ketPlus(), AXIS_Z)).toBeCloseTo(1, 12);
  });

  it("collapses onto an eigenstate of the measured axis", () => {
    const outcome = measureAlongAxis(ketPlus(), AXIS_Z, mulberry32(11));
    expect(Math.abs(outcome.eigenvalue)).toBe(1);
    expect(norm(outcome.state)).toBeCloseTo(1, 12);
    const repeat = axisDistribution(outcome.state, AXIS_Z);
    const matching = repeat.find((entry) => entry.eigenvalue === outcome.eigenvalue);
    expect(matching!.probability).toBeCloseTo(1, 9);
  });

  it("converges to the predicted frequencies over many shots", () => {
    const counts = sampleAlongAxis(ketPlus(), AXIS_Z, 20_000, mulberry32(4));
    expect(counts["+1"]! + counts["−1"]!).toBe(20_000);
    expect(counts["+1"]! / 20_000).toBeCloseTo(0.5, 1);
  });

  it("is reproducible from a seed", () => {
    const first = sampleAlongAxis(ketPlus(), AXIS_Z, 500, mulberry32(7));
    const second = sampleAlongAxis(ketPlus(), AXIS_Z, 500, mulberry32(7));
    expect(first).toEqual(second);
  });

  it("never produces an impossible outcome", () => {
    const counts = sampleComputational(ket0(), 500, mulberry32(3));
    expect(counts["0"]).toBe(500);
    expect(counts["1"]).toBe(0);
  });

  it("keeps a Bell pair's outcomes correlated", () => {
    let state = applyGate(computationalBasisState("00"), H, [0], 2);
    state = applyGate(state, CNOT, [0, 1], 2);
    const counts = sampleComputational(state, 2000, mulberry32(9));
    expect(counts["01"]).toBe(0);
    expect(counts["10"]).toBe(0);
    expect(counts["00"]! + counts["11"]!).toBe(2000);
  });

  it("measures the Y axis correctly", () => {
    expect(axisDistribution(ketPlusI(), AXIS_Y)[0]!.probability).toBeCloseTo(1, 12);
    expect(axisDistribution(ketMinusI(), AXIS_Y)[0]!.probability).toBeCloseTo(0, 12);
  });
});
