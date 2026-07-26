# Mathematical conventions

Every convention this project relies on, stated once. Where a choice was
available, the reasoning is given — a convention with no stated reason is one
that gets quietly changed later.

## Qubit ordering

Basis labels are written q₀q₁…q_{n−1}, with **q₀ the most significant bit**.

```
index 0 → |00⟩    index 1 → |01⟩    index 2 → |10⟩    index 3 → |11⟩
```

The Kronecker product matches, so the left-hand operand occupies the most
significant position:

```python
tensor_product(ket0(), ket1()) == computational_basis_state("01")
```

This is the convention that reads the same way the labels are written, which
is worth more in a teaching tool than matching any particular textbook. It is
tested directly in `tests/core/test_tensor.py`, and every API response carries
its `basis_order` so a client never has to infer it.

## Qubit state parameterisation

```
|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
```

with θ ∈ [0, π] and φ ∈ [0, 2π). At the poles φ is degenerate and is reported
as 0 rather than left to floating-point chance.

## Global and relative phase

Global phase is not observable: |ψ⟩ and e^{iγ}|ψ⟩ are the same physical state.
The core provides `global_phase_align` and `equivalent_up_to_global_phase`
rather than leaving each call site to reinvent the comparison, and the Bloch
angles are computed so that they are invariant under it.

Relative phase *is* physical, and the interface never lets it hide: amplitude
bars carry it as colour and as printed figures, and phasors carry it as an
angle.

## Gates and observables are different objects

A gate is unitary (U†U = I) and evolves a state. An observable is Hermitian
(A† = A) and describes what an instrument can read. They live in separate
modules and are validated separately, even where they share a matrix, as the
Pauli operators do.

A non-unitary matrix is **reported and refused**, never applied. The interface
must never display a state whose probabilities fail to sum to one.

## Controlled gates

`controlled(U)` places the control on the **most significant** qubit, so
`controlled(X) == CNOT` with q₀ as control. When applying a two-qubit gate, the
targets are listed in the gate's own order: for CNOT the first target is the
control, so `targets=(1, 0)` gives a CNOT controlled by q₁.

## Measurement

For a projector P_k the outcome probability is p_k = ⟨ψ|P_k|ψ⟩ and the state
becomes P_k|ψ⟩ / √(⟨ψ|P_k|ψ⟩).

Four things are kept apart in the code and in the interface, because blurring
them is the commonest way to teach measurement wrongly:

1. the probability distribution the state predicts, before anything is measured;
2. one sampled outcome;
3. the post-measurement state;
4. repeated *independent preparations*.

A shot batch never measures one collapsed qubit repeatedly. Each shot is a
fresh preparation, and the interface says so.

## Entanglement measures

For a pure two-qubit state, everything follows from the concurrence:

```
C = 2|det M| = 2|α₀₀α₁₁ − α₀₁α₁₀|
```

where M is the state reshaped across the qubit cut. The Schmidt coefficients
are λ± with λ±² = (1 ± √(1 − C²))/2, and the reduced purity is exactly
1 − C²/2. Closed forms are used throughout rather than numerical
diagonalisation, so nothing wobbles as a slider moves.

A one-qubit density matrix is written ρ = (I + r·σ)/2, and |r| = √(2·Tr(ρ²) − 1)
is the length of the Bloch arrow. This is what lets an entangled subsystem be
drawn honestly: the arrow is short, and for half of a Bell pair it is zero.

## EPR correlations

E(a, b) = ⟨ψ|σ_a ⊗ σ_b|ψ⟩. For the singlet this is −cos θ, where θ is the angle
between the axes.

The CHSH combination is S = E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′), with |S| ≤ 2
for any local hidden-variable model and |S| ≤ 2√2 in quantum mechanics. Both
bounds are demonstrated by sweeps in the test-suite rather than asserted.

## Numerical tolerances

| Constant | Value | Applies to |
| --- | --- | --- |
| `NORMALIZATION_ATOL` | 1e-10 | internal invariants |
| `UNITARY_ATOL` | 1e-10 | U†U = I |
| `HERMITIAN_ATOL` | 1e-10 | A† = A |
| `PROBABILITY_ATOL` | 1e-12 | probability sums |
| `INPUT_NORMALIZATION_ATOL` | 1e-6 | amplitudes arriving over the API |

The last deserves its own note. Amplitudes written by hand to a few decimal
places — `0.70710678` — have a norm of 0.999999998, which the internal
tolerance would reject. The API accepts residue inside 1e-6 and rescales it,
which is the allowance the specification grants for numerical residue, and
still rejects anything beyond. The exact norm is always returned, so a client
needing a stricter rule can apply one.

Probabilities may be clipped into [0, 1] and renormalised before sampling.
This repairs floating-point residue and must never conceal a materially
invalid state, so validation always runs first.

## Limits

One and two qubits; circuits up to 24 operations; up to 100,000 shots per
request. These are enforced in `core/validation.py` and surfaced by the API.
