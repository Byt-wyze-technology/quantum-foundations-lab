/**
 * The guided lesson's data model (§7).
 *
 * Sections are data, not one monolithic component: each carries its copy, its
 * interactive visual, the mathematics it reveals, the misconception it guards
 * against and the checkpoint that tests it. That makes §20's Phase 3 exit
 * criterion checkable by a test rather than by reading the page.
 */

import type { ReactNode } from "react";

import type { StateVector } from "../math";

export type Concept =
  | "classical-bit"
  | "qubit"
  | "polarisation"
  | "phase"
  | "pauli"
  | "unitary"
  | "tensor"
  | "measurement"
  | "observable"
  | "entanglement"
  | "bell"
  | "epr";

export type EquationBlock = {
  /** KaTeX source. */
  latex: string;
  /** What the equation says, in words — read aloud, and shown beneath it. */
  gloss: string;
};

export type Checkpoint = {
  question: string;
  options: { label: string; correct: boolean; response: string }[];
};

/**
 * A misconception warning. `wrong` is the phrasing to avoid and `right` the
 * phrasing to use; §8.1 requires both to be shown together, because naming
 * only the correction leaves the wrong idea intact.
 */
export type MisconceptionGuard = {
  wrong: string;
  right: string;
};

export type LessonSection = {
  id: string;
  index: number;
  eyebrow: string;
  title: string;
  summary: string;
  concept: Concept;
  /** The interactive visual. Receives nothing; sections own their own state. */
  visual: () => ReactNode;
  equations: EquationBlock[];
  checkpoints: Checkpoint[];
  glossaryTerms: string[];
  misconception: MisconceptionGuard;
  /** State to preload when the learner jumps to Explore from this section. */
  exploreState?: () => StateVector;
  /** Alternating band styling, following the QuasiShor section rhythm. */
  tone?: "plain" | "warm" | "dark";
};
