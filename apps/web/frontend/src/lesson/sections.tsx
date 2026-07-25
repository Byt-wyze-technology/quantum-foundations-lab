/**
 * The guided lesson's sections (§7, §8.1–§8.8).
 *
 * Phase 3 covers the one-qubit path. §8.6 (tensor products), §8.9
 * (entanglement), §8.10 (Bell states) and §8.11 (EPR) join this list in
 * Phases 4 and 5.
 *
 * Mapping to the PRD's lesson numbering:
 *   Lessons 0–1 → §8.1   Lesson 2 → §8.2   Lessons 3–4 → §8.3
 *   Lesson 5   → §8.4   Lesson 6 → §8.5   Lesson 9  → §8.7
 *   Lesson 10  → §8.8
 */

import { ketPlus, qubitFromAngles } from "../math";
import { AmplitudesAndPhase } from "./visuals/AmplitudesAndPhase";
import { ClassicalBitVsQubit } from "./visuals/ClassicalBitVsQubit";
import { MeasurementLab } from "./visuals/MeasurementLab";
import { ObservableLab } from "./visuals/ObservableLab";
import { PauliPlayground } from "./visuals/PauliPlayground";
import { PolarisationAndSpin } from "./visuals/PolarisationAndSpin";
import { UnitaryReversibility } from "./visuals/UnitaryReversibility";
import type { LessonSection } from "./types";

export const LESSON_SECTIONS: LessonSection[] = [
  {
    id: "classical-bit",
    index: 1,
    eyebrow: "THE STARTING POINT",
    title: "Two positions, or every direction.",
    summary:
      "A classical bit is a switch. Reading it tells you which way it was already set. A qubit is not a switch with extra settings — it is a different kind of object, and the difference shows up the moment you try to read one.",
    concept: "classical-bit",
    visual: () => <ClassicalBitVsQubit />,
    equations: [
      {
        latex: "\\left|\\psi\\right\\rangle = \\alpha\\left|0\\right\\rangle + \\beta\\left|1\\right\\rangle",
        gloss:
          "A qubit state is a weighted combination of the two basis states. The weights α and β are complex numbers called amplitudes.",
      },
      {
        latex: "|\\alpha|^2 + |\\beta|^2 = 1",
        gloss:
          "The squared magnitudes are the probabilities of the two outcomes, so they must add to one. This is why the state lives on a sphere rather than anywhere in space.",
      },
    ],
    checkpoints: [
      {
        question: "You prepare |+⟩ and measure it in the Z basis. What do you get?",
        options: [
          {
            label: "0 or 1, with equal probability",
            correct: true,
            response:
              "Right. The measurement gives one of two allowed answers — and for this state each is equally likely.",
          },
          {
            label: "A value halfway between 0 and 1",
            correct: false,
            response:
              "No — the reading is always 0 or 1. What the state controls is how often each one appears, not the value itself.",
          },
          {
            label: "0, because that is what it was really set to",
            correct: false,
            response:
              "No. There is no hidden setting the measurement uncovers; before the measurement the state is genuinely |+⟩, not a secret 0 or 1.",
          },
        ],
      },
    ],
    glossaryTerms: ["Qubit", "Amplitude", "Bloch sphere"],
    misconception: {
      wrong: "A qubit is both 0 and 1 at the same time.",
      right:
        "A qubit can occupy a state whose measurement probabilities are described by amplitudes for 0 and 1.",
    },
    exploreState: ketPlus,
    tone: "plain",
  },

  {
    id: "polarisation-spin",
    index: 2,
    eyebrow: "SOMETHING YOU HAVE SEEN",
    title: "You already own a measuring device.",
    summary:
      "Two polarising filters at right angles block the light between them. Turn one, and the brightness returns. That behaviour follows the same mathematics as a qubit — and dimming the beam far enough shows where the everyday picture runs out.",
    concept: "polarisation",
    visual: () => <PolarisationAndSpin />,
    equations: [
      {
        latex: "P(\\text{pass}) = \\cos^{2}\\theta",
        gloss:
          "For light polarised at an angle θ to the analyser, this is the fraction of the intensity that passes — and, for a single photon, the probability that it passes.",
      },
      {
        latex:
          "\\left|\\theta\\right\\rangle = \\cos\\theta\\left|\\updownarrow\\right\\rangle + \\sin\\theta\\left|\\leftrightarrow\\right\\rangle",
        gloss:
          "Polarisation states combine exactly like qubit states, which is why the same cos²θ appears in both.",
      },
    ],
    checkpoints: [
      {
        question:
          "The analyser is at 45°. You send one photon. What does the detector record?",
        options: [
          {
            label: "Either one full click or nothing, with a 50% chance each",
            correct: true,
            response:
              "Exactly. The intensity halves only once many photons have gone through; each individual photon arrives whole or not at all.",
          },
          {
            label: "A click at half strength",
            correct: false,
            response:
              "No — a photon is not delivered in halves. Half the intensity means half the photons pass, not that each arrives diminished.",
          },
          {
            label: "Nothing, because 45° is between the two allowed directions",
            correct: false,
            response:
              "No. 45° is a perfectly good state to be in; it just makes the two outcomes equally likely.",
          },
        ],
      },
    ],
    glossaryTerms: ["Measurement", "Shot"],
    misconception: {
      wrong: "An electron's spin is a tiny ball turning on its axis.",
      right:
        "Spin is an intrinsic quantum degree of freedom. The arrow represents a state and a measurement orientation, not a small object rotating in space.",
    },
    exploreState: () => qubitFromAngles(Math.PI / 4, 0),
    tone: "warm",
  },

  {
    id: "amplitudes-phase",
    index: 3,
    eyebrow: "WHERE MOST PEOPLE STALL",
    title: "The number that hides, then decides.",
    summary:
      "Each amplitude is a clock hand: a length and an angle. The length sets the odds you can see straight away. The angle — the phase — leaves those odds untouched, and then completely determines a different measurement.",
    concept: "phase",
    visual: () => <AmplitudesAndPhase />,
    equations: [
      {
        latex:
          "\\left|\\psi\\right\\rangle = \\cos\\tfrac{\\theta}{2}\\left|0\\right\\rangle + e^{i\\phi}\\sin\\tfrac{\\theta}{2}\\left|1\\right\\rangle",
        gloss:
          "θ sets how the weight is divided between |0⟩ and |1⟩; φ is the relative phase between them, and turns the state around the vertical axis.",
      },
      {
        latex:
          "\\tfrac{1}{\\sqrt2}(\\left|0\\right\\rangle + \\left|1\\right\\rangle) \\;\\neq\\; \\tfrac{1}{\\sqrt2}(\\left|0\\right\\rangle - \\left|1\\right\\rangle)",
        gloss:
          "|+⟩ and |−⟩ give identical Z-basis probabilities and are still different states. An X-basis measurement tells them apart with complete certainty.",
      },
      {
        latex: "\\left|\\psi\\right\\rangle \\sim e^{i\\gamma}\\left|\\psi\\right\\rangle",
        gloss:
          "Turning every amplitude by the same angle changes nothing measurable. Only phase differences between amplitudes are physical.",
      },
    ],
    checkpoints: [
      {
        question:
          "Two states have exactly the same Z-basis probabilities. Must they be the same state?",
        options: [
          {
            label: "No — they can differ in relative phase",
            correct: true,
            response:
              "Correct. |+⟩ and |−⟩ are the standard example: identical in Z, opposite in X.",
          },
          {
            label: "Yes — probabilities determine the state",
            correct: false,
            response:
              "Not quite. The Z-basis probabilities are one measurement's worth of information; the phase is invisible to that one and decisive for others.",
          },
          {
            label: "Only if both are also normalised",
            correct: false,
            response:
              "Normalisation is not the issue — both states here are normalised and still different.",
          },
        ],
      },
    ],
    glossaryTerms: ["Amplitude", "Relative phase", "Global phase"],
    misconception: {
      wrong: "Phase is a bookkeeping detail you can ignore.",
      right:
        "Global phase is unobservable, but relative phase is physical — it is the whole difference between |+⟩ and |−⟩.",
    },
    exploreState: ketPlus,
    tone: "plain",
  },

  {
    id: "pauli",
    index: 4,
    eyebrow: "WHAT YOU CAN DO TO IT",
    title: "Three turns, and the matrices that name them.",
    summary:
      "Before writing down a single matrix, ask what operations are even available. On a sphere, the simplest are half turns about the three axes. Those three turns are the Pauli operators, and the matrices are just their coordinates.",
    concept: "pauli",
    visual: () => <PauliPlayground />,
    equations: [
      {
        latex: "X = \\begin{pmatrix}0&1\\\\1&0\\end{pmatrix}",
        gloss: "X exchanges |0⟩ and |1⟩ — a half turn about the x-axis.",
      },
      {
        latex: "Y = \\begin{pmatrix}0&-i\\\\i&0\\end{pmatrix}",
        gloss: "Y exchanges them and adds a quarter turn of phase — a half turn about the y-axis.",
      },
      {
        latex: "Z = \\begin{pmatrix}1&0\\\\0&-1\\end{pmatrix}",
        gloss:
          "Z leaves |0⟩ alone and flips the sign of |1⟩ — a half turn about the z-axis, invisible to a Z-basis measurement and obvious to an X-basis one.",
      },
      {
        latex: "X^2 = Y^2 = Z^2 = I",
        gloss: "Applying any Pauli twice returns the state exactly. Each is its own inverse.",
      },
    ],
    checkpoints: [
      {
        question: "You apply Z to |+⟩. What happens to the Z-basis probabilities?",
        options: [
          {
            label: "Nothing — but the state has still changed",
            correct: true,
            response:
              "Right. Z turns |+⟩ into |−⟩. The Z-basis bars do not move; an X-basis measurement flips from certain +1 to certain −1.",
          },
          {
            label: "They swap over",
            correct: false,
            response:
              "That is what X does to |0⟩ and |1⟩. Applied to |+⟩, Z leaves both Z-basis probabilities at 50%.",
          },
          {
            label: "Nothing, because Z does nothing to |+⟩",
            correct: false,
            response:
              "Z certainly acts here — it sends |+⟩ to |−⟩. The change is in relative phase, which the Z basis cannot see.",
          },
        ],
      },
    ],
    glossaryTerms: ["Unitary", "Relative phase"],
    misconception: {
      wrong: "If the probability bars do not move, the gate did nothing.",
      right:
        "A gate can change the relative phase while leaving one basis's probabilities untouched — and another basis will show the difference at once.",
    },
    exploreState: ketPlus,
    tone: "dark",
  },

  {
    id: "unitary",
    index: 5,
    eyebrow: "WHY GATES LOOK THE WAY THEY DO",
    title: "Every move can be unmade.",
    summary:
      "A Rubik's cube has no move you cannot undo. Quantum gates are the same, and not by convention: an operation that lost information would also have to lose probability, and probabilities must always add to one.",
    concept: "unitary",
    visual: () => <UnitaryReversibility />,
    equations: [
      {
        latex: "U^{\\dagger}U = I",
        gloss:
          "The defining property. It says U preserves lengths and angles, so it preserves total probability.",
      },
      {
        latex:
          "\\left\\|U\\left|\\psi\\right\\rangle\\right\\| = \\left\\|\\left|\\psi\\right\\rangle\\right\\| = 1",
        gloss:
          "The state stays on the sphere no matter how many gates you apply. That is what makes the path retraceable.",
      },
    ],
    checkpoints: [
      {
        question:
          "You type a matrix that doubles every amplitude. Why will the laboratory refuse it?",
        options: [
          {
            label: "The probabilities would sum to four, not one",
            correct: true,
            response:
              "Exactly. It fails U†U = I, so it is not a physical operation and is reported rather than applied.",
          },
          {
            label: "Because the entries are too large to display",
            correct: false,
            response: "Size is not the problem — a matrix of large entries can still be unitary.",
          },
          {
            label: "Because doubling is irreversible",
            correct: false,
            response:
              "Doubling is reversible as arithmetic — you could halve it again. What it fails to do is preserve total probability.",
          },
        ],
      },
    ],
    glossaryTerms: ["Unitary"],
    misconception: {
      wrong: "Any matrix can act as a quantum gate.",
      right:
        "Only unitary matrices are gates. Anything else fails to preserve total probability, and this interface will report it instead of applying it.",
    },
    exploreState: ketPlus,
    tone: "plain",
  },

  {
    id: "measurement",
    index: 6,
    eyebrow: "THE PART THAT IS NOT REVERSIBLE",
    title: "Asking a question changes the answer.",
    summary:
      "Every gate so far could be undone. Measurement cannot. It returns one of the device's allowed readings, leaves the system in the matching state, and the smooth arrow you had is gone.",
    concept: "measurement",
    visual: () => <MeasurementLab />,
    equations: [
      {
        latex: "p_k = \\left\\langle\\psi\\right|P_k\\left|\\psi\\right\\rangle",
        gloss: "The probability of outcome k, where P_k projects onto the states giving that reading.",
      },
      {
        latex:
          "\\left|\\psi\\right\\rangle \\rightarrow \\frac{P_k\\left|\\psi\\right\\rangle}{\\sqrt{\\left\\langle\\psi\\right|P_k\\left|\\psi\\right\\rangle}}",
        gloss:
          "After the measurement the system is in the state matching the reading, renormalised. Measure it again the same way and you get the same answer.",
      },
    ],
    checkpoints: [
      {
        question:
          "You measure a qubit in |+⟩ along Z, read 0, then measure it along Z again. What now?",
        options: [
          {
            label: "0, with certainty",
            correct: true,
            response:
              "Right. The first measurement left it in |0⟩. To see 50/50 again you must prepare a fresh |+⟩.",
          },
          {
            label: "0 or 1, 50/50 again",
            correct: false,
            response:
              "That would be true of a freshly prepared |+⟩. This qubit is no longer in |+⟩ — the first measurement changed it.",
          },
          {
            label: "It depends how quickly you measure again",
            correct: false,
            response:
              "Timing plays no part in this ideal model. The state after the first reading is |0⟩, and stays there.",
          },
        ],
      },
    ],
    glossaryTerms: ["Measurement", "Shot", "Expectation value"],
    misconception: {
      wrong: "Measurement reveals the value the qubit secretly had all along.",
      right:
        "Measurement produces one of the allowed readings and leaves the system in the matching state. There was no hidden reading beforehand.",
    },
    exploreState: ketPlus,
    tone: "warm",
  },

  {
    id: "observables",
    index: 7,
    eyebrow: "NAMING THE DEVICE",
    title: "A matrix that is a question, not a move.",
    summary:
      "Gates and observables are both matrices and they do entirely different jobs. A gate is unitary and moves the state. An observable is Hermitian and describes an instrument: what it can read, which states give each reading for certain, and the average over many trials.",
    concept: "observable",
    visual: () => <ObservableLab />,
    equations: [
      {
        latex: "A^{\\dagger} = A",
        gloss:
          "Hermitian. This is what forces every eigenvalue to be real — a device cannot display an imaginary reading.",
      },
      {
        latex:
          "\\left\\langle A\\right\\rangle = \\left\\langle\\psi\\right|A\\left|\\psi\\right\\rangle",
        gloss:
          "The expectation value: the average reading over many repetitions, which need not itself be a reading the device can produce.",
      },
      {
        latex: "(\\Delta A)^2 = \\left\\langle A^2\\right\\rangle - \\left\\langle A\\right\\rangle^2",
        gloss:
          "The variance. It is exactly zero when the state is an eigenvector of A — the one case where the answer is certain in advance.",
      },
    ],
    checkpoints: [
      {
        question: "For the Z observable on |+⟩, ⟨Z⟩ = 0. What does the device display?",
        options: [
          {
            label: "+1 or −1 — never 0",
            correct: true,
            response:
              "Correct. Zero is the average of many trials, not a reading. The eigenvalues ±1 are the only possible displays.",
          },
          {
            label: "0, since that is the expectation value",
            correct: false,
            response:
              "The expectation value is a long-run average. This device has only two eigenvalues, +1 and −1, and 0 is neither.",
          },
          {
            label: "A number between −1 and +1 that varies",
            correct: false,
            response:
              "Individual readings are always eigenvalues. It is the average of them that lands between.",
          },
        ],
      },
    ],
    glossaryTerms: ["Hermitian observable", "Expectation value"],
    misconception: {
      wrong: "The expectation value is what the instrument shows.",
      right:
        "The instrument shows an eigenvalue. The expectation value is the average of many such readings, and often is not one of them.",
    },
    exploreState: () => qubitFromAngles(1.2, 0.6),
    tone: "plain",
  },
];
