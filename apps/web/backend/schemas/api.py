"""Request and response models for the five endpoints of §11."""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from .common import (
    BasisName,
    Complex,
    GateRequest,
    MeasurementAxis,
    QuantumState,
    Seed,
    ShotCount,
)

# --- POST /api/state/validate --------------------------------------------- #


class ValidateStateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amplitudes: Annotated[list[Complex], Field(min_length=2, max_length=4)]
    #: When true, an unnormalised state is rescaled instead of rejected (§13).
    normalize: bool = False


class ValidateStateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    valid: bool
    norm: float
    qubit_count: int
    #: Present only when ``normalize`` was requested.
    normalized: QuantumState | None = None


# --- POST /api/gates/apply ------------------------------------------------- #


class ApplyGateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: QuantumState
    gate: GateRequest


class ApplyGateResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: QuantumState
    probabilities: list[float]
    basis_order: list[str]


# --- POST /api/measurement/sample ----------------------------------------- #


class SampleMeasurementRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: QuantumState
    basis: BasisName = "Z"
    #: Required when ``basis`` is "custom"; ignored otherwise.
    axis: MeasurementAxis | None = None
    shots: ShotCount
    seed: Seed = None


class OutcomeStatistics(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    expected_probability: float
    observed_count: int
    observed_frequency: float


class SampleMeasurementResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shots: int
    basis: BasisName
    outcomes: list[OutcomeStatistics]
    #: Echoed so a classroom demonstration can be reproduced exactly (§19).
    seed: int | None


# --- POST /api/entanglement/analyse ---------------------------------------- #


class AnalyseEntanglementRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: QuantumState


class AnalyseEntanglementResponse(BaseModel):
    """Exactly the four fields §11 specifies."""

    model_config = ConfigDict(extra="forbid")

    is_product_state: bool
    concurrence: float
    reduced_purity_a: float
    reduced_purity_b: float


# --- POST /api/bell/chsh --------------------------------------------------- #

BellStateName = Literal["phi_plus", "phi_minus", "psi_plus", "psi_minus"]


class ChshAngles(BaseModel):
    model_config = ConfigDict(extra="forbid")

    a: float
    a_prime: float
    b: float
    b_prime: float


class ChshRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: BellStateName = "psi_minus"
    angles: ChshAngles
    shots: ShotCount | None = None
    seed: Seed = None


class ChshCorrelation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    setting: str
    expected: float
    observed: float | None = None


class ChshResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    s_value: float
    absolute_s: float
    classical_bound: float
    quantum_bound: float
    violates_classical_bound: bool
    correlations: list[ChshCorrelation]
    observed_s: float | None = None
    shots: int | None = None
    seed: int | None = None
    #: §8.11 requires this simulation to label itself.
    model_note: str


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["ok"]
    version: str
    max_qubits: int
    max_shots: int
