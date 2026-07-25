"""Tensor products and qubit ordering (§5.4, §15).

Ordering is the convention most easily got wrong, and §21 requires it to be
documented *and* tested, so these tests pin it explicitly.
"""

import numpy as np
import pytest

from quantum_foundations.core import (
    QuantumValidationError,
    basis_labels,
    computational_basis_state,
    ket0,
    ket1,
    ket_plus,
    reshape_state_for_subsystems,
    tensor_product,
)


def test_tensor_product_basis_order():
    state = tensor_product(ket0(), ket1())
    expected = computational_basis_state("01")
    assert np.allclose(state, expected)


def test_tensor_product_matches_written_column_vector():
    """|0⟩ ⊗ |1⟩ = (0, 1, 0, 0)ᵀ, exactly as written in §5.4."""
    assert np.allclose(tensor_product(ket0(), ket1()), [0, 1, 0, 0])


def test_leftmost_operand_is_most_significant():
    assert np.allclose(tensor_product(ket1(), ket0()), computational_basis_state("10"))


@pytest.mark.parametrize("bits", ["00", "01", "10", "11"])
def test_basis_states_are_unit_vectors_at_the_expected_index(bits):
    state = computational_basis_state(bits)
    assert state[int(bits, 2)] == 1.0
    assert np.isclose(np.sum(np.abs(state) ** 2), 1.0)


def test_basis_labels_are_ordered_with_q0_leading():
    assert basis_labels(1) == ["0", "1"]
    assert basis_labels(2) == ["00", "01", "10", "11"]


def test_tensor_product_of_operators_matches_kron():
    left = np.array([[0, 1], [1, 0]], dtype=complex)
    right = np.eye(2, dtype=complex)
    assert np.allclose(tensor_product(left, right), np.kron(left, right))


def test_product_of_superpositions_expands_as_specified():
    """§8.6: (α|0⟩+β|1⟩) ⊗ (γ|0⟩+δ|1⟩) → αγ, αδ, βγ, βδ."""
    alpha, beta = 0.6, 0.8
    gamma, delta = 1 / np.sqrt(2), 1j / np.sqrt(2)
    left = np.array([alpha, beta], dtype=complex)
    right = np.array([gamma, delta], dtype=complex)
    assert np.allclose(
        tensor_product(left, right),
        [alpha * gamma, alpha * delta, beta * gamma, beta * delta],
    )


def test_reshape_splits_subsystems():
    matrix = reshape_state_for_subsystems(tensor_product(ket_plus(), ket1()), 1)
    assert matrix.shape == (2, 2)
    assert np.allclose(matrix, np.outer([1 / np.sqrt(2)] * 2, [0, 1]))


def test_reshape_rejects_degenerate_split():
    with pytest.raises(QuantumValidationError) as error:
        reshape_state_for_subsystems(tensor_product(ket0(), ket1()), 2)
    assert error.value.code == "INVALID_SUBSYSTEM_SPLIT"


def test_basis_label_rejects_invalid_characters():
    with pytest.raises(QuantumValidationError) as error:
        computational_basis_state("02")
    assert error.value.code == "INVALID_BASIS_LABEL"


def test_basis_label_rejects_empty_string():
    with pytest.raises(QuantumValidationError) as error:
        computational_basis_state("")
    assert error.value.code == "INVALID_BASIS_LABEL"


def test_tensor_product_requires_an_operand():
    with pytest.raises(QuantumValidationError) as error:
        tensor_product()
    assert error.value.code == "EMPTY_TENSOR_PRODUCT"
