"""Hermitian observables, eigensystems and expectation values.

Specification reference: §5.6.

Observables are kept deliberately separate from gates (§21): a gate is unitary
and evolves a state, an observable is Hermitian and defines what a measurement
device can read out. The two are different objects even when they share a
matrix, as the Pauli operators do.
"""

import numpy as np

from .gates import X, Y, Z
from .states import validate_state
from .types import (
    HERMITIAN_ATOL,
    ComplexMatrix,
    ComplexVector,
    MeasurementOutcome,
    RealVector,
)
from .validation import QuantumValidationError, validate_hermitian, validate_square_matrix

#: Eigenvalues closer together than this are treated as one degenerate subspace.
DEGENERACY_ATOL = 1e-9


def is_hermitian(matrix: ComplexMatrix, *, atol: float = HERMITIAN_ATOL) -> bool:
    """True when A† = A within ``atol``."""
    try:
        validate_hermitian(matrix, atol=atol)
    except QuantumValidationError:
        return False
    return True


def eigensystem(observable: ComplexMatrix) -> tuple[RealVector, ComplexMatrix]:
    """Return ``(eigenvalues, eigenvectors)`` in ascending eigenvalue order.

    Eigenvectors are the *columns* of the returned matrix. Because the
    observable is Hermitian the eigenvalues are real, and are returned as a
    real array rather than as complex numbers with vanishing imaginary parts.
    """
    validate_hermitian(observable)
    values, vectors = np.linalg.eigh(np.asarray(observable, dtype=np.complex128))
    return np.asarray(values, dtype=np.float64), np.asarray(vectors, dtype=np.complex128)


def expectation_value(state: ComplexVector, observable: ComplexMatrix) -> float:
    """⟨A⟩ = ⟨ψ|A|ψ⟩, which is real for a Hermitian observable."""
    array = np.asarray(state, dtype=np.complex128)
    matrix = np.asarray(observable, dtype=np.complex128)
    validate_state(array)
    validate_hermitian(matrix)
    _require_matching_dimensions(array, matrix)
    return float(np.real(np.vdot(array, matrix @ array)))


def variance(state: ComplexVector, observable: ComplexMatrix) -> float:
    """(ΔA)² = ⟨A²⟩ − ⟨A⟩².

    Clamped at zero so that floating-point noise on a sharp eigenstate cannot
    produce a small negative variance.
    """
    matrix = np.asarray(observable, dtype=np.complex128)
    mean = expectation_value(state, matrix)
    mean_of_square = expectation_value(state, matrix @ matrix)
    return float(max(mean_of_square - mean**2, 0.0))


def projective_measurement_distribution(
    state: ComplexVector,
    observable: ComplexMatrix,
) -> list[MeasurementOutcome]:
    """Outcomes of measuring ``observable``, one entry per distinct eigenvalue.

    Degenerate eigenvalues are grouped into a single outcome with the projector
    onto the whole eigenspace, which is what a real measurement device
    distinguishes. Outcomes are ordered by descending eigenvalue so that the
    familiar +1 result is listed first.
    """
    array = np.asarray(state, dtype=np.complex128)
    matrix = np.asarray(observable, dtype=np.complex128)
    validate_state(array)
    validate_hermitian(matrix)
    _require_matching_dimensions(array, matrix)

    values, vectors = eigensystem(matrix)
    outcomes: list[MeasurementOutcome] = []
    start = 0
    for index in range(1, len(values) + 1):
        if index < len(values) and abs(values[index] - values[start]) <= DEGENERACY_ATOL:
            continue
        subspace = vectors[:, start:index]
        projected = subspace @ (subspace.conj().T @ array)
        probability = float(np.clip(np.real(np.vdot(projected, projected)), 0.0, 1.0))
        collapsed = (
            projected / np.sqrt(probability) if probability > 0.0 else np.zeros_like(array)
        )
        outcomes.append(
            MeasurementOutcome(
                eigenvalue=float(np.mean(values[start:index])),
                probability=probability,
                state=collapsed,
            )
        )
        start = index
    return sorted(outcomes, key=lambda outcome: -outcome.eigenvalue)


def spin_observable(direction: RealVector | tuple[float, float, float]) -> ComplexMatrix:
    """σ_n = n_x X + n_y Y + n_z Z for a unit vector ``n`` in ℝ³.

    This is the observable a Stern–Gerlach device measures when its axis points
    along ``n`` (§8.2), and its eigenvalues are ±1 for any unit ``n``.
    """
    vector = np.asarray(direction, dtype=np.float64)
    if vector.shape != (3,):
        raise QuantumValidationError(
            "INVALID_SPIN_AXIS",
            f"A measurement axis must be a 3-vector; received shape {vector.shape}.",
            shape=list(vector.shape),
        )
    if not np.all(np.isfinite(vector)):
        raise QuantumValidationError(
            "NON_FINITE_VALUE", "The measurement axis contains a non-finite value."
        )
    norm = float(np.linalg.norm(vector))
    if abs(norm - 1.0) > 1e-9:
        raise QuantumValidationError(
            "MEASUREMENT_AXIS_NOT_UNIT",
            "A measurement axis must be a unit vector.",
            norm=norm,
        )
    return np.asarray(vector[0] * X + vector[1] * Y + vector[2] * Z, dtype=np.complex128)


def axis_from_angles(theta: float, phi: float) -> RealVector:
    """Cartesian unit vector for the spherical angles used by the UI (§6)."""
    return np.array(
        [
            np.sin(theta) * np.cos(phi),
            np.sin(theta) * np.sin(phi),
            np.cos(theta),
        ],
        dtype=np.float64,
    )


def _require_matching_dimensions(state: ComplexVector, matrix: ComplexMatrix) -> None:
    validate_square_matrix(matrix, label="observable")
    if matrix.shape[0] != state.shape[0]:
        raise QuantumValidationError(
            "OPERATOR_DIMENSION_MISMATCH",
            f"An operator of dimension {matrix.shape[0]} cannot act on a state of "
            f"dimension {state.shape[0]}.",
            operator_dimension=int(matrix.shape[0]),
            state_dimension=int(state.shape[0]),
        )
