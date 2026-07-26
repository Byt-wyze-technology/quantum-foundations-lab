/**
 * Explore, two-qubit mode (§9).
 *
 * The seven panels §9 requires: joint amplitude chart, joint probability
 * chart, circuit, reduced-state panels, correlation matrix, entanglement
 * indicator and measurement histogram.
 *
 * There is deliberately no pair of Bloch spheres presented as "the two
 * qubits". The reduced-state panel shows what each qubit's own description
 * really is, arrow length and all, which for an entangled pair is no arrow at
 * all (§1, §21).
 */

import { useState } from "react";

import {
  type GateName,
  MAX_CIRCUIT_DEPTH,
  basisLabels,
  probabilities,
  reducedDensityMatrix,
} from "../math";
import {
  selectEntanglementMeasure,
  useLabStore,
} from "../store/labStore";
import { AmplitudeBars } from "../viz/AmplitudeBars";
import { CircuitBuilder } from "../viz/CircuitBuilder";
import { CorrelationTable } from "../viz/CorrelationTable";
import { DensityMatrixHeatmap } from "../viz/DensityMatrixHeatmap";
import { EntanglementIndicator } from "../viz/EntanglementIndicator";
import { MeasurementHistogram } from "../viz/MeasurementHistogram";
import { ReducedStatePanel } from "../viz/ReducedStatePanel";
import { StateEquation } from "../viz/StateEquation";

const SINGLE_QUBIT_GATES = ["X", "Y", "Z", "H", "S", "T"] as const;
const SHOT_BATCHES = [10, 100, 1000];

export function TwoQubitDashboard() {
  const store = useLabStore();
  const { currentState, circuit, histogram, totalShots, lastMeasurement } = store;
  const [target, setTarget] = useState<0 | 1>(0);
  const [selectedGate, setSelectedGate] = useState<GateName | null>(null);

  const labels = basisLabels(2);
  const amplitudes = currentState.amplitudes;
  const probs = probabilities(amplitudes);
  const concurrence = selectEntanglementMeasure(store) ?? 0;

  const histogramEntries = labels.map((label, index) => ({
    label,
    expected: probs[index]!,
    observed: histogram[label] ?? 0,
  }));

  return (
    <div className="lab-dashboard">
      <div className="lab-column">
        <section className="panel">
          <h2>Joint state</h2>
          <StateEquation amplitudes={amplitudes} labels={labels} />
          <div style={{ marginTop: 16 }}>
            <AmplitudeBars amplitudes={amplitudes} labels={labels} />
          </div>
          <p className="caption">
            Four amplitudes, one for each pair of outcomes. Bar length is the magnitude and colour
            is the phase — Φ⁺ and Φ⁻ have identical bars and opposite colours on |11⟩.
          </p>
        </section>

        <section className="panel">
          <h2>Gate palette</h2>
          <div role="group" aria-label="Target qubit for single-qubit gates">
            <span className="control-legend">Apply single-qubit gates to</span>
            <div className="gate-palette" style={{ marginTop: 7 }}>
              {([0, 1] as const).map((qubit) => (
                <button
                  key={qubit}
                  type="button"
                  className={target === qubit ? "active" : ""}
                  onClick={() => setTarget(qubit)}
                  aria-pressed={target === qubit}
                >
                  q{qubit}
                </button>
              ))}
            </div>
          </div>
          <div className="gate-palette" style={{ marginTop: 14 }}>
            {SINGLE_QUBIT_GATES.map((gate) => (
              <button
                key={gate}
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", gate);
                  setSelectedGate(gate);
                }}
                onClick={() => store.applyGate(gate, [target])}
                onDoubleClick={() => setSelectedGate(selectedGate === gate ? null : gate)}
                className={selectedGate === gate ? "active" : ""}
              >
                {gate}
              </button>
            ))}
          </div>
          <span className="control-legend" style={{ marginTop: 16, display: "block" }}>
            Two-qubit gates
          </span>
          <div className="gate-palette" style={{ marginTop: 7 }}>
            <button
              type="button"
              className="two-qubit"
              title="Controlled-NOT with qubit 0 as control"
              onClick={() => store.applyGate("CNOT", [0, 1])}
            >
              CNOT 0→1
            </button>
            <button
              type="button"
              className="two-qubit"
              title="Controlled-NOT with qubit 1 as control"
              onClick={() => store.applyGate("CNOT", [1, 0])}
            >
              CNOT 1→0
            </button>
            <button type="button" className="two-qubit" onClick={() => store.applyGate("CZ", [0, 1])}>
              CZ
            </button>
            <button
              type="button"
              className="two-qubit"
              onClick={() => store.applyGate("SWAP", [0, 1])}
            >
              SWAP
            </button>
          </div>
          <p className="caption">
            Click a gate to apply it, or drag it onto a wire in the Circuit panel. Single-qubit
            gates can never create entanglement — only the two-qubit gates can. Try H on q0
            followed by CNOT 0→1. Depth {circuit.length}/{MAX_CIRCUIT_DEPTH}.
          </p>
        </section>

        <section className="panel">
          <h2>Circuit</h2>
          <CircuitBuilder
            circuit={circuit}
            qubitCount={currentState.qubitCount}
            onPlace={(gate, targets) => store.applyGate(gate, targets)}
            onRemove={(id) => store.removeGate(id)}
            onStepChange={(steps) =>
              store.setPlaybackStep(steps === circuit.length ? null : steps)
            }
            step={store.playbackStep ?? circuit.length}
            selected={selectedGate}
          />
        </section>
      </div>

      <div className="lab-column">
        <section className="panel">
          <h2>Each qubit on its own</h2>
          <ReducedStatePanel state={amplitudes} size={150} />
          <p className="caption">
            These are reduced states, not two independent qubits. When the pair is entangled the
            arrows shrink — for a Bell pair they vanish entirely, because neither qubit has a state
            of its own to draw.
          </p>
        </section>

        <section className="panel">
          <h2>Entanglement</h2>
          <EntanglementIndicator state={amplitudes} />
        </section>

        <section className="panel">
          <h2>Reduced density matrices</h2>
          <details className="reveal">
            <summary>Show the mathematics</summary>
            <div style={{ marginTop: 14, display: "grid", gap: 18 }}>
              {([0, 1] as const).map((qubit) => (
                <div key={qubit}>
                  <span className="eyebrow">ρ — QUBIT {qubit}</span>
                  <DensityMatrixHeatmap
                    rho={reducedDensityMatrix(amplitudes, [qubit], 2)}
                    labels={basisLabels(1)}
                    caption={
                      concurrence > 0.999
                        ? "Both off-diagonal entries are zero and the diagonal is even: this is I/2, the maximally mixed state."
                        : "Diagonal entries are this qubit's outcome probabilities; off-diagonal entries are its coherences."
                    }
                  />
                </div>
              ))}
            </div>
          </details>
        </section>
      </div>

      <div className="lab-column">
        <section className="panel">
          <h2>Joint outcomes</h2>
          <CorrelationTable state={amplitudes} />
          <p className="caption">
            The margins are what each qubit sees on its own. A Bell pair and two independent fair
            coins have identical margins — the grid is where they differ.
          </p>
        </section>

        <section className="panel">
          <h2>Measurement</h2>
          <p style={{ marginTop: 0 }}>
            Both qubits are measured together in the computational basis, giving one of the four
            joint outcomes.
          </p>
          <div className="gate-palette" style={{ marginTop: 12 }}>
            <button type="button" onClick={() => store.runSingleMeasurement()}>
              Measure once
            </button>
            {SHOT_BATCHES.map((shots) => (
              <button key={shots} type="button" onClick={() => store.runShots(shots)}>
                {shots.toLocaleString()} shots
              </button>
            ))}
            <button type="button" onClick={() => store.resetHistogram()}>
              Clear
            </button>
          </div>
          {lastMeasurement && (
            <p className="notice mint-notice" style={{ marginTop: 16 }} role="status">
              Single measurement read <b>{lastMeasurement.outcome}</b> — an outcome with
              probability {(lastMeasurement.probability * 100).toFixed(1)}%. Both qubits are now
              settled; measuring this pair again gives the same answer.
            </p>
          )}
        </section>

        <section className="panel">
          <h2>Statistics</h2>
          <MeasurementHistogram entries={histogramEntries} totalShots={totalShots} />
        </section>
      </div>
    </div>
  );
}
