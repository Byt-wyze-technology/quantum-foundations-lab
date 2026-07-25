"""Hermitian observables, eigensystems and expectation values (§5.6, §15)."""

import numpy as np
import pytest

from quantum_foundations.core import (
    H,
    QuantumValidationError,
    X,
    Y,
    Z,
    axis_from_angles,
    eigensystem,
    expectation_value,
    is_hermitian,
    ket0,
    ket1,
    ket_minus,
    ket_plus,
    ket_plus_i,
    projective_measurement_distribution,
    spin_observable,
    variance,
)


def test_pauli_z_is_hermitian():
    assert is_hermitian(Z)


@pytest.mark.parametrize("observable", [X, Y, Z, H])
def test_paulis_and_hadamard_are_hermitian(observable):
    assert is_hermitian(observable)


def test_non_hermitian_matrix_is_rejected():
    assert not is_hermitian(np.array([[0, 1], [0, 0]], dtype=complex))


def test_z_expectation_for_zero_state():
    assert np.isclose(expectation_value(ket0(), Z), 1.0)


@pytest.mark.parametrize(
    ("state", "observable", "expected"),
    [
        (ket1(), Z, -1.0),
        (ket_plus(), Z, 0.0),
        (ket_plus(), X, 1.0),
        (ket_minus(), X, -1.0),
        (ket_plus_i(), Y, 1.0),
        (ket0(), X, 0.0),
    ],
)
def test_pauli_expectation_values(state, observable, expected):
    assert np.isclose(expectation_value(state, observable), expected, atol=1e-12)


def test_variance_vanishes_on_an_eigenstate():
    assert np.isclose(variance(ket0(), Z), 0.0, atol=1e-12)


def test_variance_is_maximal_on_an_equatorial_state():
    assert np.isclose(variance(ket_plus(), Z), 1.0, atol=1e-12)


def test_variance_is_never_negative():
    assert variance(ket0(), Z) >= 0.0


def test_eigensystem_of_z_returns_computational_basis():
    values, vectors = eigensystem(Z)
    assert np.allclose(values, [-1.0, 1.0])
    assert np.allclose(np.abs(vectors[:, 1]), np.abs(ket0()))
    assert np.allclose(np.abs(vectors[:, 0]), np.abs(ket1()))


def test_eigenvalues_of_paulis_are_plus_and_minus_one():
    for observable in (X, Y, Z):
        values, _ = eigensystem(observable)
        assert np.allclose(sorted(values), [-1.0, 1.0])


def test_measurement_distribution_of_z_on_plus():
    outcomes = projective_measurement_distribution(ket_plus(), Z)
    assert [outcome.eigenvalue for outcome in outcomes] == [1.0, -1.0]
    assert all(np.isclose(outcome.probability, 0.5) for outcome in outcomes)


def test_measurement_distribution_probabilities_sum_to_one():
    outcomes = projective_measurement_distribution(ket_plus_i(), X)
    assert np.isclose(sum(outcome.probability for outcome in outcomes), 1.0)


def test_measurement_distribution_collapses_onto_eigenstates():
    outcomes = projective_measurement_distribution(ket0(), X)
    for outcome in outcomes:
        residual = X @ outcome.state - outcome.eigenvalue * outcome.state
        assert np.allclose(residual, 0.0, atol=1e-12)


def test_x_basis_separates_plus_from_minus():
    """§15 phase lesson: Z leaves the Z bars alone but flips the X outcome."""
    plus = projective_measurement_distribution(ket_plus(), X)
    minus = projective_measurement_distribution(Z @ ket_plus(), X)
    assert np.isclose(plus[0].probability, 1.0)
    assert np.isclose(minus[0].probability, 0.0)


def test_degenerate_observable_yields_one_outcome():
    outcomes = projective_measurement_distribution(ket_plus(), np.eye(2, dtype=complex))
    assert len(outcomes) == 1
    assert np.isclose(outcomes[0].probability, 1.0)


@pytest.mark.parametrize(
    ("axis", "expected"),
    [((1.0, 0.0, 0.0), X), ((0.0, 1.0, 0.0), Y), ((0.0, 0.0, 1.0), Z)],
)
def test_spin_observable_reproduces_the_paulis(axis, expected):
    assert np.allclose(spin_observable(axis), expected)


def test_spin_observable_is_hermitian_with_unit_eigenvalues():
    axis = axis_from_angles(0.9, 2.1)
    observable = spin_observable(axis)
    assert is_hermitian(observable)
    values, _ = eigensystem(observable)
    assert np.allclose(sorted(values), [-1.0, 1.0], atol=1e-12)


def test_spin_observable_rejects_non_unit_axis():
    with pytest.raises(QuantumValidationError) as error:
        spin_observable((1.0, 1.0, 1.0))
    assert error.value.code == "MEASUREMENT_AXIS_NOT_UNIT"


def test_expectation_rejects_non_hermitian_operator():
    with pytest.raises(QuantumValidationError) as error:
        expectation_value(ket0(), np.array([[0, 1], [0, 0]], dtype=complex))
    assert error.value.code == "NON_HERMITIAN_OBSERVABLE"


def test_expectation_rejects_dimension_mismatch():
    with pytest.raises(QuantumValidationError) as error:
        expectation_value(ket0(), np.eye(4, dtype=complex))
    assert error.value.code == "OPERATOR_DIMENSION_MISMATCH"
