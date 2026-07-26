/**
 * The reduced state of each qubit (§8.9, §9).
 *
 * This panel is where §21's rule is enforced visually: an entangled qubit is
 * never drawn as an independent pure state. Each sphere shows the arrow at its
 * true length, so a Bell pair's halves are visibly arrowless dots inside a
 * shaded ball, and the purity is printed beside them in figures.
 */

import { type StateVector, blochVectorOfDensityMatrix, blochLength, purity, reducedDensityMatrix } from "../math";
import { BlochSphere } from "./BlochSphere";

export type ReducedStatePanelProps = {
  state: StateVector;
  size?: number;
};

const describe = (length: number): string => {
  if (length > 0.999) return "pure — this qubit has a state of its own";
  if (length < 1e-6) return "maximally mixed — no state of its own at all";
  return "mixed — only partly described on its own";
};

export function ReducedStatePanel({ state, size = 168 }: ReducedStatePanelProps) {
  const halves = ([0, 1] as const).map((qubit) => {
    const rho = reducedDensityMatrix(state, [qubit], 2);
    const vector = blochVectorOfDensityMatrix(rho);
    return {
      qubit,
      vector,
      length: blochLength(vector),
      purityValue: purity(rho),
    };
  });

  return (
    <div className="reduced-panel">
      {halves.map((half) => (
        <figure key={half.qubit} className="reduced-half">
          <figcaption>
            <span className="eyebrow">QUBIT {half.qubit}</span>
          </figcaption>
          <BlochSphere
            mixedVector={half.vector}
            showAxes
            showPhaseArc={false}
            size={size}
            label={`Reduced state of qubit ${half.qubit}`}
          />
          <p className="reading">
            purity <b>{half.purityValue.toFixed(3)}</b> · arrow{" "}
            <b>{(half.length * 100).toFixed(0)}%</b>
          </p>
          <p className="caption">{describe(half.length)}</p>
        </figure>
      ))}
    </div>
  );
}
