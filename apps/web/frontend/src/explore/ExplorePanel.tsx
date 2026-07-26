/**
 * The Explore laboratory (§9).
 *
 * Every interaction updates every panel simultaneously, which is the whole
 * promise of the mode: change the phase and watch the Bloch arrow swing, the
 * phasor rotate, the X-basis prediction move and the Z-basis bars stay exactly
 * where they were.
 *
 * The toolbar is shared; the dashboard below it differs by qubit count,
 * because the two modes genuinely answer different questions.
 */

import { useState } from "react";

import { type MeasurementAxis, AXIS_FOR_BASIS } from "../math";
import {
  PRESET_LABELS,
  type PresetName,
  type QubitCount,
  TWO_QUBIT_PRESETS,
  selectEntanglementMeasure,
  selectExpectationValues,
  selectStatePurity,
  useLabStore,
} from "../store/labStore";
import { OneQubitDashboard } from "./OneQubitDashboard";
import { TwoQubitDashboard } from "./TwoQubitDashboard";

const degrees = (radians: number) => (radians * 180) / Math.PI;
const radians = (deg: number) => (deg * Math.PI) / 180;

export function ExplorePanel() {
  const store = useLabStore();
  const { currentState, measurementAxis, seed, error } = store;
  const [copied, setCopied] = useState(false);

  const isTwoQubit = currentState.qubitCount === 2;
  const presets = isTwoQubit ? TWO_QUBIT_PRESETS : PRESET_LABELS;
  const expectations = selectExpectationValues(store);
  const purities = selectStatePurity(store);
  const concurrence = selectEntanglementMeasure(store);
  const basis = axisBasis(measurementAxis);

  const shareState = async () => {
    const parameters = new URLSearchParams();
    parameters.set("qubits", String(currentState.qubitCount));
    if (!isTwoQubit) {
      const angles = blochAngles(store.initialState.amplitudes);
      parameters.set("theta", angles.theta.toFixed(6));
      parameters.set("phi", angles.phi.toFixed(6));
    } else {
      parameters.set(
        "amplitudes",
        store.initialState.amplitudes
          .map((value) => `${value.re.toFixed(6)}_${value.im.toFixed(6)}`)
          .join(","),
      );
    }
    if (store.circuit.length > 0) {
      parameters.set(
        "circuit",
        store.circuit
          .map((operation) => {
            const angle = operation.parameters?.theta ?? operation.parameters?.phi;
            const targets = operation.targets.join("-");
            return angle === undefined
              ? `${operation.gate}@${targets}`
              : `${operation.gate}@${targets}:${angle.toFixed(5)}`;
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
      <div className="explore-head">
          <div>
            <span className="eyebrow mint">EXPLORE LABORATORY</span>
            <h1>{isTwoQubit ? "Two qubits, one joint state." : "One qubit, every view at once."}</h1>
          </div>
          <p>
            {isTwoQubit
              ? "Build a pair, entangle it, and watch what each qubit keeps and what it loses. The reduced states, the correlation table and the indicator all describe the same pair."
              : "Prepare a state, rotate it with gates, choose what to measure, then repeat the experiment. The Bloch sphere, the amplitudes, the matrix and the statistics all describe the same qubit."}
          </p>
      </div>

      {/* A dashboard should spend horizontal space, not vertical. The controls
          sit in a sticky column so they stay reachable however far the panels
          scroll, instead of pinning a third of the viewport across the top. */}
      <div className="explore-layout">
        <aside className="explore-controls" aria-label="Laboratory controls">
          <div className="lab-controls">

          <div className="control-pair">
            <label>
              Qubits
              <select
                value={currentState.qubitCount}
                onChange={(event) => store.setQubitCount(Number(event.target.value) as QubitCount)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
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
          </div>

          {/* A group of buttons, not a labelled control: a <label> here would
              attach its whole text to the first button's accessible name. */}
          <div role="group" aria-label="Starting state" style={{ flex: "2 1 320px" }}>
            <span className="control-legend">Starting state</span>
            <span className="state-buttons" style={{ marginTop: 7 }}>
              {presets.map((preset) => (
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

          {!isTwoQubit && (
            <>
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
            </>
          )}


          <div className="control-actions">
            <button type="button" className="button ghost" onClick={() => store.undoGate()}>
              Undo
            </button>
            <button type="button" className="button ghost" onClick={() => store.resetCircuit()}>
              Reset
            </button>
            <button type="button" className="button ghost" onClick={shareState}>
              {copied ? "Link copied" : "Share"}
            </button>
          </div>
        </div>

        {expectations && (
          <div className="stats">
            <div>
              <small className="literal">⟨X⟩</small>
              <strong>{expectations.x.toFixed(3)}</strong>
            </div>
            <div>
              <small className="literal">⟨Y⟩</small>
              <strong>{expectations.y.toFixed(3)}</strong>
            </div>
            <div>
              <small className="literal">⟨Z⟩</small>
              <strong>{expectations.z.toFixed(3)}</strong>
            </div>
            <div>
              <small className="literal">⟨σ·n⟩ axis</small>
              <strong>{expectations.axis.toFixed(3)}</strong>
            </div>
          </div>
        )}

        {purities && concurrence !== null && (
          <div className="stats">
            <div>
              <small className="literal">Concurrence</small>
              <strong>{concurrence.toFixed(3)}</strong>
            </div>
            <div>
              <small className="literal">Purity — qubit 0</small>
              <strong>{purities.a.toFixed(3)}</strong>
            </div>
            <div>
              <small className="literal">Purity — qubit 1</small>
              <strong>{purities.b.toFixed(3)}</strong>
            </div>
            <div>
              <small>Verdict</small>
              <strong>{concurrence <= 1e-9 ? "Product" : concurrence > 0.999 ? "Maximal" : "Partial"}</strong>
            </div>
          </div>
        )}
        </aside>

        <div className="explore-panels">
          {error && (
            <p className="error" role="alert">
              {error}{" "}
              <button type="button" className="glossary-button" onClick={() => store.clearError()}>
                Dismiss
              </button>
            </p>
          )}

          {isTwoQubit ? <TwoQubitDashboard /> : <OneQubitDashboard />}
        </div>
      </div>
    </main>
  );
}

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

export const __testing = { axisBasis, blochAngles };
