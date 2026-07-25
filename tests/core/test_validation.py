"""The rejection rules of §13, one test per documented rule."""

import numpy as np
import pytest

from quantum_foundations.core import QuantumValidationError
from quantum_foundations.core.validation import (
    validate_circuit_depth,
    validate_hermitian,
    validate_normalized,
    validate_qubit_count,
    validate_shots,
    validate_square_matrix,
    validate_state_shape,
    validate_unitary,
)


def test_non_power_of_two_length_is_rejected():
    with pytest.raises(QuantumValidationError) as error:
        validate_state_shape(np.ones(3, dtype=complex))
    assert error.value.code == "INVALID_STATE_DIMENSION"


def test_empty_state_is_rejected():
    with pytest.raises(QuantumValidationError) as error:
        validate_state_shape(np.array([], dtype=complex))
    assert error.value.code == "EMPTY_STATE"


@pytest.mark.parametrize("bad", [np.nan, np.inf, -np.inf])
def test_non_finite_values_are_rejected(bad):
    with pytest.raises(QuantumValidationError) as error:
        validate_state_shape(np.array([bad, 0.0], dtype=complex))
    assert error.value.code == "NON_FINITE_VALUE"


def test_multidimensional_state_is_rejected():
    with pytest.raises(QuantumValidationError) as error:
        validate_state_shape(np.eye(2, dtype=complex))
    assert error.value.code == "INVALID_STATE_SHAPE"


def test_non_square_matrix_is_rejected():
    with pytest.raises(QuantumValidationError) as error:
        validate_square_matrix(np.ones((2, 3), dtype=complex))
    assert error.value.code == "INVALID_MATRIX_SHAPE"


def test_unnormalised_state_is_rejected():
    with pytest.raises(QuantumValidationError) as error:
        validate_normalized(np.array([1.0, 1.0], dtype=complex))
    assert error.value.code == "STATE_NOT_NORMALIZED"


def test_non_unitary_gate_is_rejected_with_residual():
    with pytest.raises(QuantumValidationError) as error:
        validate_unitary(np.array([[1, 1], [0, 1]], dtype=complex))
    assert error.value.code == "NON_UNITARY_OPERATOR"
    assert error.value.details["residual_norm"] > 0.0
    assert error.value.to_dict()["message"].startswith("The supplied matrix")


def test_non_hermitian_observable_is_rejected():
    with pytest.raises(QuantumValidationError) as error:
        validate_hermitian(np.array([[0, 1], [0, 0]], dtype=complex))
    assert error.value.code == "NON_HERMITIAN_OBSERVABLE"


@pytest.mark.parametrize("shots", [0, -5])
def test_shot_counts_below_one_are_rejected(shots):
    with pytest.raises(QuantumValidationError) as error:
        validate_shots(shots)
    assert error.value.code == "INVALID_SHOT_COUNT"


def test_shot_cap_is_enforced():
    validate_shots(100_000)
    with pytest.raises(QuantumValidationError) as error:
        validate_shots(100_001)
    assert error.value.code == "SHOT_LIMIT_EXCEEDED"


@pytest.mark.parametrize("qubit_count", [0, 3, 10])
def test_unsupported_qubit_counts_are_rejected(qubit_count):
    with pytest.raises(QuantumValidationError) as error:
        validate_qubit_count(qubit_count)
    assert error.value.code == "UNSUPPORTED_QUBIT_COUNT"


@pytest.mark.parametrize("qubit_count", [1, 2])
def test_supported_qubit_counts_are_accepted(qubit_count):
    validate_qubit_count(qubit_count)


def test_circuit_depth_cap_is_enforced():
    validate_circuit_depth(24)
    with pytest.raises(QuantumValidationError) as error:
        validate_circuit_depth(25)
    assert error.value.code == "CIRCUIT_DEPTH_EXCEEDED"


def test_error_envelope_matches_the_documented_shape():
    """§13 requires code, message and details."""
    error = QuantumValidationError("NON_UNITARY_OPERATOR", "message", residual_norm=0.031)
    assert error.to_dict() == {
        "code": "NON_UNITARY_OPERATOR",
        "message": "message",
        "details": {"residual_norm": 0.031},
    }
