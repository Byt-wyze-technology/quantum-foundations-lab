"""Worked examples for each lesson section.

Specification reference: §2.

These are the states and results the lesson copy refers to, computed by the
core rather than typed in by hand. Figure scripts and documentation draw on
them, so a change to the mathematics can never leave a stale number in the
prose (§21).
"""

from dataclasses import dataclass

import numpy as np

from ..core import (
    CNOT,
    ComplexVector,
    H,
    X,
    Y,
    Z,
    apply_gate,
    bell_phi_plus,
    computational_basis_state,
    concurrence_two_qubit,
    expectation_value,
    is_product_state,
    ket0,
    ket1,
    ket_minus,
    ket_minus_i,
    ket_plus,
    ket_plus_i,
    probabilities,
    purity,
    qubit_from_angles,
    reduced_density_matrix,
    tensor_product,
    variance,
)

#: The six canonical states the standard-state buttons offer (§8.1).
CANONICAL_STATES: dict[str, ComplexVector] = {
    "|0⟩": ket0(),
    "|1⟩": ket1(),
    "|+⟩": ket_plus(),
    "|−⟩": ket_minus(),
    "|+i⟩": ket_plus_i(),
    "|−i⟩": ket_minus_i(),
}


@dataclass(frozen=True)
class ObservableSummary:
    """What a measurement device reports for a given state (§8.8)."""

    observable: str
    expectation: float
    variance: float


def polarisation_transmission(theta: float) -> float:
    """P(pass) = cos²θ for linear polarisation through an analyser (§8.2).

    The same number is both the transmitted fraction of a classical beam and
    the probability that one photon passes; the lesson makes that distinction
    visible rather than letting the coincidence pass unremarked.
    """
    return float(np.cos(theta) ** 2)


def phase_comparison() -> dict[str, object]:
    """The teaching moment of §8.3: identical in Z, opposite in X.

    |+⟩ and |−⟩ share their computational-basis probabilities exactly and are
    told apart with certainty by an X-basis measurement.
    """
    plus, minus = ket_plus(), ket_minus()
    return {
        "z_probabilities_plus": probabilities(plus).tolist(),
        "z_probabilities_minus": probabilities(minus).tolist(),
        "x_expectation_plus": expectation_value(plus, X),
        "x_expectation_minus": expectation_value(minus, X),
    }


def pauli_actions() -> dict[str, dict[str, list[float]]]:
    """How each Pauli operator moves the computational basis states (§8.4)."""
    actions: dict[str, dict[str, list[float]]] = {}
    for name, gate in (("X", X), ("Y", Y), ("Z", Z)):
        actions[name] = {
            "on_ket0": (gate @ ket0()).tolist(),
            "on_ket1": (gate @ ket1()).tolist(),
        }
    return actions


def observable_summaries(state: ComplexVector) -> tuple[ObservableSummary, ...]:
    """Expectation and variance of X, Y and Z on ``state`` (§8.8)."""
    return tuple(
        ObservableSummary(
            observable=name,
            expectation=expectation_value(state, observable),
            variance=variance(state, observable),
        )
        for name, observable in (("X", X), ("Y", Y), ("Z", Z))
    )


def tilted_example_state() -> ComplexVector:
    """The off-axis state the measurement and observable sections start from."""
    return qubit_from_angles(1.2, 0.6)


def tensor_expansion() -> dict[str, ComplexVector]:
    """The worked tensor products §8.6 quotes."""
    return {
        "|0⟩⊗|1⟩": tensor_product(ket0(), ket1()),
        "|1⟩⊗|0⟩": tensor_product(ket1(), ket0()),
        "|+⟩⊗|0⟩": tensor_product(ket_plus(), ket0()),
    }


def bell_build_steps() -> tuple[ComplexVector, ComplexVector, ComplexVector]:
    """The three states of the Bell-state builder (§8.10).

    |00⟩, then H on qubit 0, then CNOT. The middle state is the one students
    most often assume is already entangled; it is not.
    """
    start = computational_basis_state("00")
    after_hadamard = apply_gate(start, H, (0,), qubit_count=2)
    after_cnot = apply_gate(after_hadamard, CNOT, (0, 1), qubit_count=2)
    return start, after_hadamard, after_cnot


@dataclass(frozen=True)
class SubsystemSummary:
    """What each half of a two-qubit state looks like on its own (§8.9)."""

    concurrence: float
    purity_a: float
    purity_b: float
    is_product: bool


def subsystem_summary(state: ComplexVector) -> SubsystemSummary:
    """Reduce a two-qubit state to the four numbers §8.9's panels display."""
    return SubsystemSummary(
        concurrence=concurrence_two_qubit(state),
        purity_a=purity(reduced_density_matrix(state, keep=(0,), qubit_count=2)),
        purity_b=purity(reduced_density_matrix(state, keep=(1,), qubit_count=2)),
        is_product=is_product_state(state),
    )


def product_versus_bell() -> dict[str, SubsystemSummary]:
    """The side-by-side comparison §8.9 is built around."""
    return {
        "product": subsystem_summary(tensor_product(ket_plus(), ket0())),
        "bell": subsystem_summary(bell_phi_plus()),
    }


def best_product_overlap_with_bell() -> float:
    """The ceiling §8.9 claims: no product state exceeds ½ overlap with |Φ⁺⟩.

    Checked here by a dense sweep rather than asserted, so the claim in the
    lesson copy is one the test-suite actually stands behind.
    """
    best = 0.0
    target = bell_phi_plus()
    grid = np.linspace(0.0, np.pi, 25)
    phases = np.linspace(0.0, 2 * np.pi, 25, endpoint=False)
    for theta_a in grid:
        for phi_a in phases:
            left = qubit_from_angles(float(theta_a), float(phi_a))
            for theta_b in grid:
                for phi_b in phases:
                    candidate = tensor_product(
                        left, qubit_from_angles(float(theta_b), float(phi_b))
                    )
                    best = max(best, float(abs(np.vdot(target, candidate)) ** 2))
    return best
