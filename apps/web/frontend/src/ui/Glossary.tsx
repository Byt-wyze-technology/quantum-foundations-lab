/**
 * The glossary drawer.
 *
 * Definitions are written to the same standard as the lesson copy (§21): they
 * name the limits of each analogy rather than leaving a tidy but wrong
 * impression. Lesson-specific terms are added in Phase 3.
 */

import { useEffect, useRef } from "react";

export type GlossaryEntry = {
  term: string;
  definition: string;
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Qubit",
    definition:
      "A two-level quantum system. Its state is described by two complex amplitudes; a measurement in a chosen basis returns one of two outcomes, with probabilities set by those amplitudes.",
  },
  {
    term: "Amplitude",
    definition:
      "A complex number attached to a basis state. Its squared magnitude is a probability; its phase is invisible to that measurement but changes what other measurements find.",
  },
  {
    term: "Bloch sphere",
    definition:
      "A map of the pure states of a single qubit. Each point is a state, not a location in space, and the sphere describes one qubit only — an entangled qubit has no point on it.",
  },
  {
    term: "Global phase",
    definition:
      "Multiplying an entire state by e^{iγ} changes no measurable prediction. |ψ⟩ and e^{iγ}|ψ⟩ are the same physical state.",
  },
  {
    term: "Relative phase",
    definition:
      "The phase difference between amplitudes. Unlike global phase this is physical: |+⟩ and |−⟩ differ only by it, and an X-basis measurement tells them apart with certainty.",
  },
  {
    term: "Unitary",
    definition:
      "An operation satisfying U†U = I. It preserves total probability and can always be undone, which is why quantum gates are reversible.",
  },
  {
    term: "Hermitian observable",
    definition:
      "A matrix with A† = A, representing a measurable quantity. Its eigenvalues are the possible readings and its eigenvectors the states that give each reading with certainty.",
  },
  {
    term: "Expectation value",
    definition:
      "⟨ψ|A|ψ⟩ — the average reading over many repetitions of prepare-and-measure. It need not be a value the device can actually display on any single trial.",
  },
  {
    term: "Measurement",
    definition:
      "Choosing a basis, obtaining one outcome, and leaving the system in the corresponding state. It does not reveal a value the qubit secretly held beforehand.",
  },
  {
    term: "Shot",
    definition:
      "One repetition of preparing a state and measuring it once. A histogram of many shots approaches the predicted probabilities; it is not one qubit measured repeatedly.",
  },
  {
    term: "Tensor product",
    definition:
      "The operation that combines two systems into one. Two qubits with two amplitudes each become a joint state with four — every amplitude of the first multiplied by every amplitude of the second.",
  },
  {
    term: "Product state",
    definition:
      "A joint state that factorises into one state per qubit. Each qubit then has a complete description of its own, and knowing one tells you nothing about the other.",
  },
  {
    term: "Entanglement",
    definition:
      "A joint state that does not factorise. The pair has a description no pair of separate descriptions can reproduce. It does not mean the qubits influence one another, and it cannot be used to send anything.",
  },
  {
    term: "Reduced state",
    definition:
      "What is left of the joint description when you ignore the other qubit, obtained by a partial trace. For an entangled pair it is a mixed state, and has no single Bloch arrow.",
  },
  {
    term: "Purity",
    definition:
      "Tr(ρ²). One for a state fully described on its own, and one half for a qubit that is half of a Bell pair — the lowest a single qubit can go.",
  },
  {
    term: "Concurrence",
    definition:
      "A measure of entanglement running from 0 for a product state to 1 for a Bell pair. For a pure two-qubit state it equals 2|α₀₀α₁₁ − α₀₁α₁₀|.",
  },
  {
    term: "Bell state",
    definition:
      "One of four maximally entangled two-qubit states. Their measurement outcomes are perfectly correlated, and each qubit on its own is maximally mixed.",
  },
];

export function Glossary({ open, close }: { open: boolean; close: () => void }) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <aside
      className={`glossary${open ? " open" : ""}`}
      aria-hidden={!open}
      aria-label="Glossary"
      {...(open ? {} : { inert: "" as unknown as boolean })}
    >
      <button ref={closeRef} className="icon-button" onClick={close} aria-label="Close glossary">
        ×
      </button>
      <span className="eyebrow coral">GLOSSARY</span>
      <h2>Words as we use them</h2>
      <dl style={{ margin: 0 }}>
        {GLOSSARY.map((entry) => (
          <div key={entry.term}>
            <dt>{entry.term}</dt>
            <dd>{entry.definition}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
