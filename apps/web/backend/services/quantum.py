"""Thin service layer marshalling requests into ``quantum_foundations.core``.

Specification reference: §2 — the mathematical core stays independent of
FastAPI, so everything here is translation and nothing here is mathematics.
The core raises :class:`~quantum_foundations.core.QuantumValidationError` for
every rejection, and the application turns that into the §13 error envelope in
one place.
"""

from dataclasses import dataclass, field

import numpy as np

from quantum_foundations import core

#: Axes for the named measurement bases of §8.7, as Cartesian unit vectors.
NAMED_AXES: dict[str, np.ndarray] = {
    "Z": core.axis_from_angles(0.0, 0.0),
    "X": core.axis_from_angles(np.pi / 2, 0.0),
    "Y": core.axis_from_angles(np.pi / 2, np.pi / 2),
}


#: Tolerance for *client-supplied* amplitudes.
#:
#: §14's NORMALIZATION_ATOL of 1e-10 governs internal invariants, where the
#: numbers come from our own arithmetic. Amplitudes arriving over the wire are
#: often written to a few decimal places — §11's own worked examples send
#: 0.70710678 twice, giving a norm of 0.999999998 — so judging them at 1e-10
#: would reject the specification's own sample requests.
INPUT_NORMALIZATION_ATOL = 1e-6


def state_norm(amplitudes: np.ndarray) -> float:
    """‖ψ‖, without requiring it to be one."""
    return float(np.sqrt(np.real(np.vdot(amplitudes, amplitudes))))


def prepare_state(amplitudes: np.ndarray) -> np.ndarray:
    """Validate a client-supplied state and absorb its rounding residue.

    A norm within :data:`INPUT_NORMALIZATION_ATOL` of one is rescaled to
    exactly one, which is the "clip numerical residue" allowance of §14.
    Anything further out is rejected with the §13 code, so the tolerance
    cannot conceal a materially invalid state.
    """
    qubit_count_of(amplitudes)
    if not np.all(np.isfinite(amplitudes)):
        raise core.QuantumValidationError(
            "NON_FINITE_VALUE", "The supplied state contains a non-finite value."
        )
    norm = state_norm(amplitudes)
    if abs(norm - 1.0) > INPUT_NORMALIZATION_ATOL:
        raise core.QuantumValidationError(
            "STATE_NOT_NORMALIZED",
            "The supplied state does not satisfy ⟨ψ|ψ⟩ = 1 within tolerance.",
            norm=norm,
            residual=abs(norm - 1.0),
            tolerance=INPUT_NORMALIZATION_ATOL,
        )
    return core.normalize_state(amplitudes)


def qubit_count_of(amplitudes: np.ndarray) -> int:
    """Qubit count implied by an amplitude list, validating the length."""
    length = len(amplitudes)
    if length not in (2, 4):
        raise core.QuantumValidationError(
            "UNSUPPORTED_QUBIT_COUNT",
            f"This release supports 1 or 2 qubits, so 2 or 4 amplitudes; received {length}.",
            received=length,
        )
    return 1 if length == 2 else 2


def apply_named_gate(
    state: np.ndarray,
    name: str,
    targets: tuple[int, ...],
    parameters: dict[str, float] | None,
    qubit_count: int,
) -> np.ndarray:
    """Resolve a gate by name and apply it, rejecting anything non-unitary."""
    matrix = core.gate_matrix(name, parameters)
    return core.apply_gate(state, matrix, targets, qubit_count=qubit_count)


def axis_for_basis(basis: str, theta: float | None, phi: float | None) -> np.ndarray:
    """The measurement axis for a named basis, or a custom direction."""
    if basis in NAMED_AXES:
        return NAMED_AXES[basis]
    if basis != "custom":
        raise core.QuantumValidationError(
            "UNKNOWN_BASIS", f"Unknown measurement basis {basis!r}.", basis=basis
        )
    if theta is None:
        raise core.QuantumValidationError(
            "MISSING_MEASUREMENT_AXIS",
            'A custom basis requires an "axis" with a theta and phi.',
        )
    return core.axis_from_angles(theta, phi or 0.0)


def sample_in_basis(
    state: np.ndarray,
    basis: str,
    theta: float | None,
    phi: float | None,
    shots: int,
    rng: np.random.Generator,
) -> tuple[list[str], list[float], list[int]]:
    """Sample ``shots`` measurements and return labels, predictions and counts.

    A one-qubit state is measured along the requested axis and reports ±1. A
    two-qubit state is measured jointly in the computational basis, which is
    the measurement §9's two-qubit mode shows; a non-computational basis is
    rejected rather than silently ignored.
    """
    qubit_count = qubit_count_of(state)

    if qubit_count == 2:
        if basis != "Z":
            raise core.QuantumValidationError(
                "UNSUPPORTED_TWO_QUBIT_BASIS",
                "Two-qubit sampling is supported in the computational basis only.",
                basis=basis,
            )
        labels = core.basis_labels(2)
        expected = [float(value) for value in core.probabilities(state)]
        tally = core.sample_measurements(state, shots, rng=rng)
        return labels, expected, [tally[label] for label in labels]

    axis = axis_for_basis(basis, theta, phi)
    outcomes = core.projective_measurement_distribution(state, core.spin_observable(axis))
    labels = ["+1" if outcome.eigenvalue > 0 else "−1" for outcome in outcomes]
    expected = [float(outcome.probability) for outcome in outcomes]
    counts = rng.multinomial(shots, _cleaned(expected))
    return labels, expected, [int(count) for count in counts]


def _cleaned(probabilities: list[float]) -> np.ndarray:
    """Clip numerical residue before sampling, as §14 permits."""
    values = np.clip(np.array(probabilities, dtype=np.float64), 0.0, 1.0)
    total = float(values.sum())
    if total <= 0.0:
        raise core.QuantumValidationError(
            "DEGENERATE_DISTRIBUTION",
            "The outcome probabilities sum to zero and cannot be sampled.",
        )
    return values / total


@dataclass(frozen=True)
class EntanglementReport:
    """The four figures §11's entanglement endpoint returns."""

    is_product_state: bool
    concurrence: float
    reduced_purity_a: float
    reduced_purity_b: float


def analyse_entanglement(state: np.ndarray) -> EntanglementReport:
    """Reduce a two-qubit state to the figures the endpoint reports."""
    if qubit_count_of(state) != 2:
        raise core.QuantumValidationError(
            "NOT_A_TWO_QUBIT_STATE",
            "Entanglement analysis requires a two-qubit state.",
            received=len(state),
        )
    return EntanglementReport(
        is_product_state=bool(core.is_product_state(state)),
        concurrence=float(core.concurrence_two_qubit(state)),
        reduced_purity_a=float(
            core.purity(core.reduced_density_matrix(state, keep=(0,), qubit_count=2))
        ),
        reduced_purity_b=float(
            core.purity(core.reduced_density_matrix(state, keep=(1,), qubit_count=2))
        ),
    )


def planar_axis(theta: float) -> np.ndarray:
    """A unit vector in the x–z plane, which is where the CHSH dials live."""
    return core.axis_from_angles(theta, 0.0)


@dataclass(frozen=True)
class CorrelationEntry:
    """One of the four correlations that make up S."""

    setting: str
    expected: float
    observed: float | None = None


@dataclass(frozen=True)
class ChshReport:
    """S, its parts, and the bounds it is measured against."""

    s_value: float
    absolute_s: float
    classical_bound: float
    quantum_bound: float
    violates_classical_bound: bool
    correlations: list[CorrelationEntry] = field(default_factory=list)
    observed_s: float | None = None


def chsh(
    bell_name: str,
    a: float,
    a_prime: float,
    b: float,
    b_prime: float,
    shots: int | None,
    rng: np.random.Generator | None,
) -> ChshReport:
    """Compute S, its four correlations, and optionally a sampled estimate."""
    build = core.BELL_STATES.get(bell_name)
    if build is None:
        raise core.QuantumValidationError(
            "UNKNOWN_BELL_STATE",
            f"Unknown Bell state {bell_name!r}.",
            known=sorted(core.BELL_STATES),
        )
    state = build()

    settings = [
        ("E(a,b)", a, b, 1.0),
        ("E(a,b')", a, b_prime, 1.0),
        ("E(a',b)", a_prime, b, 1.0),
        ("E(a',b')", a_prime, b_prime, -1.0),
    ]

    correlations: list[CorrelationEntry] = []
    s_value = 0.0
    observed_s: float | None = 0.0 if shots else None

    for label, alice, bob, sign in settings:
        axis_a, axis_b = planar_axis(alice), planar_axis(bob)
        expected = core.correlation(state, axis_a, axis_b)
        s_value += sign * expected

        observed: float | None = None
        if shots and rng is not None:
            counts = core.sample_joint_measurements(state, axis_a, axis_b, shots, rng=rng)
            total = sum(counts.values())
            weighted = sum(
                alice_out * bob_out * count for (alice_out, bob_out), count in counts.items()
            )
            observed = weighted / total if total else 0.0
            observed_s = (observed_s or 0.0) + sign * observed

        correlations.append(
            CorrelationEntry(setting=label, expected=float(expected), observed=observed)
        )

    return ChshReport(
        s_value=float(s_value),
        absolute_s=float(abs(s_value)),
        classical_bound=float(core.CHSH_CLASSICAL_BOUND),
        quantum_bound=float(core.CHSH_QUANTUM_BOUND),
        violates_classical_bound=bool(abs(s_value) > core.CHSH_CLASSICAL_BOUND + 1e-12),
        correlations=correlations,
        observed_s=None if observed_s is None else float(observed_s),
    )
