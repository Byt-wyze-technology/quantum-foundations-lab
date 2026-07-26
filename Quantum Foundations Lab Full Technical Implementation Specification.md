# Quantum Foundations Lab — Full Technical Implementation Specification

**Status:** In implementation
**Product family:** QuasiShor educational apps
**Primary experience:** Guided lesson + interactive laboratory
**Target platforms:** Modern desktop and tablet browsers
**Initial scope:** One- and two-qubit systems
**Explicit non-goal:** General-purpose quantum simulation

---

## Implementation progress

This document is the source of truth. Section headings carry a status marker,
updated as each section actually lands and its tests pass. Nothing outside this
document gets built; anything that proves necessary is added here as future
work first.

| Marker | Meaning |
| --- | --- |
| ✅ COMPLETE | Implemented, tested, and meeting the section's stated criteria |
| 🟡 PARTIAL | Some deliverables landed; the remainder is named in the section |
| ⬜ NOT STARTED | No implementation yet |

### Phase status (§20)

| Phase | Status | Exit criterion |
| --- | --- | --- |
| 1 — Mathematical core | ✅ COMPLETE | All mathematical invariants pass — 229 tests, ruff and mypy clean |
| 2 — One-qubit Explore lab | ✅ COMPLETE | Met — presets, drag and keyboard construct any pure state; gates and rotations turn it; any measurement axis and shot count measure it. 75 frontend tests |
| 3 — Guided one-qubit lesson | ✅ COMPLETE | Met and enforced by test — all seven sections carry a visual, an experiment, revealable mathematics and a checkpoint. 103 frontend tests, 256 Python tests |
| 4 — Two-qubit system | ✅ COMPLETE | Met — side-by-side product/Bell comparison, reduced states drawn at true arrow length, concurrence indicator and correlation table. 125 frontend tests, 265 Python tests |
| 5 — EPR and Bell correlations | ✅ COMPLETE | Met — E(θ) = −cosθ reproduced exactly, |S| reaches 2√2, and both marginals are pinned at 50% for every pair of settings, which is no-signalling made checkable. 146 frontend tests, 309 Python tests |
| 6 — Open-source release | ⬜ NOT STARTED | Docs, CI, figures and release package |

---

# 1. Product objective

Build a visual teaching application that helps students understand:

* qubits;
* polarisation and spin analogies;
* complex amplitudes and phase;
* Pauli matrices;
* unitary operations;
* tensor products;
* measurement;
* Hermitian observables;
* entanglement;
* EPR pairs;
* Bell states.

The app must follow the same educational pattern as QuasiShor:

[
\text{visual intuition}
\rightarrow
\text{interaction}
\rightarrow
\text{observed pattern}
\rightarrow
\text{formal mathematics}
]

The application must not imply that:

* a Bloch sphere is a literal physical sphere;
* an electron is physically rotating like a classical ball;
* measurement reveals a hidden pre-existing state;
* entanglement permits faster-than-light communication;
* two entangled qubits can be fully represented as two independent Bloch spheres;
* a classical random-number visual is itself a quantum process.

---

# 2. Repository architecture — 🟡 PARTIAL

*Monorepo layout, `pyproject.toml`, `.gitignore` and the `quantum_foundations`
package are in place. `apps/web/frontend`, `apps/web/backend`,
`apps/streamlit`, `scripts/`, `images/` and `docs/` exist as directories and
are populated in Phases 2–6.*

Recommended monorepo layout:

```text
quantum-foundations/
├── apps/
│   ├── web/
│   │   ├── frontend/
│   │   │   ├── src/
│   │   │   ├── public/
│   │   │   └── package.json
│   │   ├── backend/
│   │   │   ├── main.py
│   │   │   ├── routers/
│   │   │   ├── schemas/
│   │   │   └── services/
│   │   └── README.md
│   └── streamlit/
│       └── foundations_lab.py
├── quantum_foundations/
│   ├── core/
│   │   ├── states.py
│   │   ├── gates.py
│   │   ├── tensor.py
│   │   ├── measurement.py
│   │   ├── observables.py
│   │   ├── entanglement.py
│   │   ├── validation.py
│   │   └── types.py
│   ├── lessons/
│   │   ├── content.py
│   │   └── examples.py
│   └── __init__.py
├── tests/
│   ├── core/
│   ├── api/
│   ├── frontend/
│   └── integration/
├── scripts/
│   ├── make_readme_figures.py
│   └── generate_lesson_assets.py
├── images/
├── docs/
├── pyproject.toml
├── package.json
└── README.md
```

The mathematical core must remain independent of:

* React;
* browser rendering;
* FastAPI;
* lesson copy;
* animation timing.

The frontend may reproduce the same mathematics in TypeScript for immediate interaction, but the Python core should remain the reference implementation used for validation and tests.

---

# 3. Technology stack — 🟡 PARTIAL

*Frontend stack in place: React 18, TypeScript, Vite 6, Zustand, React Router,
SVG for diagrams, Canvas for the Bloch sphere, KaTeX, Vitest and React Testing
Library. Playwright is installed; its end-to-end specs are written in Phase 6
when the flows they cover exist. D3 has not been needed. Backend stack
(FastAPI, Pydantic v2) is Phase 6.*

## Frontend

* React
* TypeScript
* Vite
* Zustand or Redux Toolkit for state
* React Router
* SVG for diagrams
* Canvas or WebGL for the Bloch sphere
* D3 only where it adds clear value
* KaTeX for mathematical notation
* Vitest
* React Testing Library
* Playwright for end-to-end tests

## Backend

* Python 3.11+
* FastAPI
* Pydantic v2
* NumPy
* SciPy only when necessary
* pytest
* Hypothesis for property-based tests

## Rendering

Recommended split:

* **SVG:** gates, circuits, state trees, basis diagrams, probability bars
* **Canvas/WebGL:** Bloch sphere and high-frequency animations
* **HTML/CSS:** lesson structure, cards, controls, glossary
* **KaTeX:** matrix and Dirac notation

---

# 4. Mathematical type system — ✅ COMPLETE

*Implemented in `quantum_foundations/core/types.py`. Density matrices are in
the architecture as specified, via `density_matrix`, `partial_trace` and
`purity` in `entanglement.py`.*

All core mathematical objects must have explicit domains.

## Scalar types

[
n\in\mathbb N
]

[
\alpha,\beta,z\in\mathbb C
]

[
p,\theta,\phi\in\mathbb R
]

with:

[
0\leq p\leq1
]

[
0\leq\theta\leq\pi
]

[
0\leq\phi<2\pi
]

## State vector

For (n) qubits:

[
|\psi\rangle\in\mathbb C^{2^n}
]

subject to:

[
\langle\psi|\psi\rangle=1
]

Type:

```python
StateVector = NDArray[np.complex128]
```

## Operator

For (n) qubits:

[
U:\mathbb C^{2^n}\rightarrow\mathbb C^{2^n}
]

represented by:

[
U\in\mathbb C^{2^n\times 2^n}
]

For a unitary operator:

[
U^\dagger U=I
]

## Observable

[
A\in\mathbb C^{2^n\times2^n}
]

with:

[
A^\dagger=A
]

## Density matrix

Include in the internal architecture even if delayed in the lesson:

[
\rho\in\mathbb C^{2^n\times2^n}
]

subject to:

[
\rho^\dagger=\rho
]

[
\rho\succeq0
]

[
\operatorname{Tr}(\rho)=1
]

This becomes important for:

* reduced states;
* mixed states;
* partial trace;
* entangled subsystems;
* measurement updates;
* future noise modules.

---

# 5. Core Python API — ✅ COMPLETE

*Every function listed in §5.1–§5.7 is implemented with the specified
signature. The following helpers were added because other sections of this
document require them; they are recorded here so the document stays the source
of truth:*

* *`states.ket_plus_i` / `ket_minus_i` — the |+i⟩ and |−i⟩ buttons required by §8.1.*
* *`states.bloch_vector` — the `selectBlochVector` selector required by §6. Rejects
  multi-qubit input, so the §21 rule that the Bloch sphere is used only for
  one-qubit pure states is enforced in the core rather than in the UI.*
* *`observables.axis_from_angles` — converts the `{theta, phi}` measurement axis
  of §6 into the Cartesian unit vector `spin_observable` takes.*
* *`gates.NAMED_GATES`, `PARAMETRIC_GATES`, `gate_matrix`, `gate_qubit_count` —
  gate-name resolution for the `{"name": "H", "targets": [0]}` payload of §11
  and the gate palette of §9.*
* *`entanglement.BELL_STATES` — the named-preset registry used by §9 and the
  `"state": "psi_minus"` field of §11.*
* *`entanglement.schmidt_coefficients` — lets §8.9 show how far a state is from
  being a product state, not merely whether it is one.*

## 5.1 `types.py` — ✅ COMPLETE

```python
from typing import TypeAlias

import numpy as np
from numpy.typing import NDArray

ComplexVector: TypeAlias = NDArray[np.complex128]
ComplexMatrix: TypeAlias = NDArray[np.complex128]
RealVector: TypeAlias = NDArray[np.float64]
```

Optional dataclasses:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class QubitAngles:
    theta: float
    phi: float

@dataclass(frozen=True)
class MeasurementOutcome:
    eigenvalue: float
    probability: float
    state: ComplexVector
```

---

## 5.2 `states.py` — ✅ COMPLETE

Required functions:

```python
def ket0() -> ComplexVector: ...
def ket1() -> ComplexVector: ...
def ket_plus() -> ComplexVector: ...
def ket_minus() -> ComplexVector: ...

def normalize_state(state: ComplexVector) -> ComplexVector: ...
def validate_state(state: ComplexVector, *, atol: float = 1e-10) -> None: ...

def qubit_from_angles(theta: float, phi: float) -> ComplexVector: ...
def angles_from_qubit(state: ComplexVector) -> QubitAngles: ...

def probabilities(state: ComplexVector) -> RealVector: ...
def global_phase_align(reference: ComplexVector, state: ComplexVector) -> ComplexVector: ...
def equivalent_up_to_global_phase(
    left: ComplexVector,
    right: ComplexVector,
    *,
    atol: float = 1e-10,
) -> bool: ...
```

Qubit parameterisation:

[
|\psi\rangle
============

\cos\left(\frac{\theta}{2}\right)|0\rangle
+
e^{i\phi}
\sin\left(\frac{\theta}{2}\right)|1\rangle
]

Important teaching rule:

The UI must explain that global phase is not observable:

[
|\psi\rangle
\sim
e^{i\gamma}|\psi\rangle
]

---

## 5.3 `gates.py` — ✅ COMPLETE

Constants:

```python
I
X
Y
Z
H
S
SDG
T
TDG
CNOT
CZ
SWAP
```

Constructors:

```python
def rx(theta: float) -> ComplexMatrix: ...
def ry(theta: float) -> ComplexMatrix: ...
def rz(theta: float) -> ComplexMatrix: ...
def phase(phi: float) -> ComplexMatrix: ...

def controlled(unitary: ComplexMatrix) -> ComplexMatrix: ...
def apply_gate(
    state: ComplexVector,
    gate: ComplexMatrix,
    targets: tuple[int, ...],
    *,
    qubit_count: int,
) -> ComplexVector: ...
```

Pauli matrices:

[
X=
\begin{pmatrix}
0&1\
1&0
\end{pmatrix}
]

[
Y=
\begin{pmatrix}
0&-i\
i&0
\end{pmatrix}
]

[
Z=
\begin{pmatrix}
1&0\
0&-1
\end{pmatrix}
]

Hadamard:

[
H=
\frac{1}{\sqrt2}
\begin{pmatrix}
1&1\
1&-1
\end{pmatrix}
]

Unitary validation:

```python
def is_unitary(matrix: ComplexMatrix, *, atol: float = 1e-10) -> bool: ...
```

---

## 5.4 `tensor.py` — ✅ COMPLETE

```python
def tensor_product(*objects: ComplexVector | ComplexMatrix) -> ComplexVector | ComplexMatrix:
    ...

def computational_basis_state(bits: str) -> ComplexVector:
    ...

def basis_labels(qubit_count: int) -> list[str]:
    ...

def reshape_state_for_subsystems(
    state: ComplexVector,
    left_qubits: int,
) -> ComplexMatrix:
    ...
```

Examples:

[
|0\rangle\otimes|1\rangle=|01\rangle
]

[
\begin{pmatrix}1\0\end{pmatrix}
\otimes
\begin{pmatrix}0\1\end{pmatrix}
===============================

\begin{pmatrix}0\1\0\0\end{pmatrix}
]

The codebase must define and document qubit ordering.

Recommended convention:

* basis labels are written (q_0q_1\cdots q_{n-1});
* (q_0) is the most significant displayed bit;
* internal Kronecker-product ordering must match this convention.

---

## 5.5 `measurement.py` — ✅ COMPLETE

Projective measurement in the computational basis:

```python
def measure_computational(
    state: ComplexVector,
    *,
    rng: np.random.Generator,
) -> MeasurementOutcome:
    ...
```

Measurement of a single qubit inside a multi-qubit system:

```python
def measure_qubit(
    state: ComplexVector,
    qubit: int,
    *,
    qubit_count: int,
    rng: np.random.Generator,
) -> MeasurementOutcome:
    ...
```

Repeated shots:

```python
def sample_measurements(
    state: ComplexVector,
    shots: int,
    *,
    rng: np.random.Generator,
) -> dict[str, int]:
    ...
```

State update:

[
|\psi\rangle
\rightarrow
\frac{P_k|\psi\rangle}
{\sqrt{\langle\psi|P_k|\psi\rangle}}
]

with outcome probability:

[
p_k=
\langle\psi|P_k|\psi\rangle
]

The UI must distinguish:

* probability distribution before measurement;
* one sampled outcome;
* the post-measurement state;
* repeated independent preparations and measurements.

It must not animate one physical qubit as if it can be measured repeatedly without being re-prepared.

---

## 5.6 `observables.py` — ✅ COMPLETE

```python
def is_hermitian(matrix: ComplexMatrix, *, atol: float = 1e-10) -> bool: ...

def eigensystem(observable: ComplexMatrix) -> tuple[RealVector, ComplexMatrix]:
    ...

def expectation_value(
    state: ComplexVector,
    observable: ComplexMatrix,
) -> float:
    ...

def variance(
    state: ComplexVector,
    observable: ComplexMatrix,
) -> float:
    ...

def projective_measurement_distribution(
    state: ComplexVector,
    observable: ComplexMatrix,
) -> list[MeasurementOutcome]:
    ...
```

Expectation:

[
\langle A\rangle
================

\langle\psi|A|\psi\rangle
]

Variance:

[
(\Delta A)^2
============

\langle A^2\rangle-\langle A\rangle^2
]

The first release should focus visually on:

* (X);
* (Y);
* (Z);
* arbitrary spin axes.

Arbitrary spin observable:

[
\sigma_{\mathbf n}
==================

n_xX+n_yY+n_zZ
]

where:

[
\mathbf n\in\mathbb R^3,\qquad |\mathbf n|=1
]

---

## 5.7 `entanglement.py` — ✅ COMPLETE

Bell states:

[
|\Phi^+\rangle
==============

\frac{|00\rangle+|11\rangle}{\sqrt2}
]

[
|\Phi^-\rangle
==============

\frac{|00\rangle-|11\rangle}{\sqrt2}
]

[
|\Psi^+\rangle
==============

\frac{|01\rangle+|10\rangle}{\sqrt2}
]

[
|\Psi^-\rangle
==============

\frac{|01\rangle-|10\rangle}{\sqrt2}
]

Required functions:

```python
def bell_phi_plus() -> ComplexVector: ...
def bell_phi_minus() -> ComplexVector: ...
def bell_psi_plus() -> ComplexVector: ...
def bell_psi_minus() -> ComplexVector: ...

def density_matrix(state: ComplexVector) -> ComplexMatrix: ...

def partial_trace(
    rho: ComplexMatrix,
    *,
    keep: tuple[int, ...],
    qubit_count: int,
) -> ComplexMatrix:
    ...

def reduced_density_matrix(
    state: ComplexVector,
    *,
    keep: tuple[int, ...],
    qubit_count: int,
) -> ComplexMatrix:
    ...

def purity(rho: ComplexMatrix) -> float: ...

def concurrence_two_qubit(state: ComplexVector) -> float: ...

def is_product_state(
    state: ComplexVector,
    *,
    atol: float = 1e-10,
) -> bool:
    ...
```

For a pure one-qubit state:

[
\operatorname{Tr}(\rho^2)=1
]

For one subsystem of a Bell pair:

[
\rho_A=\frac{I}{2}
]

and:

[
\operatorname{Tr}(\rho_A^2)=\frac12
]

This provides a rigorous visual explanation of why neither entangled subsystem has its own pure Bloch-sphere arrow.

---

# 6. Frontend state model — ✅ COMPLETE

*Implemented in `apps/web/frontend/src/store/labStore.ts` with every field,
action and selector listed below. `currentState` is derived by replaying the
circuit from `initialState`, so the displayed state can never disagree with the
displayed circuit.*

Recommended Zustand store:

```ts
type Complex = {
  re: number;
  im: number;
};

type QuantumState = {
  qubitCount: 1 | 2;
  amplitudes: Complex[];
};

type GateOperation = {
  id: string;
  gate: GateName;
  targets: number[];
  controls?: number[];
  parameters?: Record<string, number>;
};

type MeasurementRecord = {
  basis: "X" | "Y" | "Z" | "custom";
  outcome: string;
  probability: number;
  timestamp: number;
};

type LabState = {
  initialState: QuantumState;
  currentState: QuantumState;
  circuit: GateOperation[];
  measurementAxis: {
    theta: number;
    phi: number;
  };
  shots: number;
  histogram: Record<string, number>;
  selectedLesson: string;
  animationSpeed: number;
};
```

Required actions:

```ts
setInitialState()
applyGate()
undoGate()
resetCircuit()
setMeasurementAxis()
runSingleMeasurement()
runShots()
setQubitCount()
loadPreset()
```

Derived selectors:

```ts
selectProbabilities()
selectBlochVector()
selectReducedBlochVectors()
selectStatePurity()
selectEntanglementMeasure()
selectExpectationValues()
```

---

# 7. Guided lesson implementation — ✅ COMPLETE

*Implemented as data-driven sections in `apps/web/frontend/src/lesson/`. The
`LessonSection` type carries every field below, and `sections.test.tsx`
asserts that each section supplies introductory copy, a live visual,
revealable mathematics, a misconception guard, a knowledge check and a link
into Explore with the state preloaded — so Phase 3's exit criterion is checked
by the suite rather than by reading the page. The canonical section spine also
lives in `quantum_foundations/lessons/content.py`, and
`tests/integration/test_lesson_consistency.py` fails if the two drift apart.*

The guided lesson should be implemented as data-driven sections rather than one monolithic component.

## Lesson schema

```ts
type LessonSection = {
  id: string;
  index: number;
  eyebrow: string;
  title: string;
  summary: string;
  concept:
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
  visual: VisualSpec;
  equations: EquationBlock[];
  checkpoints: Checkpoint[];
  glossaryTerms: string[];
};
```

Each section should support:

* introductory copy;
* live interactive visual;
* revealable formal mathematics;
* one misconception warning;
* one short knowledge check;
* a link to Explore mode with the current state preloaded.

---

# 8. Detailed lesson modules — ✅ COMPLETE

*All eleven modules are implemented: the one-qubit path in Phase 3, tensor
products, entanglement and the Bell-state builder in Phase 4, and EPR with
CHSH in Phase 5.*

## 8.1 Classical bit versus qubit — ✅ COMPLETE

### Visual

A split panel:

* left: binary switch;
* right: Bloch sphere.

### Interaction

* toggle classical bit;
* drag qubit state;
* click standard states.

### Standard state buttons

```text
|0⟩
|1⟩
|+⟩
|−⟩
|+i⟩
|−i⟩
```

### Learning statement

A qubit state may be a superposition, but a measurement in a chosen basis produces one allowed outcome.

### Misconception guard

Do not say:

> “A qubit is both 0 and 1.”

Use:

> “A qubit can occupy a state whose measurement probabilities are described by amplitudes for 0 and 1.”

---

## 8.2 Polarisation and spin — ✅ COMPLETE

### Polarisation visual

* photon/light-path illustration;
* rotatable analyser;
* intensity display;
* repeated single-photon detections.

For linear polarisation:

[
P(\text{pass})=\cos^2(\theta)
]

The visual must distinguish:

* classical beam intensity;
* single-photon detection probability.

### Spin visual

* Stern–Gerlach-style axis selector;
* input state;
* two output channels;
* repeated trial histogram.

Misconception guard:

Electron spin is not shown as a literal spinning ball.

Label:

> “Spin is an intrinsic quantum degree of freedom. The arrow represents a state and measurement orientation, not a tiny object rotating in space.”

---

## 8.3 Amplitudes and phase — ✅ COMPLETE

### Visual components

* amplitude magnitude sliders;
* phase dial;
* two rotating phasors;
* Bloch sphere;
* measurement probabilities.

State:

[
|\psi\rangle
============

\alpha|0\rangle+\beta|1\rangle
]

Constraint:

[
|\alpha|^2+|\beta|^2=1
]

### Interaction

Changing relative phase should rotate the state around the Bloch sphere without changing (Z)-basis probabilities.

This is a crucial teaching moment:

[
\frac{|0\rangle+|1\rangle}{\sqrt2}
]

and:

[
\frac{|0\rangle-|1\rangle}{\sqrt2}
]

have identical computational-basis probabilities but differ under (X)-basis measurement.

---

## 8.4 Pauli matrices — ✅ COMPLETE

Each Pauli operator gets:

* button;
* sphere animation;
* before/after state;
* matrix;
* basis-state mapping;
* reversible “apply again” demonstration.

### (X)

[
X|0\rangle=|1\rangle
]

[
X|1\rangle=|0\rangle
]

Geometric interpretation: rotation by (\pi) about the (x)-axis, up to global phase.

### (Y)

Geometric interpretation: rotation by (\pi) about the (y)-axis, up to global phase.

### (Z)

[
Z|0\rangle=|0\rangle
]

[
Z|1\rangle=-|1\rangle
]

The visual must show that (Z) changes relative phase even when computational probabilities remain unchanged.

---

## 8.5 Unitary matrices — ✅ COMPLETE

### Visual

* reversible state transformation;
* trail from initial to final point;
* inverse button;
* determinant/orthogonality hidden under “show maths”.

### Core rule

[
U^\dagger U=I
]

### Interactive matrix builder

Allow students to choose from valid gates initially.

Later, an advanced panel may allow direct matrix editing.

When the matrix is non-unitary:

```text
This matrix does not preserve total probability.
```

Do not apply it as a valid quantum gate.

---

## 8.6 Tensor products — ✅ COMPLETE

### Visual progression

```text
one two-state system
×
one two-state system
=
one four-amplitude joint state
```

Use:

* basis tiles;
* amplitude bars;
* animated Cartesian expansion.

Example:

[
(\alpha|0\rangle+\beta|1\rangle)
\otimes
(\gamma|0\rangle+\delta|1\rangle)
]

expands to:

[
\alpha\gamma|00\rangle
+
\alpha\delta|01\rangle
+
\beta\gamma|10\rangle
+
\beta\delta|11\rangle
]

### Interaction

Students drag two one-qubit states and watch the four joint amplitudes update.

---

## 8.7 Measurement — ✅ COMPLETE

### Required views

* pre-measurement amplitudes;
* probabilities;
* selected measurement basis;
* sampled outcome;
* collapsed state;
* repeated-shot histogram.

### Measurement modes

* Z basis;
* X basis;
* Y basis;
* arbitrary axis.

### Repeat controls

```text
Measure once
10 shots
100 shots
1,000 shots
Reset
```

Each batch must represent fresh preparations of the same initial state.

---

## 8.8 Hermitian observables — ✅ COMPLETE

### Visual metaphor

A measurement device defines:

* possible readouts;
* corresponding states;
* expected average over many trials.

### Display

For selected observable (A):

* matrix;
* eigenvalues;
* eigenvectors;
* probability of each outcome;
* expectation value;
* variance.

For (Z):

[
Z|0\rangle=+|0\rangle
]

[
Z|1\rangle=-|1\rangle
]

Possible outcomes:

[
+1,\quad -1
]

---

## 8.9 Entanglement — ✅ COMPLETE

### Product-state comparison

Show:

[
|+\rangle\otimes|0\rangle
]

next to:

[
|\Phi^+\rangle
==============

\frac{|00\rangle+|11\rangle}{\sqrt2}
]

Panels:

* four joint amplitudes;
* joint probabilities;
* reduced state of qubit A;
* reduced state of qubit B;
* purity;
* correlation table.

### Interaction

Try to reconstruct the Bell state from two independent one-qubit sliders.

The app should show:

```text
No pair of independent single-qubit states can reproduce these amplitudes.
```

This is more rigorous than saying the particles are merely “linked”.

---

## 8.10 Bell-state builder — ✅ COMPLETE

Circuit:

```text
|0⟩ ──H──●──
         │
|0⟩ ─────X──
```

Step-by-step state:

[
|00\rangle
]

[
\frac{|00\rangle+|10\rangle}{\sqrt2}
]

[
\frac{|00\rangle+|11\rangle}{\sqrt2}
]

At each step update:

* circuit;
* amplitude bars;
* probability bars;
* reduced states;
* entanglement indicator.

---

## 8.11 EPR and Bell correlations — ✅ COMPLETE

The first release should teach EPR correlations without claiming to provide a full loophole-free Bell-test simulation.

### Layout

* Alice on the left;
* Bob on the right;
* source in the centre;
* independent angle selectors;
* trial counter;
* outcome table;
* correlation curve.

### State

Use the singlet:

[
|\Psi^-\rangle
==============

\frac{|01\rangle-|10\rangle}{\sqrt2}
]

For measurement axes separated by angle (\theta):

[
E(\theta)=-\cos\theta
]

### CHSH advanced panel

Settings:

[
a,\quad a',\quad b,\quad b'
]

Compute:

[
S=
E(a,b)+E(a,b')+E(a',b)-E(a',b')
]

Classical local-hidden-variable bound:

[
|S|\leq2
]

Quantum maximum:

[
2\sqrt2
]

The simulation must label this as an ideal theoretical model.

---

# 9. Explore laboratory — ✅ COMPLETE

*Both modes are built. One-qubit mode has all six panels, the gate palette,
rotation gates, measurement basis and arbitrary axis, and shot batches.
Two-qubit mode has all seven panels, the two-qubit gate palette and every
preset listed below. Undo, reset, seed and share-state links are shared.*

## Main controls

* qubit count: 1 or 2;
* starting state;
* gate palette;
* circuit depth;
* measurement basis;
* measurement axis;
* number of shots;
* animation speed;
* reset;
* undo;
* share state.

## Primary panels

### One-qubit mode

1. Bloch sphere
2. State amplitudes
3. Probability bars
4. Current matrix
5. Circuit history
6. Measurement histogram

### Two-qubit mode

1. Joint amplitude chart
2. Joint probability chart
3. Circuit
4. Reduced-state panels
5. Correlation matrix
6. Entanglement indicator
7. Measurement histogram

## Presets

```text
|0⟩
|1⟩
|+⟩
|−⟩
Random pure qubit
Bell Φ+
Bell Φ−
Bell Ψ+
Bell Ψ−
Product state
Partially entangled state
```

---

# 10. Visual components — 🟡 PARTIAL

*Implemented: `BlochSphere`, `AmplitudePhasor`, `AmplitudeBars`,
`StateEquation`, `MeasurementHistogram` and `DensityMatrixHeatmap`, plus
`ReducedStatePanel`, `CorrelationTable` and `EntanglementIndicator` (added
because §8.9 and §9 require those panels by name).*

*`BlochSphere` gained a `mixedVector` prop taking Bloch coordinates from a
reduced density matrix. The arrow is then drawn at its true length — short for
a mixed state, absent for half a Bell pair — which is how §21's rule against
depicting entangled qubits as independent pure states is kept visually rather
than by refusing to draw anything.*

*Outstanding: `CircuitBuilder` currently ships as the linear `CircuitHistory`
with click-to-apply gates and undo. Drag-and-drop placement and step playback
remain, and are scheduled for Phase 6.*

## `BlochSphere`

Props:

```ts
type BlochSphereProps = {
  state: QuantumState;
  interactive: boolean;
  showAxes: boolean;
  showPhaseArc: boolean;
  measurementAxis?: SphericalAxis;
  onStateChange?: (state: QuantumState) => void;
};
```

Features:

* drag orbit;
* drag state vector;
* snap to canonical states;
* accessible keyboard controls;
* tooltip for (\theta) and (\phi);
* optional measurement axis;
* animated gate rotations.

## `AmplitudePhasor`

Shows complex amplitude as:

* radius = magnitude;
* angle = phase.

## `AmplitudeBars`

Each basis state gets:

* magnitude bar;
* phase colour;
* numeric amplitude;
* probability.

Avoid using height alone to encode signed or complex amplitude.

## `StateEquation`

Renders:

[
|\psi\rangle
============

\sum_x \alpha_x|x\rangle
]

and updates live.

## `CircuitBuilder`

Supports:

* drag-and-drop gates;
* single-qubit gates;
* CNOT;
* undo;
* step playback;
* state inspection after every layer.

## `MeasurementHistogram`

Shows:

* expected probability;
* observed shot count;
* uncertainty indicator for finite sampling.

## `DensityMatrixHeatmap`

Advanced panel:

* magnitude;
* phase;
* diagonal probabilities;
* off-diagonal coherence.

---

# 11. API design — ⬜ NOT STARTED

The app can run locally in the browser, but a backend provides reproducibility, validation and export.

## `POST /api/state/validate`

Request:

```json
{
  "amplitudes": [
    {"re": 0.70710678, "im": 0},
    {"re": 0.70710678, "im": 0}
  ]
}
```

Response:

```json
{
  "valid": true,
  "norm": 0.999999999,
  "qubit_count": 1
}
```

## `POST /api/gates/apply`

Request:

```json
{
  "state": {
    "qubit_count": 1,
    "amplitudes": [
      {"re": 1, "im": 0},
      {"re": 0, "im": 0}
    ]
  },
  "gate": {
    "name": "H",
    "targets": [0]
  }
}
```

## `POST /api/measurement/sample`

Request:

```json
{
  "state": {
    "qubit_count": 1,
    "amplitudes": [
      {"re": 0.70710678, "im": 0},
      {"re": 0.70710678, "im": 0}
    ]
  },
  "basis": "Z",
  "shots": 1000,
  "seed": 42
}
```

## `POST /api/entanglement/analyse`

Response:

```json
{
  "is_product_state": false,
  "concurrence": 1.0,
  "reduced_purity_a": 0.5,
  "reduced_purity_b": 0.5
}
```

## `POST /api/bell/chsh`

Request:

```json
{
  "state": "psi_minus",
  "angles": {
    "a": 0,
    "a_prime": 1.57079632679,
    "b": 0.78539816339,
    "b_prime": -0.78539816339
  },
  "shots": 10000,
  "seed": 123
}
```

---

# 12. Data serialization — ⬜ NOT STARTED

Complex numbers:

```json
{
  "re": 0.5,
  "im": -0.5
}
```

Never serialize complex values as ambiguous strings such as:

```text
"0.5-0.5j"
```

Quantum state:

```json
{
  "qubit_count": 2,
  "basis_order": ["00", "01", "10", "11"],
  "amplitudes": [
    {"re": 0.70710678, "im": 0},
    {"re": 0, "im": 0},
    {"re": 0, "im": 0},
    {"re": 0.70710678, "im": 0}
  ]
}
```

---

# 13. Validation rules — ✅ COMPLETE

Reject:

* non-power-of-two state lengths;
* empty states;
* non-finite numbers;
* incorrectly shaped matrices;
* non-normalised states, unless explicitly requesting normalisation;
* non-unitary gates;
* non-Hermitian observables;
* invalid target indices;
* duplicate gate targets;
* shot counts below 1;
* unsupported qubit counts.

Error example:

```json
{
  "code": "NON_UNITARY_OPERATOR",
  "message": "The supplied matrix does not satisfy U†U = I within tolerance.",
  "details": {
    "residual_norm": 0.031
  }
}
```

---

# 14. Numerical tolerances — ✅ COMPLETE

Recommended defaults:

```python
NORMALIZATION_ATOL = 1e-10
UNITARY_ATOL = 1e-10
HERMITIAN_ATOL = 1e-10
PROBABILITY_ATOL = 1e-12
```

Before sampling, probabilities may be clipped only for numerical residue:

```python
probabilities = np.clip(probabilities, 0.0, 1.0)
probabilities /= probabilities.sum()
```

This must not conceal materially invalid states.

---

# 15. Test plan — 🟡 PARTIAL

## Core unit tests — ✅ COMPLETE

### State normalisation

```python
def test_qubit_from_angles_is_normalized():
    state = qubit_from_angles(theta=np.pi / 3, phi=np.pi / 5)
    assert np.isclose(np.vdot(state, state), 1.0)
```

### Global phase

```python
def test_global_phase_does_not_change_physical_state():
    psi = ket_plus()
    shifted = np.exp(1j * 0.7) * psi
    assert equivalent_up_to_global_phase(psi, shifted)
```

### Pauli behaviour

```python
def test_x_swaps_computational_basis_states():
    assert np.allclose(X @ ket0(), ket1())
    assert np.allclose(X @ ket1(), ket0())
```

### Unitarity

```python
@pytest.mark.parametrize("gate", [I, X, Y, Z, H, S, T])
def test_standard_gates_are_unitary(gate):
    assert is_unitary(gate)
```

### Tensor ordering

```python
def test_tensor_product_basis_order():
    state = tensor_product(ket0(), ket1())
    expected = computational_basis_state("01")
    assert np.allclose(state, expected)
```

### Measurement probabilities

```python
def test_plus_state_has_equal_z_probabilities():
    probs = probabilities(ket_plus())
    assert np.allclose(probs, [0.5, 0.5])
```

### Bell pair

```python
def test_phi_plus_has_expected_joint_probabilities():
    probs = probabilities(bell_phi_plus())
    assert np.allclose(probs, [0.5, 0.0, 0.0, 0.5])
```

### Reduced state

```python
def test_bell_subsystem_is_maximally_mixed():
    rho_a = reduced_density_matrix(
        bell_phi_plus(),
        keep=(0,),
        qubit_count=2,
    )
    assert np.allclose(rho_a, np.eye(2) / 2)
```

### Entanglement

```python
def test_bell_state_is_not_product_state():
    assert not is_product_state(bell_phi_plus())
    assert np.isclose(concurrence_two_qubit(bell_phi_plus()), 1.0)
```

### Product state

```python
def test_tensor_product_is_product_state():
    psi = tensor_product(ket_plus(), ket0())
    assert is_product_state(psi)
```

### Hermitian observable

```python
def test_pauli_z_is_hermitian():
    assert is_hermitian(Z)
```

### Expectation value

```python
def test_z_expectation_for_zero_state():
    assert np.isclose(expectation_value(ket0(), Z), 1.0)
```

---

## Property-based tests — ✅ COMPLETE

Use Hypothesis to generate:

* random normalised one-qubit states;
* random unitary matrices;
* random tensor-product states;
* random measurement axes.

Properties:

[
|U|\psi\rangle|=1
]

[
\sum_i p_i=1
]

[
\operatorname{Tr}(\rho)=1
]

[
\operatorname{Tr}(\rho_A)=1
]

[
0\leq\operatorname{purity}(\rho)\leq1
]

---

## Frontend tests — ✅ COMPLETE

*Every case below passes, including the two-qubit and Bell-state cases and
the check that entangled states are never shown as independent pure Bloch
vectors — asserted on the accessible description, which is the text a screen
reader announces.*

Verify:

* canonical-state buttons update all panels;
* applying (X) to (|0\rangle) displays (|1\rangle);
* applying (H) to (|0\rangle) displays equal probabilities;
* phase changes affect the (X)-basis result;
* measurement histogram converges approximately to expected values;
* two-qubit mode shows four basis states;
* Bell preset shows only `00` and `11` probabilities;
* entangled states do not show independent pure Bloch vectors;
* lesson copy never says “both 0 and 1” without qualification;
* no interface claims entanglement sends information.

---

## End-to-end tests — ⬜ NOT STARTED

### Bell-state lesson

1. Load (|00\rangle).
2. Apply (H) to qubit 0.
3. Apply CNOT.
4. Verify displayed state is (|\Phi^+\rangle).
5. Measure 1,000 shots.
6. Verify only `00` and `11` appear.
7. Verify both are within tolerance of 50%.

### Phase lesson

1. Load (|+\rangle).
2. Apply (Z).
3. Verify computational probabilities remain equal.
4. Switch to (X)-basis measurement.
5. Verify outcome changes from `+` to `−`.

---

# 16. Accessibility — 🟡 PARTIAL

*Implemented for everything built so far: keyboard control of the Bloch sphere
and every slider, screen-reader descriptions of state changes, text
equivalents for each visual, high-contrast and reduced-motion modes, phase
carried by figures as well as colour, visible focus rings, 44×44 px targets and
a skip link. A full audit runs in Phase 6, once every surface exists.*

Required:

* keyboard operation for all sliders and rotations;
* screen-reader descriptions of state changes;
* text equivalents for visual-only diagrams;
* high-contrast mode;
* reduced-motion mode;
* no reliance on colour alone;
* captions for every animation;
* visible focus states;
* minimum touch target of 44×44 px.

Bloch sphere screen-reader summary example:

```text
Qubit state: theta 90 degrees, phi 0 degrees.
Equivalent state: |+⟩.
Measurement probabilities in the Z basis:
0: 50 per cent, 1: 50 per cent.
```

---

# 17. Performance limits — 🟡 PARTIAL

Version 1 supports:

* one qubit;
* two qubits;
* circuits up to 24 operations;
* at most 100,000 simulated shots per request;
* smooth 60 fps Bloch-sphere interaction on modern hardware.

Client-side sampling may use multinomial sampling rather than executing each shot separately.

Do not initially support arbitrary (n)-qubit state vectors. The educational value falls while UI and complexity costs rise rapidly.

---

# 18. Analytics — ⬜ NOT STARTED

Track only educational interaction events:

* lesson started;
* lesson section completed;
* checkpoint attempted;
* checkpoint passed;
* Explore mode opened;
* preset selected;
* gate applied;
* measurement basis changed;
* Bell-state lesson completed.

Do not collect raw free-form student inputs unless necessary.

Useful learning metrics:

* completion rate by section;
* concepts with repeated checkpoint failure;
* most-used presets;
* abandonment point;
* time between visual interaction and opening formal mathematics.

---

# 19. Security and privacy — 🟡 PARTIAL

*No account, no personal data, and share links encode only the prepared
state's angles, the gate sequence and the measurement axis. Deterministic
seeds are supported for classroom demonstrations. Server-side validation,
request-size limits and CORS configuration arrive with the backend in Phase 6.*

* no account required for initial release;
* no personally identifiable information required;
* state-sharing links encode only circuit and state parameters;
* server validates all matrices and dimensions;
* enforce request-size limits;
* cap shots and circuit depth;
* no dynamic code execution;
* strict CORS configuration;
* deterministic seed support for reproducible classroom demonstrations.

---

# 20. Delivery phases

## Phase 1 — Mathematical core — ✅ COMPLETE

Deliver:

* state vectors;
* canonical states;
* Pauli gates;
* Hadamard;
* rotations;
* tensor products;
* computational measurement;
* observables;
* Bell states;
* partial trace;
* core tests.

Exit criterion:

All mathematical invariants pass.

## Phase 2 — One-qubit Explore lab — ✅ COMPLETE

Deliver:

* Bloch sphere;
* amplitude phasors;
* probability bars;
* Pauli operations;
* unitary rotations;
* measurement axes;
* histograms.

Exit criterion:

A learner can construct, rotate and measure arbitrary pure one-qubit states.

## Phase 3 — Guided one-qubit lesson — ✅ COMPLETE

Deliver:

* classical bit;
* qubit;
* polarisation;
* spin;
* phase;
* Pauli;
* unitary;
* measurement;
* observables.

Exit criterion:

All sections include visual, experiment, mathematics and checkpoint.

## Phase 4 — Two-qubit system — ✅ COMPLETE

Deliver:

* tensor-product visual;
* four-amplitude state panel;
* CNOT;
* reduced states;
* product-state detection;
* Bell-state builder.

Exit criterion:

Students can distinguish product and entangled states.

## Phase 5 — EPR and Bell correlations — ✅ COMPLETE

Deliver:

* Alice/Bob visual;
* axis controls;
* correlation simulation;
* CHSH advanced panel;
* no-signalling explanation.

Exit criterion:

The app accurately displays ideal quantum correlations without implying communication.

## Phase 6 — Open-source release — ⬜ NOT STARTED

Deliver:

* README;
* architecture guide;
* mathematical conventions;
* contribution guide;
* code of conduct;
* issue templates;
* classroom deployment notes;
* screenshots;
* generated figures;
* CI;
* release package.

---

# 21. Completion criteria — 🟡 PARTIAL

The project is ready when:

* all states remain normalised under supported gates;
* all supported gates pass unitary checks;
* measurement probabilities sum to one;
* Bell-state reduced subsystems are correctly shown as mixed;
* the UI does not depict entangled qubits as independent pure states;
* the Bloch sphere is used only for valid one-qubit pure-state views;
* tensor-product ordering is documented and tested;
* Hermitian observables are separated from unitary gates;
* measurement statistics distinguish expected and observed frequencies;
* polarisation and spin analogies contain explicit limitations;
* no lesson claims entanglement enables communication;
* every formal equation is linked to an interactive visual;
* frontend and backend agree numerically;
* lesson, README and tests use the same terminology.

---

# 22. Recommended release positioning

**Name:** Quantum Foundations Lab
**Subtitle:**

> A visual path from qubits to entanglement.

**Description:**

> Quantum Foundations Lab is an interactive teaching tool for understanding the mathematical language of quantum computing. Manipulate qubits, rotate states, apply gates, build tensor products, perform measurements and create Bell pairs—then reveal the formal mathematics behind each visual.

**Scope statement:**

> This is a mathematical teaching model, not a physical hardware simulator. It focuses on ideal one- and two-qubit systems so that the underlying ideas remain visible.
