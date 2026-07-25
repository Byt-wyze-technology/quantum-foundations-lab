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
    ComplexVector,
    X,
    Y,
    Z,
    expectation_value,
    ket0,
    ket1,
    ket_minus,
    ket_minus_i,
    ket_plus,
    ket_plus_i,
    probabilities,
    qubit_from_angles,
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
