"""Property-based tests over the invariants listed in §15.

Hypothesis generates random normalised one-qubit states, random unitaries,
random tensor-product states and random measurement axes, and checks that

    ‖U|ψ⟩‖ = 1,  Σᵢ pᵢ = 1,  Tr(ρ) = 1,  Tr(ρ_A) = 1,  0 ≤ purity(ρ) ≤ 1
"""

import numpy as np
from hypothesis import assume, given
from hypothesis import strategies as st

from quantum_foundations.core import (
    NAMED_GATES,
    apply_gate,
    axis_from_angles,
    concurrence_two_qubit,
    density_matrix,
    eigensystem,
    expectation_value,
    is_product_state,
    is_unitary,
    partial_trace,
    probabilities,
    purity,
    qubit_from_angles,
    reduced_density_matrix,
    rx,
    ry,
    rz,
    spin_observable,
    tensor_product,
    variance,
)

angles = st.floats(min_value=0.0, max_value=np.pi, allow_nan=False, allow_infinity=False)
azimuths = st.floats(
    min_value=0.0, max_value=2 * np.pi, exclude_max=True, allow_nan=False, allow_infinity=False
)
rotation_angles = st.floats(
    min_value=-4 * np.pi, max_value=4 * np.pi, allow_nan=False, allow_infinity=False
)

one_qubit_states = st.builds(qubit_from_angles, angles, azimuths)
single_qubit_gates = st.one_of(
    st.sampled_from([NAMED_GATES[name] for name in ("I", "X", "Y", "Z", "H", "S", "T")]),
    st.builds(rx, rotation_angles),
    st.builds(ry, rotation_angles),
    st.builds(rz, rotation_angles),
)
product_states = st.builds(tensor_product, one_qubit_states, one_qubit_states)
measurement_axes = st.builds(axis_from_angles, angles, azimuths)


@given(one_qubit_states)
def test_generated_states_are_normalized(state):
    assert np.isclose(np.vdot(state, state).real, 1.0)


@given(one_qubit_states)
def test_probabilities_sum_to_one(state):
    assert np.isclose(probabilities(state).sum(), 1.0)


@given(product_states)
def test_two_qubit_probabilities_sum_to_one(state):
    assert np.isclose(probabilities(state).sum(), 1.0)


@given(single_qubit_gates)
def test_generated_gates_are_unitary(gate):
    assert is_unitary(gate)


@given(one_qubit_states, single_qubit_gates)
def test_unitary_evolution_preserves_norm(state, gate):
    evolved = apply_gate(state, gate, (0,), qubit_count=1)
    assert np.isclose(np.linalg.norm(evolved), 1.0)


@given(product_states, single_qubit_gates, st.sampled_from([0, 1]))
def test_unitary_evolution_preserves_norm_on_two_qubits(state, gate, target):
    evolved = apply_gate(state, gate, (target,), qubit_count=2)
    assert np.isclose(np.linalg.norm(evolved), 1.0)


@given(one_qubit_states)
def test_density_matrix_has_unit_trace(state):
    assert np.isclose(np.trace(density_matrix(state)).real, 1.0)


@given(product_states)
def test_reduced_density_matrix_has_unit_trace(state):
    for keep in ((0,), (1,)):
        reduced = reduced_density_matrix(state, keep=keep, qubit_count=2)
        assert np.isclose(np.trace(reduced).real, 1.0)


@given(product_states)
def test_purity_stays_within_bounds(state):
    for keep in ((0,), (1,)):
        value = purity(reduced_density_matrix(state, keep=keep, qubit_count=2))
        assert -1e-9 <= value <= 1.0 + 1e-9


@given(one_qubit_states)
def test_pure_state_purity_is_one(state):
    assert np.isclose(purity(density_matrix(state)), 1.0)


@given(product_states)
def test_product_states_are_detected_and_have_pure_subsystems(state):
    assert is_product_state(state)
    assert np.isclose(concurrence_two_qubit(state), 0.0, atol=1e-9)
    assert np.isclose(purity(reduced_density_matrix(state, keep=(0,), qubit_count=2)), 1.0)


@given(product_states)
def test_partial_trace_of_both_halves_agrees_on_trace(state):
    rho = density_matrix(state)
    left = partial_trace(rho, keep=(0,), qubit_count=2)
    right = partial_trace(rho, keep=(1,), qubit_count=2)
    assert np.isclose(np.trace(left).real, np.trace(right).real)


@given(measurement_axes)
def test_spin_observables_have_unit_eigenvalues(axis):
    values, _ = eigensystem(spin_observable(axis))
    assert np.allclose(sorted(values), [-1.0, 1.0], atol=1e-9)


@given(one_qubit_states, measurement_axes)
def test_expectation_of_a_spin_observable_lies_in_the_spectrum(state, axis):
    value = expectation_value(state, spin_observable(axis))
    assert -1.0 - 1e-9 <= value <= 1.0 + 1e-9


@given(one_qubit_states, measurement_axes)
def test_variance_is_non_negative(state, axis):
    assert variance(state, spin_observable(axis)) >= 0.0


@given(one_qubit_states, measurement_axes)
def test_variance_matches_the_spectrum_identity(state, axis):
    """For a ±1 observable, ⟨A²⟩ = 1, so (ΔA)² = 1 − ⟨A⟩²."""
    observable = spin_observable(axis)
    mean = expectation_value(state, observable)
    assert np.isclose(variance(state, observable), max(1.0 - mean**2, 0.0), atol=1e-9)


@given(one_qubit_states, single_qubit_gates)
def test_gate_application_is_reversible(state, gate):
    """§8.5: every gate can be undone exactly."""
    assume(is_unitary(gate))
    forward = apply_gate(state, gate, (0,), qubit_count=1)
    back = apply_gate(forward, gate.conj().T, (0,), qubit_count=1)
    assert np.allclose(back, state, atol=1e-9)
