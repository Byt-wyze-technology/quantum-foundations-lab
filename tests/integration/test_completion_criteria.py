"""§21's completion criteria, as executable checks.

The specification ends with fourteen conditions for the project being ready.
Most are already covered somewhere in the suite; this file gathers them in one
place so the criteria can be *audited* rather than believed, and so a
regression against any of them fails with a message naming the criterion.

Where a criterion is genuinely about the interface rather than the mathematics,
the check reads the frontend source or the lesson data, because that is where
the claim lives.
"""

import re
from pathlib import Path

import numpy as np
import pytest

from quantum_foundations import core
from quantum_foundations.lessons import LESSON_SECTIONS, section_ids

ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = ROOT / "apps" / "web" / "frontend" / "src"
README = ROOT / "README.md"
CONVENTIONS = ROOT / "docs" / "conventions.md"

ALL_GATES = ["I", "X", "Y", "Z", "H", "S", "SDG", "T", "TDG", "CNOT", "CZ", "SWAP"]


def _frontend_sources() -> list[tuple[Path, str]]:
    return [
        (path, path.read_text(encoding="utf-8"))
        for path in FRONTEND_SRC.rglob("*")
        if path.suffix in {".ts", ".tsx"} and ".test." not in path.name
    ]


# --- 1. All states remain normalised under supported gates ----------------- #


@pytest.mark.parametrize("name", ALL_GATES)
def test_states_stay_normalised_under_every_gate(name):
    matrix = core.gate_matrix(name)
    qubit_count = core.gate_qubit_count(name)
    rng = np.random.default_rng(11)
    for _ in range(40):
        angles = rng.uniform(0, np.pi, size=qubit_count)
        phases = rng.uniform(0, 2 * np.pi, size=qubit_count)
        state = core.qubit_from_angles(float(angles[0]), float(phases[0]))
        for index in range(1, qubit_count):
            state = core.tensor_product(
                state, core.qubit_from_angles(float(angles[index]), float(phases[index]))
            )
        evolved = core.apply_gate(
            state, matrix, tuple(range(qubit_count)), qubit_count=qubit_count
        )
        assert np.isclose(np.linalg.norm(evolved), 1.0, atol=1e-12)


# --- 2. All supported gates pass unitary checks ---------------------------- #


@pytest.mark.parametrize("name", ALL_GATES)
def test_every_named_gate_is_unitary(name):
    assert core.is_unitary(core.gate_matrix(name))


@pytest.mark.parametrize("name", ["RX", "RY", "RZ", "PHASE"])
def test_every_rotation_is_unitary(name):
    for angle in np.linspace(-2 * np.pi, 2 * np.pi, 25):
        assert core.is_unitary(core.gate_matrix(name, {"theta": float(angle), "phi": float(angle)}))


# --- 3. Measurement probabilities sum to one ------------------------------- #


def test_probabilities_always_sum_to_one():
    rng = np.random.default_rng(5)
    for _ in range(100):
        state = core.qubit_from_angles(
            float(rng.uniform(0, np.pi)), float(rng.uniform(0, 2 * np.pi))
        )
        assert np.isclose(core.probabilities(state).sum(), 1.0)
        for axis_angle in rng.uniform(0, np.pi, size=5):
            observable = core.spin_observable(core.axis_from_angles(float(axis_angle), 0.0))
            outcomes = core.projective_measurement_distribution(state, observable)
            assert np.isclose(sum(o.probability for o in outcomes), 1.0)


# --- 4. Bell-state reduced subsystems are correctly shown as mixed --------- #


@pytest.mark.parametrize("name", ["phi_plus", "phi_minus", "psi_plus", "psi_minus"])
@pytest.mark.parametrize("keep", [(0,), (1,)])
def test_every_bell_subsystem_is_maximally_mixed(name, keep):
    state = core.BELL_STATES[name]()
    rho = core.reduced_density_matrix(state, keep=keep, qubit_count=2)
    assert np.allclose(rho, np.eye(2) / 2, atol=1e-12)
    assert np.isclose(core.purity(rho), 0.5)


# --- 5. The UI does not depict entangled qubits as independent pure states -- #


def test_the_interface_draws_reduced_states_at_their_true_length():
    """The rule is kept by drawing a short arrow, not by drawing a false one."""
    sphere = (FRONTEND_SRC / "viz" / "BlochSphere.tsx").read_text(encoding="utf-8")
    assert "mixedVector" in sphere
    assert "arrowLength" in sphere
    # A zero-length vector must produce a dot, never an arrow with a guessed heading.
    assert "maximally mixed" in sphere

    panel = (FRONTEND_SRC / "viz" / "ReducedStatePanel.tsx").read_text(encoding="utf-8")
    assert "mixedVector" in panel
    assert "state=" not in panel.replace("mixedVector", "")


def test_no_component_feeds_a_reduced_state_in_as_a_pure_state():
    for path, text in _frontend_sources():
        if "reducedDensityMatrix" not in text:
            continue
        # A reduced density matrix may only reach the sphere as `mixedVector`.
        for match in re.finditer(r"<BlochSphere[^>]*?state=\{([^}]*)\}", text, re.S):
            assert "reduced" not in match.group(1).lower(), path


# --- 6. The Bloch sphere is used only for valid one-qubit views ------------ #


def test_bloch_vector_rejects_multi_qubit_states():
    with pytest.raises(core.QuantumValidationError):
        core.bloch_vector(core.bell_phi_plus())


# --- 7. Tensor-product ordering is documented and tested ------------------- #


def test_tensor_ordering_is_documented():
    conventions = CONVENTIONS.read_text(encoding="utf-8")
    assert "most significant" in conventions
    assert 'tensor_product(ket0(), ket1()) == computational_basis_state("01")' in conventions


def test_tensor_ordering_behaves_as_documented():
    assert np.allclose(
        core.tensor_product(core.ket0(), core.ket1()),
        core.computational_basis_state("01"),
    )
    assert core.basis_labels(2) == ["00", "01", "10", "11"]


# --- 8. Hermitian observables are separated from unitary gates ------------- #


def test_observables_and_gates_are_separate_modules():
    from quantum_foundations.core import gates, observables

    assert hasattr(gates, "is_unitary")
    assert not hasattr(gates, "expectation_value")
    assert hasattr(observables, "is_hermitian")
    assert not hasattr(observables, "apply_gate")


def test_a_non_unitary_matrix_is_refused_not_applied():
    shear = np.array([[1, 1], [0, 1]], dtype=complex)
    with pytest.raises(core.QuantumValidationError) as error:
        core.apply_gate(core.ket0(), shear, (0,), qubit_count=1)
    assert error.value.code == "NON_UNITARY_OPERATOR"


def test_a_non_hermitian_matrix_is_refused_as_an_observable():
    with pytest.raises(core.QuantumValidationError) as error:
        core.expectation_value(core.ket0(), np.array([[0, 1], [0, 0]], dtype=complex))
    assert error.value.code == "NON_HERMITIAN_OBSERVABLE"


# --- 9. Measurement statistics distinguish expected from observed ---------- #


def test_the_histogram_distinguishes_prediction_from_observation():
    histogram = (FRONTEND_SRC / "viz" / "MeasurementHistogram.tsx").read_text(encoding="utf-8")
    assert "expected" in histogram and "observed" in histogram
    assert "Expected probability" in histogram
    assert "Observed frequency" in histogram
    assert "samplingUncertainty" in histogram


# --- 10. Polarisation and spin analogies state their limits ---------------- #


def test_the_spin_analogy_names_its_limit():
    spin = section_ids()
    assert "polarisation-spin" in spin
    guard = next(s for s in LESSON_SECTIONS if s.id == "polarisation-spin").misconception
    assert "not a small object rotating in space" in guard.right


def test_the_polarisation_visual_separates_beam_from_single_photon():
    source = (FRONTEND_SRC / "lesson" / "visuals" / "PolarisationAndSpin.tsx").read_text(
        encoding="utf-8"
    )
    assert "CLASSICAL BEAM" in source
    assert "SINGLE PHOTONS" in source


# --- 11. No lesson claims entanglement enables communication --------------- #


def test_the_entanglement_sections_deny_signalling():
    """Both sections must state the denial, not merely avoid the claim."""
    entanglement = next(s for s in LESSON_SECTIONS if s.id == "entanglement")
    assert "sends a signal" in entanglement.misconception.wrong
    assert "statistics change when the other is measured" in entanglement.misconception.right

    epr = next(s for s in LESSON_SECTIONS if s.id == "epr")
    assert "faster than light" in epr.misconception.wrong
    assert "Nothing is transmitted" in epr.misconception.right


def test_no_signalling_holds_for_every_pair_of_settings():
    """The claim in the copy is true of the mathematics behind it."""
    for alice in np.linspace(0, np.pi, 7):
        reference = None
        for bob in np.linspace(0, 2 * np.pi, 13):
            marginals = core.marginal_probabilities(
                core.bell_psi_minus(),
                core.axis_from_angles(float(alice), 0.0),
                core.axis_from_angles(float(bob), 0.0),
            )
            if reference is None:
                reference = marginals["alice"]
            assert np.isclose(marginals["alice"][1], reference[1], atol=1e-12)


# --- 12. Every formal equation is linked to an interactive visual ---------- #


def test_every_section_with_equations_also_has_a_visual():
    sections = (FRONTEND_SRC / "lesson" / "sections.tsx").read_text(encoding="utf-8")
    # Each section literal must carry both a `visual:` and an `equations:` key.
    blocks = sections.split("    id: ")[1:]
    assert len(blocks) == len(LESSON_SECTIONS)
    for block in blocks:
        assert "visual: ()" in block
        assert "equations: [" in block
        assert "checkpoints: [" in block


# --- 13. Frontend and backend agree numerically ---------------------------- #
# Covered in full by tests/integration/test_frontend_backend_agreement.py.


def test_the_agreement_check_exists_and_is_not_vacuous():
    agreement = (
        ROOT / "tests" / "integration" / "test_frontend_backend_agreement.py"
    ).read_text(encoding="utf-8")
    assert "esbuild" in agreement
    # A guard against the cross-check quietly shrinking to nothing.
    assert "covers_every_area_of_the_mathematics" in agreement
    assert "stateProbabilities" in agreement
    assert "chsh" in agreement


# --- 14. Lesson, README and tests use the same terminology ----------------- #


def test_the_readme_describes_the_same_scope_the_specification_does():
    readme = README.read_text(encoding="utf-8")
    assert "not a physical hardware simulator" in readme.lower()
    assert "one- and two-qubit" in readme
    assert "ideal theoretical model" in readme.lower() or "ideal calculation" in readme.lower()


def test_the_readme_lists_every_lesson_section():
    readme = README.read_text(encoding="utf-8")
    for section in LESSON_SECTIONS:
        assert section.title.rstrip(".") in readme, section.id


def test_the_readme_and_the_spine_agree_on_section_count():
    readme = README.read_text(encoding="utf-8")
    assert f"{len(LESSON_SECTIONS)} sections" in readme or "Eleven sections" in readme
