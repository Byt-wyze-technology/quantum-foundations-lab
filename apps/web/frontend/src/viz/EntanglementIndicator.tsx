/**
 * The entanglement indicator (§9).
 *
 * Concurrence on a scale from product state to Bell pair, with the verdict in
 * words as well as position — §16 forbids relying on the bar alone.
 */

import { type StateVector, concurrenceTwoQubit, isProductState, reducedPurity } from "../math";

export function EntanglementIndicator({ state }: { state: StateVector }) {
  const concurrence = concurrenceTwoQubit(state);
  const separable = isProductState(state);
  const subsystemPurity = reducedPurity(state);

  const verdict = separable
    ? "Product state — each qubit has a state of its own."
    : concurrence > 0.999
      ? "Maximally entangled — neither qubit has a state of its own."
      : "Partly entangled — neither qubit is fully described on its own.";

  return (
    <div className="entanglement-indicator">
      <div
        className="entanglement-scale"
        role="img"
        aria-label={`Concurrence ${concurrence.toFixed(3)} on a scale from 0, a product state, to 1, a Bell pair. ${verdict}`}
      >
        <span className="entanglement-fill" style={{ width: `${concurrence * 100}%` }} />
        <span className="entanglement-marker" style={{ left: `${concurrence * 100}%` }} />
      </div>
      <div className="entanglement-ends" aria-hidden="true">
        <span>0 · product</span>
        <span>1 · Bell pair</span>
      </div>
      <p className="reading">
        concurrence <b>{concurrence.toFixed(3)}</b> · subsystem purity{" "}
        <b>{subsystemPurity.toFixed(3)}</b>
      </p>
      {/* Entanglement is a fact about the state, not a problem with it, so the
          verdict never borrows the coral treatment used for errors. */}
      <p className={separable ? "notice mint-notice" : "notice violet-notice"}>{verdict}</p>
    </div>
  );
}
