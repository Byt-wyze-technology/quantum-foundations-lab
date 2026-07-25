"""Projective measurement in the computational basis.

Specification reference: §5.5.

For a projector P_k the outcome probability is p_k = ⟨ψ|P_k|ψ⟩ and the state
update is

    |ψ⟩ → P_k|ψ⟩ / √(⟨ψ|P_k|ψ⟩)

The distinction the UI must preserve (§5.5) is between the probability
distribution *before* measurement, one *sampled* outcome, the *post-measurement*
state, and *repeated independent preparations*. Each function here does exactly
one of those things, so the interface cannot blur them by accident:
:func:`measure_computational` and :func:`measure_qubit` sample once and collapse;
:func:`sample_measurements` models many fresh preparations of the same state and
never returns a collapsed state.
"""

import numpy as np

from .states import probabilities, validate_state
from .tensor import basis_labels
from .types import ComplexVector, MeasurementOutcome, RealVector
from .validation import (
    QuantumValidationError,
    qubit_count_for_dimension,
    validate_shots,
)


def _sampling_distribution(state: ComplexVector) -> RealVector:
    """Outcome probabilities, cleaned of numerical residue only (§14).

    Clipping repairs values such as −1e-17 that arise from floating-point
    arithmetic. It must not conceal a materially invalid state, so
    :func:`validate_state` runs first and a large residual still raises.
    """
    values = probabilities(state)
    values = np.clip(values, 0.0, 1.0)
    total = float(values.sum())
    if total <= 0.0:
        raise QuantumValidationError(
            "DEGENERATE_DISTRIBUTION",
            "The outcome probabilities sum to zero and cannot be sampled.",
        )
    return values / total


def measure_computational(
    state: ComplexVector,
    *,
    rng: np.random.Generator,
) -> MeasurementOutcome:
    """Measure every qubit in the computational basis exactly once.

    ``eigenvalue`` carries the index of the observed basis state — the natural
    label for the projector set {|x⟩⟨x|}. True observable eigenvalues (±1 for a
    Pauli, for instance) come from :mod:`quantum_foundations.core.observables`.
    """
    array = np.asarray(state, dtype=np.complex128)
    validate_state(array)
    distribution = _sampling_distribution(array)
    index = int(rng.choice(len(distribution), p=distribution))
    collapsed = np.zeros_like(array)
    collapsed[index] = 1.0
    return MeasurementOutcome(
        eigenvalue=float(index),
        probability=float(distribution[index]),
        state=collapsed,
    )


def measure_qubit(
    state: ComplexVector,
    qubit: int,
    *,
    qubit_count: int,
    rng: np.random.Generator,
) -> MeasurementOutcome:
    """Measure a single qubit inside a multi-qubit system.

    The other qubits are *not* measured; the returned state is the full system
    after projection, which is what makes the correlation in a Bell pair
    visible (§8.9).

    ``eigenvalue`` carries the observed bit, 0.0 or 1.0.
    """
    array = np.asarray(state, dtype=np.complex128)
    validate_state(array)
    expected = 2**qubit_count
    if array.shape != (expected,):
        raise QuantumValidationError(
            "STATE_DIMENSION_MISMATCH",
            f"A {qubit_count}-qubit state must have {expected} amplitudes.",
            qubit_count=qubit_count,
            expected=expected,
        )
    if qubit < 0 or qubit >= qubit_count:
        raise QuantumValidationError(
            "INVALID_TARGET_INDEX",
            f"Qubit {qubit} is outside the range 0 to {qubit_count - 1}.",
            target=qubit,
            qubit_count=qubit_count,
        )

    tensor = array.reshape((2,) * qubit_count)
    weights = np.array(
        [
            float(np.sum(np.abs(np.take(tensor, bit, axis=qubit)) ** 2))
            for bit in (0, 1)
        ],
        dtype=np.float64,
    )
    weights = np.clip(weights, 0.0, 1.0)
    total = float(weights.sum())
    if total <= 0.0:
        raise QuantumValidationError(
            "DEGENERATE_DISTRIBUTION",
            "The outcome probabilities sum to zero and cannot be sampled.",
        )
    weights /= total

    bit = int(rng.choice(2, p=weights))
    projected = np.zeros_like(tensor)
    index: list[slice | int] = [slice(None)] * qubit_count
    index[qubit] = bit
    projected[tuple(index)] = tensor[tuple(index)]
    probability = float(weights[bit])
    collapsed = projected.reshape(expected) / np.sqrt(probability)
    return MeasurementOutcome(eigenvalue=float(bit), probability=probability, state=collapsed)


def sample_measurements(
    state: ComplexVector,
    shots: int,
    *,
    rng: np.random.Generator,
) -> dict[str, int]:
    """Repeat *prepare-then-measure* ``shots`` times and tally the outcomes.

    Every shot is a fresh preparation of the same state (§8.7); this never
    measures one collapsed qubit repeatedly. Sampling is multinomial rather
    than shot-by-shot, which §17 permits and which keeps 100,000 shots
    instantaneous.
    """
    array = np.asarray(state, dtype=np.complex128)
    validate_state(array)
    validate_shots(shots)
    qubit_count = qubit_count_for_dimension(array.shape[0])
    distribution = _sampling_distribution(array)
    counts = rng.multinomial(shots, distribution)
    return {
        label: int(count)
        for label, count in zip(basis_labels(qubit_count), counts)
    }
