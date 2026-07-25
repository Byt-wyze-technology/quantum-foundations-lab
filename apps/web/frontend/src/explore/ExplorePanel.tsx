/**
 * The Explore laboratory, one-qubit mode (§9).
 *
 * Every interaction updates every panel simultaneously, which is the whole
 * promise of the mode: change the phase and watch the Bloch arrow swing, the
 * phasor rotate, the X-basis prediction move and the Z-basis bars stay exactly
 * where they were.
 *
 * Two-qubit mode arrives in Phase 4.
 */

import { useMemo, useState } from "react";

import {
  type MeasurementAxis,
  AXIS_FOR_BASIS,
  MAX_CIRCUIT_DEPTH,
  H,
  I,
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
  qubitFromAngles,
} from "../math";
import {
  PRESET_LABELS,
  type PresetName,
  selectAxisDistribution,
  selectBlochVector,
  selectExpectationValues,
  useLabStore,
} from "../store/labStore";
import { AmplitudeBars } from "../viz/AmplitudeBars";
import { AmplitudePhasor } from "../viz/AmplitudePhasor";
import { BlochSphere } from "../viz/BlochSphere";
import { CircuitHistory } from "../viz/CircuitHistory";
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

/** The repeat controls named in §8.7. */
const SHOT_BATCHES = [10, 100, 1000];

const degrees = (radians: number) => (radians * 180) / Math.PI;
const radians = (deg: number) => (deg * Math.PI) / 180;

export function ExplorePanel() {
  const store = useLabStore();
  const {
    currentState,
    circuit,
    measurementAxis,
    histogram,
    totalShots,
    error,
    lastMeasurement,
    seed,
  } = store;

  const [rotationAngle, setRotationAngle] = useState(90);
  const [showMatrix, setShowMatrix] = useState(false);
  const [copied, setCopied] = useState(false);

  const labels = basisLabels(currentState.qubitCount);
  const bloch = selectBlochVector(store);
  const expectations = selectExpectationValues(store);
  const distribution = selectAxisDistribution(store);

  /** The cumulative unitary of the circuit so far (§9, "current matrix"). */
  const circuitMatrix = useMemo(
    () =>
      circuit.reduce(
        (accumulated, operation) =>
          matrixMultiply(gateMatrix(operation.gate, operation.parameters), accumulated),
        identityMatrix(2 ** currentState.qubitCount),
      ),
    [circuit, currentState.qubitCount],
  );

  const basis = axisBasis(measurementAxis);

  const histogramEntries = useMemo(() => {
    if (!distribution) return [];
    return distribution.map((outcome) => ({
      label: outcome.label,
      expected: outcome.probability,
      observed: histogram[outcome.label] ?? 0,
    }));
  }, [distribution, histogram]);

  const shareState = async () => {
    const parameters = new URLSearchParams();
    const angles = blochAngles(store.initialState.amplitudes);
    parameters.set("theta", angles.theta.toFixed(6));
    parameters.set("phi", angles.phi.toFixed(6));
    if (circuit.length > 0) {
      parameters.set(
        "circuit",
        circuit
          .map((operation) => {
            const angle = operation.parameters?.theta ?? operation.parameters?.phi;
            return angle === undefined ? operation.gate : `${operation.gate}:${angle.toFixed(5)}`;
          })
          .join(","),
      );
    }
    parameters.set("axis", `${measurementAxis.theta.toFixed(6)}_${measurementAxis.phi.toFixed(6)}`);
    const url = `${window.location.origin}${window.location.pathname}?${parameters.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this link to share the current state:", url);
    }
  };

  return (
    <main className="explore">
      <div className="explore-toolbar">
        <div className="explore-head">
          <div>
            <span className="eyebrow mint">EXPLORE LABORATORY</span>
            <h1>One qubit, every view at once.</h1>
          </div>
          <p>
            Prepare a state, rotate it with gates, choose what to measure, then repeat the
            experiment. The Bloch sphere, the amplitudes, the matrix and the statistics all
            describe the same qubit.
          </p>
        </div>

        <div className="lab-controls">
          <label>
            Qubits
            <select value={currentState.qubitCount} onChange={() => undefined} disabled>
              <option value={1}>1</option>
            </select>
          </label>

          {/* A group of buttons, not a labelled control: a <label> here would
              attach its whole text to the first button's accessible name. */}
          <div role="group" aria-label="Starting state" style={{ flex: "2 1 320px" }}>
            <span className="control-legend">Starting state</span>
            <span className="state-buttons" style={{ marginTop: 7 }}>
              {PRESET_LABELS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  title={preset.description}
                  onClick={() => store.loadPreset(preset.name as PresetName)}
                >
                  {preset.label}
                </button>
              ))}
            </span>
          </div>

          <label>
            Measurement basis
            <select
              value={basis}
              onChange={(event) => {
                const value = event.target.value as "Z" | "X" | "Y" | "custom";
                if (value !== "custom") store.setMeasurementAxis(AXIS_FOR_BASIS[value]);
              }}
            >
              <option value="Z">Z — computational</option>
              <option value="X">X</option>
              <option value="Y">Y</option>
              <option value="custom">Custom axis</option>
            </select>
          </label>

          <label>
            Axis θ ({degrees(measurementAxis.theta).toFixed(0)}°)
            <input
              type="range"
              min={0}
              max={180}
              step={1}
              value={degrees(measurementAxis.theta)}
              onChange={(event) =>
                store.setMeasurementAxis({
                  theta: radians(Number(event.target.value)),
                  phi: measurementAxis.phi,
                })
              }
            />
          </label>

          <label>
            Axis φ ({degrees(measurementAxis.phi).toFixed(0)}°)
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={degrees(measurementAxis.phi)}
              onChange={(event) =>
                store.setMeasurementAxis({
                  theta: measurementAxis.theta,
                  phi: radians(Number(event.target.value)),
                })
              }
            />
          </label>

          <label>
            Seed
            <input
              type="number"
              value={seed ?? ""}
              placeholder="none"
              onChange={(event) =>
                store.setSeed(event.target.value === "" ? null : Number(event.target.value))
              }
              title="Set a seed to make a classroom demonstration reproducible"
            />
          </label>

          <button type="button" className="button ghost" onClick={() => store.undoGate()}>
            Undo
          </button>
          <button type="button" className="button ghost" onClick={() => store.resetCircuit()}>
            Reset
          </button>
          <button type="button" className="button ghost" onClick={shareState}>
            {copied ? "Link copied" : "Share state"}
          </button>
        </div>

        {expectations && (
          <div className="stats">
            <div>
              <small>⟨X⟩</small>
              <strong>{expectations.x.toFixed(3)}</strong>
            </div>
            <div>
              <small>⟨Y⟩</small>
              <strong>{expectations.y.toFixed(3)}</strong>
            </div>
            <div>
              <small>⟨Z⟩</small>
              <strong>{expectations.z.toFixed(3)}</strong>
            </div>
            <div>
              <small className="literal">⟨σ·n⟩ — chosen axis</small>
              <strong>{expectations.axis.toFixed(3)}</strong>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button type="button" className="glossary-button" onClick={() => store.clearError()}>
            Dismiss
          </button>
        </p>
      )}

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
              state; Home returns it to |0⟩. The sphere is a map of the possible states of one
              qubit, not a picture of a physical object.
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
                  onClick={() => store.applyGate(gate.name, [0])}
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
              Every gate here is unitary, so every one can be undone exactly. Depth{" "}
              {circuit.length}/{MAX_CIRCUIT_DEPTH}.
            </p>
          </section>

          <section className="panel">
            <h2>Circuit</h2>
            <CircuitHistory circuit={circuit} />
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
            <details className="reveal" open={showMatrix} onToggle={(event) => setShowMatrix((event.target as HTMLDetailsElement).open)}>
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
            <p style={{ marginTop: 0 }}>
              Measuring along {basis === "custom" ? "a custom axis" : `the ${basis} axis`}. Possible
              readings are +1 and −1.
            </p>
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
                  {shots.toLocaleString()} shot{shots === 1 ? "" : "s"}
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
    </main>
  );
}

const clamp = (value: number) => Math.min(1, Math.max(-1, value));

const axisBasis = (axis: MeasurementAxis): "X" | "Y" | "Z" | "custom" => {
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  if (near(axis.theta, 0)) return "Z";
  if (near(axis.theta, Math.PI / 2) && near(axis.phi, 0)) return "X";
  if (near(axis.theta, Math.PI / 2) && near(axis.phi, Math.PI / 2)) return "Y";
  return "custom";
};

const blochAngles = (amplitudes: { re: number; im: number }[]) => {
  const [alpha, beta] = amplitudes as [{ re: number; im: number }, { re: number; im: number }];
  const magnitude = Math.min(1, Math.hypot(alpha.re, alpha.im));
  const theta = 2 * Math.acos(magnitude);
  const phi =
    magnitude < 1e-12 || Math.hypot(beta.re, beta.im) < 1e-12
      ? 0
      : (Math.atan2(beta.im, beta.re) - Math.atan2(alpha.im, alpha.re) + 2 * Math.PI) %
        (2 * Math.PI);
  return { theta, phi };
};

export const __testing = { axisBasis, blochAngles, qubitFromAngles };
