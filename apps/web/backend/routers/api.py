"""Route handlers for the five endpoints of §11.

Handlers stay thin: they unpack a validated request, call the service layer,
and pack the result. Every mathematical rejection arrives as a
:class:`~quantum_foundations.core.QuantumValidationError` and is converted to
the §13 envelope by a single exception handler in ``main``.
"""

import numpy as np
from fastapi import APIRouter

from quantum_foundations import __version__, core

from ..schemas.api import (
    AnalyseEntanglementRequest,
    AnalyseEntanglementResponse,
    ApplyGateRequest,
    ApplyGateResponse,
    ChshCorrelation,
    ChshRequest,
    ChshResponse,
    HealthResponse,
    OutcomeStatistics,
    SampleMeasurementRequest,
    SampleMeasurementResponse,
    ValidateStateRequest,
    ValidateStateResponse,
)
from ..schemas.common import QuantumState
from ..services import quantum

router = APIRouter(prefix="/api")

MODEL_NOTE = (
    "An ideal theoretical model. Perfect detectors, perfect state preparation and "
    "freely chosen settings are assumed; no detection or locality loophole is simulated."
)



def _generator(seed: int | None) -> np.random.Generator:
    """A seeded generator when one is asked for, so §19's reproducibility holds."""
    return np.random.default_rng(seed) if seed is not None else np.random.default_rng()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        version=__version__,
        max_qubits=core.MAX_QUBITS,
        max_shots=core.MAX_SHOTS,
    )


@router.post("/state/validate", response_model=ValidateStateResponse)
def validate_state(payload: ValidateStateRequest) -> ValidateStateResponse:
    amplitudes = np.array(
        [value.to_python() for value in payload.amplitudes], dtype=np.complex128
    )
    qubit_count = quantum.qubit_count_of(amplitudes)
    norm = quantum.state_norm(amplitudes)

    if payload.normalize:
        normalized = core.normalize_state(amplitudes)
        return ValidateStateResponse(
            valid=True,
            norm=norm,
            qubit_count=qubit_count,
            normalized=QuantumState.from_array(normalized),
        )

    # Report rather than raise: asking whether a state is valid is a fair
    # question, and the answer "no, its norm is 1.41" is more useful than a 400.
    valid = abs(norm - 1.0) <= quantum.INPUT_NORMALIZATION_ATOL
    return ValidateStateResponse(valid=valid, norm=norm, qubit_count=qubit_count)


@router.post("/gates/apply", response_model=ApplyGateResponse)
def apply_gate(payload: ApplyGateRequest) -> ApplyGateResponse:
    state = quantum.prepare_state(payload.state.to_array())
    result = quantum.apply_named_gate(
        state,
        payload.gate.name,
        tuple(payload.gate.targets),
        payload.gate.parameters,
        payload.state.qubit_count,
    )
    return ApplyGateResponse(
        state=QuantumState.from_array(result),
        probabilities=[float(value) for value in core.probabilities(result)],
        basis_order=core.basis_labels(payload.state.qubit_count),
    )


@router.post("/measurement/sample", response_model=SampleMeasurementResponse)
def sample_measurement(payload: SampleMeasurementRequest) -> SampleMeasurementResponse:
    state = quantum.prepare_state(payload.state.to_array())
    labels, expected, counts = quantum.sample_in_basis(
        state,
        payload.basis,
        payload.axis.theta if payload.axis else None,
        payload.axis.phi if payload.axis else None,
        payload.shots,
        _generator(payload.seed),
    )
    return SampleMeasurementResponse(
        shots=payload.shots,
        basis=payload.basis,
        seed=payload.seed,
        outcomes=[
            OutcomeStatistics(
                label=label,
                expected_probability=probability,
                observed_count=count,
                observed_frequency=count / payload.shots,
            )
            for label, probability, count in zip(labels, expected, counts)
        ],
    )


@router.post("/entanglement/analyse", response_model=AnalyseEntanglementResponse)
def analyse_entanglement(payload: AnalyseEntanglementRequest) -> AnalyseEntanglementResponse:
    state = quantum.prepare_state(payload.state.to_array())
    report = quantum.analyse_entanglement(state)
    return AnalyseEntanglementResponse(
        is_product_state=report.is_product_state,
        concurrence=report.concurrence,
        reduced_purity_a=report.reduced_purity_a,
        reduced_purity_b=report.reduced_purity_b,
    )


@router.post("/bell/chsh", response_model=ChshResponse)
def bell_chsh(payload: ChshRequest) -> ChshResponse:
    result = quantum.chsh(
        payload.state,
        payload.angles.a,
        payload.angles.a_prime,
        payload.angles.b,
        payload.angles.b_prime,
        payload.shots,
        _generator(payload.seed) if payload.shots else None,
    )
    return ChshResponse(
        s_value=result.s_value,
        absolute_s=result.absolute_s,
        classical_bound=result.classical_bound,
        quantum_bound=result.quantum_bound,
        violates_classical_bound=result.violates_classical_bound,
        correlations=[
            ChshCorrelation(setting=entry.setting, expected=entry.expected, observed=entry.observed)
            for entry in result.correlations
        ],
        observed_s=result.observed_s,
        shots=payload.shots,
        seed=payload.seed,
        model_note=MODEL_NOTE,
    )
