"""Quantum Foundations Lab — Streamlit edition.

Specification reference: §2.

A second front end over the same mathematical core, for classrooms where a
Python process is easier to run than a Node toolchain. It is deliberately the
laboratory rather than the guided lesson: the lesson depends on interactions
Streamlit cannot express well, and a half-hearted copy of it would teach worse
than the real one.

Run with::

    streamlit run apps/streamlit/foundations_lab.py

The same rules the web app follows apply here (§21): the Bloch arrow is drawn
at its true length, so an entangled subsystem's arrow visibly shrinks to
nothing rather than being drawn as a confident unit vector.
"""

from __future__ import annotations

import matplotlib.pyplot as plt
import numpy as np
import streamlit as st

from quantum_foundations import core

PAPER = "#f3f0e8"
INK = "#102224"
MINT = "#75d5b3"
CORAL = "#ef7c64"
VIOLET = "#8a7cc8"
AMBER = "#e0a458"
LINE = "#c9c6bc"

ONE_QUBIT_PRESETS = {
    "|0⟩": core.ket0,
    "|1⟩": core.ket1,
    "|+⟩": core.ket_plus,
    "|−⟩": core.ket_minus,
    "|+i⟩": core.ket_plus_i,
    "|−i⟩": core.ket_minus_i,
}

TWO_QUBIT_PRESETS = {
    "Product |+⟩⊗|0⟩": lambda: core.tensor_product(core.ket_plus(), core.ket0()),
    "Bell Φ⁺": core.bell_phi_plus,
    "Bell Φ⁻": core.bell_phi_minus,
    "Bell Ψ⁺": core.bell_psi_plus,
    "Bell Ψ⁻ (singlet)": core.bell_psi_minus,
}

ONE_QUBIT_GATES = ["I", "X", "Y", "Z", "H", "S", "SDG", "T", "TDG"]
TWO_QUBIT_GATES = ["CNOT 0→1", "CNOT 1→0", "CZ", "SWAP"]


def bloch_figure(vector: np.ndarray, axis: np.ndarray | None = None) -> plt.Figure:
    """Draw a Bloch vector at its true length.

    A vector shorter than one is a mixed state and is drawn short, with a
    shaded ball showing how far it has retreated from the surface. A vector of
    length zero gets a dot and no arrow at all, because a maximally mixed qubit
    has no direction to point (§21).
    """
    figure = plt.figure(figsize=(4.2, 4.2), facecolor=PAPER)
    axes = figure.add_subplot(111, projection="3d", facecolor=PAPER)

    grid = np.linspace(0, 2 * np.pi, 80)
    for plane in ("xy", "xz", "yz"):
        zeros = np.zeros_like(grid)
        cos, sin = np.cos(grid), np.sin(grid)
        points = {"xy": (cos, sin, zeros), "xz": (cos, zeros, sin), "yz": (zeros, cos, sin)}[plane]
        axes.plot(*points, color=LINE, linewidth=0.8, linestyle=":")

    for direction, label in (
        ((1, 0, 0), "|+⟩"),
        ((-1, 0, 0), "|−⟩"),
        ((0, 1, 0), "|+i⟩"),
        ((0, -1, 0), "|−i⟩"),
        ((0, 0, 1), "|0⟩"),
        ((0, 0, -1), "|1⟩"),
    ):
        axes.plot(*[[0, value] for value in direction], color="#98a3a1", linewidth=0.7)
        axes.text(*[value * 1.18 for value in direction], label, fontsize=7, color="#66716f")

    length = float(np.linalg.norm(vector))
    if length < 1e-9:
        axes.scatter([0], [0], [0], color=VIOLET, s=40)
    else:
        axes.quiver(0, 0, 0, *vector, color=CORAL, linewidth=2.4, arrow_length_ratio=0.13)
        axes.scatter(*[[value] for value in vector], color=INK, s=18)

    if length < 0.999:
        radius = 1 - length
        theta, phi = np.mgrid[0 : 2 * np.pi : 24j, 0 : np.pi : 12j]
        axes.plot_surface(
            radius * np.cos(theta) * np.sin(phi),
            radius * np.sin(theta) * np.sin(phi),
            radius * np.cos(phi),
            color=VIOLET,
            alpha=0.12,
            linewidth=0,
        )

    if axis is not None:
        axes.plot(
            [-axis[0], axis[0]], [-axis[1], axis[1]], [-axis[2], axis[2]],
            color=AMBER, linewidth=1.8, linestyle="--",
        )

    axes.set_xlim(-1, 1)
    axes.set_ylim(-1, 1)
    axes.set_zlim(-1, 1)
    axes.set_box_aspect((1, 1, 1))
    axes.axis("off")
    figure.tight_layout()
    return figure


def amplitude_figure(state: np.ndarray, labels: list[str]) -> plt.Figure:
    """Magnitude bars coloured by phase, with the numbers printed alongside."""
    figure, axes = plt.subplots(figsize=(4.6, 2.4), facecolor=PAPER)
    axes.set_facecolor(PAPER)
    magnitudes = np.abs(state)
    phases = np.angle(state)
    colours = plt.cm.hsv((np.mod(phases, 2 * np.pi)) / (2 * np.pi))
    axes.barh(labels[::-1], magnitudes[::-1], color=colours[::-1], edgecolor=INK, linewidth=0.6)
    axes.set_xlim(0, 1)
    axes.set_xlabel("|amplitude|", fontsize=8, color=INK)
    axes.tick_params(labelsize=8, colors=INK)
    for spine in axes.spines.values():
        spine.set_color(LINE)
    figure.tight_layout()
    return figure


def histogram_figure(labels: list[str], expected: np.ndarray, counts: dict[str, int], shots: int):
    """Observed frequency against predicted probability, kept distinguishable."""
    figure, axes = plt.subplots(figsize=(4.6, 2.6), facecolor=PAPER)
    axes.set_facecolor(PAPER)
    observed = [counts.get(label, 0) / shots if shots else 0 for label in labels]
    positions = np.arange(len(labels))
    axes.bar(positions, observed, color=MINT, edgecolor="#3ca782", label="observed")
    axes.plot(
        positions, expected, "o", color=CORAL, markersize=7, linestyle="none", label="expected"
    )
    axes.set_xticks(positions, labels)
    axes.set_ylim(0, 1)
    axes.tick_params(labelsize=8, colors=INK)
    axes.legend(fontsize=7, frameon=False)
    for spine in axes.spines.values():
        spine.set_color(LINE)
    figure.tight_layout()
    return figure


def main() -> None:
    st.set_page_config(page_title="Quantum Foundations Lab", layout="wide")
    st.title("Quantum Foundations Lab")
    st.caption(
        "A mathematical teaching model for ideal one- and two-qubit systems. "
        "Not a physical hardware simulator."
    )

    with st.sidebar:
        st.header("Setup")
        qubit_count = st.radio("Qubits", (1, 2), horizontal=True)
        presets = ONE_QUBIT_PRESETS if qubit_count == 1 else TWO_QUBIT_PRESETS
        preset_name = st.selectbox("Starting state", list(presets))
        gates = st.multiselect(
            "Gates, applied in order",
            ONE_QUBIT_GATES if qubit_count == 1 else ONE_QUBIT_GATES + TWO_QUBIT_GATES,
        )
        target = 0
        if qubit_count == 2:
            target = st.radio("Single-qubit gates act on", (0, 1), horizontal=True)
        shots = st.select_slider("Shots", options=[0, 10, 100, 1000, 10000], value=1000)
        seed = st.number_input("Seed (for a reproducible demonstration)", value=42, step=1)

    state = presets[preset_name]()
    for gate in gates:
        if gate.startswith("CNOT"):
            targets = (0, 1) if gate.endswith("0→1") else (1, 0)
            state = core.apply_gate(state, core.CNOT, targets, qubit_count=qubit_count)
        elif gate in {"CZ", "SWAP"}:
            matrix = core.CZ if gate == "CZ" else core.SWAP
            state = core.apply_gate(state, matrix, (0, 1), qubit_count=qubit_count)
        else:
            state = core.apply_gate(
                state, core.gate_matrix(gate), (target,), qubit_count=qubit_count
            )

    labels = core.basis_labels(qubit_count)
    expected = core.probabilities(state)

    left, right = st.columns([1, 1])

    with left:
        if qubit_count == 1:
            st.subheader("Bloch sphere")
            st.pyplot(bloch_figure(core.bloch_vector(state)))
            st.caption(
                "A map of the possible states of one qubit, not a picture of a physical object."
            )
        else:
            st.subheader("Each qubit on its own")
            spheres = st.columns(2)
            for qubit, column in enumerate(spheres):
                rho = core.reduced_density_matrix(state, keep=(qubit,), qubit_count=2)
                vector = np.array(
                    [
                        2 * rho[0, 1].real,
                        -2 * rho[0, 1].imag,
                        (rho[0, 0] - rho[1, 1]).real,
                    ]
                )
                with column:
                    st.pyplot(bloch_figure(vector))
                    st.caption(
                        f"qubit {qubit} · purity {core.purity(rho):.3f} · "
                        f"arrow {np.linalg.norm(vector) * 100:.0f}%"
                    )
            st.caption(
                "These are reduced states, not two independent qubits. For a Bell pair the "
                "arrows vanish entirely, because neither qubit has a state of its own to draw."
            )

    with right:
        st.subheader("Amplitudes")
        st.pyplot(amplitude_figure(state, labels))
        st.caption("Bar length is the magnitude; colour is the phase.")

        if qubit_count == 2:
            concurrence = core.concurrence_two_qubit(state)
            st.metric("Concurrence", f"{concurrence:.3f}")
            st.write(
                "Product state — each qubit has a state of its own."
                if core.is_product_state(state)
                else "Entangled — neither qubit is fully described on its own."
            )

    st.subheader("Measurement")
    if shots:
        rng = np.random.default_rng(int(seed))
        counts = core.sample_measurements(state, int(shots), rng=rng)
        st.pyplot(histogram_figure(labels, expected, counts, int(shots)))
        st.caption(
            "Each shot is a fresh preparation of the same state, measured once. This is not one "
            "qubit measured repeatedly — a measured qubit stays where it collapsed."
        )
    else:
        st.write("Set a shot count in the sidebar to gather statistics.")

    with st.expander("Show the mathematics"):
        st.write("**State vector**")
        st.write(
            {label: f"{value.real:+.4f}{value.imag:+.4f}i" for label, value in zip(labels, state)}
        )
        st.write("**Computational-basis probabilities**")
        st.write({label: round(float(value), 6) for label, value in zip(labels, expected)})
        if qubit_count == 2:
            for qubit in (0, 1):
                rho = core.reduced_density_matrix(state, keep=(qubit,), qubit_count=2)
                st.write(f"**Reduced density matrix, qubit {qubit}**")
                st.write(np.round(rho, 4))


if __name__ == "__main__":
    main()
