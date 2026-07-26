/**
 * §8.9 — entanglement.
 *
 * A product state and a Bell pair, side by side, with the same panels under
 * each: joint amplitudes, joint probabilities, both reduced states, purity and
 * the correlation table. The difference is then something the learner reads
 * off two identical layouts rather than something asserted in prose.
 *
 * Below that, the challenge §8.9 asks for: try to reach |Φ⁺⟩ using two
 * independent single-qubit sliders. The panel reports how close the best
 * attempt gets and why it cannot arrive — which is a good deal more rigorous
 * than saying the particles are "linked".
 */

import { useState } from "react";

import {
  type StateVector,
  basisLabels,
  bellPhiPlus,
  complex,
  concurrenceTwoQubit,
  expI,
  innerProduct,
  ket0,
  ketPlus,
  magnitude,
  reducedPurity,
  scale,
  tensorProduct,
} from "../../math";
import { AmplitudeBars } from "../../viz/AmplitudeBars";
import { CorrelationTable } from "../../viz/CorrelationTable";
import { EntanglementIndicator } from "../../viz/EntanglementIndicator";
import { ReducedStatePanel } from "../../viz/ReducedStatePanel";

const LABELS = basisLabels(2);

function StateColumn({
  title,
  subtitle,
  state,
}: {
  title: string;
  subtitle: string;
  state: StateVector;
}) {
  return (
    <div className="comparison-column">
      <h3>{title}</h3>
      <p className="caption" style={{ marginTop: -6 }}>
        {subtitle}
      </p>
      <AmplitudeBars amplitudes={state} labels={LABELS} />
      <h4 className="panel-subhead">Each qubit on its own</h4>
      <ReducedStatePanel state={state} size={140} />
      <h4 className="panel-subhead">Joint outcomes</h4>
      <CorrelationTable state={state} />
      <EntanglementIndicator state={state} />
    </div>
  );
}

export function EntanglementComparison() {
  const [leftWeight, setLeftWeight] = useState(50);
  const [leftPhase, setLeftPhase] = useState(0);
  const [rightWeight, setRightWeight] = useState(50);
  const [rightPhase, setRightPhase] = useState(0);

  const target = bellPhiPlus();
  const attempt = tensorProduct(
    [
      complex(Math.sqrt(1 - leftWeight / 100)),
      scale(expI((leftPhase * Math.PI) / 180), Math.sqrt(leftWeight / 100)),
    ],
    [
      complex(Math.sqrt(1 - rightWeight / 100)),
      scale(expI((rightPhase * Math.PI) / 180), Math.sqrt(rightWeight / 100)),
    ],
  );

  // |⟨Φ⁺|attempt⟩|² — the best any product state can manage is ½.
  const overlap = magnitude(innerProduct(target, attempt)) ** 2;

  return (
    <div className="lesson-stack">
      <div className="comparison-grid">
        <StateColumn
          title="A product state"
          subtitle="|+⟩ ⊗ |0⟩ — built from two independent qubits"
          state={tensorProduct(ketPlus(), ket0())}
        />
        <StateColumn
          title="A Bell pair"
          subtitle="(|00⟩ + |11⟩)/√2 — not built from two independent qubits at all"
          state={target}
        />
      </div>

      <div className="challenge-panel">
        <h3>Try to build the Bell pair from two separate qubits</h3>
        <p>
          Both sliders below control one qubit each, independently — exactly what a product state
          allows. See how close you can get to (|00⟩ + |11⟩)/√2.
        </p>
        <div className="challenge-controls">
          <div>
            <span className="control-legend">Qubit 0</span>
            <label className="range">
              weight on |1⟩: <b>{leftWeight}%</b>
              <input
                type="range"
                min={0}
                max={100}
                value={leftWeight}
                onChange={(event) => setLeftWeight(Number(event.target.value))}
              />
            </label>
            <label className="range">
              phase: <b>{leftPhase}°</b>
              <input
                type="range"
                min={0}
                max={359}
                value={leftPhase}
                onChange={(event) => setLeftPhase(Number(event.target.value))}
              />
            </label>
          </div>
          <div>
            <span className="control-legend">Qubit 1</span>
            <label className="range">
              weight on |1⟩: <b>{rightWeight}%</b>
              <input
                type="range"
                min={0}
                max={100}
                value={rightWeight}
                onChange={(event) => setRightWeight(Number(event.target.value))}
              />
            </label>
            <label className="range">
              phase: <b>{rightPhase}°</b>
              <input
                type="range"
                min={0}
                max={359}
                value={rightPhase}
                onChange={(event) => setRightPhase(Number(event.target.value))}
              />
            </label>
          </div>
        </div>

        <div className="challenge-result">
          <AmplitudeBars amplitudes={attempt} labels={LABELS} />
          <div>
            <p className="reading">
              overlap with |Φ⁺⟩: <b>{(overlap * 100).toFixed(1)}%</b> · concurrence of your state:{" "}
              <b>{concurrenceTwoQubit(attempt).toFixed(3)}</b> · subsystem purity{" "}
              <b>{reducedPurity(attempt).toFixed(3)}</b>
            </p>
            <p className="notice" role="status">
              No pair of independent single-qubit states can reproduce these amplitudes. A product
              state always has α₀₀α₁₁ = α₀₁α₁₀, and |Φ⁺⟩ has α₀₀α₁₁ = ½ while α₀₁α₁₀ = 0. The best
              any product state can reach is 50% overlap.
            </p>
            <p className="caption">
              This is what "entangled" means: not that the qubits influence each other, but that
              the pair has a joint description which no pair of separate descriptions can
              reproduce.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
