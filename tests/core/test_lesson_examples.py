"""The lesson's worked examples say what the lesson copy claims (§2, §8)."""

import numpy as np
import pytest

from quantum_foundations.core import ket_minus, ket_plus, probabilities
from quantum_foundations.lessons import (
    CANONICAL_STATES,
    observable_summaries,
    pauli_actions,
    phase_comparison,
    polarisation_transmission,
    tilted_example_state,
)


@pytest.mark.parametrize("label", ["|0⟩", "|1⟩", "|+⟩", "|−⟩", "|+i⟩", "|−i⟩"])
def test_canonical_states_are_normalised(label):
    state = CANONICAL_STATES[label]
    assert np.isclose(np.vdot(state, state).real, 1.0)


@pytest.mark.parametrize(
    ("degrees", "expected"),
    [(0, 1.0), (30, 0.75), (45, 0.5), (60, 0.25), (90, 0.0)],
)
def test_polarisation_follows_cos_squared(degrees, expected):
    """§8.2 quotes these numbers; they come from the formula, not from prose."""
    assert np.isclose(polarisation_transmission(np.radians(degrees)), expected, atol=1e-12)


def test_crossed_analysers_block_everything():
    assert np.isclose(polarisation_transmission(np.pi / 2), 0.0, atol=1e-12)


def test_phase_comparison_matches_the_teaching_claim():
    """|+⟩ and |−⟩: identical in Z, opposite in X (§8.3)."""
    comparison = phase_comparison()
    assert np.allclose(
        comparison["z_probabilities_plus"], comparison["z_probabilities_minus"]
    )
    assert np.isclose(comparison["x_expectation_plus"], 1.0)
    assert np.isclose(comparison["x_expectation_minus"], -1.0)


def test_z_basis_probabilities_of_plus_and_minus_are_both_even():
    assert np.allclose(probabilities(ket_plus()), [0.5, 0.5])
    assert np.allclose(probabilities(ket_minus()), [0.5, 0.5])


def test_pauli_actions_match_the_lesson_text():
    """§8.4 states X|0⟩ = |1⟩, Z|1⟩ = −|1⟩ and Y|0⟩ = i|1⟩."""
    actions = pauli_actions()
    assert np.allclose(actions["X"]["on_ket0"], [0, 1])
    assert np.allclose(actions["X"]["on_ket1"], [1, 0])
    assert np.allclose(actions["Z"]["on_ket0"], [1, 0])
    assert np.allclose(actions["Z"]["on_ket1"], [0, -1])
    assert np.allclose(actions["Y"]["on_ket0"], [0, 1j])


def test_observable_summaries_for_the_plus_state():
    summaries = {entry.observable: entry for entry in observable_summaries(ket_plus())}
    assert np.isclose(summaries["X"].expectation, 1.0)
    assert np.isclose(summaries["X"].variance, 0.0, atol=1e-12)
    assert np.isclose(summaries["Z"].expectation, 0.0, atol=1e-12)
    assert np.isclose(summaries["Z"].variance, 1.0)


def test_variance_vanishes_exactly_on_an_eigenstate():
    """§8.8: the variance is zero precisely when the reading is certain."""
    for entry in observable_summaries(CANONICAL_STATES["|0⟩"]):
        if entry.observable == "Z":
            assert np.isclose(entry.variance, 0.0, atol=1e-12)
        else:
            assert np.isclose(entry.variance, 1.0)


def test_tilted_example_state_is_off_every_axis():
    """The measurement and observable sections need a state with no easy answer."""
    summaries = observable_summaries(tilted_example_state())
    for entry in summaries:
        assert abs(entry.expectation) < 1.0 - 1e-6
        assert entry.variance > 1e-6
