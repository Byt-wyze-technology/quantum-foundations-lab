"""EPR correlations and CHSH (§8.11).

The claims the lesson makes are checked here rather than asserted in prose:
E(theta) = -cos(theta) for the singlet, |S| reaches 2*sqrt(2) and no further,
and neither observer's own statistics depend on the other's setting.
"""

import numpy as np
import pytest

from quantum_foundations.core import (
    CHSH_CLASSICAL_BOUND,
    CHSH_QUANTUM_BOUND,
    bell_phi_plus,
    bell_psi_minus,
    chsh_value,
    correlation,
    joint_spin_probabilities,
    ket0,
    ket_plus,
    marginal_probabilities,
    sample_joint_measurements,
    singlet_correlation,
    tensor_product,
)


def axis(theta: float) -> np.ndarray:
    """A unit vector in the x-z plane, which is where the EPR dials live."""
    return np.array([np.sin(theta), 0.0, np.cos(theta)])


@pytest.mark.parametrize("degrees", [0, 30, 45, 60, 90, 120, 180])
def test_singlet_correlation_is_minus_cosine(degrees):
    theta = np.radians(degrees)
    assert np.isclose(
        correlation(bell_psi_minus(), axis(0.0), axis(theta)),
        -np.cos(theta),
        atol=1e-12,
    )


def test_closed_form_agrees_with_the_general_computation():
    for degrees in range(0, 360, 15):
        theta = np.radians(degrees)
        assert np.isclose(
            correlation(bell_psi_minus(), axis(0.0), axis(theta)),
            singlet_correlation(theta),
            atol=1e-12,
        )


def test_aligned_analysers_always_disagree():
    """The singlet's defining behaviour: same axis, opposite outcomes."""
    joint = joint_spin_probabilities(bell_psi_minus(), axis(0.0), axis(0.0))
    assert np.isclose(joint[(1, 1)], 0.0, atol=1e-12)
    assert np.isclose(joint[(-1, -1)], 0.0, atol=1e-12)
    assert np.isclose(joint[(1, -1)], 0.5)
    assert np.isclose(joint[(-1, 1)], 0.5)


def test_opposed_analysers_always_agree():
    joint = joint_spin_probabilities(bell_psi_minus(), axis(0.0), axis(np.pi))
    assert np.isclose(joint[(1, 1)], 0.5)
    assert np.isclose(joint[(-1, -1)], 0.5)


@pytest.mark.parametrize("degrees", [0, 25, 90, 137, 250])
def test_joint_probabilities_sum_to_one(degrees):
    joint = joint_spin_probabilities(bell_psi_minus(), axis(0.0), axis(np.radians(degrees)))
    assert np.isclose(sum(joint.values()), 1.0)


@pytest.mark.parametrize("alice_degrees", [0, 37, 90, 180])
@pytest.mark.parametrize("bob_degrees", [0, 45, 90, 173, 300])
def test_no_signalling(alice_degrees, bob_degrees):
    """Neither observer's own statistics depend on the other's setting (§21).

    This is the property that makes the "no information travels" claim in the
    lesson copy true rather than reassuring.
    """
    marginals = marginal_probabilities(
        bell_psi_minus(), axis(np.radians(alice_degrees)), axis(np.radians(bob_degrees))
    )
    assert np.isclose(marginals["alice"][1], 0.5)
    assert np.isclose(marginals["alice"][-1], 0.5)
    assert np.isclose(marginals["bob"][1], 0.5)
    assert np.isclose(marginals["bob"][-1], 0.5)


def test_alices_marginal_is_identical_for_every_setting_bob_chooses():
    """Stated as a single assertion, because it is the whole no-signalling point."""
    reference = marginal_probabilities(bell_psi_minus(), axis(0.4), axis(0.0))["alice"]
    for degrees in range(0, 360, 10):
        other = marginal_probabilities(
            bell_psi_minus(), axis(0.4), axis(np.radians(degrees))
        )["alice"]
        assert np.isclose(other[1], reference[1], atol=1e-12)
        assert np.isclose(other[-1], reference[-1], atol=1e-12)


def test_chsh_reaches_the_tsirelson_bound_at_the_optimal_settings():
    value = chsh_value(
        bell_psi_minus(),
        axis(0.0),
        axis(np.pi / 2),
        axis(np.pi / 4),
        axis(-np.pi / 4),
    )
    assert np.isclose(abs(value), CHSH_QUANTUM_BOUND)
    assert abs(value) > CHSH_CLASSICAL_BOUND


def test_chsh_never_exceeds_the_tsirelson_bound():
    """A sweep, so the quantum maximum is demonstrated rather than assumed."""
    rng = np.random.default_rng(4)
    for _ in range(400):
        angles = rng.uniform(-np.pi, np.pi, size=4)
        value = chsh_value(
            bell_psi_minus(), axis(angles[0]), axis(angles[1]), axis(angles[2]), axis(angles[3])
        )
        assert abs(value) <= CHSH_QUANTUM_BOUND + 1e-9


def test_a_product_state_stays_within_the_classical_bound():
    """No entanglement, no violation — the contrast the section rests on."""
    product = tensor_product(ket_plus(), ket0())
    rng = np.random.default_rng(9)
    for _ in range(200):
        angles = rng.uniform(-np.pi, np.pi, size=4)
        value = chsh_value(
            product, axis(angles[0]), axis(angles[1]), axis(angles[2]), axis(angles[3])
        )
        assert abs(value) <= CHSH_CLASSICAL_BOUND + 1e-9


def test_aligned_settings_give_no_violation():
    value = chsh_value(bell_psi_minus(), axis(0.0), axis(0.0), axis(0.0), axis(0.0))
    assert abs(value) <= CHSH_CLASSICAL_BOUND + 1e-9


def test_phi_plus_also_violates_with_its_own_optimal_settings():
    value = chsh_value(
        bell_phi_plus(),
        axis(0.0),
        axis(np.pi / 2),
        axis(np.pi / 4),
        axis(-np.pi / 4),
    )
    assert abs(value) > CHSH_CLASSICAL_BOUND


def test_sampling_converges_to_the_predicted_correlation():
    rng = np.random.default_rng(20260726)
    theta = np.radians(60)
    counts = sample_joint_measurements(
        bell_psi_minus(), axis(0.0), axis(theta), 40_000, rng=rng
    )
    total = sum(counts.values())
    assert total == 40_000
    observed = (
        counts[(1, 1)] - counts[(1, -1)] - counts[(-1, 1)] + counts[(-1, -1)]
    ) / total
    assert np.isclose(observed, -np.cos(theta), atol=0.02)


def test_sampling_is_reproducible_from_a_seed():
    first = sample_joint_measurements(
        bell_psi_minus(), axis(0.0), axis(1.0), 500, rng=np.random.default_rng(3)
    )
    second = sample_joint_measurements(
        bell_psi_minus(), axis(0.0), axis(1.0), 500, rng=np.random.default_rng(3)
    )
    assert first == second


def test_joint_measurement_rejects_a_one_qubit_state():
    from quantum_foundations.core import QuantumValidationError

    with pytest.raises(QuantumValidationError) as error:
        joint_spin_probabilities(ket0(), axis(0.0), axis(0.0))
    assert error.value.code == "NOT_A_TWO_QUBIT_STATE"
