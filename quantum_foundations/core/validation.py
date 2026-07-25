"""Validation rules shared by the core, the API and the test-suite.

Specification reference: §13 (validation rules). Every rejection raises
:class:`QuantumValidationError`, which carries the machine-readable ``code``,
a human-readable ``message`` and a ``details`` mapping, matching the error
envelope the API is required to emit.
"""

from typing import Any, Sequence

import numpy as np

from .types import (
    HERMITIAN_ATOL,
    MAX_CIRCUIT_DEPTH,
    MAX_QUBITS,
    MAX_SHOTS,
    NORMALIZATION_ATOL,
    UNITARY_ATOL,
    ComplexMatrix,
    ComplexVector,
)


class QuantumValidationError(ValueError):
    """A supplied mathematical object violates a documented invariant."""

    def __init__(self, code: str, message: str, **details: Any) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details: dict[str, Any] = details

    def to_dict(self) -> dict[str, Any]:
        """Render the error in the envelope described in §13."""
        return {"code": self.code, "message": self.message, "details": self.details}


def _require_finite(array: np.ndarray, label: str) -> None:
    if not np.all(np.isfinite(array)):
        raise QuantumValidationError(
            "NON_FINITE_VALUE",
            f"The supplied {label} contains a non-finite value (NaN or infinity).",
            label=label,
        )


def is_power_of_two(value: int) -> bool:
    return value > 0 and value & (value - 1) == 0


def qubit_count_for_dimension(dimension: int) -> int:
    """Return n such that ``dimension == 2**n``, validating the dimension."""
    if dimension == 0:
        raise QuantumValidationError("EMPTY_STATE", "A quantum state must have at least one amplitude.")
    if not is_power_of_two(dimension):
        raise QuantumValidationError(
            "INVALID_STATE_DIMENSION",
            f"A state vector must have a power-of-two length; received {dimension}.",
            dimension=dimension,
        )
    return int(dimension).bit_length() - 1


def validate_qubit_count(qubit_count: int) -> None:
    """Reject qubit counts outside the range supported by version 1 (§17)."""
    if qubit_count < 1 or qubit_count > MAX_QUBITS:
        raise QuantumValidationError(
            "UNSUPPORTED_QUBIT_COUNT",
            f"This release supports 1 to {MAX_QUBITS} qubits; received {qubit_count}.",
            qubit_count=qubit_count,
            maximum=MAX_QUBITS,
        )


def validate_state_shape(state: ComplexVector) -> int:
    """Validate a state vector's shape and finiteness; return its qubit count."""
    array = np.asarray(state)
    if array.ndim != 1:
        raise QuantumValidationError(
            "INVALID_STATE_SHAPE",
            f"A state vector must be one-dimensional; received shape {array.shape}.",
            shape=list(array.shape),
        )
    _require_finite(array, "state vector")
    return qubit_count_for_dimension(array.shape[0])


def validate_normalized(state: ComplexVector, *, atol: float = NORMALIZATION_ATOL) -> None:
    """Reject a state whose norm differs from one by more than ``atol``."""
    norm = float(np.sqrt(np.real(np.vdot(state, state))))
    if abs(norm - 1.0) > atol:
        raise QuantumValidationError(
            "STATE_NOT_NORMALIZED",
            "The supplied state does not satisfy ⟨ψ|ψ⟩ = 1 within tolerance.",
            norm=norm,
            residual=abs(norm - 1.0),
        )


def validate_square_matrix(matrix: ComplexMatrix, *, label: str = "matrix") -> int:
    """Validate that ``matrix`` is a finite 2**n square matrix; return n."""
    array = np.asarray(matrix)
    if array.ndim != 2 or array.shape[0] != array.shape[1]:
        raise QuantumValidationError(
            "INVALID_MATRIX_SHAPE",
            f"A {label} must be square; received shape {array.shape}.",
            shape=list(array.shape),
        )
    _require_finite(array, label)
    return qubit_count_for_dimension(array.shape[0])


def validate_unitary(matrix: ComplexMatrix, *, atol: float = UNITARY_ATOL) -> None:
    """Reject an operator that does not satisfy U†U = I (§13)."""
    validate_square_matrix(matrix, label="gate")
    array = np.asarray(matrix, dtype=np.complex128)
    residual = array.conj().T @ array - np.eye(array.shape[0])
    residual_norm = float(np.linalg.norm(residual))
    if residual_norm > atol:
        raise QuantumValidationError(
            "NON_UNITARY_OPERATOR",
            "The supplied matrix does not satisfy U†U = I within tolerance.",
            residual_norm=residual_norm,
        )


def validate_hermitian(matrix: ComplexMatrix, *, atol: float = HERMITIAN_ATOL) -> None:
    """Reject an observable that does not satisfy A† = A (§13)."""
    validate_square_matrix(matrix, label="observable")
    array = np.asarray(matrix, dtype=np.complex128)
    residual_norm = float(np.linalg.norm(array.conj().T - array))
    if residual_norm > atol:
        raise QuantumValidationError(
            "NON_HERMITIAN_OBSERVABLE",
            "The supplied matrix does not satisfy A† = A within tolerance.",
            residual_norm=residual_norm,
        )


def validate_targets(targets: Sequence[int], *, qubit_count: int, gate_qubits: int) -> None:
    """Reject out-of-range, duplicated or miscounted gate targets (§13)."""
    if len(targets) != gate_qubits:
        raise QuantumValidationError(
            "TARGET_COUNT_MISMATCH",
            f"A {gate_qubits}-qubit gate requires {gate_qubits} targets; received {len(targets)}.",
            expected=gate_qubits,
            received=len(targets),
        )
    if len(set(targets)) != len(targets):
        raise QuantumValidationError(
            "DUPLICATE_GATE_TARGETS",
            "A gate cannot address the same qubit more than once.",
            targets=list(targets),
        )
    for target in targets:
        if target < 0 or target >= qubit_count:
            raise QuantumValidationError(
                "INVALID_TARGET_INDEX",
                f"Target qubit {target} is outside the range 0 to {qubit_count - 1}.",
                target=target,
                qubit_count=qubit_count,
            )


def validate_shots(shots: int) -> None:
    """Reject shot counts below one or above the documented cap (§13, §17)."""
    if shots < 1:
        raise QuantumValidationError(
            "INVALID_SHOT_COUNT",
            f"The number of shots must be at least 1; received {shots}.",
            shots=shots,
        )
    if shots > MAX_SHOTS:
        raise QuantumValidationError(
            "SHOT_LIMIT_EXCEEDED",
            f"At most {MAX_SHOTS} shots may be simulated per request; received {shots}.",
            shots=shots,
            maximum=MAX_SHOTS,
        )


def validate_circuit_depth(depth: int) -> None:
    """Reject circuits longer than the documented limit (§17)."""
    if depth > MAX_CIRCUIT_DEPTH:
        raise QuantumValidationError(
            "CIRCUIT_DEPTH_EXCEEDED",
            f"Circuits are limited to {MAX_CIRCUIT_DEPTH} operations; received {depth}.",
            depth=depth,
            maximum=MAX_CIRCUIT_DEPTH,
        )
