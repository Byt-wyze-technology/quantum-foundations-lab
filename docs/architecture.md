# Architecture

## The shape of the thing

```text
                    quantum_foundations/core
                    the reference implementation
                    NumPy only; knows nothing else
                              |
        +---------------------+---------------------+
        |                     |                     |
   FastAPI backend      Streamlit app       (mirrored in TypeScript)
   apps/web/backend     apps/streamlit       apps/web/frontend/src/math
        |                                            |
        +------------ compared numerically -----------+
                       tests/integration
```

The mathematical core is the only place mathematics happens. Everything else
translates, draws or explains.

## Why the mathematics exists twice

The frontend reimplements the core in TypeScript. That is a real cost — two
implementations to keep correct — paid for one reason: every interaction
updates every panel instantly, with no network round trip. Dragging a Bloch
arrow at 60 fps through an HTTP round trip is not the same experience, and the
experience is the product.

The cost is contained by never letting the duplication go unchecked.
`tests/integration/test_frontend_backend_agreement.py` bundles the frontend's
mathematics with esbuild, runs it under Node, and compares state probabilities,
gate application, axis statistics, entanglement measures, correlations and CHSH
against the Python core. They agree to 1e-11 or better. If a change lands in
one and not the other, that test fails.

Python remains the reference. Where they could disagree, Python is right.

## The layers

**`quantum_foundations/core`** — states, gates, tensor products, measurement,
observables, entanglement, validation, types. Pure functions over NumPy arrays.
Every rejection raises `QuantumValidationError`, carrying a machine-readable
code, a message and details.

**`quantum_foundations/lessons`** — the canonical lesson spine: section order,
concepts, titles, misconception guards, glossary terms, and worked examples
computed from the core. Documentation and figures read from here, so the prose
cannot go stale. A test fails if the TypeScript sections and this spine drift
apart.

**`apps/web/backend`** — FastAPI. `schemas/` are Pydantic models describing the
wire format; `services/` translate to and from the core; `routers/` are thin.
One exception handler turns every core rejection into the documented error
envelope, so clients parse one shape.

**`apps/web/frontend`** — React and TypeScript. `math/` mirrors the core;
`store/` holds the Zustand lab state; `viz/` are the reusable visual
components; `lesson/` and `explore/` are the two modes.

**`apps/streamlit`** — a second front end over the same core, for classrooms
where a Python process is easier to run than a Node toolchain. It offers the
laboratory, not the lesson: the lesson depends on interactions Streamlit
cannot express well, and a half-hearted copy would teach worse than the real
one.

## Two decisions worth knowing about

### State is derived, never mutated

`currentState` is always produced by replaying the circuit from
`initialState`. Undo is a pop; step playback is a partial replay. The state
shown can never drift out of agreement with the circuit shown, because there
is only one way to compute it. At the 24-operation cap a full replay is far
cheaper than a frame.

### The Bloch sphere draws what is true

`BlochSphere` takes either a pure state or the Bloch coordinates of a reduced
density matrix, and draws the arrow at its **true length**. A product state's
halves keep full-length arrows; a partly entangled state's arrows fall short;
half of a Bell pair becomes a dot with no direction at all, inside a shaded
ball.

This is how the rule against depicting entangled qubits as independent pure
states is kept — visually, rather than by refusing to draw anything. The
screen-reader description says the same thing the picture says, and a test
asserts it.

## Rendering

| Surface | Technique | Why |
| --- | --- | --- |
| Bloch sphere | Canvas 2D, hand-written orthographic projection | No 3D dependency; complete control over draw order so the arrow reads correctly front and back |
| Diagrams, bars, circuits, curves | SVG | Scales, inspects and styles with CSS |
| Layout, cards, controls | HTML and CSS | |
| Equations | KaTeX | |

A canvas cannot inherit CSS, so the sphere reads four surface colours from
custom properties at draw time. That is what lets it sit legibly on the paper
background and on the dark lesson bands without either caller knowing which.

## Testing strategy

| Layer | Tool | What it establishes |
| --- | --- | --- |
| Core | pytest + Hypothesis | Mathematical invariants hold for arbitrary inputs |
| API | pytest + TestClient | The documented payloads behave as documented |
| Cross-implementation | pytest + esbuild + Node | The two implementations agree numerically |
| Components | Vitest + Testing Library | Panels show what the state says |
| Lesson structure | Vitest | Every section has a visual, experiment, mathematics and checkpoint |
| Copy guards | Vitest | The forbidden claims never appear |
| End-to-end | Playwright | The real app, in a real browser, tells the truth |

The copy guards deserve a note. A reviewer can forget that "a qubit is both 0
and 1" is forbidden; a test cannot. The one sanctioned exception is the
`wrong` field of a misconception guard, which exists to quote the bad phrasing
and cross it out — and further tests check that exception is not abused.

## Adding a lesson section

1. Add the entry to `quantum_foundations/lessons/content.py` — the canonical
   spine.
2. Add the matching entry to `apps/web/frontend/src/lesson/sections.tsx`.
3. Build the visual in `src/lesson/visuals/`.
4. Add any new glossary terms to `src/ui/Glossary.tsx`.
5. Run the suites. The structure test will tell you if the section is missing a
   visual, mathematics, a misconception guard or a checkpoint, and the
   consistency test will tell you if the two lists disagree.
