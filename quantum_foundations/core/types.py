"""Shared mathematical types and numerical tolerances.

Specification references: §4 (mathematical type system), §5.1, §14 (tolerances).
"""

from dataclasses import dataclass
from typing import TypeAlias

import numpy as np
from numpy.typing import NDArray

ComplexVector: TypeAlias = NDArray[np.complex128]
ComplexMatrix: TypeAlias = NDArray[np.complex128]
RealVector: TypeAlias = NDArray[np.float64]

# §14 — numerical tolerances.
NORMALIZATION_ATOL = 1e-10
UNITARY_ATOL = 1e-10
HERMITIAN_ATOL = 1e-10
PROBABILITY_ATOL = 1e-12

# §17 — version 1 supports one- and two-qubit systems only.
MAX_QUBITS = 2
MAX_SHOTS = 100_000
MAX_CIRCUIT_DEPTH = 24


@dataclass(frozen=True)
class QubitAngles:
    """Bloch-sphere angles of a pure one-qubit state.

    ``theta`` is the polar angle from the +z axis in [0, pi]; ``phi`` is the
    azimuthal angle in [0, 2*pi).
    """

    theta: float
    phi: float


@dataclass(frozen=True)
class MeasurementOutcome:
    """One possible result of a projective measurement.

    ``state`` is the normalised post-measurement state. For an outcome with
    zero probability the post-measurement state is undefined; callers receive
    the unnormalised zero vector and must check ``probability`` first.
    """

    eigenvalue: float
    probability: float
    state: ComplexVector

    def __repr__(self) -> str:  # pragma: no cover - display helper
        return f"MeasurementOutcome(eigenvalue={self.eigenvalue:+.3f}, p={self.probability:.4f})"
