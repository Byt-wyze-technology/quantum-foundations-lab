/**
 * Circuit builder and analytics (§10, §18).
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ExplorePanel } from "../explore/ExplorePanel";
import { clearRecordedEvents, recordedEvents } from "../analytics";
import { useLabStore } from "../store/labStore";
import { concurrenceTwoQubit, isProductState, probabilities } from "../math";

const renderTwoQubit = () => {
  useLabStore.getState().setQubitCount(2);
  return render(<ExplorePanel />);
};

beforeEach(() => clearRecordedEvents());

const dropOnWire = (gate: string, wire: number) => {
  const wires = screen.getAllByText(`Drop a gate on q${wire}`);
  const target = wires[0]!.closest(".builder-wire")!;
  fireEvent.drop(target, { dataTransfer: { getData: () => gate } });
};

describe("placing gates", () => {
  it("applies a gate dropped on a wire", () => {
    renderTwoQubit();
    dropOnWire("H", 0);
    expect(probabilities(useLabStore.getState().currentState.amplitudes)[0]).toBeCloseTo(0.5, 9);
    expect(useLabStore.getState().circuit).toHaveLength(1);
  });

  it("puts a two-qubit gate's control on the wire it was dropped on", () => {
    renderTwoQubit();
    dropOnWire("H", 0);
    dropOnWire("CNOT", 0);
    const circuit = useLabStore.getState().circuit;
    expect(circuit[1]!.gate).toBe("CNOT");
    expect(circuit[1]!.targets).toEqual([0, 1]);
    expect(concurrenceTwoQubit(useLabStore.getState().currentState.amplitudes)).toBeCloseTo(1, 9);
  });

  it("reverses the control when dropped on the second wire", () => {
    renderTwoQubit();
    dropOnWire("CNOT", 1);
    expect(useLabStore.getState().circuit[0]!.targets).toEqual([1, 0]);
  });

  it("can place a selected gate without a pointer", async () => {
    const user = userEvent.setup();
    renderTwoQubit();

    // Double-click selects rather than applies, so the wire buttons light up.
    const palette = screen.getByRole("heading", { name: "Gate palette" }).closest("section")!;
    await user.dblClick(within(palette).getByRole("button", { name: "H" }));

    await user.click(screen.getByRole("button", { name: "Place H on q0" }));
    expect(probabilities(useLabStore.getState().currentState.amplitudes)[0]).toBeCloseTo(0.5, 9);
  });

  it("removes a placed gate", async () => {
    const user = userEvent.setup();
    renderTwoQubit();
    dropOnWire("H", 0);
    dropOnWire("CNOT", 0);
    expect(isProductState(useLabStore.getState().currentState.amplitudes)).toBe(false);

    await user.click(screen.getByRole("button", { name: /Remove step 2, CNOT/ }));
    expect(useLabStore.getState().circuit).toHaveLength(1);
    expect(isProductState(useLabStore.getState().currentState.amplitudes)).toBe(true);
  });
});

describe("step playback", () => {
  it("replays the circuit to an earlier step", () => {
    renderTwoQubit();
    dropOnWire("H", 0);
    dropOnWire("CNOT", 0);
    expect(concurrenceTwoQubit(useLabStore.getState().currentState.amplitudes)).toBeCloseTo(1, 9);

    fireEvent.change(screen.getByLabelText(/Step playback/), { target: { value: "1" } });
    // After only the Hadamard, the pair is still a product state.
    expect(concurrenceTwoQubit(useLabStore.getState().currentState.amplitudes)).toBeCloseTo(0, 9);

    fireEvent.change(screen.getByLabelText(/Step playback/), { target: { value: "0" } });
    expect(probabilities(useLabStore.getState().currentState.amplitudes)[0]).toBeCloseTo(1, 9);
  });

  it("returns to the end of the circuit", () => {
    renderTwoQubit();
    dropOnWire("H", 0);
    dropOnWire("CNOT", 0);
    fireEvent.change(screen.getByLabelText(/Step playback/), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(/Step playback/), { target: { value: "2" } });
    expect(useLabStore.getState().playbackStep).toBeNull();
    expect(concurrenceTwoQubit(useLabStore.getState().currentState.amplitudes)).toBeCloseTo(1, 9);
  });
});

describe("analytics (§18)", () => {
  it("records a gate application without any free-form content", () => {
    renderTwoQubit();
    dropOnWire("H", 0);

    const events = recordedEvents().filter((entry) => entry.event === "gate_applied");
    expect(events).toHaveLength(1);
    expect(events[0]!.properties).toEqual({ gate: "H", qubitCount: 2 });
  });

  it("records a preset selection", async () => {
    const user = userEvent.setup();
    renderTwoQubit();
    await user.click(screen.getByRole("button", { name: "Bell Φ⁺" }));
    expect(recordedEvents().some((entry) => entry.event === "preset_selected")).toBe(true);
  });

  it("never records anything outside the documented property list", () => {
    renderTwoQubit();
    dropOnWire("X", 1);
    const allowed = new Set([
      "sectionId",
      "concept",
      "gate",
      "preset",
      "basis",
      "qubitCount",
      "attempt",
      "correct",
    ]);
    for (const entry of recordedEvents()) {
      for (const key of Object.keys(entry.properties)) {
        expect(allowed, `unexpected property ${key}`).toContain(key);
      }
    }
  });

  it("records elapsed time rather than a wall-clock timestamp", () => {
    renderTwoQubit();
    dropOnWire("Z", 0);
    for (const entry of recordedEvents()) {
      expect(entry.elapsed).toBeLessThan(1_000_000);
      expect(entry).not.toHaveProperty("timestamp");
    }
  });
});
