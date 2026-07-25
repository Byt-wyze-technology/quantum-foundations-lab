"""Bell states, partial trace and entanglement measures (§5.7, §15)."""

import numpy as np
import pytest

from quantum_foundations.core import (
    BELL_STATES,
    QuantumValidationError,
    bell_phi_minus,
    bell_phi_plus,
    bell_psi_minus,
    bell_psi_plus,
    concurrence_two_qubit,
    density_matrix,
    is_product_state,
    ket0,
    ket1,
    ket_plus,
    partial_trace,
    probabilities,
    purity,
    reduced_density_matrix,
    schmidt_coefficients,
    tensor_product,
)

ALL_BELL = [bell_phi_plus(), bell_phi_minus(), bell_psi_plus(), bell_psi_minus()]


def test_phi_plus_has_expected_joint_probabilities():
    probs = probabilities(bell_phi_plus())
    assert np.allclose(probs, [0.5, 0.0, 0.0, 0.5])


def test_psi_minus_has_expected_joint_probabilities():
    assert np.allclose(probabilities(bell_psi_minus()), [0.0, 0.5, 0.5, 0.0])


@pytest.mark.parametrize("state", ALL_BELL)
def test_bell_states_are_normalized(state):
    assert np.isclose(np.vdot(state, state).real, 1.0)


@pytest.mark.parametrize("state", ALL_BELL)
def test_bell_states_are_mutually_orthogonal(state):
    overlaps = [abs(complex(np.vdot(state, other))) for other in ALL_BELL]
    assert sorted(overlaps) == pytest.approx([0.0, 0.0, 0.0, 1.0], abs=1e-12)


def test_bell_subsystem_is_maximally_mixed():
    rho_a = reduced_density_matrix(bell_phi_plus(), keep=(0,), qubit_count=2)
    assert np.allclose(rho_a, np.eye(2) / 2)


@pytest.mark.parametrize("state", ALL_BELL)
@pytest.mark.parametrize("keep", [(0,), (1,)])
def test_every_bell_subsystem_is_maximally_mixed(state, keep):
    """§21: neither half of a Bell pair may be drawn as a pure Bloch arrow."""
    reduced = reduced_density_matrix(state, keep=keep, qubit_count=2)
    assert np.allclose(reduced, np.eye(2) / 2)
    assert np.isclose(purity(reduced), 0.5)


def test_bell_state_is_not_product_state():
    assert not is_product_state(bell_phi_plus())
    assert np.isclose(concurrence_two_qubit(bell_phi_plus()), 1.0)


def test_tensor_product_is_product_state():
    psi = tensor_product(ket_plus(), ket0())
    assert is_product_state(psi)


@pytest.mark.parametrize("state", ALL_BELL)
def test_all_bell_states_are_maximally_entangled(state):
    assert not is_product_state(state)
    assert np.isclose(concurrence_two_qubit(state), 1.0)


def test_product_state_has_zero_concurrence():
    assert np.isclose(concurrence_two_qubit(tensor_product(ket_plus(), ket1())), 0.0, atol=1e-12)


def test_product_subsystems_stay_pure():
    """The contrast §8.9 draws: a product state's halves each have purity 1."""
    state = tensor_product(ket_plus(), ket0())
    for keep in ((0,), (1,)):
        assert np.isclose(purity(reduced_density_matrix(state, keep=keep, qubit_count=2)), 1.0)


def test_product_subsystem_recovers_the_original_factor():
    state = tensor_product(ket_plus(), ket1())
    assert np.allclose(reduced_density_matrix(state, keep=(0,), qubit_count=2), density_matrix(ket_plus()))
    assert np.allclose(reduced_density_matrix(state, keep=(1,), qubit_count=2), density_matrix(ket1()))


def test_partially_entangled_state_sits_between_the_extremes():
    state = np.array([np.sqrt(0.9), 0.0, 0.0, np.sqrt(0.1)], dtype=complex)
    concurrence = concurrence_two_qubit(state)
    assert 0.0 < concurrence < 1.0
    reduced = reduced_density_matrix(state, keep=(0,), qubit_count=2)
    assert 0.5 < purity(reduced) < 1.0


def test_density_matrix_is_hermitian_unit_trace_and_pure():
    rho = density_matrix(ket_plus())
    assert np.allclose(rho, rho.conj().T)
    assert np.isclose(np.trace(rho).real, 1.0)
    assert np.isclose(purity(rho), 1.0)


def test_partial_trace_preserves_trace():
    rho = density_matrix(bell_psi_plus())
    assert np.isclose(np.trace(partial_trace(rho, keep=(0,), qubit_count=2)).real, 1.0)


def test_partial_trace_keeping_everything_is_the_identity_operation():
    rho = density_matrix(bell_phi_minus())
    assert np.allclose(partial_trace(rho, keep=(0, 1), qubit_count=2), rho)


def test_schmidt_coefficients_distinguish_product_from_bell():
    assert np.allclose(schmidt_coefficients(tensor_product(ket0(), ket1())), [1.0, 0.0], atol=1e-12)
    assert np.allclose(schmidt_coefficients(bell_phi_plus()), [1 / np.sqrt(2)] * 2)


def test_one_qubit_state_is_trivially_a_product_state():
    assert is_product_state(ket_plus())


def test_bell_state_registry_matches_constructors():
    assert set(BELL_STATES) == {"phi_plus", "phi_minus", "psi_plus", "psi_minus"}
    assert np.allclose(BELL_STATES["psi_minus"](), bell_psi_minus())


def test_partial_trace_rejects_empty_subsystem():
    with pytest.raises(QuantumValidationError) as error:
        partial_trace(density_matrix(bell_phi_plus()), keep=(), qubit_count=2)
    assert error.value.code == "EMPTY_SUBSYSTEM"


def test_partial_trace_rejects_dimension_mismatch():
    with pytest.raises(QuantumValidationError) as error:
        partial_trace(density_matrix(ket0()), keep=(0,), qubit_count=2)
    assert error.value.code == "OPERATOR_DIMENSION_MISMATCH"


def test_concurrence_rejects_one_qubit_state():
    with pytest.raises(QuantumValidationError) as error:
        concurrence_two_qubit(ket0())
    assert error.value.code == "NOT_A_TWO_QUBIT_STATE"
