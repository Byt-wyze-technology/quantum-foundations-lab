/**
 * Two-qubit interaction tests (§15, "Frontend tests").
 *
 * Three of these are named directly in §15: two-qubit mode shows four basis
 * states, the Bell preset shows only `00` and `11`, and entangled states are
 * never drawn as independent pure Bloch vectors. The last is also a §21
 * completion criterion, so it is asserted on the accessible description — the
 * text a screen reader would announce — rather than on pixels.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ExplorePanel } from "./ExplorePanel";
import { useLabStore } from "../store/labStore";
import {
  bellPhiPlus,
  concurrenceTwoQubit,
  computationalBasisState,
  isProductState,
  ket0,
  ketPlus,
  probabilities,
  tensorProduct,
} from "../math";

/** Switch the store to two qubits *before* mounting, so the first render is
 *  already in two-qubit mode rather than needing a second pass. */
const renderTwoQubit = () => {
  useLabStore.getState().setQubitCount(2);
  return render(<ExplorePanel />);
};

const currentAmplitudes = () => useLabStore.getState().currentState.amplitudes;

describe("two-qubit mode", () => {
  it("shows four basis states", async () => {
    renderTwoQubit();

    for (const label of ["00", "01", "10", "11"]) {
      expect(
        screen.getAllByRole("img", { name: new RegExp(`basis state ${label}:`) }).length,
      ).toBeGreaterThan(0);
    }
  });

  it("switches back to one qubit and shows two basis states", async () => {
    const user = userEvent.setup();
    renderTwoQubit();
    expect(useLabStore.getState().currentState.amplitudes).toHaveLength(4);

    await user.selectOptions(screen.getByLabelText("Qubits"), "1");
    expect(useLabStore.getState().currentState.amplitudes).toHaveLength(2);
  });

  it("starts two-qubit mode in |00⟩", () => {
    renderTwoQubit();
    expect(currentAmplitudes()).toEqual(computationalBasisState("00"));
  });
});

describe("the Bell preset", () => {
  it("shows only 00 and 11 probabilities", async () => {
    const user = userEvent.setup();
    renderTwoQubit();

    await user.click(screen.getByRole("button", { name: "Bell Φ⁺" }));

    const probs = probabilities(currentAmplitudes());
    expect(probs[0]).toBeCloseTo(0.5, 9);
    expect(probs[1]).toBeCloseTo(0, 9);
    expect(probs[2]).toBeCloseTo(0, 9);
    expect(probs[3]).toBeCloseTo(0.5, 9);

    expect(
      screen.getAllByRole("img", { name: /basis state 01:.*probability 0\.0 per cent/ }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("img", { name: /basis state 11:.*probability 50\.0 per cent/ }).length,
    ).toBeGreaterThan(0);
  });

  it("never samples an impossible joint outcome", async () => {
    const user = userEvent.setup();
    renderTwoQubit();
    await user.click(screen.getByRole("button", { name: "Bell Φ⁺" }));
    useLabStore.getState().setSeed(11);
    useLabStore.getState().runShots(1000);

    const { histogram, totalShots } = useLabStore.getState();
    expect(totalShots).toBe(1000);
    expect(histogram["01"] ?? 0).toBe(0);
    expect(histogram["10"] ?? 0).toBe(0);
    expect((histogram["00"] ?? 0) + (histogram["11"] ?? 0)).toBe(1000);
  });
});

describe("entangled states are never drawn as independent pure states (§21)", () => {
  it("reports both halves of a Bell pair as having no Bloch arrow", async () => {
    const user = userEvent.setup();
    renderTwoQubit();
    await user.click(screen.getByRole("button", { name: "Bell Φ⁺" }));

    for (const qubit of [0, 1]) {
      const sphere = screen.getByRole("img", {
        name: new RegExp(`Reduced state of qubit ${qubit}`),
      });
      expect(sphere).toHaveAccessibleName(/maximally mixed/);
      expect(sphere).toHaveAccessibleName(/no Bloch arrow at all/);
      // It must not claim a definite direction.
      expect(sphere).not.toHaveAccessibleName(/theta \d+ degrees/);
    }
  });

  it("does draw full arrows for a genuine product state", async () => {
    const user = userEvent.setup();
    renderTwoQubit();
    await user.click(screen.getByRole("button", { name: "Product" }));

    expect(isProductState(currentAmplitudes())).toBe(true);
    for (const qubit of [0, 1]) {
      const sphere = screen.getByRole("img", {
        name: new RegExp(`Reduced state of qubit ${qubit}`),
      });
      expect(sphere).not.toHaveAccessibleName(/mixed/);
    }
  });

  it("shrinks the arrow for a partially entangled state", async () => {
    const user = userEvent.setup();
    renderTwoQubit();
    await user.click(screen.getByRole("button", { name: "Partly entangled" }));

    const concurrence = concurrenceTwoQubit(currentAmplitudes());
    expect(concurrence).toBeGreaterThan(0);
    expect(concurrence).toBeLessThan(1);

    const sphere = screen.getByRole("img", { name: /Reduced state of qubit 0/ });
    expect(sphere).toHaveAccessibleName(/mixed state/);
    expect(sphere).toHaveAccessibleName(/per cent of the way to the surface/);
  });
});

describe("building entanglement", () => {
  it("stays a product state under single-qubit gates and entangles under CNOT", async () => {
    const user = userEvent.setup();
    renderTwoQubit();

    await user.click(screen.getByRole("button", { name: "H" }));
    expect(isProductState(currentAmplitudes())).toBe(true);
    expect(currentAmplitudes()).toEqual(tensorProduct(ketPlus(), ket0()));

    await user.click(screen.getByRole("button", { name: "CNOT 0→1" }));
    expect(isProductState(currentAmplitudes())).toBe(false);
    expect(concurrenceTwoQubit(currentAmplitudes())).toBeCloseTo(1, 9);
    expect(currentAmplitudes().map((a) => Number(a.re.toFixed(9)))).toEqual(
      bellPhiPlus().map((a) => Number(a.re.toFixed(9))),
    );
  });

  it("reports the verdict in words, not only on a bar", async () => {
    const user = userEvent.setup();
    renderTwoQubit();

    await user.click(screen.getByRole("button", { name: "Product" }));
    expect(screen.getByText(/Product state — each qubit has a state of its own/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Bell Φ⁺" }));
    expect(
      screen.getByText(/Maximally entangled — neither qubit has a state of its own/),
    ).toBeInTheDocument();
  });

  it("undoes the entangling gate", async () => {
    const user = userEvent.setup();
    renderTwoQubit();

    await user.click(screen.getByRole("button", { name: "H" }));
    await user.click(screen.getByRole("button", { name: "CNOT 0→1" }));
    expect(concurrenceTwoQubit(currentAmplitudes())).toBeCloseTo(1, 9);

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(concurrenceTwoQubit(currentAmplitudes())).toBeCloseTo(0, 9);
  });
});

describe("the correlation table", () => {
  it("gives a Bell pair and a product state the same margins but different cells", async () => {
    const user = userEvent.setup();
    renderTwoQubit();

    await user.click(screen.getByRole("button", { name: "Bell Φ⁺" }));
    const bellTable = screen.getByRole("table");
    expect(within(bellTable).getAllByText("50.0%").length).toBeGreaterThanOrEqual(4);
    expect(within(bellTable).getAllByText("0.0%")).toHaveLength(2);

    expect(screen.getByText(/⟨Z ⊗ Z⟩/)).toHaveTextContent("1.000");
  });

  it("shows anti-correlation for the singlet", async () => {
    const user = userEvent.setup();
    renderTwoQubit();
    await user.click(screen.getByRole("button", { name: "Bell Ψ⁻" }));
    expect(screen.getByText(/⟨Z ⊗ Z⟩/)).toHaveTextContent("-1.000");
  });
});
