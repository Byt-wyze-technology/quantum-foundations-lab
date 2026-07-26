"""The two implementations must agree numerically (§21).

The frontend reproduces the mathematics in TypeScript so interaction is
instant; the Python package is the reference implementation (§2). Nothing
keeps them in step except a comparison, so this test bundles the frontend's
maths with esbuild, runs it under Node, and checks every number it produces
against the core.

Skipped, not failed, when Node or the frontend's dependencies are absent — a
contributor working only on the Python side should not be blocked by a missing
toolchain. CI installs both, so the check runs there.
"""

import json
import shutil
import subprocess
from pathlib import Path

import numpy as np
import pytest

from quantum_foundations.core import (
    CNOT,
    H,
    S,
    T,
    X,
    Y,
    Z,
    apply_gate,
    axis_from_angles,
    bell_phi_plus,
    bell_psi_minus,
    chsh_value,
    computational_basis_state,
    concurrence_two_qubit,
    correlation,
    expectation_value,
    probabilities,
    projective_measurement_distribution,
    purity,
    qubit_from_angles,
    reduced_density_matrix,
    spin_observable,
    tensor_product,
    variance,
)

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
FRONTEND = REPOSITORY_ROOT / "apps" / "web" / "frontend"
PROBE = REPOSITORY_ROOT / "scripts" / "frontend_math_probe.mts"

#: The frontend uses double precision throughout, as NumPy does, so agreement
#: should be to near machine precision rather than merely "close".
TOLERANCE = 1e-12


def _npx() -> str | None:
    return shutil.which("npx") or shutil.which("npx.cmd")


@pytest.fixture(scope="module")
def frontend_results() -> dict:
    npx = _npx()
    node = shutil.which("node")
    if npx is None or node is None:
        pytest.skip("Node and npx are required to cross-check the frontend mathematics.")
    if not (FRONTEND / "node_modules").is_dir():
        pytest.skip("Frontend dependencies are not installed; run npm install in the frontend.")

    bundle = FRONTEND / "node_modules" / ".tmp" / "math-probe.mjs"
    bundle.parent.mkdir(parents=True, exist_ok=True)

    build = subprocess.run(
        [npx, "esbuild", str(PROBE), "--bundle", "--format=esm", f"--outfile={bundle}"],
        cwd=FRONTEND,
        capture_output=True,
        text=True,
    )
    if build.returncode != 0:
        pytest.fail(f"Could not bundle the frontend maths probe:\n{build.stderr}")

    run = subprocess.run([node, str(bundle)], capture_output=True, text=True)
    if run.returncode != 0:
        pytest.fail(f"The frontend maths probe failed:\n{run.stderr}")
    return json.loads(run.stdout)


def _axis(theta: float) -> np.ndarray:
    return axis_from_angles(theta, 0.0)


def test_state_probabilities_agree(frontend_results):
    for entry in frontend_results["stateProbabilities"]:
        expected = probabilities(qubit_from_angles(entry["theta"], entry["phi"]))
        assert np.allclose(entry["probabilities"], expected, atol=TOLERANCE), entry


def test_gate_application_agrees(frontend_results):
    gates = {"X": X, "Y": Y, "Z": Z, "H": H, "S": S, "T": T}
    for entry in frontend_results["gateApplication"]:
        state = qubit_from_angles(entry["theta"], 0.9)
        expected = probabilities(
            apply_gate(state, gates[entry["gate"]], (0,), qubit_count=1)
        )
        assert np.allclose(entry["probabilities"], expected, atol=TOLERANCE), entry


def test_axis_statistics_agree(frontend_results):
    for entry in frontend_results["axisStatistics"]:
        state = qubit_from_angles(entry["theta"], 1.1)
        observable = spin_observable(_axis(entry["axisTheta"]))
        assert np.isclose(entry["expectation"], expectation_value(state, observable), atol=1e-11)
        assert np.isclose(entry["variance"], variance(state, observable), atol=1e-11)

        outcomes = projective_measurement_distribution(state, observable)
        plus = max(outcomes, key=lambda outcome: outcome.eigenvalue)
        assert np.isclose(entry["plusProbability"], plus.probability, atol=1e-11)


def test_entanglement_measures_agree(frontend_results):
    builders = {
        "phi_plus": bell_phi_plus(),
        "psi_minus": bell_psi_minus(),
        "product": tensor_product(
            qubit_from_angles(0.8, 0.3), qubit_from_angles(2.1, 1.7)
        ),
        "bell_from_circuit": apply_gate(
            apply_gate(computational_basis_state("00"), H, (0,), qubit_count=2),
            CNOT,
            (0, 1),
            qubit_count=2,
        ),
    }
    for entry in frontend_results["entanglement"]:
        state = builders[entry["name"]]
        assert np.allclose(entry["probabilities"], probabilities(state), atol=TOLERANCE), entry
        assert np.isclose(entry["concurrence"], concurrence_two_qubit(state), atol=1e-11), entry
        expected_purity = purity(reduced_density_matrix(state, keep=(0,), qubit_count=2))
        assert np.isclose(entry["reducedPurity"], expected_purity, atol=1e-11), entry


def test_correlations_agree(frontend_results):
    for entry in frontend_results["correlations"]:
        expected = correlation(bell_psi_minus(), _axis(0.0), _axis(entry["theta"]))
        assert np.isclose(entry["value"], expected, atol=1e-11), entry


def test_chsh_agrees(frontend_results):
    for entry in frontend_results["chsh"]:
        expected = chsh_value(
            bell_psi_minus(),
            _axis(entry["a"]),
            _axis(entry["aPrime"]),
            _axis(entry["b"]),
            _axis(entry["bPrime"]),
        )
        assert np.isclose(entry["s"], expected, atol=1e-11), entry


def test_the_probe_covers_every_area_of_the_mathematics(frontend_results):
    """A guard against the cross-check quietly shrinking to nothing."""
    assert len(frontend_results["stateProbabilities"]) >= 25
    assert len(frontend_results["gateApplication"]) >= 30
    assert len(frontend_results["axisStatistics"]) >= 30
    assert len(frontend_results["entanglement"]) == 4
    assert len(frontend_results["chsh"]) == 3
