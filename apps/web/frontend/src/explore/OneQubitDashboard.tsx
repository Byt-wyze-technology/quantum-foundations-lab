/**
 * Explore, one-qubit mode (§9).
 *
 * The six panels §9 requires: Bloch sphere, state amplitudes, probability
 * bars, current matrix, circuit history and measurement histogram.
 */

import { useMemo, useState } from "react";

import {
  type GateName,
  H,
  I,
  MAX_CIRCUIT_DEPTH,
  S,
  SDG,
  T,
  TDG,
  X,
  Y,
  Z,
  basisLabels,
  gateMatrix,
  identityMatrix,
  matrixMultiply,
} from "../math";
import {
  selectAxisDistribution,
  selectBlochVector,
  useLabStore,
} from "../store/labStore";
import { AmplitudeBars } from "../viz/AmplitudeBars";
import { AmplitudePhasor } from "../viz/AmplitudePhasor";
import { BlochSphere } from "../viz/BlochSphere";
import { CircuitBuilder } from "../viz/CircuitBuilder";
import { MatrixDisplay } from "../viz/MatrixDisplay";
import { MeasurementHistogram } from "../viz/MeasurementHistogram";
import { StateEquation } from "../viz/StateEquation";

const SINGLE_QUBIT_GATES = [
  { name: "X" as const, matrix: X, hint: "Half turn about x — swaps |0⟩ and |1⟩" },
  { name: "Y" as const, matrix: Y, hint: "Half turn about y" },
  { name: "Z" as const, matrix: Z, hint: "Half turn about z — flips the sign of |1⟩" },
  { name: "H" as const, matrix: H, hint: "Maps |0⟩ to |+⟩ and back" },
  { name: "S" as const, matrix: S, hint: "Quarter turn of phase" },
  { name: "SDG" as const, matrix: SDG, hint: "Undoes S" },
  { name: "T" as const, matrix: T, hint: "Eighth turn of phase" },
  { name: "TDG" as const, matrix: TDG, hint: "Undoes T" },
  { name: "I" as const, matrix: I, hint: "Does nothing — the identity" },
];

const SHOT_BATCHES = [10, 100, 1000];
const degrees = (radians: number) => (radians * 180) / Math.PI;
const radians = (deg: number) => (deg * Math.PI) / 180;
const clamp = (value: number) => Math.min(1, Math.max(-1, value));

export function OneQubitDashboard() {
  const store = useLabStore();
  const { currentState, circuit, measurementAxis, histogram, totalShots, lastMeasurement } = store;
  const [rotationAngle, setRotationAngle] = useState(90);
  // The palette is also the drag source for the circuit builder, so a
  // selected gate can be placed by keyboard as well as dropped.
  const [selectedGate, setSelectedGate] = useState<GateName | null>(null);

  const labels = basisLabels(1);
  const bloch = selectBlochVector(store);
  const distribution = selectAxisDistribution(store);

  const circuitMatrix = useMemo(
    () =>
      circuit.reduce(
        (accumulated, operation) =>
          matrixMultiply(gateMatrix(operation.gate, operation.parameters), accumulated),
        identityMatrix(2),
      ),
    [circuit],
  );

  const histogramEntries = (distribution ?? []).map((outcome) => ({
    label: outcome.label,
    expected: outcome.probability,
    observed: histogram[outcome.label] ?? 0,
  }));

  return (
    <div className="lab-dashboard">
      <div className="lab-column">
        <section className="panel">
          <h2>Bloch sphere</h2>
          <BlochSphere
            state={currentState.amplitudes}
            interactive
            showAxes
            showPhaseArc
            measurementAxis={measurementAxis}
            onStateChange={(next) => store.setInitialState(next)}
            size={300}
          />
          <div className="bloch-readout">
            <span>
              θ <b>{bloch ? degrees(Math.acos(clamp(bloch.z))).toFixed(1) : "—"}°</b>
            </span>
            <span>
              φ{" "}
              <b>
                {bloch
                  ? (((Math.atan2(bloch.y, bloch.x) * 180) / Math.PI + 360) % 360).toFixed(1)
                  : "—"}
                °
              </b>
            </span>
          </div>
          <p className="caption">
            Drag to move the state. Hold Shift and drag to orbit the view. Arrow keys move the
            state; Home returns it to |0⟩. The sphere is a map of the possible states of one qubit,
            not a picture of a physical object.
          </p>
        </section>

        <section className="panel">
          <h2>Gate palette</h2>
          <div className="gate-palette">
            {SINGLE_QUBIT_GATES.map((gate) => (
              <button
                key={gate.name}
                type="button"
                title={gate.hint}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", gate.name);
                  setSelectedGate(gate.name);
                }}
                onClick={() => store.applyGate(gate.name, [0])}
                onDoubleClick={() =>
                  setSelectedGate(selectedGate === gate.name ? null : gate.name)
                }
                className={selectedGate === gate.name ? "active" : ""}
              >
                {gate.name}
              </button>
            ))}
          </div>
          <label className="range" style={{ marginTop: 16 }}>
            Rotation angle: <b>{rotationAngle}°</b>
            <input
              type="range"
              min={-180}
              max={180}
              step={5}
              value={rotationAngle}
              onChange={(event) => setRotationAngle(Number(event.target.value))}
            />
          </label>
          <div className="gate-palette">
            {(["RX", "RY", "RZ", "PHASE"] as const).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() =>
                  store.applyGate(name, [0], {
                    [name === "PHASE" ? "phi" : "theta"]: radians(rotationAngle),
                  })
                }
              >
                {name}
              </button>
            ))}
          </div>
          <p className="caption">
            Click a gate to apply it, or drag it onto a wire in the Circuit panel. Every gate here
            is unitary, so every one can be undone exactly. Depth {circuit.length}/
            {MAX_CIRCUIT_DEPTH}.
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
          <h2>State</h2>
          <StateEquation amplitudes={currentState.amplitudes} labels={labels} />
          <div style={{ marginTop: 18 }}>
            <AmplitudeBars amplitudes={currentState.amplitudes} labels={labels} />
          </div>
        </section>

        <section className="panel">
          <h2>Amplitudes as phasors</h2>
          <div className="phasor-grid">
            {currentState.amplitudes.map((amplitude, index) => (
              <AmplitudePhasor
                key={labels[index]}
                amplitude={amplitude}
                label={`α${labels[index]}`}
              />
            ))}
          </div>
          <p className="caption">
            Length is the magnitude, angle is the phase. Turning one hand without changing its
            length leaves the Z-basis probabilities untouched — but not the X-basis ones.
          </p>
        </section>

        <section className="panel">
          <h2>Circuit matrix</h2>
          <details className="reveal">
            <summary>Show the mathematics</summary>
            <div style={{ marginTop: 14 }}>
              <MatrixDisplay
                matrix={circuitMatrix}
                caption="The product of every gate applied so far, acting on the prepared state."
              />
            </div>
          </details>
        </section>
      </div>

      <div className="lab-column">
        <section className="panel">
          <h2>Measurement</h2>
          {distribution && (
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
              {distribution.map((outcome) => (
                <li key={outcome.label} className="amplitude-row">
                  <span className="amplitude-label">{outcome.label}</span>
                  <span className="amplitude-track">
                    <span
                      className="amplitude-fill"
                      style={{
                        width: `${outcome.probability * 100}%`,
                        background: outcome.eigenvalue === 1 ? "#75d5b3" : "#e0a458",
                      }}
                    />
                  </span>
                  <span className="amplitude-figures">
                    <b>{(outcome.probability * 100).toFixed(1)}%</b>
                    predicted
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="gate-palette" style={{ marginTop: 16 }}>
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
              probability {(lastMeasurement.probability * 100).toFixed(1)}%. That qubit is now in
              the corresponding eigenstate; measuring it again gives the same answer.
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
