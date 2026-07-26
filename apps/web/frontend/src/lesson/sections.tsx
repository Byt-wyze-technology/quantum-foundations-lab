/**
 * The guided lesson's sections (§7, §8.1–§8.11).
 *
 * Phase 3 covers the one-qubit path, Phase 4 adds §8.6 (tensor products),
 * §8.9 (entanglement) and §8.10 (Bell states), and Phase 5 closes with §8.11
 * (EPR and CHSH).
 *
 * Mapping to the PRD's lesson numbering:
 *   Lessons 0–1 → §8.1   Lesson 2 → §8.2   Lessons 3–4 → §8.3
 *   Lesson 5   → §8.4   Lesson 6 → §8.5   Lessons 7–8 → §8.6
 *   Lesson 9   → §8.7   Lesson 10 → §8.8  Lesson 11 → §8.9
 *   Lesson 12  → §8.10  Lesson 13 → §8.11
 */

import { bellPhiPlus, bellPsiMinus, ket0, ketPlus, qubitFromAngles, tensorProduct } from "../math";
import { AmplitudesAndPhase } from "./visuals/AmplitudesAndPhase";
import { BellStateBuilder } from "./visuals/BellStateBuilder";
import { ClassicalBitVsQubit } from "./visuals/ClassicalBitVsQubit";
import { EntanglementComparison } from "./visuals/EntanglementComparison";
import { EprExperiment } from "./visuals/EprExperiment";
import { TensorProductBuilder } from "./visuals/TensorProductBuilder";
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

  {
    id: "tensor",
    index: 8,
    eyebrow: "TWO SYSTEMS, ONE STATE",
    title: "Four numbers where there were two.",
    summary:
      "Add a second qubit and the description does not double — it squares. Two amplitudes each become four joint amplitudes, one for every pairing. That is the tensor product, and doing it once by hand makes the symbol unnecessary.",
    concept: "tensor",
    visual: () => <TensorProductBuilder />,
    equations: [
      {
        latex: "\\left|0\\right\\rangle \\otimes \\left|1\\right\\rangle = \\left|01\\right\\rangle",
        gloss:
          "The left operand is the first qubit. Written as column vectors, (1,0)ᵀ ⊗ (0,1)ᵀ = (0,1,0,0)ᵀ.",
      },
      {
        latex:
          "(\\alpha_0\\left|0\\right\\rangle + \\alpha_1\\left|1\\right\\rangle) \\otimes (\\gamma_0\\left|0\\right\\rangle + \\gamma_1\\left|1\\right\\rangle) = \\alpha_0\\gamma_0\\left|00\\right\\rangle + \\alpha_0\\gamma_1\\left|01\\right\\rangle + \\alpha_1\\gamma_0\\left|10\\right\\rangle + \\alpha_1\\gamma_1\\left|11\\right\\rangle",
        gloss:
          "Every amplitude of the first qubit multiplies every amplitude of the second. Each joint amplitude is one product.",
      },
      {
        latex: "\\dim(\\mathbb{C}^{2} \\otimes \\mathbb{C}^{2}) = 4",
        gloss:
          "n qubits need 2ⁿ amplitudes. That growth is the reason this release stops at two — and the reason simulating many qubits is hard.",
      },
    ],
    checkpoints: [
      {
        question: "How many complex amplitudes describe three qubits?",
        options: [
          {
            label: "Eight",
            correct: true,
            response: "Right — 2³. Each extra qubit doubles the number of joint amplitudes.",
          },
          {
            label: "Six",
            correct: false,
            response:
              "Six would be three qubits with two amplitudes each, kept separate. The joint state has one amplitude per combination of outcomes, so 2 × 2 × 2 = 8.",
          },
          {
            label: "Three",
            correct: false,
            response:
              "That would be one number per qubit. Even a single qubit needs two amplitudes.",
          },
        ],
      },
    ],
    glossaryTerms: ["Tensor product", "Product state"],
    misconception: {
      wrong: "Two qubits are just two Bloch spheres side by side.",
      right:
        "Two qubits share one four-amplitude state. It sometimes factorises into two separate descriptions, and the interesting cases are the ones where it does not.",
    },
    exploreState: () => tensorProduct(ketPlus(), ket0()),
    tone: "plain",
  },

  {
    id: "entanglement",
    index: 9,
    eyebrow: "THE ONE THAT MATTERS",
    title: "A pair with no parts.",
    summary:
      "Some joint states factorise into one description per qubit. Most do not. When a state does not factorise, each qubit on its own is not merely unknown — it has no state of its own to be described, and the Bloch arrow shrinks to nothing to say so.",
    concept: "entanglement",
    visual: () => <EntanglementComparison />,
    equations: [
      {
        latex:
          "\\left|\\Phi^{+}\\right\\rangle = \\tfrac{1}{\\sqrt2}(\\left|00\\right\\rangle + \\left|11\\right\\rangle)",
        gloss:
          "The state cannot be written as one qubit's state tensored with another's. Try it: no choice of four numbers works.",
      },
      {
        latex: "\\rho_A = \\operatorname{Tr}_B\\left|\\psi\\right\\rangle\\!\\left\\langle\\psi\\right| = \\tfrac{I}{2}",
        gloss:
          "Trace out qubit B and what remains for A is the maximally mixed state — the same description you would give a completely unknown qubit.",
      },
      {
        latex: "\\operatorname{Tr}(\\rho_A^{2}) = \\tfrac12",
        gloss:
          "Purity one half, the lowest a single qubit can reach. A product state gives one instead, which is why its Bloch arrow keeps full length.",
      },
    ],
    checkpoints: [
      {
        question:
          "Alice measures her half of a Bell pair and gets 0. Bob's qubit is now certain to give 0 too. Has anything been sent to Bob?",
        options: [
          {
            label: "No — and Bob cannot tell she measured at all",
            correct: true,
            response:
              "Correct. Bob's outcome statistics are identical whether or not Alice measured. The correlation only appears when the two lists of results are later compared, and comparing them needs an ordinary channel.",
          },
          {
            label: "Yes — her measurement changed his qubit instantly",
            correct: false,
            response:
              "Bob's reduced state is I/2 before Alice measures and I/2 after. Nothing he can do reveals whether she measured, so nothing has reached him.",
          },
          {
            label: "Yes, but only one bit",
            correct: false,
            response:
              "Not even one bit. Alice cannot choose her outcome, so she cannot encode anything in it; Bob sees an even split either way.",
          },
        ],
      },
    ],
    glossaryTerms: ["Entanglement", "Product state", "Reduced state", "Purity", "Concurrence"],
    misconception: {
      wrong: "Measuring one entangled qubit sends a signal to the other.",
      right:
        "Neither qubit's own statistics change when the other is measured. What exists is a correlation, visible only once both sets of results are brought together by ordinary means.",
    },
    exploreState: bellPhiPlus,
    tone: "dark",
  },

  {
    id: "bell",
    index: 10,
    eyebrow: "BUILDING ONE",
    title: "Two gates, and the pair exists.",
    summary:
      "Entanglement is not exotic machinery. A Hadamard and a controlled-NOT are enough. Step through the two gates and watch the moment each qubit stops having a state of its own — while the probabilities barely flinch.",
    concept: "bell",
    visual: () => <BellStateBuilder />,
    equations: [
      {
        latex: "\\left|00\\right\\rangle \\xrightarrow{\\;H_0\\;} \\tfrac{1}{\\sqrt2}(\\left|00\\right\\rangle + \\left|10\\right\\rangle)",
        gloss:
          "The Hadamard puts qubit 0 into |+⟩. The pair is still a product state: |+⟩ ⊗ |0⟩.",
      },
      {
        latex:
          "\\tfrac{1}{\\sqrt2}(\\left|00\\right\\rangle + \\left|10\\right\\rangle) \\xrightarrow{\\;\\mathrm{CNOT}\\;} \\tfrac{1}{\\sqrt2}(\\left|00\\right\\rangle + \\left|11\\right\\rangle)",
        gloss:
          "The controlled-NOT flips qubit 1 only in the branch where qubit 0 is 1. One amplitude moves, and the state stops factorising.",
      },
      {
        latex:
          "\\left|\\Phi^{\\pm}\\right\\rangle = \\tfrac{\\left|00\\right\\rangle \\pm \\left|11\\right\\rangle}{\\sqrt2}, \\quad \\left|\\Psi^{\\pm}\\right\\rangle = \\tfrac{\\left|01\\right\\rangle \\pm \\left|10\\right\\rangle}{\\sqrt2}",
        gloss:
          "The four Bell states. They are mutually orthogonal and each is maximally entangled.",
      },
    ],
    checkpoints: [
      {
        question:
          "After the Hadamard but before the CNOT, is the pair entangled?",
        options: [
          {
            label: "No — it is |+⟩ ⊗ |0⟩, a product state",
            correct: true,
            response:
              "Right. Qubit 0 is in a superposition, which is not the same thing as being entangled. Both reduced states are still pure.",
          },
          {
            label: "Yes — qubit 0 is in a superposition",
            correct: false,
            response:
              "Superposition and entanglement are different. A single qubit in |+⟩ is in superposition and perfectly well described on its own.",
          },
          {
            label: "Partly — the concurrence is one half",
            correct: false,
            response:
              "The concurrence is exactly zero at that point. It jumps to one only when the CNOT is applied.",
          },
        ],
      },
    ],
    glossaryTerms: ["Bell state", "Entanglement", "Concurrence"],
    misconception: {
      wrong: "A qubit in superposition is already entangled.",
      right:
        "Superposition describes one qubit; entanglement describes a pair. |+⟩ ⊗ |0⟩ has a superposition in it and no entanglement at all.",
    },
    exploreState: bellPhiPlus,
    tone: "plain",
  },

  {
    id: "epr",
    index: 11,
    eyebrow: "THE ARGUMENT SETTLED",
    title: "Correlations no list of instructions can fake.",
    summary:
      "Einstein, Podolsky and Rosen argued that if measuring here fixes an outcome there, each particle must have carried the answer all along. Bell turned that into a number you can measure. Set the two dials, run the trials, and watch the number go where no such list of answers can follow.",
    concept: "epr",
    visual: () => <EprExperiment />,
    equations: [
      {
        latex:
          "\\left|\\Psi^{-}\\right\\rangle = \\tfrac{1}{\\sqrt2}(\\left|01\\right\\rangle - \\left|10\\right\\rangle)",
        gloss:
          "The singlet. Measured along the same axis, the two outcomes are always opposite, whichever axis is chosen.",
      },
      {
        latex: "E(\\theta) = -\\cos\\theta",
        gloss:
          "The correlation as a function of the angle between the two analysers. A local hidden-variable model can produce a straight line here, but not this curve.",
      },
      {
        latex: "S = E(a,b) + E(a,b') + E(a',b) - E(a',b')",
        gloss:
          "The CHSH combination. Each observer chooses between two settings and the four correlations are combined.",
      },
      {
        latex: "|S| \\leq 2 \\quad \\text{(local hidden variables)}, \\qquad |S|_{\\max} = 2\\sqrt2",
        gloss:
          "Any theory where each particle carries its own answers, uninfluenced by the distant setting, obeys the bound of 2. Quantum mechanics reaches 2√2 ≈ 2.828.",
      },
    ],
    checkpoints: [
      {
        question:
          "Alice turns her dial from 0° to 90°. What changes in the results Bob records at his own detector?",
        options: [
          {
            label: "Nothing — his outcomes stay an even 50/50 split",
            correct: true,
            response:
              "Correct, and this is the whole reason no message can be sent. Bob's own statistics are identical whatever Alice does. The correlation only shows up when the two records are compared afterwards.",
          },
          {
            label: "His outcomes become correlated with hers",
            correct: false,
            response:
              "The correlation is a property of the pairs, not something visible in Bob's list alone. His column is 50/50 before and after; you only see the pattern by lining the two columns up.",
          },
          {
            label: "His outcomes flip to the opposite of hers",
            correct: false,
            response:
              "Bob cannot see which way any of his results 'should' have gone without Alice's list. On its own his record is indistinguishable from fair coin flips.",
          },
        ],
      },
      {
        question: "What does measuring |S| = 2.8 rule out?",
        options: [
          {
            label:
              "Any theory where each particle carries its answers and neither is affected by the distant setting",
            correct: true,
            response:
              "Exactly. That is the local hidden-variable assumption, and |S| ≤ 2 is what it forces. Exceeding 2 rules out the whole class, not one particular model.",
          },
          {
            label: "That the particles are communicating faster than light",
            correct: false,
            response:
              "It rules nothing in. Exceeding the bound shows local hidden variables cannot account for the results; it does not show that anything travels, and the marginals confirm nothing does.",
          },
          {
            label: "That quantum mechanics is incomplete",
            correct: false,
            response:
              "That was the EPR conclusion, and Bell's result points the other way: it is the assumption of pre-existing local answers that has to go.",
          },
        ],
      },
    ],
    glossaryTerms: ["Entanglement", "Bell state", "Measurement"],
    misconception: {
      wrong: "Bell's result proves the particles signal each other faster than light.",
      right:
        "It rules out every theory in which each particle carries its answers locally. Nothing is transmitted: each observer's own statistics are unchanged by the other's choice.",
    },
    exploreState: bellPsiMinus,
    tone: "dark",
  },
];
