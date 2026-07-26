/**
 * §8.6 — tensor products.
 *
 * Two two-state systems combine into one four-amplitude joint state. The
 * expansion is shown as a Cartesian grid: each joint amplitude sits at the
 * crossing of the row it came from and the column it came from, so
 * α₀γ₀ → |00⟩ is something you can point at rather than something to take on
 * trust. The ⊗ symbol arrives last.
 */

import { useState } from "react";

import {
  type StateVector,
  basisLabels,
  complex,
  expI,
  formatComplex,
  magnitude,
  multiply,
  scale,
  tensorProduct,
} from "../../math";
import { AmplitudeBars } from "../../viz/AmplitudeBars";
import { Katex } from "../../viz/Katex";
import { phaseColor } from "../../viz/phaseColor";

type Factor = { weight: number; phase: number };

const buildFactor = ({ weight, phase }: Factor): StateVector => [
  complex(Math.sqrt(1 - weight / 100)),
  scale(expI((phase * Math.PI) / 180), Math.sqrt(weight / 100)),
];

const PRESETS: { label: string; factor: Factor }[] = [
  { label: "|0⟩", factor: { weight: 0, phase: 0 } },
  { label: "|1⟩", factor: { weight: 100, phase: 0 } },
  { label: "|+⟩", factor: { weight: 50, phase: 0 } },
  { label: "|−⟩", factor: { weight: 50, phase: 180 } },
];

function FactorControls({
  title,
  factor,
  onChange,
}: {
  title: string;
  factor: Factor;
  onChange: (factor: Factor) => void;
}) {
  return (
    <div className="factor-controls">
      <h3>{title}</h3>
      <div className="state-buttons">
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => onChange(preset.factor)}>
            {preset.label}
          </button>
        ))}
      </div>
      <label className="range" style={{ marginTop: 14 }}>
        Weight on |1⟩: <b>{factor.weight}%</b>
        <input
          type="range"
          min={0}
          max={100}
          value={factor.weight}
          onChange={(event) => onChange({ ...factor, weight: Number(event.target.value) })}
        />
      </label>
      <label className="range">
        Phase: <b>{factor.phase}°</b>
        <input
          type="range"
          min={0}
          max={359}
          value={factor.phase}
          onChange={(event) => onChange({ ...factor, phase: Number(event.target.value) })}
        />
      </label>
    </div>
  );
}

export function TensorProductBuilder() {
  const [left, setLeft] = useState<Factor>({ weight: 50, phase: 0 });
  const [right, setRight] = useState<Factor>({ weight: 0, phase: 0 });

  const leftState = buildFactor(left);
  const rightState = buildFactor(right);
  const joint = tensorProduct(leftState, rightState);
  const labels = basisLabels(2);

  return (
    <div className="tensor-lab">
      <div className="tensor-factors">
        <FactorControls title="Qubit 0" factor={left} onChange={setLeft} />
        <FactorControls title="Qubit 1" factor={right} onChange={setRight} />
      </div>

      <div className="tensor-grid-wrap">
        <h3>Every pairing, once</h3>
        <div className="tensor-grid" role="img" aria-label={
          `A two by two grid. Each joint amplitude is the product of one amplitude from qubit 0 and one from qubit 1. ` +
          labels
            .map((label, index) => `Amplitude for ${label} has magnitude ${magnitude(joint[index]!).toFixed(3)}.`)
            .join(" ")
        }>
          <span className="tensor-corner" aria-hidden="true">
            ⊗
          </span>
          {[0, 1].map((bit) => (
            <span key={`col-${bit}`} className="tensor-head" aria-hidden="true">
              <b>|{bit}⟩</b>
              <small>{formatComplex(rightState[bit]!, 2)}</small>
            </span>
          ))}
          {[0, 1].map((rowBit) => (
            <TensorRow
              key={`row-${rowBit}`}
              rowBit={rowBit}
              leftAmplitude={leftState[rowBit]!}
              rightState={rightState}
            />
          ))}
        </div>

        <div className="state-equation" style={{ marginTop: 20 }}>
          <Katex
            expression={
              "(\\alpha_0\\left|0\\right\\rangle + \\alpha_1\\left|1\\right\\rangle) \\otimes " +
              "(\\gamma_0\\left|0\\right\\rangle + \\gamma_1\\left|1\\right\\rangle) = " +
              "\\alpha_0\\gamma_0\\left|00\\right\\rangle + \\alpha_0\\gamma_1\\left|01\\right\\rangle + " +
              "\\alpha_1\\gamma_0\\left|10\\right\\rangle + \\alpha_1\\gamma_1\\left|11\\right\\rangle"
            }
            block
            description="The tensor product multiplies every amplitude of the first qubit by every amplitude of the second."
          />
        </div>
      </div>

      <div className="tensor-result">
        <h3>The joint state</h3>
        <AmplitudeBars amplitudes={joint} labels={labels} />
        <p className="caption">
          Two qubits, four amplitudes. Every state you can build this way is a product state —
          move either slider and both qubits' descriptions stay perfectly separate. The next
          section asks what happens to the states you <em>cannot</em> build this way.
        </p>
      </div>
    </div>
  );
}

function TensorRow({
  rowBit,
  leftAmplitude,
  rightState,
}: {
  rowBit: number;
  leftAmplitude: ReturnType<typeof complex>;
  rightState: StateVector;
}) {
  return (
    <>
      <span className="tensor-head" aria-hidden="true">
        <b>|{rowBit}⟩</b>
        <small>{formatComplex(leftAmplitude, 2)}</small>
      </span>
      {[0, 1].map((columnBit) => {
        const value = multiply(leftAmplitude, rightState[columnBit]!);
        const size = magnitude(value);
        return (
          <span
            key={columnBit}
            className="tensor-cell"
            style={{
              background: size < 1e-9 ? "transparent" : phaseColor(Math.atan2(value.im, value.re)),
              opacity: size < 1e-9 ? 0.3 : 0.35 + 0.65 * size,
            }}
          >
            <b>|{rowBit}{columnBit}⟩</b>
            <small>{formatComplex(value, 2)}</small>
          </span>
        );
      })}
    </>
  );
}
