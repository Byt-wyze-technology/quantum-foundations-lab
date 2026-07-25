/**
 * Explore-laboratory interaction tests (§15, "Frontend tests").
 *
 * The two-qubit cases in §15 land with Phase 4.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ExplorePanel } from "./ExplorePanel";
import { useLabStore } from "../store/labStore";
import { equivalentUpToGlobalPhase, ket1, ketMinus, probabilities } from "../math";

const renderPanel = () => {
  useLabStore.getState().setInitialState([
    { re: 1, im: 0 },
    { re: 0, im: 0 },
  ]);
  useLabStore.getState().setMeasurementAxis({ theta: 0, phi: 0 });
  return render(<ExplorePanel />);
};

const currentAmplitudes = () => useLabStore.getState().currentState.amplitudes;

describe("canonical state buttons", () => {
  it("update every panel at once", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "|+⟩" }));

    // Bloch sphere description.
    expect(screen.getByRole("img", { name: /Equivalent state: \|\+⟩/ })).toBeInTheDocument();
    // Amplitude bars.
    expect(
      screen.getByRole("img", { name: /Amplitude for basis state 0: magnitude 0\.707/ }),
    ).toBeInTheDocument();
    // Measurement prediction.
    expect(probabilities(currentAmplitudes())[0]).toBeCloseTo(0.5, 9);
  });

  it.each([
    ["|0⟩", { x: 0, y: 0, z: 1 }],
    ["|1⟩", { x: 0, y: 0, z: -1 }],
    ["|−⟩", { x: -1, y: 0, z: 0 }],
    ["|+i⟩", { x: 0, y: 1, z: 0 }],
  ])("place %s correctly on the sphere", async (label) => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: label }));
    expect(
      screen.getByRole("img", { name: new RegExp(`Equivalent state: \\${label[0]}`) }),
    ).toBeInTheDocument();
  });
});

describe("gates", () => {
  it("turns |0⟩ into |1⟩ when X is applied", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "X" }));

    expect(equivalentUpToGlobalPhase(currentAmplitudes(), ket1())).toBe(true);
    expect(screen.getByRole("img", { name: /Equivalent state: \|1⟩/ })).toBeInTheDocument();
  });

  it("turns |0⟩ into an equal superposition when H is applied", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "H" }));

    const probs = probabilities(currentAmplitudes());
    expect(probs[0]).toBeCloseTo(0.5, 9);
    expect(probs[1]).toBeCloseTo(0.5, 9);
    expect(
      screen.getByRole("img", { name: /basis state 0: magnitude 0\.707.*probability 50\.0/ }),
    ).toBeInTheDocument();
  });

  it("records the circuit and undoes the last gate", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "H" }));
    await user.click(screen.getByRole("button", { name: "Z" }));
    expect(useLabStore.getState().circuit).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(useLabStore.getState().circuit).toHaveLength(1);
    expect(probabilities(currentAmplitudes())[0]).toBeCloseTo(0.5, 9);
  });

  it("resets the circuit back to the prepared state", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "H" }));
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(useLabStore.getState().circuit).toHaveLength(0);
    expect(probabilities(currentAmplitudes())[0]).toBeCloseTo(1, 9);
  });
});

describe("phase", () => {
  it("leaves Z-basis probabilities alone but flips the X-basis result", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "|+⟩" }));
    const beforeZ = probabilities(currentAmplitudes());

    await user.click(screen.getByRole("button", { name: "Z" }));
    const afterZ = probabilities(currentAmplitudes());

    expect(afterZ[0]).toBeCloseTo(beforeZ[0]!, 9);
    expect(afterZ[1]).toBeCloseTo(beforeZ[1]!, 9);
    expect(equivalentUpToGlobalPhase(currentAmplitudes(), ketMinus())).toBe(true);

    // Switching to the X basis now predicts the opposite outcome with certainty.
    await user.selectOptions(screen.getByLabelText(/Measurement basis/), "X");
    const distribution = useLabStore.getState();
    expect(distribution.measurementAxis.theta).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe("measurement", () => {
  it("builds a histogram that approaches the expected probabilities", async () => {
    const user = userEvent.setup();
    renderPanel();
    useLabStore.getState().setSeed(4);

    await user.click(screen.getByRole("button", { name: "|+⟩" }));
    useLabStore.getState().setSeed(4);
    await user.click(screen.getByRole("button", { name: "1,000 shots" }));

    const { histogram, totalShots } = useLabStore.getState();
    expect(totalShots).toBe(1000);
    expect(histogram["+1"]! + histogram["−1"]!).toBe(1000);
    expect(Math.abs(histogram["+1"]! / 1000 - 0.5)).toBeLessThan(0.06);
  });

  it("reports a single measurement as one sampled outcome, not a distribution", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "|+⟩" }));
    await user.click(screen.getByRole("button", { name: "Measure once" }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/Single measurement read/);
    expect(status).toHaveTextContent(/measuring it again gives the same answer/);
  });

  it("shows an eigenstate as certain and never offers an impossible outcome", async () => {
    renderPanel();
    const histogram = screen.getByRole("heading", { name: "Statistics" }).closest("section")!;
    expect(within(histogram).getByRole("img", { name: /expected 100\.0 per cent/ })).toBeInTheDocument();
    expect(within(histogram).getByRole("img", { name: /expected 0\.0 per cent/ })).toBeInTheDocument();
  });

  it("clears accumulated shots when the state changes", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "|+⟩" }));
    await user.click(screen.getByRole("button", { name: "100 shots" }));
    expect(useLabStore.getState().totalShots).toBe(100);

    await user.click(screen.getByRole("button", { name: "H" }));
    expect(useLabStore.getState().totalShots).toBe(0);
  });
});

describe("expectation values", () => {
  it("reads +1 along Z for |0⟩ and 0 for |+⟩", async () => {
    const user = userEvent.setup();
    renderPanel();

    const zTile = screen.getByText("⟨Z⟩").closest("div")!;
    expect(within(zTile).getByText("1.000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "|+⟩" }));
    expect(within(screen.getByText("⟨Z⟩").closest("div")!).getByText("0.000")).toBeInTheDocument();
    expect(within(screen.getByText("⟨X⟩").closest("div")!).getByText("1.000")).toBeInTheDocument();
  });
});
