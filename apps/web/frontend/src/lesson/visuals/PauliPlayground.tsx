/**
 * §8.4 — the Pauli operators.
 *
 * Animation first, matrix second. Each operator gets a button, an animated
 * turn of the sphere, the before/after states side by side, its action on the
 * basis states, and the matrix behind a disclosure. Pressing the same button
 * twice returns the state, which is the reversibility §8.4 asks to be shown.
 */

import { useEffect, useRef, useState } from "react";

import {
  type Matrix,
  type StateVector,
  X,
  Y,
  Z,
  applyGate,
  blochVector,
  ket0,
  ket1,
  ketMinus,
  ketPlus,
  probabilities,
  qubitFromAngles,
  anglesFromQubit,
} from "../../math";
import { BlochSphere } from "../../viz/BlochSphere";
import { MatrixDisplay } from "../../viz/MatrixDisplay";
import { StateEquation } from "../../viz/StateEquation";
import { usePreferences } from "../../ui/preferences";

const OPERATORS: {
  name: "X" | "Y" | "Z";
  matrix: Matrix;
  geometry: string;
  onBasis: string;
}[] = [
  {
    name: "X",
    matrix: X,
    geometry: "A half turn about the x-axis, up to an unobservable global phase.",
    onBasis: "X|0⟩ = |1⟩ and X|1⟩ = |0⟩ — it exchanges the two basis states.",
  },
  {
    name: "Y",
    matrix: Y,
    geometry: "A half turn about the y-axis, up to an unobservable global phase.",
    onBasis: "Y|0⟩ = i|1⟩ and Y|1⟩ = −i|0⟩ — it exchanges them and adds a quarter turn of phase.",
  },
  {
    name: "Z",
    matrix: Z,
    geometry: "A half turn about the z-axis, up to an unobservable global phase.",
    onBasis: "Z|0⟩ = |0⟩ and Z|1⟩ = −|1⟩ — it leaves |0⟩ alone and flips the sign of |1⟩.",
  },
];

const START_STATES: { label: string; build: () => StateVector }[] = [
  { label: "|0⟩", build: ket0 },
  { label: "|1⟩", build: ket1 },
  { label: "|+⟩", build: ketPlus },
  { label: "|−⟩", build: ketMinus },
];

/** Interpolate along the sphere so the turn is visible rather than instant. */
const useAnimatedState = (target: StateVector, enabled: boolean) => {
  const [shown, setShown] = useState<StateVector>(target);
  const frame = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setShown(target);
      return undefined;
    }
    const from = anglesFromQubit(shown);
    const to = anglesFromQubit(target);
    // Take the short way round the equator.
    let deltaPhi = to.phi - from.phi;
    if (deltaPhi > Math.PI) deltaPhi -= 2 * Math.PI;
    if (deltaPhi < -Math.PI) deltaPhi += 2 * Math.PI;

    const start = performance.now();
    const duration = 420;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
      setShown(
        qubitFromAngles(
          from.theta + (to.theta - from.theta) * eased,
          from.phi + deltaPhi * eased,
        ),
      );
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
    // `shown` is deliberately excluded: it is the animation's own output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, enabled]);

  return shown;
};

export function PauliPlayground() {
  const reducedMotion = usePreferences((state) => state.reducedMotion);
  const [before, setBefore] = useState<StateVector>(ketPlus);
  const [after, setAfter] = useState<StateVector>(ketPlus);
  const [applied, setApplied] = useState<"X" | "Y" | "Z" | null>(null);
  const shown = useAnimatedState(after, !reducedMotion);

  const trail = [blochVector(before), blochVector(after)];

  const apply = (operator: (typeof OPERATORS)[number]) => {
    setBefore(after);
    setAfter(applyGate(after, operator.matrix, [0], 1));
    setApplied(operator.name);
  };

  const reset = (build: () => StateVector) => {
    const state = build();
    setBefore(state);
    setAfter(state);
    setApplied(null);
  };

  const active = OPERATORS.find((operator) => operator.name === applied) ?? null;

  const probabilitiesUnchanged =
    applied !== null &&
    probabilities(before).every((value, index) => Math.abs(value - probabilities(after)[index]!) < 1e-9);

  return (
    <div className="pauli-lab">
      <div className="pauli-stage">
        <BlochSphere
          state={shown}
          showAxes
          showPhaseArc
          size={280}
          trail={trail}
          label="The state, with a trail from where it was"
        />
        <div className="gate-palette" style={{ justifyContent: "center", marginTop: 10 }}>
          {OPERATORS.map((operator) => (
            <button
              key={operator.name}
              type="button"
              onClick={() => apply(operator)}
              className={applied === operator.name ? "active" : ""}
            >
              {operator.name}
            </button>
          ))}
        </div>
        <div className="state-buttons" style={{ justifyContent: "center", marginTop: 10 }}>
          {START_STATES.map((entry) => (
            <button key={entry.label} type="button" onClick={() => reset(entry.build)}>
              {entry.label}
            </button>
          ))}
        </div>
        <p className="caption">
          Press the same operator twice and the state comes back exactly. Every Pauli is its own
          inverse.
        </p>
      </div>

      <div className="pauli-readout">
        <div className="before-after">
          <div>
            <span className="eyebrow">BEFORE</span>
            <StateEquation amplitudes={before} labels={["0", "1"]} />
          </div>
          <div>
            <span className="eyebrow coral">AFTER</span>
            <StateEquation amplitudes={after} labels={["0", "1"]} />
          </div>
        </div>

        {active && (
          <>
            <p className="reading" role="status">
              <b>{active.name}</b> — {active.geometry}
            </p>
            <p className="caption">{active.onBasis}</p>
            {probabilitiesUnchanged && (
              <p className="notice mint-notice">
                Notice the Z-basis probabilities did not move. {active.name} still changed the
                state — the difference is in the relative phase, which an X-basis measurement would
                find immediately.
              </p>
            )}
            <details className="reveal">
              <summary>Show the matrix</summary>
              <div style={{ marginTop: 14 }}>
                <MatrixDisplay
                  matrix={active.matrix}
                  caption={`${active.name}, the matrix that produces the turn you just watched.`}
                />
              </div>
            </details>
          </>
        )}
        {!active && (
          <p className="caption">
            Pick an operator and watch the arrow move before reading a single matrix entry.
          </p>
        )}
      </div>
    </div>
  );
}
