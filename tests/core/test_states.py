"""State vectors, Bloch angles and global phase (§5.2, §15)."""

import numpy as np
import pytest

from quantum_foundations.core import (
    QuantumValidationError,
    angles_from_qubit,
    bloch_vector,
    equivalent_up_to_global_phase,
    global_phase_align,
    ket0,
    ket1,
    ket_minus,
    ket_minus_i,
    ket_plus,
    ket_plus_i,
    normalize_state,
    probabilities,
    qubit_from_angles,
    validate_state,
)

CANONICAL = [ket0(), ket1(), ket_plus(), ket_minus(), ket_plus_i(), ket_minus_i()]


@pytest.mark.parametrize("state", CANONICAL)
def test_canonical_states_are_normalized(state):
    validate_state(state)


def test_qubit_from_angles_is_normalized():
    state = qubit_from_angles(theta=np.pi / 3, phi=np.pi / 5)
    assert np.isclose(np.vdot(state, state), 1.0)


def test_global_phase_does_not_change_physical_state():
    psi = ket_plus()
    shifted = np.exp(1j * 0.7) * psi
    assert equivalent_up_to_global_phase(psi, shifted)


def test_plus_state_has_equal_z_probabilities():
    probs = probabilities(ket_plus())
    assert np.allclose(probs, [0.5, 0.5])


def test_plus_and_minus_share_z_probabilities_but_differ_physically():
    """The teaching moment in §8.3: identical Z statistics, different states."""
    assert np.allclose(probabilities(ket_plus()), probabilities(ket_minus()))
    assert not equivalent_up_to_global_phase(ket_plus(), ket_minus())


@pytest.mark.parametrize(
    ("theta", "phi"),
    [(0.0, 0.0), (np.pi, 0.0), (np.pi / 2, 0.0), (np.pi / 2, np.pi), (0.9, 1.7), (2.4, 5.9)],
)
def test_angles_round_trip(theta, phi):
    state = qubit_from_angles(theta, phi)
    recovered = angles_from_qubit(state)
    assert np.isclose(recovered.theta, theta, atol=1e-9)
    if 1e-9 < theta < np.pi - 1e-9:
        assert np.isclose(recovered.phi, np.mod(phi, 2 * np.pi), atol=1e-9)


def test_angles_are_invariant_under_global_phase():
    state = qubit_from_angles(1.1, 2.2)
    shifted = np.exp(1j * 1.3) * state
    original, rotated = angles_from_qubit(state), angles_from_qubit(shifted)
    assert np.isclose(original.theta, rotated.theta)
    assert np.isclose(original.phi, rotated.phi)


@pytest.mark.parametrize(
    ("state", "expected"),
    [
        (ket0(), [0.0, 0.0, 1.0]),
        (ket1(), [0.0, 0.0, -1.0]),
        (ket_plus(), [1.0, 0.0, 0.0]),
        (ket_minus(), [-1.0, 0.0, 0.0]),
        (ket_plus_i(), [0.0, 1.0, 0.0]),
        (ket_minus_i(), [0.0, -1.0, 0.0]),
    ],
)
def test_canonical_bloch_vectors(state, expected):
    assert np.allclose(bloch_vector(state), expected, atol=1e-12)


def test_normalize_state_rescales():
    assert np.allclose(normalize_state(np.array([3.0, 4.0], dtype=complex)), [0.6, 0.8])


def test_normalize_rejects_zero_vector():
    with pytest.raises(QuantumValidationError) as error:
        normalize_state(np.zeros(2, dtype=complex))
    assert error.value.code == "ZERO_STATE_VECTOR"


def test_global_phase_align_makes_overlap_real_and_positive():
    aligned = global_phase_align(ket_plus(), np.exp(1j * 2.1) * ket_plus())
    overlap = complex(np.vdot(ket_plus(), aligned))
    assert np.isclose(overlap.imag, 0.0, atol=1e-12)
    assert overlap.real > 0.0


def test_orthogonal_states_are_not_equivalent():
    assert not equivalent_up_to_global_phase(ket0(), ket1())


def test_validate_state_rejects_unnormalized():
    with pytest.raises(QuantumValidationError) as error:
        validate_state(np.array([1.0, 1.0], dtype=complex))
    assert error.value.code == "STATE_NOT_NORMALIZED"


def test_bloch_vector_rejects_two_qubit_state():
    with pytest.raises(QuantumValidationError) as error:
        bloch_vector(np.array([1.0, 0.0, 0.0, 0.0], dtype=complex))
    assert error.value.code == "NOT_A_ONE_QUBIT_STATE"
