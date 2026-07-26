"""Generate the figures the README and docs use.

Specification reference: §2, Phase 6.

Every figure is computed from the core, so a change to the mathematics cannot
leave a stale picture behind. Run with::

    python scripts/make_readme_figures.py
"""

from __future__ import annotations

from pathlib import Path

import matplotlib
import numpy as np

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from quantum_foundations import core  # noqa: E402

PAPER = "#f3f0e8"
INK = "#102224"
MINT = "#75d5b3"
MINT_DEEP = "#3ca782"
CORAL = "#ef7c64"
VIOLET = "#8a7cc8"
LINE = "#c9c6bc"

IMAGES = Path(__file__).resolve().parents[1] / "images"


def _style(axes) -> None:
    axes.set_facecolor(PAPER)
    axes.tick_params(labelsize=8, colors=INK)
    for spine in axes.spines.values():
        spine.set_color(LINE)


def phase_is_invisible_then_decisive(path: Path) -> None:
    """The teaching moment of §8.3, as one picture.

    Turning the relative phase leaves the Z-basis probabilities flat and swings
    the X-basis ones from certain to impossible.
    """
    phases = np.linspace(0, 2 * np.pi, 240)
    z_probability, x_probability = [], []
    for phi in phases:
        state = core.qubit_from_angles(np.pi / 2, float(phi))
        z_probability.append(core.probabilities(state)[0])
        x_probability.append((1 + core.expectation_value(state, core.X)) / 2)

    figure, axes = plt.subplots(figsize=(7, 3.2), facecolor=PAPER)
    _style(axes)
    axes.plot(np.degrees(phases), z_probability, color=MINT_DEEP, linewidth=2.4,
              label="P(0) measured along Z")
    axes.plot(np.degrees(phases), x_probability, color=CORAL, linewidth=2.4,
              label="P(+1) measured along X")
    axes.set_xlabel("relative phase φ (degrees)", fontsize=9, color=INK)
    axes.set_ylabel("probability", fontsize=9, color=INK)
    axes.set_ylim(-0.05, 1.05)
    axes.set_xlim(0, 360)
    axes.legend(fontsize=8, frameon=False)
    axes.set_title("Phase is invisible to one measurement and decisive for another",
                   fontsize=10, color=INK)
    figure.tight_layout()
    figure.savefig(path, dpi=160, facecolor=PAPER)
    plt.close(figure)


def entanglement_shrinks_the_arrow(path: Path) -> None:
    """§8.9 in one picture: as concurrence rises, each subsystem's arrow shrinks."""
    weights = np.linspace(0.5, 1.0, 200)
    concurrences, lengths, purities = [], [], []
    for weight in weights:
        state = np.array([np.sqrt(weight), 0, 0, np.sqrt(1 - weight)], dtype=complex)
        rho = core.reduced_density_matrix(state, keep=(0,), qubit_count=2)
        concurrences.append(core.concurrence_two_qubit(state))
        purities.append(core.purity(rho))
        lengths.append(np.sqrt(max(0.0, 2 * core.purity(rho) - 1)))

    figure, axes = plt.subplots(figsize=(7, 3.2), facecolor=PAPER)
    _style(axes)
    axes.plot(concurrences, lengths, color=CORAL, linewidth=2.4, label="length of the Bloch arrow")
    axes.plot(concurrences, purities, color=VIOLET, linewidth=2.4, linestyle="--",
              label="purity of the reduced state")
    axes.set_xlabel("concurrence", fontsize=9, color=INK)
    axes.set_ylim(-0.05, 1.05)
    axes.legend(fontsize=8, frameon=False)
    axes.set_title("An entangled qubit has no arrow of its own", fontsize=10, color=INK)
    figure.tight_layout()
    figure.savefig(path, dpi=160, facecolor=PAPER)
    plt.close(figure)


def bell_correlation_curve(path: Path) -> None:
    """§8.11: E(θ) = −cos θ, with the CHSH settings marked."""
    angles = np.linspace(-np.pi, np.pi, 300)
    values = [
        core.correlation(
            core.bell_psi_minus(),
            core.axis_from_angles(0.0, 0.0),
            core.axis_from_angles(float(angle), 0.0),
        )
        for angle in angles
    ]

    figure, axes = plt.subplots(figsize=(7, 3.2), facecolor=PAPER)
    _style(axes)
    axes.axhline(0, color=LINE, linewidth=0.8)
    axes.axvline(0, color=LINE, linewidth=0.8)
    axes.plot(np.degrees(angles), values, color=CORAL, linewidth=2.4)
    for setting in (45, 135):
        axes.plot([setting], [-np.cos(np.radians(setting))], "o", color=VIOLET, markersize=7)
    axes.set_xlabel("angle between the analysers (degrees)", fontsize=9, color=INK)
    axes.set_ylabel("E(θ)", fontsize=9, color=INK)
    axes.set_title("Singlet correlations, with two CHSH settings marked", fontsize=10, color=INK)
    figure.tight_layout()
    figure.savefig(path, dpi=160, facecolor=PAPER)
    plt.close(figure)


def sampling_converges(path: Path) -> None:
    """§8.7: observed frequency approaches the prediction as shots accumulate."""
    rng = np.random.default_rng(20260726)
    state = core.ket_plus()
    totals = np.unique(np.logspace(0, 4, 40).astype(int))
    frequencies = []
    for shots in totals:
        counts = core.sample_measurements(state, int(shots), rng=rng)
        frequencies.append(counts["0"] / int(shots))

    figure, axes = plt.subplots(figsize=(7, 3.2), facecolor=PAPER)
    _style(axes)
    axes.axhline(0.5, color=CORAL, linewidth=2, linestyle="--", label="predicted probability")
    axes.plot(totals, frequencies, color=MINT_DEEP, marker="o", markersize=3.5,
              linewidth=1.4, label="observed frequency")
    axes.set_xscale("log")
    axes.set_xlabel("shots (each a fresh preparation)", fontsize=9, color=INK)
    axes.set_ylabel("fraction reading 0", fontsize=9, color=INK)
    axes.set_ylim(0, 1)
    axes.legend(fontsize=8, frameon=False)
    axes.set_title("Statistics converge; a single shot never does", fontsize=10, color=INK)
    figure.tight_layout()
    figure.savefig(path, dpi=160, facecolor=PAPER)
    plt.close(figure)


FIGURES = {
    "figure-phase.png": phase_is_invisible_then_decisive,
    "figure-entanglement.png": entanglement_shrinks_the_arrow,
    "figure-bell-correlation.png": bell_correlation_curve,
    "figure-sampling.png": sampling_converges,
}


def main() -> None:
    IMAGES.mkdir(exist_ok=True)
    for name, build in FIGURES.items():
        target = IMAGES / name
        build(target)
        print(f"wrote {target.relative_to(IMAGES.parent)}")


if __name__ == "__main__":
    main()
