/**
 * The circuit builder (§10).
 *
 * Gates come from the dashboard's gate palette — there is one palette, not
 * two — and are dropped onto a qubit wire here. Step playback scrubs through
 * the circuit so the state can be inspected after every layer, which is the
 * point of the panel: watching *when* the entanglement appears is what makes
 * the Bell circuit legible.
 *
 * Drag-and-drop is an enhancement, never a requirement. A gate selected in the
 * palette can be placed with the wire buttons below, and every placed gate has
 * its own remove button, so nothing here needs a pointer (§16).
 */

import { useState } from "react";

import { type GateName, gateQubitCount } from "../math";
import type { GateOperation, QubitCount } from "../store/labStore";

export type CircuitBuilderProps = {
  circuit: GateOperation[];
  qubitCount: QubitCount;
  /** Called when a gate is dropped or placed on the given targets. */
  onPlace: (gate: GateName, targets: number[]) => void;
  onRemove: (id: string) => void;
  /** Called as the playback scrubber moves; `steps` gates are applied. */
  onStepChange?: (steps: number) => void;
  step?: number;
  /** The gate currently selected in the dashboard's palette, if any. */
  selected?: GateName | null;
};

const describe = (operation: GateOperation): string => {
  const angle = operation.parameters?.theta ?? operation.parameters?.phi;
  const suffix = angle === undefined ? "" : `(${((angle * 180) / Math.PI).toFixed(0)}°)`;
  return `${operation.gate}${suffix}`;
};

export function CircuitBuilder({
  circuit,
  qubitCount,
  onPlace,
  onRemove,
  onStepChange,
  step,
  selected = null,
}: CircuitBuilderProps) {
  const [dragOver, setDragOver] = useState<number | null>(null);

  const activeStep = step ?? circuit.length;

  /** Where a gate goes when dropped on `wire`. Two-qubit gates take both. */
  const targetsFor = (gate: GateName, wire: number): number[] => {
    if (gateQubitCount(gate) === 1) return [wire];
    // The wire dropped on becomes the control; the other is the target.
    return wire === 0 ? [0, 1] : [1, 0];
  };

  const place = (gate: GateName, wire: number) => {
    if (gateQubitCount(gate) === 2 && qubitCount < 2) return;
    onPlace(gate, targetsFor(gate, wire));
  };

  return (
    <div className="circuit-builder">
      <div className="builder-wires">
        {Array.from({ length: qubitCount }, (_, wire) => (
          <div
            key={wire}
            className={`builder-wire${dragOver === wire ? " drag-over" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setDragOver(wire);
            }}
            onDragLeave={() => setDragOver((current) => (current === wire ? null : current))}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(null);
              const gate = event.dataTransfer.getData("text/plain") as GateName;
              if (gate) place(gate, wire);
            }}
          >
            <span className="wire-label">q{wire}</span>
            <span className="wire-line" aria-hidden="true" />
            <button
              type="button"
              className="wire-drop"
              disabled={selected === null}
              onClick={() => selected && place(selected, wire)}
            >
              {selected ? `Place ${selected} on q${wire}` : `Drop a gate on q${wire}`}
            </button>
          </div>
        ))}
      </div>

      <ol className="builder-sequence" aria-label="Applied gates, in order">
        {circuit.length === 0 && (
          <li className="empty">No gates yet — the state is as prepared.</li>
        )}
        {circuit.map((operation, index) => (
          <li key={operation.id}>
            <span className={`circuit-chip${index < activeStep ? " latest" : " pending"}`}>
              {index + 1}. {describe(operation)} · q{operation.targets.join("→q")}
            </span>
            <button
              type="button"
              className="chip-remove"
              onClick={() => onRemove(operation.id)}
              aria-label={`Remove step ${index + 1}, ${describe(operation)}`}
            >
              ×
            </button>
          </li>
        ))}
      </ol>

      {circuit.length > 0 && onStepChange && (
        <label className="range playback">
          Step playback: <b>{activeStep} of {circuit.length}</b>
          <input
            type="range"
            min={0}
            max={circuit.length}
            step={1}
            value={activeStep}
            onChange={(event) => onStepChange(Number(event.target.value))}
          />
          <span className="caption">
            Scrub back through the circuit to inspect the state after each layer. The panels above
            follow the step shown here.
          </span>
        </label>
      )}
    </div>
  );
}
