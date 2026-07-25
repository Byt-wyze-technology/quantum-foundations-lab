/**
 * §8.5 — unitary operations.
 *
 * Build a sequence of turns, watch the trail, then undo them one at a time and
 * watch the trail retrace exactly. The advanced panel lets a learner type a
 * matrix; a non-unitary one is *reported and refused*, never applied, so the
 * interface never shows a state whose probabilities fail to sum to one.
 */

import { useState } from "react";

import {
  type Matrix,
  type StateVector,
  applyGate,
  blochVector,
  complex,
  dagger,
  equivalentUpToGlobalPhase,
  ketPlus,
  norm,
  rx,
  ry,
  rz,
  unitaryResidual,
} from "../../math";
import { BlochSphere } from "../../viz/BlochSphere";
import { MatrixDisplay } from "../../viz/MatrixDisplay";

type Step = { label: string; matrix: Matrix };

const ROTATIONS: Step[] = [
  { label: "RX 60°", matrix: rx(Math.PI / 3) },
  { label: "RY 60°", matrix: ry(Math.PI / 3) },
  { label: "RZ 60°", matrix: rz(Math.PI / 3) },
];

export function UnitaryReversibility() {
  const [start] = useState<StateVector>(ketPlus);
  const [steps, setSteps] = useState<Step[]>([]);
  const [entries, setEntries] = useState(["1", "0", "0", "1"]);
  const [customError, setCustomError] = useState<string | null>(null);

  const states = steps.reduce<StateVector[]>(
    (trail, step) => [...trail, applyGate(trail[trail.length - 1]!, step.matrix, [0], 1)],
    [start],
  );
  const current = states[states.length - 1]!;
  const trail = states.map(blochVector);
  const isBackHome = steps.length > 0 && equivalentUpToGlobalPhase(current, start);

  const push = (step: Step) => setSteps((existing) => [...existing, step]);
  const undo = () => setSteps((existing) => existing.slice(0, -1));

  const undoAll = () => {
    // Undo by *applying the inverses*, so the trail retraces visibly rather
    // than the state teleporting back to the start.
    setSteps((existing) => [
      ...existing,
      ...[...existing].reverse().map((step) => ({
        label: `${step.label}⁻¹`,
        matrix: dagger(step.matrix),
      })),
    ]);
  };

  const parsed: Matrix = [
    [complex(Number(entries[0])), complex(Number(entries[1]))],
    [complex(Number(entries[2])), complex(Number(entries[3]))],
  ];
  const finite = entries.every((entry) => Number.isFinite(Number(entry)) && entry.trim() !== "");
  const residual = finite ? unitaryResidual(parsed) : Number.NaN;
  const customIsUnitary = finite && residual <= 1e-9;

  const applyCustom = () => {
    if (!finite) {
      setCustomError("Every entry must be a number.");
      return;
    }
    if (!customIsUnitary) {
      setCustomError("This matrix does not preserve total probability.");
      return;
    }
    setCustomError(null);
    push({ label: "custom", matrix: parsed });
  };

  return (
    <div className="unitary-lab">
      <div className="unitary-stage">
        <BlochSphere
          state={current}
          showAxes
          showPhaseArc
          size={280}
          trail={trail}
          label="The state, with the path it has taken"
        />
        <div className="gate-palette" style={{ justifyContent: "center", marginTop: 10 }}>
          {ROTATIONS.map((rotation) => (
            <button key={rotation.label} type="button" onClick={() => push(rotation)}>
              {rotation.label}
            </button>
          ))}
        </div>
        <div className="gate-palette" style={{ justifyContent: "center", marginTop: 8 }}>
          <button type="button" onClick={undo} disabled={steps.length === 0}>
            Undo one
          </button>
          <button type="button" onClick={undoAll} disabled={steps.length === 0}>
            Retrace to the start
          </button>
          <button type="button" onClick={() => setSteps([])} disabled={steps.length === 0}>
            Clear
          </button>
        </div>
        <p className="reading" role="status">
          Norm of the state: <b>{norm(current).toFixed(12)}</b>
          {isBackHome && " — and you are exactly back where you started."}
        </p>
        <p className="caption">
          Every rotation preserves the length of the arrow. That is what U†U = I says, and it is
          why the path can always be walked backwards.
        </p>
      </div>

      <div className="unitary-readout">
        <h3>The sequence</h3>
        <div className="circuit-history">
          {steps.length === 0 ? (
            <span className="empty">Nothing applied yet.</span>
          ) : (
            steps.map((step, index) => (
              <span
                key={`${step.label}-${index}`}
                className={`circuit-chip${index === steps.length - 1 ? " latest" : ""}`}
              >
                {index + 1}. {step.label}
              </span>
            ))
          )}
        </div>

        <details className="reveal">
          <summary>Advanced — write your own matrix</summary>
          <div style={{ marginTop: 14 }}>
            <div className="matrix-input">
              {entries.map((entry, index) => (
                <input
                  key={index}
                  value={entry}
                  inputMode="decimal"
                  aria-label={`Matrix entry row ${Math.floor(index / 2) + 1}, column ${(index % 2) + 1}`}
                  onChange={(event) =>
                    setEntries((existing) =>
                      existing.map((value, position) =>
                        position === index ? event.target.value : value,
                      ),
                    )
                  }
                />
              ))}
            </div>
            <p className="reading">
              ‖U†U − I‖ = <b>{finite ? residual.toFixed(6) : "—"}</b>{" "}
              {finite && (customIsUnitary ? "· unitary" : "· not unitary")}
            </p>
            <div className="gate-palette">
              <button type="button" onClick={applyCustom}>
                Apply this matrix
              </button>
              <button type="button" onClick={() => setEntries(["0", "1", "1", "0"])}>
                Try X
              </button>
              <button type="button" onClick={() => setEntries(["1", "1", "0", "1"])}>
                Try a shear
              </button>
            </div>
            {customError && (
              <p className="error" role="alert">
                {customError} It has not been applied.
              </p>
            )}
            <div style={{ marginTop: 14 }}>
              <MatrixDisplay matrix={parsed} caption="The matrix as entered." />
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
