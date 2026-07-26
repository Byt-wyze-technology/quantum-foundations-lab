/**
 * Phase 3's exit criterion, as a test.
 *
 * §20 requires that "all sections include visual, experiment, mathematics and
 * checkpoint". Reading the page cannot prove that stays true; these assertions
 * can, and they fail the build the moment a section is added without one of
 * the four.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { GLOSSARY } from "../ui/Glossary";
import { norm } from "../math";
import { LessonSectionView } from "./LessonSectionView";
import { LESSON_SECTIONS } from "./sections";

const renderSection = (section: (typeof LESSON_SECTIONS)[number]) =>
  render(
    <MemoryRouter>
      <LessonSectionView section={section} />
    </MemoryRouter>,
  );

describe("lesson structure", () => {
  it("covers the concepts Phases 3 and 4 deliver, in teaching order", () => {
    expect(LESSON_SECTIONS.map((section) => section.concept)).toEqual([
      // Phase 3 — one qubit.
      "classical-bit",
      "polarisation",
      "phase",
      "pauli",
      "unitary",
      "measurement",
      "observable",
      // Phase 4 — two qubits.
      "tensor",
      "entanglement",
      "bell",
    ]);
  });

  it("numbers sections uniquely and in order", () => {
    const ids = LESSON_SECTIONS.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(LESSON_SECTIONS.map((section) => section.index)).toEqual(
      LESSON_SECTIONS.map((_, position) => position + 1),
    );
  });

  it.each(LESSON_SECTIONS.map((section) => [section.id, section] as const))(
    "%s carries copy, mathematics, a misconception guard and a checkpoint",
    (_id, section) => {
      expect(section.eyebrow.trim()).not.toBe("");
      expect(section.title.trim()).not.toBe("");
      expect(section.summary.length).toBeGreaterThan(60);

      // Mathematics: at least one equation, each with a spoken gloss (§16).
      expect(section.equations.length).toBeGreaterThan(0);
      for (const equation of section.equations) {
        expect(equation.latex.trim()).not.toBe("");
        expect(equation.gloss.length).toBeGreaterThan(20);
      }

      // Checkpoint: at least one, with exactly one correct option and a
      // response on every option, right or wrong.
      expect(section.checkpoints.length).toBeGreaterThan(0);
      for (const checkpoint of section.checkpoints) {
        expect(checkpoint.options.length).toBeGreaterThanOrEqual(2);
        expect(checkpoint.options.filter((option) => option.correct)).toHaveLength(1);
        for (const option of checkpoint.options) {
          expect(option.response.length).toBeGreaterThan(20);
        }
      }

      expect(section.misconception.wrong.trim()).not.toBe("");
      expect(section.misconception.right.trim()).not.toBe("");
    },
  );

  it.each(LESSON_SECTIONS.map((section) => [section.id, section] as const))(
    "%s preloads a valid state for the laboratory",
    (_id, section) => {
      expect(section.exploreState).toBeDefined();
      expect(norm(section.exploreState!())).toBeCloseTo(1, 12);
    },
  );

  it("only cites glossary terms that exist", () => {
    const known = new Set(GLOSSARY.map((entry) => entry.term));
    for (const section of LESSON_SECTIONS) {
      for (const term of section.glossaryTerms) {
        expect(known, `${section.id} cites "${term}"`).toContain(term);
      }
    }
  });
});

describe("lesson rendering", () => {
  it.each(LESSON_SECTIONS.map((section) => [section.id, section] as const))(
    "%s renders its visual, mathematics and checkpoint",
    (_id, section) => {
      renderSection(section);

      expect(screen.getByRole("heading", { name: section.title })).toBeInTheDocument();

      // The mathematics is present but behind a disclosure, so the picture
      // arrives first (§1, PRD design philosophy).
      const reveal = screen.getByText("Show the mathematics");
      expect(reveal.closest("details")).not.toHaveAttribute("open");

      expect(screen.getByText("CHECKPOINT")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Try this in the laboratory/ }),
      ).toBeInTheDocument();
      expect(screen.getByText(`“${section.misconception.right}”`)).toBeInTheDocument();
    },
  );

  it("marks a correct checkpoint answer and explains a wrong one", async () => {
    const user = userEvent.setup();
    const section = LESSON_SECTIONS[0]!;
    const { container } = renderSection(section);

    // Scoped to the checkpoint: the visuals carry their own live readouts.
    const card = within(container.querySelector(".quiz-card") as HTMLElement);
    const checkpoint = section.checkpoints[0]!;
    const wrong = checkpoint.options.find((option) => !option.correct)!;
    const right = checkpoint.options.find((option) => option.correct)!;

    await user.click(card.getByRole("button", { name: wrong.label }));
    expect(card.getByRole("status")).toHaveTextContent(wrong.response);
    expect(card.getByRole("button", { name: wrong.label })).toHaveClass("wrong");

    await user.click(card.getByRole("button", { name: right.label }));
    expect(card.getByRole("status")).toHaveTextContent(right.response);
    expect(card.getByRole("button", { name: right.label })).toHaveClass("correct");
  });

  it("reveals the mathematics only when asked", async () => {
    const user = userEvent.setup();
    const section = LESSON_SECTIONS[2]!;
    const { container } = renderSection(section);

    const details = container.querySelector("details.maths-reveal")!;
    expect(details).not.toHaveAttribute("open");

    await user.click(screen.getByText("Show the mathematics"));
    expect(details).toHaveAttribute("open");

    const glosses = within(details as HTMLElement);
    for (const equation of section.equations) {
      expect(glosses.getByText(equation.gloss)).toBeInTheDocument();
    }
  });
});
