"""Bell states, density matrices, partial trace and entanglement measures.

Specification reference: §5.7.

The reduced density matrix is what makes the central teaching point rigorous
rather than rhetorical (§8.9, §21). For a product state each subsystem is pure,
Tr(ρ_A²) = 1, and a Bloch arrow is a faithful picture of it. For a Bell pair

    ρ_A = I/2      and      Tr(ρ_A²) = 1/2

so the subsystem is maximally mixed and has *no* pure-state arrow at all. The
interface must therefore refuse to draw one, and this module is what tells it.
"""

import string

import numpy as np

from .observables import eigensystem, spin_observable
from .states import validate_state
from .tensor import reshape_state_for_subsystems
from .types import ComplexMatrix, ComplexVector, RealVector
from .validation import (
    QuantumValidationError,
    validate_qubit_count,
    validate_shots,
    validate_square_matrix,
)

_SQRT_HALF = 1.0 / np.sqrt(2.0)


def bell_phi_plus() -> ComplexVector:
    """|Φ⁺⟩ = (|00⟩ + |11⟩)/√2."""
    return np.array([_SQRT_HALF, 0.0, 0.0, _SQRT_HALF], dtype=np.complex128)


def bell_phi_minus() -> ComplexVector:
    """|Φ⁻⟩ = (|00⟩ − |11⟩)/√2."""
    return np.array([_SQRT_HALF, 0.0, 0.0, -_SQRT_HALF], dtype=np.complex128)


def bell_psi_plus() -> ComplexVector:
    """|Ψ⁺⟩ = (|01⟩ + |10⟩)/√2."""
    return np.array([0.0, _SQRT_HALF, _SQRT_HALF, 0.0], dtype=np.complex128)


def bell_psi_minus() -> ComplexVector:
    """|Ψ⁻⟩ = (|01⟩ − |10⟩)/√2 — the singlet used for EPR correlations (§8.11)."""
    return np.array([0.0, _SQRT_HALF, -_SQRT_HALF, 0.0], dtype=np.complex128)


BELL_STATES = {
    "phi_plus": bell_phi_plus,
    "phi_minus": bell_phi_minus,
    "psi_plus": bell_psi_plus,
    "psi_minus": bell_psi_minus,
}


def density_matrix(state: ComplexVector) -> ComplexMatrix:
    """ρ = |ψ⟩⟨ψ| for a pure state."""
    array = np.asarray(state, dtype=np.complex128)
    validate_state(array)
    return np.outer(array, array.conj())


def partial_trace(
    rho: ComplexMatrix,
    *,
    keep: tuple[int, ...],
    qubit_count: int,
) -> ComplexMatrix:
    """Trace out every qubit not listed in ``keep``.

    ``keep`` is interpreted in the q₀-leading convention of §5.4 and the kept
    qubits appear in ascending order in the result.
    """
    validate_qubit_count(qubit_count)
    matrix = np.asarray(rho, dtype=np.complex128)
    validate_square_matrix(matrix, label="density matrix")
    expected = 2**qubit_count
    if matrix.shape[0] != expected:
        raise QuantumValidationError(
            "OPERATOR_DIMENSION_MISMATCH",
            f"A {qubit_count}-qubit density matrix must be {expected}×{expected}.",
            expected=expected,
            received=int(matrix.shape[0]),
        )

    kept = tuple(sorted(set(keep)))
    if not kept:
        raise QuantumValidationError(
            "EMPTY_SUBSYSTEM", "At least one qubit must be kept by a partial trace."
        )
    for qubit in kept:
        if qubit < 0 or qubit >= qubit_count:
            raise QuantumValidationError(
                "INVALID_TARGET_INDEX",
                f"Qubit {qubit} is outside the range 0 to {qubit_count - 1}.",
                target=qubit,
                qubit_count=qubit_count,
            )

    letters = string.ascii_lowercase
    rows = [letters[index] for index in range(qubit_count)]
    columns = [letters[qubit_count + index] for index in range(qubit_count)]
    for qubit in range(qubit_count):
        if qubit not in kept:
            columns[qubit] = rows[qubit]

    subscripts = (
        "".join(rows)
        + "".join(columns)
        + "->"
        + "".join(rows[qubit] for qubit in kept)
        + "".join(columns[qubit] for qubit in kept)
    )
    tensor = matrix.reshape((2,) * (2 * qubit_count))
    reduced = np.einsum(subscripts, tensor)
    dimension = 2 ** len(kept)
    return np.asarray(reduced, dtype=np.complex128).reshape(dimension, dimension)


def reduced_density_matrix(
    state: ComplexVector,
    *,
    keep: tuple[int, ...],
    qubit_count: int,
) -> ComplexMatrix:
    """Reduced state of the ``keep`` subsystem of a pure state."""
    return partial_trace(density_matrix(state), keep=keep, qubit_count=qubit_count)


def purity(rho: ComplexMatrix) -> float:
    """Tr(ρ²): 1 for a pure state, 1/d for a maximally mixed d-dimensional one."""
    matrix = np.asarray(rho, dtype=np.complex128)
    validate_square_matrix(matrix, label="density matrix")
    return float(np.real(np.trace(matrix @ matrix)))


def concurrence_two_qubit(state: ComplexVector) -> float:
    """Concurrence of a pure two-qubit state: 0 for a product state, 1 for a Bell pair.

    For a pure state |ψ⟩ = α₀₀|00⟩ + α₀₁|01⟩ + α₁₀|10⟩ + α₁₁|11⟩ this reduces
    to C = 2|α₀₀α₁₁ − α₀₁α₁₀|.
    """
    array = np.asarray(state, dtype=np.complex128)
    validate_state(array)
    if array.shape != (4,):
        raise QuantumValidationError(
            "NOT_A_TWO_QUBIT_STATE",
            f"Concurrence is defined here for two-qubit states; received shape {array.shape}.",
            shape=list(array.shape),
        )
    a00, a01, a10, a11 = array
    return float(np.clip(2.0 * abs(a00 * a11 - a01 * a10), 0.0, 1.0))


def is_product_state(state: ComplexVector, *, atol: float = 1e-10) -> bool:
    """True when the state factorises into independent single-qubit states.

    Decided by the rank of the state reshaped across the 1|rest cut: a product
    state has exactly one non-zero Schmidt coefficient. A one-qubit state is
    trivially a product state.
    """
    array = np.asarray(state, dtype=np.complex128)
    validate_state(array)
    if array.shape == (2,):
        return True
    singular_values = np.linalg.svd(reshape_state_for_subsystems(array, 1), compute_uv=False)
    return bool(singular_values[1] <= atol)


def joint_spin_probabilities(
    state: ComplexVector,
    axis_a: RealVector | tuple[float, float, float],
    axis_b: RealVector | tuple[float, float, float],
) -> dict[tuple[int, int], float]:
    """Probabilities of the four joint outcomes when Alice measures along
    ``axis_a`` and Bob along ``axis_b`` (§8.11).

    Keys are ``(alice, bob)`` with each entry ±1.
    """
    validate_state(state)
    array = np.asarray(state, dtype=np.complex128)
    if array.shape != (4,):
        raise QuantumValidationError(
            "NOT_A_TWO_QUBIT_STATE",
            f"Joint spin measurement needs a two-qubit state; received shape {array.shape}.",
            shape=list(array.shape),
        )

    values_a, vectors_a = eigensystem(spin_observable(axis_a))
    values_b, vectors_b = eigensystem(spin_observable(axis_b))

    probabilities: dict[tuple[int, int], float] = {}
    for index_a, eigenvalue_a in enumerate(values_a):
        for index_b, eigenvalue_b in enumerate(values_b):
            joint = np.kron(vectors_a[:, index_a], vectors_b[:, index_b])
            amplitude = complex(np.vdot(joint, array))
            probabilities[(int(round(float(eigenvalue_a))), int(round(float(eigenvalue_b))))] = (
                float(abs(amplitude) ** 2)
            )
    return probabilities


def correlation(
    state: ComplexVector,
    axis_a: RealVector | tuple[float, float, float],
    axis_b: RealVector | tuple[float, float, float],
) -> float:
    """E(a, b) = ⟨ψ|σ_a ⊗ σ_b|ψ⟩, the average product of the two outcomes.

    For the singlet this equals −cos θ, where θ is the angle between the axes.
    """
    joint = joint_spin_probabilities(state, axis_a, axis_b)
    return float(sum(alice * bob * value for (alice, bob), value in joint.items()))


def marginal_probabilities(
    state: ComplexVector,
    axis_a: RealVector | tuple[float, float, float],
    axis_b: RealVector | tuple[float, float, float],
) -> dict[str, dict[int, float]]:
    """Each observer's own outcome distribution, ignoring the other's result.

    This is the no-signalling statement made checkable (§8.11, §21): Alice's
    marginal does not depend on ``axis_b`` at all, so nothing Bob does can
    change what she sees.
    """
    joint = joint_spin_probabilities(state, axis_a, axis_b)
    alice = {
        outcome: float(sum(value for (a, _), value in joint.items() if a == outcome))
        for outcome in (1, -1)
    }
    bob = {
        outcome: float(sum(value for (_, b), value in joint.items() if b == outcome))
        for outcome in (1, -1)
    }
    return {"alice": alice, "bob": bob}


def singlet_correlation(theta: float) -> float:
    """The closed form E(θ) = −cos θ for the singlet (§8.11).

    Kept alongside the general :func:`correlation` so the lesson's curve and
    the simulation can be checked against each other rather than one being
    taken on trust.
    """
    return float(-np.cos(theta))


def chsh_value(
    state: ComplexVector,
    a: RealVector | tuple[float, float, float],
    a_prime: RealVector | tuple[float, float, float],
    b: RealVector | tuple[float, float, float],
    b_prime: RealVector | tuple[float, float, float],
) -> float:
    """S = E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′).

    A local hidden-variable model obeys |S| ≤ 2; quantum mechanics reaches
    2√2 ≈ 2.828 for the singlet at the right settings. This is an ideal
    theoretical model, with no detector inefficiency or locality loopholes
    represented (§8.11).
    """
    return float(
        correlation(state, a, b)
        + correlation(state, a, b_prime)
        + correlation(state, a_prime, b)
        - correlation(state, a_prime, b_prime)
    )


#: The classical local-hidden-variable bound on |S| (§8.11).
CHSH_CLASSICAL_BOUND = 2.0

#: The Tsirelson bound, 2√2, the largest |S| quantum mechanics allows.
CHSH_QUANTUM_BOUND = float(2 * np.sqrt(2))


def sample_joint_measurements(
    state: ComplexVector,
    axis_a: RealVector | tuple[float, float, float],
    axis_b: RealVector | tuple[float, float, float],
    shots: int,
    *,
    rng: np.random.Generator,
) -> dict[tuple[int, int], int]:
    """Tally ``shots`` independent trials of the Alice/Bob experiment.

    Every trial is a fresh pair prepared in the same state, exactly as with the
    single-qubit shot batches of §8.7.
    """
    validate_shots(shots)
    joint = joint_spin_probabilities(state, axis_a, axis_b)
    outcomes = list(joint.keys())
    weights = np.clip(np.array([joint[key] for key in outcomes], dtype=np.float64), 0.0, 1.0)
    total = float(weights.sum())
    if total <= 0.0:
        raise QuantumValidationError(
            "DEGENERATE_DISTRIBUTION",
            "The joint outcome probabilities sum to zero and cannot be sampled.",
        )
    counts = rng.multinomial(shots, weights / total)
    return {outcome: int(count) for outcome, count in zip(outcomes, counts)}


def schmidt_coefficients(state: ComplexVector) -> np.ndarray:
    """Schmidt coefficients across the 1|rest cut, descending.

    Exposed so the interface can show *how far* from a product state a given
    state is, rather than only whether it is one (§8.9).
    """
    array = np.asarray(state, dtype=np.complex128)
    validate_state(array)
    if array.shape == (2,):
        return np.array([1.0], dtype=np.float64)
    return np.asarray(
        np.linalg.svd(reshape_state_for_subsystems(array, 1), compute_uv=False),
        dtype=np.float64,
    )
