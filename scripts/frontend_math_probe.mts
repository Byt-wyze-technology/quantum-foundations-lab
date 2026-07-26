/**
 * Emits the frontend's answers to a fixed battery of questions as JSON.
 *
 * `tests/integration/test_frontend_backend_agreement.py` bundles this with
 * esbuild, runs it under Node, and compares every number against the Python
 * core. That is how §21's "frontend and backend agree numerically" is checked
 * rather than assumed: the two implementations are independent, so only an
 * actual comparison can catch a drift between them.
 */

import {
  CNOT,
  H,
  S,
  T,
  X,
  Y,
  Z,
  applyGate,
  axisDistribution,
  bellPhiPlus,
  bellPsiMinus,
  chshValue,
  concurrenceTwoQubit,
  correlation,
  expectationAlongAxis,
  planarAxis,
  probabilities,
  qubitFromAngles,
  reducedPurity,
  tensorProduct,
  varianceAlongAxis,
} from "../apps/web/frontend/src/math/index";

const ANGLE_GRID = [0, 0.4, 1.0, Math.PI / 2, 2.2, Math.PI];
const PHASE_GRID = [0, 0.7, Math.PI / 2, 3.9, 2 * Math.PI - 0.1];

const gates: Record<string, typeof X> = { X, Y, Z, H, S, T };

const output = {
  stateProbabilities: ANGLE_GRID.flatMap((theta) =>
    PHASE_GRID.map((phi) => ({
      theta,
      phi,
      probabilities: probabilities(qubitFromAngles(theta, phi)),
    })),
  ),

  gateApplication: Object.entries(gates).flatMap(([name, matrix]) =>
    ANGLE_GRID.map((theta) => ({
      gate: name,
      theta,
      probabilities: probabilities(applyGate(qubitFromAngles(theta, 0.9), matrix, [0], 1)),
    })),
  ),

  axisStatistics: ANGLE_GRID.flatMap((theta) =>
    ANGLE_GRID.map((axisTheta) => {
      const state = qubitFromAngles(theta, 1.1);
      const axis = planarAxis(axisTheta);
      return {
        theta,
        axisTheta,
        expectation: expectationAlongAxis(state, axis),
        variance: varianceAlongAxis(state, axis),
        plusProbability: axisDistribution(state, axis)[0]!.probability,
      };
    }),
  ),

  entanglement: [
    { name: "phi_plus", state: bellPhiPlus() },
    { name: "psi_minus", state: bellPsiMinus() },
    { name: "product", state: tensorProduct(qubitFromAngles(0.8, 0.3), qubitFromAngles(2.1, 1.7)) },
    {
      name: "bell_from_circuit",
      state: applyGate(
        applyGate(
          [
            { re: 1, im: 0 },
            { re: 0, im: 0 },
            { re: 0, im: 0 },
            { re: 0, im: 0 },
          ],
          H,
          [0],
          2,
        ),
        CNOT,
        [0, 1],
        2,
      ),
    },
  ].map((entry) => ({
    name: entry.name,
    probabilities: probabilities(entry.state),
    concurrence: concurrenceTwoQubit(entry.state),
    reducedPurity: reducedPurity(entry.state),
  })),

  correlations: ANGLE_GRID.map((theta) => ({
    theta,
    value: correlation(bellPsiMinus(), planarAxis(0), planarAxis(theta)),
  })),

  chsh: [
    { a: 0, aPrime: Math.PI / 2, b: Math.PI / 4, bPrime: -Math.PI / 4 },
    { a: 0, aPrime: 0, b: 0, bPrime: 0 },
    { a: 0.3, aPrime: 1.9, b: 0.9, bPrime: -1.2 },
  ].map((setting) => ({
    ...setting,
    s: chshValue(
      bellPsiMinus(),
      planarAxis(setting.a),
      planarAxis(setting.aPrime),
      planarAxis(setting.b),
      planarAxis(setting.bPrime),
    ),
  })),
};

process.stdout.write(JSON.stringify(output));
