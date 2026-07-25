/**
 * §8.8 — Hermitian observables.
 *
 * A measurement device defines three things: what it can read, which states
 * give each reading with certainty, and what the average reading would be over
 * many trials. This panel shows all three at once, then the matrix, the
 * eigenvalues and the eigenvectors behind them.
 */

import { useState } from "react";

import {
  type Matrix,
  type StateVector,
  X,
  Y,
  Z,
  expectationValue,
  ket0,
  ketPlus,
  observableOutcomes,
  qubitFromAngles,
  spinObservable,
  variance,
} from "../../math";
import { BlochSphere } from "../../viz/BlochSphere";
import { Katex } from "../../viz/Katex";
import { MatrixDisplay } from "../../viz/MatrixDisplay";

const DEVICES: { label: string; matrix: Matrix; description: string }[] = [
  { label: "Z", matrix: Z, description: "Reads +1 on |0⟩ and −1 on |1⟩." },
  { label: "X", matrix: X, description: "Reads +1 on |+⟩ and −1 on |−⟩." },
  { label: "Y", matrix: Y, description: "Reads +1 on |+i⟩ and −1 on |−i⟩." },
];

export function ObservableLab() {
  const [state, setState] = useState<StateVector>(ketPlus);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [tilt, setTilt] = useState<number | null>(null);

  const observable: Matrix =
    tilt === null
      ? DEVICES[deviceIndex]!.matrix
      : spinObservable({ x: Math.sin(tilt), y: 0, z: Math.cos(tilt) });
  const deviceLabel = tilt === null ? DEVICES[deviceIndex]!.label : "σ·n";

  const outcomes = observableOutcomes(observable, state);
  const mean = expectationValue(observable, state);
  const spread = variance(observable, state);

  return (
    <div className="observable-lab">
      <div className="observable-column">
        <h3>The state</h3>
        <BlochSphere
          state={state}
          interactive
          showAxes
          measurementAxis={outcomes[0]?.axis}
          size={250}
          onStateChange={setState}
          label="The state, with the device's +1 direction"
        />
        <div className="state-buttons" style={{ marginTop: 10, justifyContent: "center" }}>
          <button type="button" onClick={() => setState(ket0())}>
            |0⟩
          </button>
          <button type="button" onClick={() => setState(ketPlus())}>
            |+⟩
          </button>
          <button type="button" onClick={() => setState(qubitFromAngles(1.2, 0.6))}>
            A tilted state
          </button>
        </div>
      </div>

      <div className="observable-column">
        <h3>The device</h3>
        <div className="gate-palette">
          {DEVICES.map((device, index) => (
            <button
              key={device.label}
              type="button"
              className={tilt === null && deviceIndex === index ? "active" : ""}
              onClick={() => {
                setDeviceIndex(index);
                setTilt(null);
              }}
            >
              {device.label}
            </button>
          ))}
        </div>
        <label className="range" style={{ marginTop: 14 }}>
          Or tilt the device: <b>{Math.round(((tilt ?? 0) * 180) / Math.PI)}°</b> from z
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={Math.round(((tilt ?? 0) * 180) / Math.PI)}
            onChange={(event) => setTilt((Number(event.target.value) * Math.PI) / 180)}
          />
        </label>

        <h3 style={{ marginTop: 18 }}>What it can read</h3>
        <ul className="outcome-list">
          {outcomes.map((outcome) => (
            <li key={outcome.eigenvalue}>
              <span className="outcome-eigenvalue">{outcome.eigenvalue > 0 ? "+" : ""}
                {outcome.eigenvalue.toFixed(2)}
              </span>
              <span className="amplitude-track">
                <span
                  className="amplitude-fill"
                  style={{
                    width: `${outcome.probability * 100}%`,
                    background: outcome.eigenvalue > 0 ? "#75d5b3" : "#e0a458",
                  }}
                />
              </span>
              <span className="amplitude-figures">
                <b>{(outcome.probability * 100).toFixed(1)}%</b>
                of the time
              </span>
            </li>
          ))}
        </ul>

        <div className="stats" style={{ margin: "18px 0 0" }}>
          <div>
            <small className="literal">⟨A⟩ expectation</small>
            <strong>{mean.toFixed(3)}</strong>
          </div>
          <div>
            <small className="literal">(ΔA)² variance</small>
            <strong>{spread.toFixed(3)}</strong>
          </div>
        </div>
        <p className="caption">
          The expectation value is the average over many repetitions. For {deviceLabel} the device
          can only ever display {outcomes.map((o) => o.eigenvalue.toFixed(0)).join(" or ")} — an
          average of {mean.toFixed(2)} is not a reading it can produce on any single trial. The
          variance falls to zero exactly when the state is one of the device's own eigenstates.
        </p>

        <details className="reveal">
          <summary>Show the matrix and its eigensystem</summary>
          <div style={{ marginTop: 14 }}>
            <MatrixDisplay
              matrix={observable}
              caption={`${deviceLabel} — Hermitian, so A† = A and every eigenvalue is real.`}
            />
            <div className="equation-list" style={{ marginTop: 14 }}>
              {outcomes.map((outcome) => (
                <div key={outcome.eigenvalue} className="equation-item">
                  <Katex
                    expression={`A\\left|\\lambda_{${outcome.eigenvalue > 0 ? "+" : "-"}}\\right\\rangle = ${outcome.eigenvalue.toFixed(
                      0,
                    )}\\left|\\lambda_{${outcome.eigenvalue > 0 ? "+" : "-"}}\\right\\rangle`}
                    block
                    description={`The eigenvector for eigenvalue ${outcome.eigenvalue.toFixed(0)}.`}
                  />
                  <p className="caption">
                    Eigenvalue {outcome.eigenvalue.toFixed(0)} — a possible reading. Its eigenvector
                    is the state that gives that reading every single time.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
