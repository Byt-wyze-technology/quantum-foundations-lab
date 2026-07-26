/**
 * §8.10 — the Bell-state builder.
 *
 *     |0⟩ ──H──●──
 *              │
 *     |0⟩ ─────X──
 *
 * Step through the circuit and watch every panel update together: the
 * amplitudes, the probabilities, both reduced states and the entanglement
 * indicator. The interesting moment is the second gate — the probabilities
 * barely change, and the reduced states collapse from pure to maximally mixed.
 */

import { useState } from "react";

import {
  type StateVector,
  CNOT,
  H,
  applyGate,
  basisLabels,
  computationalBasisState,
} from "../../math";
import { AmplitudeBars } from "../../viz/AmplitudeBars";
import { EntanglementIndicator } from "../../viz/EntanglementIndicator";
import { ReducedStatePanel } from "../../viz/ReducedStatePanel";
import { StateEquation } from "../../viz/StateEquation";

const LABELS = basisLabels(2);

const STEPS: { label: string; note: string }[] = [
  {
    label: "Prepare |00⟩",
    note: "Both qubits start in |0⟩. Nothing is entangled — each has a perfectly definite state.",
  },
  {
    label: "H on qubit 0",
    note: "Qubit 0 is now in |+⟩. The pair is still a product state: |+⟩ ⊗ |0⟩. Qubit 1 has not been touched, and its reduced state is still pure.",
  },
  {
    label: "CNOT, control 0, target 1",
    note: "Now the pair is |Φ⁺⟩. The joint probabilities scarcely moved — but both reduced states have gone from pure to maximally mixed. Neither qubit has a state of its own any more.",
  },
];

const stateAfter = (step: number): StateVector => {
  let state = computationalBasisState("00");
  if (step >= 1) state = applyGate(state, H, [0], 2);
  if (step >= 2) state = applyGate(state, CNOT, [0, 1], 2);
  return state;
};

export function BellStateBuilder() {
  const [step, setStep] = useState(0);
  const state = stateAfter(step);

  return (
    <div className="bell-builder">
      <div className="bell-circuit-column">
        <h3>The circuit</h3>
        <svg
          viewBox="0 0 300 130"
          className="bell-circuit"
          role="img"
          aria-label={`A two-qubit circuit: Hadamard on qubit 0, then a controlled-NOT with qubit 0 as control and qubit 1 as target. ${STEPS[step]!.label} has been applied.`}
        >
          <text x="4" y="44" className="diagram-label">
            |0⟩
          </text>
          <text x="4" y="104" className="diagram-label">
            |0⟩
          </text>
          <line x1="34" y1="40" x2="290" y2="40" stroke="#102224" strokeWidth="1.2" />
          <line x1="34" y1="100" x2="290" y2="100" stroke="#102224" strokeWidth="1.2" />

          {/* Hadamard */}
          <rect
            x="96"
            y="22"
            width="36"
            height="36"
            fill={step >= 1 ? "#75d5b3" : "#f8f5ee"}
            stroke="#102224"
            strokeWidth="1.4"
          />
          <text x="108" y="46" className="gate-glyph">
            H
          </text>

          {/* CNOT */}
          <line
            x1="200"
            y1="40"
            x2="200"
            y2="100"
            stroke={step >= 2 ? "#102224" : "#b9b9b2"}
            strokeWidth="1.4"
          />
          <circle cx="200" cy="40" r="6" fill={step >= 2 ? "#102224" : "#b9b9b2"} />
          <circle
            cx="200"
            cy="100"
            r="14"
            fill={step >= 2 ? "#75d5b3" : "#f8f5ee"}
            stroke={step >= 2 ? "#102224" : "#b9b9b2"}
            strokeWidth="1.4"
          />
          <line x1="186" y1="100" x2="214" y2="100" stroke="#102224" strokeWidth="1.2" />
          <line x1="200" y1="86" x2="200" y2="114" stroke="#102224" strokeWidth="1.2" />
        </svg>

        <div className="gate-palette" style={{ marginTop: 12 }}>
          {STEPS.map((entry, index) => (
            <button
              key={entry.label}
              type="button"
              className={step === index ? "active" : ""}
              onClick={() => setStep(index)}
            >
              {index === 0 ? "Start" : `Step ${index}`}
            </button>
          ))}
        </div>

        <p className="reading" style={{ marginTop: 14 }}>
          {STEPS[step]!.label}
        </p>
        <p className="caption">{STEPS[step]!.note}</p>

        <div style={{ marginTop: 18 }}>
          <StateEquation amplitudes={state} labels={LABELS} block />
        </div>
      </div>

      <div className="bell-panels">
        <div>
          <h4 className="panel-subhead">Joint amplitudes</h4>
          <AmplitudeBars amplitudes={state} labels={LABELS} />
        </div>
        <div>
          <h4 className="panel-subhead">Each qubit on its own</h4>
          <ReducedStatePanel state={state} size={140} />
        </div>
        <div>
          <h4 className="panel-subhead">Entanglement</h4>
          <EntanglementIndicator state={state} />
        </div>
      </div>
    </div>
  );
}
