"""Canonical states, normalisation, Bloch angles and global-phase handling.

Specification reference: §5.2.

A pure one-qubit state is parameterised as

    |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩

with θ ∈ [0, π] and φ ∈ [0, 2π). Global phase is not observable: |ψ⟩ and
e^{iγ}|ψ⟩ describe the same physical state, and the helpers below make that
equivalence explicit rather than leaving it implicit in the UI.
"""

import numpy as np

from .types import NORMALIZATION_ATOL, ComplexVector, QubitAngles, RealVector
from .validation import (
    QuantumValidationError,
    validate_normalized,
    validate_state_shape,
)

_SQRT_HALF = 1.0 / np.sqrt(2.0)


def ket0() -> ComplexVector:
    """|0⟩ — the +z pole of the Bloch sphere."""
    return np.array([1.0, 0.0], dtype=np.complex128)


def ket1() -> ComplexVector:
    """|1⟩ — the −z pole of the Bloch sphere."""
    return np.array([0.0, 1.0], dtype=np.complex128)


def ket_plus() -> ComplexVector:
    """|+⟩ = (|0⟩ + |1⟩)/√2 — the +x point."""
    return np.array([_SQRT_HALF, _SQRT_HALF], dtype=np.complex128)


def ket_minus() -> ComplexVector:
    """|−⟩ = (|0⟩ − |1⟩)/√2 — the −x point."""
    return np.array([_SQRT_HALF, -_SQRT_HALF], dtype=np.complex128)


def ket_plus_i() -> ComplexVector:
    """|+i⟩ = (|0⟩ + i|1⟩)/√2 — the +y point (§8.1 standard state buttons)."""
    return np.array([_SQRT_HALF, 1j * _SQRT_HALF], dtype=np.complex128)


def ket_minus_i() -> ComplexVector:
    """|−i⟩ = (|0⟩ − i|1⟩)/√2 — the −y point (§8.1 standard state buttons)."""
    return np.array([_SQRT_HALF, -1j * _SQRT_HALF], dtype=np.complex128)


def normalize_state(state: ComplexVector) -> ComplexVector:
    """Return ``state`` rescaled to unit norm.

    A zero vector has no direction and therefore no physical meaning, so it is
    rejected rather than silently returned.
    """
    array = np.asarray(state, dtype=np.complex128)
    validate_state_shape(array)
    norm = float(np.sqrt(np.real(np.vdot(array, array))))
    if norm == 0.0:
        raise QuantumValidationError(
            "ZERO_STATE_VECTOR",
            "A zero vector cannot be normalised into a quantum state.",
        )
    return array / norm


def validate_state(state: ComplexVector, *, atol: float = NORMALIZATION_ATOL) -> None:
    """Raise unless ``state`` is a finite, power-of-two-length, unit vector."""
    array = np.asarray(state, dtype=np.complex128)
    validate_state_shape(array)
    validate_normalized(array, atol=atol)


def qubit_from_angles(theta: float, phi: float) -> ComplexVector:
    """Build the pure one-qubit state at Bloch angles ``theta`` and ``phi``."""
    return np.array(
        [np.cos(theta / 2.0), np.exp(1j * phi) * np.sin(theta / 2.0)],
        dtype=np.complex128,
    )


def angles_from_qubit(state: ComplexVector) -> QubitAngles:
    """Recover Bloch angles from a pure one-qubit state.

    The result is invariant under global phase. At the poles the azimuthal
    angle is degenerate and is reported as 0.
    """
    array = np.asarray(state, dtype=np.complex128)
    if array.shape != (2,):
        raise QuantumValidationError(
            "NOT_A_ONE_QUBIT_STATE",
            f"Bloch angles are defined for one-qubit states; received shape {array.shape}.",
            shape=list(array.shape),
        )
    validate_state(array)
    alpha, beta = array
    theta = float(2.0 * np.arccos(np.clip(abs(alpha), 0.0, 1.0)))
    if abs(alpha) < 1e-12 or abs(beta) < 1e-12:
        phi = 0.0
    else:
        phi = float(np.mod(np.angle(beta) - np.angle(alpha), 2.0 * np.pi))
    return QubitAngles(theta=theta, phi=phi)


def bloch_vector(state: ComplexVector) -> RealVector:
    """Return the Cartesian Bloch coordinates (x, y, z) of a pure one-qubit state.

    This is only meaningful for a *pure one-qubit* state; entangled subsystems
    must go through the reduced density matrix instead (§21).
    """
    angles = angles_from_qubit(state)
    return np.array(
        [
            np.sin(angles.theta) * np.cos(angles.phi),
            np.sin(angles.theta) * np.sin(angles.phi),
            np.cos(angles.theta),
        ],
        dtype=np.float64,
    )


def probabilities(state: ComplexVector) -> RealVector:
    """Computational-basis outcome probabilities |⟨x|ψ⟩|²."""
    array = np.asarray(state, dtype=np.complex128)
    validate_state(array)
    return np.abs(array) ** 2


def global_phase_align(reference: ComplexVector, state: ComplexVector) -> ComplexVector:
    """Rotate ``state`` by a global phase so that ⟨reference|state⟩ is real and non-negative.

    Used to compare two states, and to keep an animated Bloch arrow from
    flickering when a gate introduces an unobservable phase.
    """
    left = np.asarray(reference, dtype=np.complex128)
    right = np.asarray(state, dtype=np.complex128)
    if left.shape != right.shape:
        raise QuantumValidationError(
            "STATE_SHAPE_MISMATCH",
            f"Cannot align states of different shapes: {left.shape} and {right.shape}.",
            left_shape=list(left.shape),
            right_shape=list(right.shape),
        )
    overlap = complex(np.vdot(left, right))
    if abs(overlap) < 1e-15:
        return right
    return np.asarray(right * np.exp(-1j * np.angle(overlap)), dtype=np.complex128)


def equivalent_up_to_global_phase(
    left: ComplexVector,
    right: ComplexVector,
    *,
    atol: float = 1e-10,
) -> bool:
    """True when two normalised states differ only by an unobservable phase."""
    first = np.asarray(left, dtype=np.complex128)
    second = np.asarray(right, dtype=np.complex128)
    if first.shape != second.shape:
        return False
    validate_state(first, atol=max(atol, NORMALIZATION_ATOL))
    validate_state(second, atol=max(atol, NORMALIZATION_ATOL))
    return bool(abs(abs(complex(np.vdot(first, second))) - 1.0) <= atol)
