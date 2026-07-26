"""The Streamlit front end draws the same truths as the web app (§2, §21).

Streamlit's own runtime needs a server, so these tests exercise the figure
builders and the state pipeline directly. That is where the teaching claims
live: a Bell pair's reduced arrow must vanish here exactly as it does in the
browser, or the two front ends would disagree about what entanglement looks
like.
"""

import importlib.util
from pathlib import Path

import matplotlib
import numpy as np
import pytest

matplotlib.use("Agg")

from quantum_foundations import core  # noqa: E402

APP = Path(__file__).resolve().parents[2] / "apps" / "streamlit" / "foundations_lab.py"


@pytest.fixture(scope="module")
def app():
    spec = importlib.util.spec_from_file_location("foundations_lab", APP)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def reduced_bloch(state, qubit):
    rho = core.reduced_density_matrix(state, keep=(qubit,), qubit_count=2)
    return np.array([2 * rho[0, 1].real, -2 * rho[0, 1].imag, (rho[0, 0] - rho[1, 1]).real])


def test_the_app_file_exists_where_the_layout_says():
    assert APP.is_file()


def test_every_one_qubit_preset_is_a_valid_state(app):
    for name, build in app.ONE_QUBIT_PRESETS.items():
        state = build()
        assert np.isclose(np.vdot(state, state).real, 1.0), name


def test_every_two_qubit_preset_is_a_valid_state(app):
    for name, build in app.TWO_QUBIT_PRESETS.items():
        state = build()
        assert len(state) == 4, name
        assert np.isclose(np.vdot(state, state).real, 1.0), name


def test_a_bell_pair_has_no_reduced_arrow(app):
    """The §21 rule, checked in this front end too."""
    for qubit in (0, 1):
        vector = reduced_bloch(core.bell_phi_plus(), qubit)
        assert np.linalg.norm(vector) < 1e-12
        # The figure still builds; it simply draws a dot rather than an arrow.
        assert app.bloch_figure(vector) is not None


def test_a_product_state_keeps_full_length_arrows(app):
    state = core.tensor_product(core.ket_plus(), core.ket0())
    for qubit in (0, 1):
        assert np.isclose(np.linalg.norm(reduced_bloch(state, qubit)), 1.0)


def test_a_partly_entangled_state_has_a_shortened_arrow(app):
    state = np.array([np.sqrt(0.9), 0, 0, np.sqrt(0.1)], dtype=complex)
    length = float(np.linalg.norm(reduced_bloch(state, 0)))
    assert 0.0 < length < 1.0


def test_the_reduced_bloch_length_matches_the_purity(app):
    """|r|² = 2·Tr(ρ²) − 1, so the drawing and the figure printed beside it agree."""
    for state in (
        core.bell_phi_plus(),
        core.tensor_product(core.ket_plus(), core.ket0()),
        np.array([np.sqrt(0.7), 0, 0, np.sqrt(0.3)], dtype=complex),
    ):
        rho = core.reduced_density_matrix(state, keep=(0,), qubit_count=2)
        length = float(np.linalg.norm(reduced_bloch(state, 0)))
        assert np.isclose(length**2, 2 * core.purity(rho) - 1, atol=1e-12)


def test_gate_names_offered_are_all_resolvable(app):
    for name in app.ONE_QUBIT_GATES:
        assert core.gate_matrix(name).shape == (2, 2), name


def test_figures_build_for_both_qubit_counts(app):
    assert app.amplitude_figure(core.ket_plus(), core.basis_labels(1)) is not None
    assert app.amplitude_figure(core.bell_phi_plus(), core.basis_labels(2)) is not None
    assert (
        app.histogram_figure(
            core.basis_labels(2), core.probabilities(core.bell_phi_plus()),
            {"00": 500, "11": 500}, 1000,
        )
        is not None
    )


def test_the_app_states_what_it_is_not(app):
    """§22 — a teaching model, not a hardware simulator."""
    source = APP.read_text(encoding="utf-8")
    assert "Not a physical hardware simulator" in source
    assert "not a picture of a physical object" in source
    assert "fresh preparation" in source
