"""Wire types shared across the API.

Specification reference: §12 (data serialization), §13 (validation rules).

Complex numbers cross the wire as ``{"re": …, "im": …}``. They are never
serialised as strings such as ``"0.5-0.5j"``, which are ambiguous to parse and
differ between languages.
"""

from typing import Annotated, Any, Literal

import numpy as np
from pydantic import BaseModel, ConfigDict, Field

from quantum_foundations.core import (
    MAX_QUBITS,
    MAX_SHOTS,
    ComplexVector,
    QuantumValidationError,
    basis_labels,
)


class Complex(BaseModel):
    """One complex number, in the only form §12 permits."""

    model_config = ConfigDict(extra="forbid")

    re: float
    im: float = 0.0

    def to_python(self) -> complex:
        return complex(self.re, self.im)

    @classmethod
    def from_python(cls, value: complex | np.complexfloating) -> "Complex":
        return cls(re=float(np.real(value)), im=float(np.imag(value)))


class QuantumState(BaseModel):
    """A state vector with its qubit count and basis ordering made explicit.

    ``basis_order`` is emitted on every response so a client never has to
    assume the convention of §5.4; it is optional on requests and validated
    against the canonical order when present.
    """

    model_config = ConfigDict(extra="forbid")

    qubit_count: Annotated[int, Field(ge=1, le=MAX_QUBITS)]
    amplitudes: Annotated[list[Complex], Field(min_length=2, max_length=2**MAX_QUBITS)]
    basis_order: list[str] | None = None

    def to_array(self) -> ComplexVector:
        expected = 2**self.qubit_count
        if len(self.amplitudes) != expected:
            raise QuantumValidationError(
                "STATE_DIMENSION_MISMATCH",
                f"A {self.qubit_count}-qubit state must have {expected} amplitudes; "
                f"received {len(self.amplitudes)}.",
                qubit_count=self.qubit_count,
                expected=expected,
                received=len(self.amplitudes),
            )
        if self.basis_order is not None and self.basis_order != basis_labels(self.qubit_count):
            raise QuantumValidationError(
                "INVALID_BASIS_ORDER",
                "basis_order must match the documented q0-leading convention.",
                expected=basis_labels(self.qubit_count),
                received=self.basis_order,
            )
        return np.array(
            [amplitude.to_python() for amplitude in self.amplitudes],
            dtype=np.complex128,
        )

    @classmethod
    def from_array(cls, state: ComplexVector) -> "QuantumState":
        qubit_count = int(len(state)).bit_length() - 1
        return cls(
            qubit_count=qubit_count,
            basis_order=basis_labels(qubit_count),
            amplitudes=[Complex.from_python(value) for value in state],
        )


class GateRequest(BaseModel):
    """A gate named by string, with its targets and any angle it needs."""

    model_config = ConfigDict(extra="forbid")

    name: str
    targets: Annotated[list[int], Field(min_length=1, max_length=MAX_QUBITS)]
    parameters: dict[str, float] | None = None


class ErrorDetail(BaseModel):
    """The error envelope of §13."""

    model_config = ConfigDict(extra="forbid")

    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    """What a rejected request returns."""

    model_config = ConfigDict(extra="forbid")

    error: ErrorDetail


BasisName = Literal["Z", "X", "Y", "custom"]


class MeasurementAxis(BaseModel):
    """A measurement direction in spherical coordinates (§6)."""

    model_config = ConfigDict(extra="forbid")

    theta: Annotated[float, Field(ge=0.0, le=float(np.pi))]
    phi: float = 0.0


ShotCount = Annotated[int, Field(ge=1, le=MAX_SHOTS)]
Seed = Annotated[int | None, Field(default=None, ge=0)]
