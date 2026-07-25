/**
 * §8.1 — a classical bit beside a qubit.
 *
 * Left: a switch with two positions and nothing in between. Right: a sphere
 * the learner can point anywhere. The contrast is the whole lesson, so the two
 * sit side by side rather than one after the other.
 */

import { useState } from "react";

import {
  type StateVector,
  ket0,
  ket1,
  ketMinus,
  ketMinusI,
  ketPlus,
  ketPlusI,
  probabilities,
} from "../../math";
import { BlochSphere } from "../../viz/BlochSphere";

const STANDARD_STATES: { label: string; build: () => StateVector }[] = [
  { label: "|0⟩", build: ket0 },
  { label: "|1⟩", build: ket1 },
  { label: "|+⟩", build: ketPlus },
  { label: "|−⟩", build: ketMinus },
  { label: "|+i⟩", build: ketPlusI },
  { label: "|−i⟩", build: ketMinusI },
];

export function ClassicalBitVsQubit() {
  const [bit, setBit] = useState<0 | 1>(0);
  const [state, setState] = useState<StateVector>(ketPlus);
  const [probabilityZero, probabilityOne] = probabilities(state) as [number, number];

  return (
    <div className="split-panel">
      <div className="split-half">
        <h3>A classical bit</h3>
        <div className="bit-switch">
          <button
            type="button"
            className={bit === 0 ? "active" : ""}
            onClick={() => setBit(0)}
            aria-pressed={bit === 0}
          >
            0
          </button>
          <span className="bit-track" aria-hidden="true">
            <span className="bit-thumb" style={{ left: bit === 0 ? "2px" : "calc(100% - 34px)" }} />
          </span>
          <button
            type="button"
            className={bit === 1 ? "active" : ""}
            onClick={() => setBit(1)}
            aria-pressed={bit === 1}
          >
            1
          </button>
        </div>
        <p className="reading" role="status">
          Reading: <b>{bit}</b>
        </p>
        <p className="caption">
          Two positions. Nothing in between, and reading it changes nothing — the value was
          already there.
        </p>
      </div>

      <div className="split-half">
        <h3>A qubit</h3>
        <BlochSphere
          state={state}
          interactive
          showAxes
          showPhaseArc
          size={280}
          onStateChange={setState}
          label="Drag to point the qubit state anywhere"
        />
        <div className="state-buttons" style={{ justifyContent: "center", marginTop: 12 }}>
          {STANDARD_STATES.map((entry) => (
            <button key={entry.label} type="button" onClick={() => setState(entry.build())}>
              {entry.label}
            </button>
          ))}
        </div>
        <p className="reading" role="status">
          Measured in the Z basis: <b>{(probabilityZero * 100).toFixed(0)}%</b> chance of 0,{" "}
          <b>{(probabilityOne * 100).toFixed(0)}%</b> chance of 1.
        </p>
        <p className="caption">
          Every direction is a different state. A measurement still returns one of two answers —
          but which one, and how often, depends on where the arrow points.
        </p>
      </div>
    </div>
  );
}
