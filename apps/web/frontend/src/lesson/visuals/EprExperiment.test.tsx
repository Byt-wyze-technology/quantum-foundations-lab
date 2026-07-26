/**
 * EPR panel behaviour (§8.11, §21).
 *
 * The exit criterion for Phase 5 is that the app "accurately displays ideal
 * quantum correlations without implying communication". Both halves of that
 * are asserted here: the correlation curve matches -cos, and no dial movement
 * changes what either observer sees on their own.
 */

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { EprExperiment } from "./EprExperiment";
import {
  CHSH_CLASSICAL_BOUND,
  CHSH_QUANTUM_BOUND,
  bellPsiMinus,
  chshValue,
  correlation,
  marginalProbabilities,
  planarAxis,
  singletCorrelation,
} from "../../math";

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

describe("the correlation it predicts", () => {
  it.each([0, 30, 45, 60, 90, 180])("matches -cos at %i degrees", (degrees) => {
    const value = correlation(bellPsiMinus(), planarAxis(0), planarAxis(toRadians(degrees)));
    expect(value).toBeCloseTo(-Math.cos(toRadians(degrees)), 12);
    expect(value).toBeCloseTo(singletCorrelation(toRadians(degrees)), 12);
  });

  it("shows the predicted correlation for the starting dials", () => {
    render(<EprExperiment />);
    // Alice 0 degrees, Bob 45 degrees: E = -cos(45) = -0.707.
    expect(screen.getByText(/predicted correlation/)).toHaveTextContent("-0.707");
  });

  it("updates the prediction when a dial moves", () => {
    render(<EprExperiment />);
    // jsdom range inputs do not respond to arrow keys, so drive the change
    // directly rather than pretending to be a pointer.
    fireEvent.change(screen.getByLabelText(/Bob's angle/), { target: { value: "90" } });
    // At 90 degrees apart the outcomes are uncorrelated.
    expect(screen.getByText(/predicted correlation/)).toHaveTextContent("0.000");
    expect(screen.getByText(/angle between the dials/)).toHaveTextContent("90°");
  });
});

describe("no signalling (§21)", () => {
  it("keeps both marginals at fifty per cent for every pair of settings", () => {
    for (let alice = -180; alice <= 180; alice += 15) {
      for (let bob = -180; bob <= 180; bob += 15) {
        const marginals = marginalProbabilities(
          bellPsiMinus(),
          planarAxis(toRadians(alice)),
          planarAxis(toRadians(bob)),
        );
        expect(marginals.alice.plus).toBeCloseTo(0.5, 12);
        expect(marginals.bob.plus).toBeCloseTo(0.5, 12);
      }
    }
  });

  it("displays both marginals as fifty per cent", () => {
    render(<EprExperiment />);
    const readout = screen.getByText(/Alice:/);
    expect(readout).toHaveTextContent("50.0%");
    // And the joint table still shows a genuine correlation, so the even
    // marginals are not hiding an uncorrelated state. At 0 and 45 degrees the
    // singlet gives cos^2(22.5)/2 = 42.7% for opposite outcomes and
    // sin^2(22.5)/2 = 7.3% for equal ones.
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("42.7%")).toHaveLength(2);
    expect(within(table).getAllByText("7.3%")).toHaveLength(2);
  });

  it("states in words that nothing is carried between the two sides", () => {
    render(<EprExperiment />);
    expect(
      screen.getByText(/no measurement here can carry anything from one side to the other/),
    ).toBeInTheDocument();
  });
});

describe("the CHSH panel", () => {
  it("starts at the optimal settings and reports a violation", () => {
    render(<EprExperiment />);
    expect(screen.getByText(/\|S\| exceeds 2/)).toBeInTheDocument();
  });

  it("reaches the Tsirelson bound at the optimal settings", () => {
    const value = chshValue(
      bellPsiMinus(),
      planarAxis(0),
      planarAxis(toRadians(90)),
      planarAxis(toRadians(45)),
      planarAxis(toRadians(-45)),
    );
    expect(Math.abs(value)).toBeCloseTo(CHSH_QUANTUM_BOUND, 9);
    expect(Math.abs(value)).toBeGreaterThan(CHSH_CLASSICAL_BOUND);
  });

  it("falls back inside the classical bound when the settings are aligned", async () => {
    const user = userEvent.setup();
    render(<EprExperiment />);
    await user.click(screen.getByRole("button", { name: "All aligned" }));
    expect(screen.getByText(/within the classical bound/)).toBeInTheDocument();
  });

  it("labels itself an ideal theoretical model", () => {
    render(<EprExperiment />);
    expect(screen.getByText(/ideal theoretical model/)).toBeInTheDocument();
    expect(screen.getByText(/detection and locality loopholes/)).toBeInTheDocument();
  });

  it("never claims a signal was sent", () => {
    render(<EprExperiment />);
    expect(screen.queryByText(/faster than light/)).not.toBeInTheDocument();
  });
});

describe("running trials", () => {
  it("accumulates trials and reports an observed correlation", async () => {
    const user = userEvent.setup();
    render(<EprExperiment />);

    // Scoped to the readout: the outcome table has its own "observed" column.
    expect(screen.getByText(/predicted correlation/)).not.toHaveTextContent(/observed/);
    await user.click(screen.getByRole("button", { name: "Run 1,000" }));

    const readout = screen.getByText(/predicted correlation/);
    expect(readout).toHaveTextContent(/observed/);
    expect(readout).toHaveTextContent("1,000 trials");
  });

  it("clears the tally when a dial moves, since the setting has changed", async () => {
    const user = userEvent.setup();
    render(<EprExperiment />);

    await user.click(screen.getByRole("button", { name: "Run 100 pairs" }));
    expect(screen.getByText(/predicted correlation/)).toHaveTextContent("100 trials");

    fireEvent.change(screen.getByLabelText(/Alice's angle/), { target: { value: "30" } });
    expect(screen.getByText(/predicted correlation/)).not.toHaveTextContent("trials");
  });
});
