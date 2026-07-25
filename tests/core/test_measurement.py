"""Projective measurement, collapse and repeated shots (§5.5, §15)."""

import numpy as np
import pytest

from quantum_foundations.core import (
    CNOT,
    H,
    QuantumValidationError,
    apply_gate,
    bell_phi_plus,
    computational_basis_state,
    ket0,
    ket1,
    ket_plus,
    measure_computational,
    measure_qubit,
    sample_measurements,
    tensor_product,
)


def test_measuring_a_basis_state_is_deterministic(rng):
    outcome = measure_computational(ket0(), rng=rng)
    assert outcome.eigenvalue == 0.0
    assert np.isclose(outcome.probability, 1.0)
    assert np.allclose(outcome.state, ket0())


def test_measurement_collapses_to_a_basis_state(rng):
    outcome = measure_computational(ket_plus(), rng=rng)
    assert outcome.eigenvalue in (0.0, 1.0)
    assert np.isclose(outcome.probability, 0.5)
    assert np.isclose(np.vdot(outcome.state, outcome.state).real, 1.0)
    assert np.count_nonzero(np.abs(outcome.state) > 1e-12) == 1


def test_repeated_measurement_of_a_collapsed_state_agrees(rng):
    """Once collapsed, the same state re-measures to the same outcome."""
    first = measure_computational(ket_plus(), rng=rng)
    second = measure_computational(first.state, rng=rng)
    assert second.eigenvalue == first.eigenvalue
    assert np.isclose(second.probability, 1.0)


def test_sample_measurements_sums_to_shot_count(rng):
    counts = sample_measurements(ket_plus(), 1000, rng=rng)
    assert sum(counts.values()) == 1000
    assert set(counts) == {"0", "1"}


def test_sample_measurements_converges_to_expected_probabilities(rng):
    counts = sample_measurements(ket_plus(), 20_000, rng=rng)
    assert abs(counts["0"] / 20_000 - 0.5) < 0.02


def test_bell_pair_only_yields_correlated_outcomes(rng):
    """§15 end-to-end expectation, checked at the core level."""
    counts = sample_measurements(bell_phi_plus(), 1000, rng=rng)
    assert counts["01"] == 0
    assert counts["10"] == 0
    assert counts["00"] + counts["11"] == 1000
    assert abs(counts["00"] / 1000 - 0.5) < 0.06


def test_bell_state_built_by_circuit_matches_constant(rng):
    state = apply_gate(computational_basis_state("00"), H, (0,), qubit_count=2)
    state = apply_gate(state, CNOT, (0, 1), qubit_count=2)
    assert np.allclose(state, bell_phi_plus())


def test_measuring_one_qubit_of_a_bell_pair_fixes_the_other(rng):
    outcome = measure_qubit(bell_phi_plus(), 0, qubit_count=2, rng=rng)
    assert np.isclose(outcome.probability, 0.5)
    expected = "00" if outcome.eigenvalue == 0.0 else "11"
    assert np.allclose(outcome.state, computational_basis_state(expected))


def test_measuring_one_qubit_of_a_product_state_leaves_the_other_untouched(rng):
    state = tensor_product(ket_plus(), ket_plus())
    outcome = measure_qubit(state, 0, qubit_count=2, rng=rng)
    bit = int(outcome.eigenvalue)
    expected = tensor_product(ket0() if bit == 0 else ket1(), ket_plus())
    assert np.allclose(outcome.state, expected)


def test_measure_qubit_is_deterministic_on_a_basis_state(rng):
    outcome = measure_qubit(computational_basis_state("10"), 1, qubit_count=2, rng=rng)
    assert outcome.eigenvalue == 0.0
    assert np.isclose(outcome.probability, 1.0)


def test_measure_qubit_rejects_out_of_range_qubit(rng):
    with pytest.raises(QuantumValidationError) as error:
        measure_qubit(bell_phi_plus(), 5, qubit_count=2, rng=rng)
    assert error.value.code == "INVALID_TARGET_INDEX"


def test_sample_measurements_rejects_zero_shots(rng):
    with pytest.raises(QuantumValidationError) as error:
        sample_measurements(ket_plus(), 0, rng=rng)
    assert error.value.code == "INVALID_SHOT_COUNT"


def test_sample_measurements_rejects_shot_limit(rng):
    with pytest.raises(QuantumValidationError) as error:
        sample_measurements(ket_plus(), 100_001, rng=rng)
    assert error.value.code == "SHOT_LIMIT_EXCEEDED"


def test_sampling_is_reproducible_from_a_seed():
    """§19: deterministic seeds for classroom demonstrations."""
    first = sample_measurements(ket_plus(), 500, rng=np.random.default_rng(7))
    second = sample_measurements(ket_plus(), 500, rng=np.random.default_rng(7))
    assert first == second


def test_measurement_rejects_unnormalized_state(rng):
    with pytest.raises(QuantumValidationError) as error:
        sample_measurements(np.array([1.0, 1.0], dtype=complex), 10, rng=rng)
    assert error.value.code == "STATE_NOT_NORMALIZED"
