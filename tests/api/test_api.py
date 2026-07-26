"""API tests (§11, §12, §13).

The worked payloads in §11 are used verbatim where the specification gives
them, so the document and the implementation are checked against each other
rather than against my reading of it.
"""

import math

import numpy as np
import pytest
from fastapi.testclient import TestClient

from apps.web.backend.main import MAX_REQUEST_BYTES, app
from quantum_foundations.core import CHSH_QUANTUM_BOUND


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def test_health_reports_the_documented_limits(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["max_qubits"] == 2
    assert body["max_shots"] == 100_000


# --- §11 POST /api/state/validate ------------------------------------------ #


def test_validate_accepts_the_specifications_own_example(client):
    """§11 shows this request returning valid: true with a norm just under one."""
    response = client.post(
        "/api/state/validate",
        json={"amplitudes": [{"re": 0.70710678, "im": 0}, {"re": 0.70710678, "im": 0}]},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["valid"] is True
    assert body["qubit_count"] == 1
    assert math.isclose(body["norm"], 1.0, abs_tol=1e-6)


def test_validate_reports_an_unnormalised_state_without_raising(client):
    body = client.post(
        "/api/state/validate",
        json={"amplitudes": [{"re": 1, "im": 0}, {"re": 1, "im": 0}]},
    ).json()
    assert body["valid"] is False
    assert math.isclose(body["norm"], math.sqrt(2.0))


def test_validate_can_normalise_on_request(client):
    body = client.post(
        "/api/state/validate",
        json={"amplitudes": [{"re": 3, "im": 0}, {"re": 4, "im": 0}], "normalize": True},
    ).json()
    assert body["valid"] is True
    amplitudes = body["normalized"]["amplitudes"]
    assert math.isclose(amplitudes[0]["re"], 0.6)
    assert math.isclose(amplitudes[1]["re"], 0.8)


def test_validate_rejects_a_non_power_of_two_length(client):
    response = client.post(
        "/api/state/validate",
        json={"amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}, {"re": 0, "im": 0}]},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNSUPPORTED_QUBIT_COUNT"


# --- §11 POST /api/gates/apply --------------------------------------------- #


def test_apply_gate_uses_the_specifications_own_example(client):
    """§11's example: H on |0⟩."""
    response = client.post(
        "/api/gates/apply",
        json={
            "state": {
                "qubit_count": 1,
                "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}],
            },
            "gate": {"name": "H", "targets": [0]},
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["basis_order"] == ["0", "1"]
    assert np.allclose(body["probabilities"], [0.5, 0.5])


def test_apply_gate_builds_a_bell_pair(client):
    state = {
        "qubit_count": 2,
        "amplitudes": [{"re": 1, "im": 0}] + [{"re": 0, "im": 0}] * 3,
    }
    after_h = client.post(
        "/api/gates/apply", json={"state": state, "gate": {"name": "H", "targets": [0]}}
    ).json()["state"]
    after_cnot = client.post(
        "/api/gates/apply",
        json={"state": after_h, "gate": {"name": "CNOT", "targets": [0, 1]}},
    ).json()
    assert after_cnot["basis_order"] == ["00", "01", "10", "11"]
    assert np.allclose(after_cnot["probabilities"], [0.5, 0.0, 0.0, 0.5], atol=1e-12)


def test_apply_gate_accepts_a_rotation_angle(client):
    body = client.post(
        "/api/gates/apply",
        json={
            "state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]},
            "gate": {"name": "RY", "targets": [0], "parameters": {"theta": math.pi / 2}},
        },
    ).json()
    assert np.allclose(body["probabilities"], [0.5, 0.5])


def test_apply_gate_rejects_an_unknown_gate(client):
    response = client.post(
        "/api/gates/apply",
        json={
            "state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]},
            "gate": {"name": "NOPE", "targets": [0]},
        },
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "UNKNOWN_GATE"


def test_apply_gate_rejects_an_out_of_range_target(client):
    response = client.post(
        "/api/gates/apply",
        json={
            "state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]},
            "gate": {"name": "X", "targets": [5]},
        },
    )
    assert response.json()["error"]["code"] == "INVALID_TARGET_INDEX"


def test_apply_gate_rejects_an_unnormalised_state(client):
    response = client.post(
        "/api/gates/apply",
        json={
            "state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 1, "im": 0}]},
            "gate": {"name": "X", "targets": [0]},
        },
    )
    assert response.json()["error"]["code"] == "STATE_NOT_NORMALIZED"


def test_apply_gate_rejects_a_mismatched_qubit_count(client):
    response = client.post(
        "/api/gates/apply",
        json={
            "state": {"qubit_count": 2, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]},
            "gate": {"name": "X", "targets": [0]},
        },
    )
    assert response.json()["error"]["code"] == "STATE_DIMENSION_MISMATCH"


def test_apply_gate_rejects_a_wrong_basis_order(client):
    response = client.post(
        "/api/gates/apply",
        json={
            "state": {
                "qubit_count": 1,
                "basis_order": ["1", "0"],
                "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}],
            },
            "gate": {"name": "X", "targets": [0]},
        },
    )
    assert response.json()["error"]["code"] == "INVALID_BASIS_ORDER"


# --- §11 POST /api/measurement/sample -------------------------------------- #


def test_sample_uses_the_specifications_own_example(client):
    """§11's example: |+⟩, Z basis, 1000 shots, seed 42."""
    response = client.post(
        "/api/measurement/sample",
        json={
            "state": {
                "qubit_count": 1,
                "amplitudes": [{"re": 0.70710678, "im": 0}, {"re": 0.70710678, "im": 0}],
            },
            "basis": "Z",
            "shots": 1000,
            "seed": 42,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["shots"] == 1000
    assert body["seed"] == 42
    assert sum(outcome["observed_count"] for outcome in body["outcomes"]) == 1000
    assert all(
        math.isclose(outcome["expected_probability"], 0.5, abs_tol=1e-6)
        for outcome in body["outcomes"]
    )


def test_sampling_is_reproducible_from_a_seed(client):
    payload = {
        "state": {
            "qubit_count": 1,
            "amplitudes": [{"re": 0.70710678, "im": 0}, {"re": 0.70710678, "im": 0}],
        },
        "basis": "Z",
        "shots": 500,
        "seed": 7,
    }
    first = client.post("/api/measurement/sample", json=payload).json()
    second = client.post("/api/measurement/sample", json=payload).json()
    assert first["outcomes"] == second["outcomes"]


def test_sampling_in_the_x_basis_is_certain_for_the_plus_state(client):
    body = client.post(
        "/api/measurement/sample",
        json={
            "state": {
                "qubit_count": 1,
                "amplitudes": [{"re": 0.7071067811865476, "im": 0}, {"re": 0.7071067811865476, "im": 0}],
            },
            "basis": "X",
            "shots": 200,
            "seed": 1,
        },
    ).json()
    plus = next(o for o in body["outcomes"] if o["label"] == "+1")
    assert math.isclose(plus["expected_probability"], 1.0, abs_tol=1e-9)
    assert plus["observed_count"] == 200


def test_sampling_a_bell_pair_never_yields_an_impossible_outcome(client):
    root = 1 / math.sqrt(2)
    body = client.post(
        "/api/measurement/sample",
        json={
            "state": {
                "qubit_count": 2,
                "amplitudes": [
                    {"re": root, "im": 0},
                    {"re": 0, "im": 0},
                    {"re": 0, "im": 0},
                    {"re": root, "im": 0},
                ],
            },
            "basis": "Z",
            "shots": 1000,
            "seed": 3,
        },
    ).json()
    counts = {o["label"]: o["observed_count"] for o in body["outcomes"]}
    assert counts["01"] == 0
    assert counts["10"] == 0
    assert counts["00"] + counts["11"] == 1000


def test_a_custom_basis_needs_an_axis(client):
    response = client.post(
        "/api/measurement/sample",
        json={
            "state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]},
            "basis": "custom",
            "shots": 10,
        },
    )
    assert response.json()["error"]["code"] == "MISSING_MEASUREMENT_AXIS"


@pytest.mark.parametrize("shots", [0, -1, 100_001])
def test_shot_counts_outside_the_documented_range_are_rejected(client, shots):
    response = client.post(
        "/api/measurement/sample",
        json={
            "state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]},
            "basis": "Z",
            "shots": shots,
        },
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


# --- §11 POST /api/entanglement/analyse ------------------------------------ #


def test_analyse_returns_the_documented_shape_for_a_bell_pair(client):
    """§11's example response, for |Φ⁺⟩."""
    root = 1 / math.sqrt(2)
    body = client.post(
        "/api/entanglement/analyse",
        json={
            "state": {
                "qubit_count": 2,
                "amplitudes": [
                    {"re": root, "im": 0},
                    {"re": 0, "im": 0},
                    {"re": 0, "im": 0},
                    {"re": root, "im": 0},
                ],
            }
        },
    ).json()
    assert body == {
        "is_product_state": False,
        "concurrence": pytest.approx(1.0),
        "reduced_purity_a": pytest.approx(0.5),
        "reduced_purity_b": pytest.approx(0.5),
    }


def test_analyse_recognises_a_product_state(client):
    root = 1 / math.sqrt(2)
    body = client.post(
        "/api/entanglement/analyse",
        json={
            "state": {
                "qubit_count": 2,
                "amplitudes": [
                    {"re": root, "im": 0},
                    {"re": 0, "im": 0},
                    {"re": root, "im": 0},
                    {"re": 0, "im": 0},
                ],
            }
        },
    ).json()
    assert body["is_product_state"] is True
    assert body["concurrence"] == pytest.approx(0.0, abs=1e-12)
    assert body["reduced_purity_a"] == pytest.approx(1.0)


def test_analyse_rejects_a_one_qubit_state(client):
    response = client.post(
        "/api/entanglement/analyse",
        json={"state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]}},
    )
    assert response.json()["error"]["code"] == "NOT_A_TWO_QUBIT_STATE"


# --- §11 POST /api/bell/chsh ------------------------------------------------ #


def test_chsh_uses_the_specifications_own_example(client):
    """§11's example: the singlet at the optimal settings."""
    response = client.post(
        "/api/bell/chsh",
        json={
            "state": "psi_minus",
            "angles": {
                "a": 0,
                "a_prime": 1.57079632679,
                "b": 0.78539816339,
                "b_prime": -0.78539816339,
            },
            "shots": 10000,
            "seed": 123,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["absolute_s"] == pytest.approx(CHSH_QUANTUM_BOUND, abs=1e-9)
    assert body["violates_classical_bound"] is True
    assert body["classical_bound"] == 2.0
    assert len(body["correlations"]) == 4
    assert abs(body["observed_s"]) == pytest.approx(CHSH_QUANTUM_BOUND, abs=0.1)


def test_chsh_labels_itself_an_ideal_model(client):
    """§8.11 requires the simulation to say what it is."""
    body = client.post(
        "/api/bell/chsh",
        json={"state": "psi_minus", "angles": {"a": 0, "a_prime": 0, "b": 0, "b_prime": 0}},
    ).json()
    assert "ideal theoretical model" in body["model_note"]
    assert "loophole" in body["model_note"]


def test_chsh_without_shots_reports_prediction_only(client):
    body = client.post(
        "/api/bell/chsh",
        json={
            "state": "psi_minus",
            "angles": {"a": 0, "a_prime": 1.5707963, "b": 0.7853981, "b_prime": -0.7853981},
        },
    ).json()
    assert body["observed_s"] is None
    assert all(entry["observed"] is None for entry in body["correlations"])


def test_chsh_stays_within_the_classical_bound_when_settings_are_aligned(client):
    body = client.post(
        "/api/bell/chsh",
        json={"state": "psi_minus", "angles": {"a": 0, "a_prime": 0, "b": 0, "b_prime": 0}},
    ).json()
    assert body["violates_classical_bound"] is False
    assert body["absolute_s"] <= 2.0 + 1e-12


def test_chsh_rejects_an_unknown_state_name(client):
    response = client.post(
        "/api/bell/chsh",
        json={"state": "not_a_bell_state", "angles": {"a": 0, "a_prime": 0, "b": 0, "b_prime": 0}},
    )
    assert response.status_code == 422


# --- §13 error envelope and §19 limits ------------------------------------- #


def test_every_rejection_uses_the_documented_envelope(client):
    response = client.post(
        "/api/gates/apply",
        json={
            "state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]},
            "gate": {"name": "NOPE", "targets": [0]},
        },
    )
    body = response.json()
    assert set(body) == {"error"}
    assert set(body["error"]) == {"code", "message", "details"}
    assert isinstance(body["error"]["details"], dict)


def test_schema_failures_share_the_same_envelope(client):
    body = client.post("/api/gates/apply", json={"nonsense": True}).json()
    assert body["error"]["code"] == "INVALID_REQUEST"
    assert "errors" in body["error"]["details"]


def test_unknown_fields_are_refused(client):
    response = client.post(
        "/api/state/validate",
        json={"amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}], "surprise": 1},
    )
    assert response.status_code == 422


def test_oversized_requests_are_refused(client):
    """§19 — a request-size limit, enforced before parsing."""
    response = client.post(
        "/api/state/validate",
        content=b"x" * (MAX_REQUEST_BYTES + 1),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413
    assert response.json()["error"]["code"] == "REQUEST_TOO_LARGE"


def test_complex_numbers_are_never_serialised_as_strings(client):
    """§12 forbids ambiguous forms such as "0.5-0.5j"."""
    body = client.post(
        "/api/gates/apply",
        json={
            "state": {"qubit_count": 1, "amplitudes": [{"re": 1, "im": 0}, {"re": 0, "im": 0}]},
            "gate": {"name": "S", "targets": [0]},
        },
    ).json()
    for amplitude in body["state"]["amplitudes"]:
        assert set(amplitude) == {"re", "im"}
        assert isinstance(amplitude["re"], float)
        assert isinstance(amplitude["im"], float)


def test_responses_always_declare_their_basis_order(client):
    """§12 — a client never has to guess the convention."""
    body = client.post(
        "/api/gates/apply",
        json={
            "state": {"qubit_count": 2, "amplitudes": [{"re": 1, "im": 0}] + [{"re": 0, "im": 0}] * 3},
            "gate": {"name": "X", "targets": [1]},
        },
    ).json()
    assert body["state"]["basis_order"] == ["00", "01", "10", "11"]
    # X on qubit 1 takes |00⟩ to |01⟩.
    assert np.allclose(body["probabilities"], [0, 1, 0, 0])
