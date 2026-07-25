"""Gates, rotations and gate application (§5.3, §15)."""

import numpy as np
import pytest

from quantum_foundations.core import (
    CNOT,
    CZ,
    SDG,
    SWAP,
    TDG,
    H,
    I,
    QuantumValidationError,
    S,
    T,
    X,
    Y,
    Z,
    apply_gate,
    computational_basis_state,
    controlled,
    equivalent_up_to_global_phase,
    gate_matrix,
    gate_qubit_count,
    is_unitary,
    ket0,
    ket1,
    ket_minus,
    ket_plus,
    phase,
    probabilities,
    rx,
    ry,
    rz,
    tensor_product,
)


@pytest.mark.parametrize("gate", [I, X, Y, Z, H, S, T])
def test_standard_gates_are_unitary(gate):
    assert is_unitary(gate)


@pytest.mark.parametrize("gate", [SDG, TDG, CNOT, CZ, SWAP])
def test_remaining_named_gates_are_unitary(gate):
    assert is_unitary(gate)


@pytest.mark.parametrize("angle", [0.0, 0.3, np.pi / 2, np.pi, 2.9])
@pytest.mark.parametrize("constructor", [rx, ry, rz, phase])
def test_rotation_constructors_are_unitary(constructor, angle):
    assert is_unitary(constructor(angle))


def test_x_swaps_computational_basis_states():
    assert np.allclose(X @ ket0(), ket1())
    assert np.allclose(X @ ket1(), ket0())


def test_z_leaves_zero_and_flips_the_sign_of_one():
    assert np.allclose(Z @ ket0(), ket0())
    assert np.allclose(Z @ ket1(), -ket1())


def test_z_changes_relative_phase_without_changing_z_probabilities():
    """§8.4: the visual must show Z acting even when the bars do not move."""
    rotated = Z @ ket_plus()
    assert np.allclose(probabilities(rotated), probabilities(ket_plus()))
    assert equivalent_up_to_global_phase(rotated, ket_minus())


def test_hadamard_creates_equal_superposition():
    assert np.allclose(probabilities(H @ ket0()), [0.5, 0.5])
    assert np.allclose(H @ ket0(), ket_plus())


@pytest.mark.parametrize("gate", [X, Y, Z, H])
def test_self_inverse_gates_undo_themselves(gate):
    assert np.allclose(gate @ gate, np.eye(2), atol=1e-12)


def test_pauli_gates_are_pi_rotations_up_to_global_phase():
    """§8.4: X is a π rotation about x, up to an unobservable phase."""
    assert equivalent_up_to_global_phase(rx(np.pi) @ ket0(), X @ ket0())
    assert equivalent_up_to_global_phase(ry(np.pi) @ ket0(), Y @ ket0())
    assert equivalent_up_to_global_phase(rz(np.pi) @ ket_plus(), Z @ ket_plus())


def test_s_squared_is_z_and_t_squared_is_s():
    assert np.allclose(S @ S, Z)
    assert np.allclose(T @ T, S)


@pytest.mark.parametrize(("gate", "inverse"), [(S, SDG), (T, TDG)])
def test_daggered_gates_invert(gate, inverse):
    assert np.allclose(gate @ inverse, np.eye(2), atol=1e-12)


def test_controlled_x_is_cnot():
    assert np.allclose(controlled(X), CNOT)


def test_controlled_z_is_cz():
    assert np.allclose(controlled(Z), CZ)


def test_apply_gate_to_first_qubit_of_two():
    state = computational_basis_state("00")
    result = apply_gate(state, X, (0,), qubit_count=2)
    assert np.allclose(result, computational_basis_state("10"))


def test_apply_gate_to_second_qubit_of_two():
    state = computational_basis_state("00")
    result = apply_gate(state, X, (1,), qubit_count=2)
    assert np.allclose(result, computational_basis_state("01"))


def test_cnot_flips_target_when_control_is_one():
    assert np.allclose(
        apply_gate(computational_basis_state("10"), CNOT, (0, 1), qubit_count=2),
        computational_basis_state("11"),
    )
    assert np.allclose(
        apply_gate(computational_basis_state("00"), CNOT, (0, 1), qubit_count=2),
        computational_basis_state("00"),
    )


def test_cnot_with_reversed_targets_uses_second_qubit_as_control():
    assert np.allclose(
        apply_gate(computational_basis_state("01"), CNOT, (1, 0), qubit_count=2),
        computational_basis_state("11"),
    )


def test_swap_exchanges_qubits():
    assert np.allclose(
        apply_gate(computational_basis_state("01"), SWAP, (0, 1), qubit_count=2),
        computational_basis_state("10"),
    )


def test_apply_gate_matches_explicit_tensor_product():
    state = tensor_product(ket_plus(), ket0())
    expected = tensor_product(H, I) @ state
    assert np.allclose(apply_gate(state, H, (0,), qubit_count=2), expected)


def test_apply_gate_preserves_normalisation():
    state = tensor_product(ket_plus(), ket_minus())
    result = apply_gate(state, CNOT, (0, 1), qubit_count=2)
    assert np.isclose(np.vdot(result, result).real, 1.0)


def test_apply_gate_rejects_non_unitary_matrix():
    """§8.5: a non-unitary matrix is reported, never applied."""
    with pytest.raises(QuantumValidationError) as error:
        apply_gate(ket0(), np.array([[1, 1], [0, 1]], dtype=complex), (0,), qubit_count=1)
    assert error.value.code == "NON_UNITARY_OPERATOR"
    assert error.value.details["residual_norm"] > 0


def test_apply_gate_rejects_duplicate_targets():
    with pytest.raises(QuantumValidationError) as error:
        apply_gate(computational_basis_state("00"), CNOT, (0, 0), qubit_count=2)
    assert error.value.code == "DUPLICATE_GATE_TARGETS"


def test_apply_gate_rejects_out_of_range_target():
    with pytest.raises(QuantumValidationError) as error:
        apply_gate(ket0(), X, (3,), qubit_count=1)
    assert error.value.code == "INVALID_TARGET_INDEX"


def test_apply_gate_rejects_wrong_target_count():
    with pytest.raises(QuantumValidationError) as error:
        apply_gate(computational_basis_state("00"), CNOT, (0,), qubit_count=2)
    assert error.value.code == "TARGET_COUNT_MISMATCH"


def test_is_unitary_rejects_scaled_identity():
    assert not is_unitary(2 * np.eye(2))


def test_gate_matrix_resolves_names_and_parameters():
    assert np.allclose(gate_matrix("h"), H)
    assert np.allclose(gate_matrix("RX", {"theta": 0.4}), rx(0.4))
    assert np.allclose(gate_matrix("PHASE", {"phi": 0.4}), phase(0.4))


def test_gate_matrix_rejects_unknown_gate():
    with pytest.raises(QuantumValidationError) as error:
        gate_matrix("NOPE")
    assert error.value.code == "UNKNOWN_GATE"


def test_gate_matrix_requires_angle_for_rotation():
    with pytest.raises(QuantumValidationError) as error:
        gate_matrix("RZ")
    assert error.value.code == "MISSING_GATE_PARAMETER"


@pytest.mark.parametrize(("name", "expected"), [("X", 1), ("RY", 1), ("CNOT", 2), ("SWAP", 2)])
def test_gate_qubit_count(name, expected):
    assert gate_qubit_count(name) == expected
