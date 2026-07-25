/**
 * §8.2 — polarisation and spin.
 *
 * Two visuals, because §8.2 requires both and they carry different weight.
 * The analyser starts with sunglasses, where the intensity law P = cos²θ is
 * something the learner already half-knows. The Stern–Gerlach panel then makes
 * the same law produce *discrete* clicks rather than a dimmer beam, which is
 * where the classical picture stops working.
 *
 * The spin arrow is never drawn as a spinning ball (§8.2 misconception guard).
 */

import { useState } from "react";

import { mulberry32 } from "../../math";

const degrees = (radians: number) => (radians * 180) / Math.PI;

export function PolarisationAnalyser() {
  const [angle, setAngle] = useState(30);
  const [photons, setPhotons] = useState<{ passed: number; total: number }>({
    passed: 0,
    total: 0,
  });
  const radians = (angle * Math.PI) / 180;
  const transmission = Math.cos(radians) ** 2;

  const sendPhotons = (count: number) => {
    const random = mulberry32(angle * 1000 + photons.total);
    let passed = 0;
    for (let index = 0; index < count; index += 1) {
      if (random() < transmission) passed += 1;
    }
    setPhotons((current) => ({
      passed: current.passed + passed,
      total: current.total + count,
    }));
  };

  return (
    <div className="analyser">
      <svg viewBox="0 0 460 180" role="img" aria-label={`A light beam meets an analyser turned ${angle} degrees. Transmitted intensity is ${(transmission * 100).toFixed(0)} per cent.`}>
        <defs>
          <linearGradient id="beam-in" x1="0" x2="1">
            <stop offset="0" stopColor="#e0a458" stopOpacity="0.15" />
            <stop offset="1" stopColor="#e0a458" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        <rect x="8" y="74" width="150" height="32" fill="url(#beam-in)" />
        <text x="14" y="64" className="diagram-label">
          source
        </text>

        {/* The analyser, drawn as a slotted disc turned by the slider. */}
        <g transform={`translate(200 90) rotate(${-angle})`}>
          <circle r="52" fill="#f8f5ee" stroke="#102224" strokeWidth="1.5" />
          {[-30, -15, 0, 15, 30].map((offset) => (
            <line
              key={offset}
              x1={offset}
              y1={-Math.sqrt(Math.max(0, 52 * 52 - offset * offset))}
              x2={offset}
              y2={Math.sqrt(Math.max(0, 52 * 52 - offset * offset))}
              stroke="#8a7cc8"
              strokeWidth="2"
            />
          ))}
        </g>
        <text x="176" y="164" className="diagram-label">
          analyser {angle}°
        </text>

        <rect
          x="258"
          y={90 - 16 * Math.max(0.06, transmission)}
          width="194"
          height={32 * Math.max(0.06, transmission)}
          fill="#e0a458"
          opacity={0.25 + 0.6 * transmission}
        />
        <text x="392" y="64" className="diagram-label">
          detector
        </text>
      </svg>

      <label className="range">
        Analyser angle: <b>{angle}°</b>
        <input
          type="range"
          min={0}
          max={90}
          step={1}
          value={angle}
          onChange={(event) => {
            setAngle(Number(event.target.value));
            setPhotons({ passed: 0, total: 0 });
          }}
        />
      </label>

      <div className="analyser-readouts">
        <div>
          <small>CLASSICAL BEAM</small>
          <strong>{(transmission * 100).toFixed(1)}%</strong>
          <span>of the intensity gets through</span>
        </div>
        <div>
          <small>SINGLE PHOTONS</small>
          <strong>
            {photons.total === 0
              ? "—"
              : `${((photons.passed / photons.total) * 100).toFixed(1)}%`}
          </strong>
          <span>
            {photons.total === 0
              ? "send some photons"
              : `${photons.passed} of ${photons.total} passed`}
          </span>
        </div>
      </div>

      <div className="gate-palette">
        <button type="button" onClick={() => sendPhotons(1)}>
          Send 1 photon
        </button>
        <button type="button" onClick={() => sendPhotons(100)}>
          Send 100
        </button>
        <button type="button" onClick={() => setPhotons({ passed: 0, total: 0 })}>
          Clear
        </button>
      </div>

      <p className="caption">
        Dim the beam far enough and the smooth fade stops being smooth: each photon either arrives
        at the detector or does not. The percentage is the *chance* of one photon passing, and only
        looks like a brightness once enough of them have gone through.
      </p>
    </div>
  );
}

const AXES = [
  { label: "Z", theta: 0 },
  { label: "45°", theta: Math.PI / 4 },
  { label: "X", theta: Math.PI / 2 },
];

export function SternGerlach() {
  const [axisIndex, setAxisIndex] = useState(0);
  const [counts, setCounts] = useState({ up: 0, down: 0 });
  const axis = AXES[axisIndex]!;

  // The prepared state is spin-up along z; the device measures along `axis`.
  const probabilityUp = Math.cos(axis.theta / 2) ** 2;

  const runTrials = (count: number) => {
    const random = mulberry32(axisIndex * 7919 + counts.up + counts.down);
    let up = 0;
    for (let index = 0; index < count; index += 1) {
      if (random() < probabilityUp) up += 1;
    }
    setCounts((current) => ({ up: current.up + up, down: current.down + count - up }));
  };

  const total = counts.up + counts.down;

  return (
    <div className="stern-gerlach">
      <svg viewBox="0 0 460 200" role="img" aria-label={`Particles prepared spin-up along z enter a device measuring along ${axis.label}. The chance of the upper channel is ${(probabilityUp * 100).toFixed(0)} per cent.`}>
        <text x="10" y="96" className="diagram-label">
          prepared ↑z
        </text>
        <line x1="92" y1="100" x2="180" y2="100" stroke="#102224" strokeWidth="1.5" />
        <rect x="180" y="62" width="86" height="76" fill="#f8f5ee" stroke="#102224" strokeWidth="1.5" />
        <text x="196" y="106" className="diagram-label">
          {axis.label} axis
        </text>
        <line x1="266" y1="100" x2="360" y2="52" stroke="#3ca782" strokeWidth="2" />
        <line x1="266" y1="100" x2="360" y2="148" stroke="#e0a458" strokeWidth="2" />
        <circle cx="368" cy="48" r={6 + 16 * probabilityUp} fill="#75d5b3" />
        <circle cx="368" cy="152" r={6 + 16 * (1 - probabilityUp)} fill="#e0a458" />
        <text x="392" y="52" className="diagram-label">
          +1
        </text>
        <text x="392" y="156" className="diagram-label">
          −1
        </text>
      </svg>

      <div className="gate-palette">
        {AXES.map((entry, index) => (
          <button
            key={entry.label}
            type="button"
            className={index === axisIndex ? "active" : ""}
            onClick={() => {
              setAxisIndex(index);
              setCounts({ up: 0, down: 0 });
            }}
          >
            {entry.label}
          </button>
        ))}
        <button type="button" onClick={() => runTrials(200)}>
          Run 200 trials
        </button>
        <button type="button" onClick={() => setCounts({ up: 0, down: 0 })}>
          Clear
        </button>
      </div>

      <p className="reading" role="status">
        Predicted: <b>{(probabilityUp * 100).toFixed(1)}%</b> upper channel.{" "}
        {total > 0 && (
          <>
            Observed: <b>{((counts.up / total) * 100).toFixed(1)}%</b> from {total} trials.
          </>
        )}
      </p>

      <p className="caption">
        Turning the device does not produce a weaker deflection — it changes how often each of the
        two channels fires. Spin is an intrinsic quantum degree of freedom. The arrow represents a
        state and a measurement orientation, not a tiny object turning in space.
      </p>
    </div>
  );
}

export function PolarisationAndSpin() {
  return (
    <div className="lesson-stack">
      <div>
        <h3>Start with sunglasses</h3>
        <PolarisationAnalyser />
      </div>
      <div>
        <h3>Then the same law, one particle at a time</h3>
        <SternGerlach />
      </div>
    </div>
  );
}

export const __testing = { degrees };
