/**
 * §8.3 — amplitudes and phase.
 *
 * The crucial teaching moment: turning the phase dial moves the Bloch arrow
 * and changes the X-basis prediction while the Z-basis bars sit perfectly
 * still. The two predictions are shown side by side so the learner watches one
 * move and one not, at the same moment.
 */

import { useState } from "react";

import {
  AXIS_X,
  AXIS_Z,
  axisDistribution,
  complex,
  expI,
  scale,
  type StateVector,
} from "../../math";
import { AmplitudeBars } from "../../viz/AmplitudeBars";
import { AmplitudePhasor } from "../../viz/AmplitudePhasor";
import { BlochSphere } from "../../viz/BlochSphere";
import { Katex } from "../../viz/Katex";

export function AmplitudesAndPhase() {
  // The magnitude split is one number because |α|² + |β|² = 1 leaves one
  // degree of freedom; the constraint is enforced by construction rather than
  // by asking the learner to keep two sliders in step.
  const [weight, setWeight] = useState(50);
  const [phaseDegrees, setPhaseDegrees] = useState(0);

  const magnitudeOne = Math.sqrt(weight / 100);
  const magnitudeZero = Math.sqrt(1 - weight / 100);
  const relativePhase = (phaseDegrees * Math.PI) / 180;

  const state: StateVector = [
    complex(magnitudeZero),
    scale(expI(relativePhase), magnitudeOne),
  ];

  const zOutcomes = axisDistribution(state, AXIS_Z);
  const xOutcomes = axisDistribution(state, AXIS_X);

  return (
    <div className="phase-lab">
      <div className="phase-controls">
        <label className="range">
          Weight on |1⟩: <b>{weight}%</b>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={weight}
            onChange={(event) => setWeight(Number(event.target.value))}
          />
        </label>
        <label className="range">
          Relative phase φ: <b>{phaseDegrees}°</b>
          <input
            type="range"
            min={0}
            max={359}
            step={1}
            value={phaseDegrees}
            onChange={(event) => setPhaseDegrees(Number(event.target.value))}
          />
        </label>
        <div className="gate-palette">
          <button type="button" onClick={() => { setWeight(50); setPhaseDegrees(0); }}>
            |+⟩
          </button>
          <button type="button" onClick={() => { setWeight(50); setPhaseDegrees(180); }}>
            |−⟩
          </button>
          <button type="button" onClick={() => { setWeight(50); setPhaseDegrees(90); }}>
            |+i⟩
          </button>
        </div>
        <div className="state-equation" style={{ marginTop: 18 }}>
          <Katex
            expression={`\\left|\\psi\\right\\rangle = ${magnitudeZero.toFixed(
              3,
            )}\\left|0\\right\\rangle + ${magnitudeOne.toFixed(
              3,
            )}e^{i\\,${phaseDegrees}^{\\circ}}\\left|1\\right\\rangle`}
            block
            description={`State: ${magnitudeZero.toFixed(3)} times ket 0, plus ${magnitudeOne.toFixed(
              3,
            )} times ket 1 with a phase of ${phaseDegrees} degrees.`}
          />
        </div>
      </div>

      <div className="phase-views">
        <BlochSphere state={state} showAxes showPhaseArc size={250} label="The state" />

        <div className="phasor-grid" style={{ marginTop: 8 }}>
          <AmplitudePhasor amplitude={state[0]!} label="α₀" size={96} />
          <AmplitudePhasor amplitude={state[1]!} label="α₁" size={96} />
        </div>

        <AmplitudeBars amplitudes={state} labels={["0", "1"]} />
      </div>

      <div className="phase-predictions">
        <div className="prediction-card">
          <span className="eyebrow mint">MEASURED ALONG Z</span>
          {zOutcomes.map((outcome) => (
            <p key={outcome.label}>
              {outcome.label}: <b>{(outcome.probability * 100).toFixed(1)}%</b>
            </p>
          ))}
          <p className="caption">Turning the phase dial does not move these.</p>
        </div>
        <div className="prediction-card">
          <span className="eyebrow coral">MEASURED ALONG X</span>
          {xOutcomes.map((outcome) => (
            <p key={outcome.label}>
              {outcome.label}: <b>{(outcome.probability * 100).toFixed(1)}%</b>
            </p>
          ))}
          <p className="caption">These swing all the way from certain to impossible.</p>
        </div>
      </div>
    </div>
  );
}
