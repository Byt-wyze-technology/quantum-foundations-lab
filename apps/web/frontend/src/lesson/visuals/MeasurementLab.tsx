/**
 * §8.7 — measurement.
 *
 * All six required views: the amplitudes before, the probabilities, the chosen
 * basis, one sampled outcome, the collapsed state, and the repeated-shot
 * histogram.
 *
 * The panel keeps two ideas apart that are easy to blur. "Measure once"
 * collapses *this* qubit and says so; measuring it again returns the same
 * answer. The shot batches never touch that qubit — each batch is a run of
 * fresh preparations of the state as it was before any measurement.
 */

import { useState } from "react";

import {
  type MeasurementAxis,
  type StateVector,
  AXIS_X,
  AXIS_Y,
  AXIS_Z,
  axisDistribution,
  ketPlus,
  measureAlongAxis,
  mulberry32,
  qubitFromAngles,
  sampleAlongAxis,
} from "../../math";
import { AmplitudeBars } from "../../viz/AmplitudeBars";
import { BlochSphere } from "../../viz/BlochSphere";
import { MeasurementHistogram } from "../../viz/MeasurementHistogram";

const BASES: { label: string; axis: MeasurementAxis }[] = [
  { label: "Z", axis: AXIS_Z },
  { label: "X", axis: AXIS_X },
  { label: "Y", axis: AXIS_Y },
];

export function MeasurementLab() {
  const [prepared, setPrepared] = useState<StateVector>(ketPlus);
  const [basisIndex, setBasisIndex] = useState(0);
  const [customTheta, setCustomTheta] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState<{ label: string; state: StateVector } | null>(null);
  const [histogram, setHistogram] = useState<Record<string, number>>({});
  const [shots, setShots] = useState(0);

  const axis: MeasurementAxis =
    customTheta === null ? BASES[basisIndex]!.axis : { theta: customTheta, phi: 0 };
  const basisLabel = customTheta === null ? BASES[basisIndex]!.label : "custom";

  const distribution = axisDistribution(prepared, axis);

  const clearStatistics = () => {
    setHistogram({});
    setShots(0);
    setCollapsed(null);
  };

  const measureOnce = () => {
    const outcome = measureAlongAxis(prepared, axis, mulberry32(Date.now() % 100000));
    setCollapsed({ label: outcome.label, state: outcome.state });
  };

  const runShots = (count: number) => {
    const batch = sampleAlongAxis(prepared, axis, count, mulberry32(shots + count * 31));
    setHistogram((current) => {
      const merged = { ...current };
      for (const [label, value] of Object.entries(batch)) {
        merged[label] = (merged[label] ?? 0) + value;
      }
      return merged;
    });
    setShots((current) => current + count);
  };

  return (
    <div className="measurement-lab">
      <div className="measurement-column">
        <h3>Before the measurement</h3>
        <BlochSphere
          state={prepared}
          interactive
          showAxes
          showPhaseArc
          measurementAxis={axis}
          size={250}
          onStateChange={(next) => {
            setPrepared(next);
            clearStatistics();
          }}
          label="The prepared state, with the measurement axis"
        />
        <AmplitudeBars amplitudes={prepared} labels={["0", "1"]} />
        <div className="state-buttons" style={{ marginTop: 10 }}>
          <button type="button" onClick={() => { setPrepared(ketPlus()); clearStatistics(); }}>
            |+⟩
          </button>
          <button type="button" onClick={() => { setPrepared(qubitFromAngles(0, 0)); clearStatistics(); }}>
            |0⟩
          </button>
          <button type="button" onClick={() => { setPrepared(qubitFromAngles(1.05, 0.9)); clearStatistics(); }}>
            A tilted state
          </button>
        </div>
      </div>

      <div className="measurement-column">
        <h3>What is being measured</h3>
        <div className="gate-palette">
          {BASES.map((entry, index) => (
            <button
              key={entry.label}
              type="button"
              className={customTheta === null && basisIndex === index ? "active" : ""}
              onClick={() => {
                setBasisIndex(index);
                setCustomTheta(null);
                clearStatistics();
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <label className="range" style={{ marginTop: 14 }}>
          Or an arbitrary axis: <b>{Math.round(((customTheta ?? 0) * 180) / Math.PI)}°</b> from z
          <input
            type="range"
            min={0}
            max={180}
            step={1}
            value={Math.round(((customTheta ?? 0) * 180) / Math.PI)}
            onChange={(event) => {
              setCustomTheta((Number(event.target.value) * Math.PI) / 180);
              clearStatistics();
            }}
          />
        </label>

        <h3 style={{ marginTop: 18 }}>What it predicts</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
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

        <div className="gate-palette" style={{ marginTop: 16 }}>
          <button type="button" onClick={measureOnce}>
            Measure once
          </button>
          <button type="button" onClick={() => runShots(10)}>
            10 shots
          </button>
          <button type="button" onClick={() => runShots(100)}>
            100 shots
          </button>
          <button type="button" onClick={() => runShots(1000)}>
            1,000 shots
          </button>
          <button type="button" onClick={clearStatistics}>
            Reset
          </button>
        </div>

        {collapsed && (
          <div className="collapse-card" role="status">
            <span className="eyebrow coral">THIS ONE QUBIT</span>
            <p>
              It read <b>{collapsed.label}</b> along {basisLabel}. It is now in the corresponding
              eigenstate, and measuring <em>it</em> again along {basisLabel} returns{" "}
              <b>{collapsed.label}</b> every time.
            </p>
            <BlochSphere
              state={collapsed.state}
              showAxes
              measurementAxis={axis}
              size={170}
              label="The collapsed state"
            />
          </div>
        )}
      </div>

      <div className="measurement-column">
        <h3>Many fresh preparations</h3>
        <MeasurementHistogram
          entries={distribution.map((outcome) => ({
            label: outcome.label,
            expected: outcome.probability,
            observed: histogram[outcome.label] ?? 0,
          }))}
          totalShots={shots}
        />
        <p className="caption">
          Every bar above comes from re-preparing the state and measuring it once. The dashed line
          is what the state predicts; the solid bar is what actually happened. With few shots they
          disagree, and that disagreement is ordinary sampling noise, not a flaw in the theory.
        </p>
      </div>
    </div>
  );
}
