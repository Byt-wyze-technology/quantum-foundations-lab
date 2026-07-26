"""Worked examples for the two-qubit lesson sections (§8.6, §8.9, §8.10)."""

import numpy as np

from quantum_foundations.core import (
    bell_phi_plus,
    computational_basis_state,
    ket0,
    ket1,
    ket_plus,
    probabilities,
    tensor_product,
)
from quantum_foundations.lessons import (
    bell_build_steps,
    best_product_overlap_with_bell,
    product_versus_bell,
    subsystem_summary,
    tensor_expansion,
)


def test_tensor_expansion_matches_the_lesson_text():
    """§8.6 fixes the ordering: the left operand is the most significant qubit."""
    expansion = tensor_expansion()
    assert np.allclose(expansion["|0⟩⊗|1⟩"], computational_basis_state("01"))
    assert np.allclose(expansion["|1⟩⊗|0⟩"], computational_basis_state("10"))
    assert np.allclose(expansion["|+⟩⊗|0⟩"], tensor_product(ket_plus(), ket0()))


def test_bell_build_steps_end_at_phi_plus():
    start, after_hadamard, after_cnot = bell_build_steps()
    assert np.allclose(start, computational_basis_state("00"))
    assert np.allclose(after_hadamard, tensor_product(ket_plus(), ket0()))
    assert np.allclose(after_cnot, bell_phi_plus())


def test_the_middle_step_is_not_yet_entangled():
    """The claim §8.10's checkpoint turns on: superposition is not entanglement."""
    _, after_hadamard, after_cnot = bell_build_steps()
    assert subsystem_summary(after_hadamard).is_product
    assert np.isclose(subsystem_summary(after_hadamard).concurrence, 0.0, atol=1e-12)
    assert not subsystem_summary(after_cnot).is_product
    assert np.isclose(subsystem_summary(after_cnot).concurrence, 1.0)


def test_the_cnot_barely_moves_the_probabilities():
    """§8.10: the joint probabilities scarcely change while the pair entangles."""
    _, after_hadamard, after_cnot = bell_build_steps()
    before = np.sort(probabilities(after_hadamard))
    after = np.sort(probabilities(after_cnot))
    assert np.allclose(before, after)


def test_product_and_bell_differ_exactly_where_the_lesson_says():
    comparison = product_versus_bell()
    assert comparison["product"].is_product
    assert np.isclose(comparison["product"].purity_a, 1.0)
    assert np.isclose(comparison["product"].purity_b, 1.0)
    assert np.isclose(comparison["product"].concurrence, 0.0, atol=1e-12)

    assert not comparison["bell"].is_product
    assert np.isclose(comparison["bell"].purity_a, 0.5)
    assert np.isclose(comparison["bell"].purity_b, 0.5)
    assert np.isclose(comparison["bell"].concurrence, 1.0)


def test_no_product_state_beats_half_overlap_with_a_bell_pair():
    """The ceiling §8.9's challenge panel states, checked by a dense sweep."""
    assert best_product_overlap_with_bell() <= 0.5 + 1e-9


def test_a_product_state_can_reach_the_half_ceiling():
    """|00> alone already achieves it, so the bound is tight, not merely true."""
    overlap = abs(np.vdot(bell_phi_plus(), tensor_product(ket0(), ket0()))) ** 2
    assert np.isclose(overlap, 0.5)


def test_singlet_is_anti_correlated():
    from quantum_foundations.core import bell_psi_minus

    probs = probabilities(bell_psi_minus())
    assert np.isclose(probs[0], 0.0, atol=1e-12)
    assert np.isclose(probs[3], 0.0, atol=1e-12)
    assert np.isclose(probs[1], 0.5)
    assert np.isclose(probs[2], 0.5)


def test_ket1_tensor_ket0_lands_where_expected():
    assert np.allclose(tensor_product(ket1(), ket0()), computational_basis_state("10"))
