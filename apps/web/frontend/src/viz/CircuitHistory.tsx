/**
 * The circuit as an ordered list of applied operations (§9).
 *
 * The full drag-and-drop `CircuitBuilder` of §10 arrives with two-qubit mode
 * in Phase 4. In one-qubit mode the circuit is a linear history, and showing
 * it as one keeps the undo button's effect obvious.
 */

import type { GateOperation } from "../store/labStore";

export type CircuitHistoryProps = {
  circuit: GateOperation[];
  /** Called with the number of operations to keep, for step playback. */
  onStepTo?: (index: number) => void;
  activeStep?: number;
};

const describe = (operation: GateOperation): string => {
  const angle = operation.parameters?.theta ?? operation.parameters?.phi;
  const suffix = angle === undefined ? "" : `(${((angle * 180) / Math.PI).toFixed(0)}°)`;
  const targets = operation.targets.length > 1 ? ` q${operation.targets.join("→q")}` : "";
  return `${operation.gate}${suffix}${targets}`;
};

export function CircuitHistory({ circuit, onStepTo, activeStep }: CircuitHistoryProps) {
  if (circuit.length === 0) {
    return (
      <div className="circuit-history">
        <span className="empty">No gates applied yet — the state is as prepared.</span>
      </div>
    );
  }

  const active = activeStep ?? circuit.length;

  return (
    <ol className="circuit-history" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {circuit.map((operation, index) => {
        const chip = (
          <span className={`circuit-chip${index === active - 1 ? " latest" : ""}`}>
            {index + 1}. {describe(operation)}
          </span>
        );
        return (
          <li key={operation.id}>
            {onStepTo ? (
              <button
                type="button"
                onClick={() => onStepTo(index + 1)}
                style={{ border: 0, background: "none", padding: 0 }}
                aria-label={`Show the state after step ${index + 1}, ${describe(operation)}`}
              >
                {chip}
              </button>
            ) : (
              chip
            )}
          </li>
        );
      })}
    </ol>
  );
}
