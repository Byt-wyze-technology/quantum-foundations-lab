# Contributing

Thank you for considering it. The most valuable contribution to a teaching
tool is not a feature — it is a place where the explanation is wrong,
misleading, or technically true but reliably misread. Those reports are welcome
even without a fix attached.

## Getting set up

Requires Node 20+ and Python 3.11+.

```bash
python -m pip install -e ".[dev,web,streamlit]"
cd apps/web/frontend && npm install
```

## Running the checks

```bash
python -m pytest                  # core, API and integration
python -m ruff check .
python -m mypy

cd apps/web/frontend
npx tsc -b                        # types
npm test                          # components and mathematics
npx playwright test               # end-to-end
```

All of these run in CI on every pull request. The cross-implementation check
skips locally if Node is unavailable, but it runs in CI, so do not rely on the
skip.

## Where things belong

**Mathematics goes in `quantum_foundations/core` and nowhere else.** If you
find yourself computing a probability inside a React component, the calculation
belongs in the core with the component reading the result.

**The core stays free of everything else.** No React, no FastAPI, no lesson
copy, no animation timing. It depends on NumPy and nothing more.

**Changing the mathematics means changing it twice.** The frontend mirrors the
core in TypeScript so interaction is instant. Update both, and the
cross-implementation test will confirm they still agree.

**Conventions are documented, not folklore.** Qubit ordering, phase handling,
tolerances and the rest live in [docs/conventions.md](docs/conventions.md). If
you need a new one, add it there in the same commit.

## The rules the test-suite enforces

Some of this project's requirements are educational rather than technical, so
they are guarded by tests. A change that breaks one of these will fail the
build, and the failure is the point:

- The interface never claims a qubit is "both 0 and 1". The single exception is
  the `wrong` field of a misconception guard, which exists to quote the bad
  phrasing and cross it out.
- Nothing claims entanglement transmits information.
- The Bloch sphere is never described as a physical object, and spin is never
  drawn as a spinning ball.
- An entangled qubit is never drawn as an independent pure state. Its arrow is
  drawn at its true, shortened length.
- Every lesson section carries a visual, an experiment, revealable mathematics,
  a misconception guard and a checkpoint.
- Non-unitary matrices are reported, never applied.

If you believe one of these guards is wrong, please open an issue and argue the
case — but do not simply delete the test.

## Style

**Python.** Ruff and mypy, both configured in `pyproject.toml`. Type
annotations on everything in the core. Docstrings say *why*, not what the
signature already says.

**TypeScript.** Strict mode. Prefer explicit types at module boundaries.

**Comments.** Explain reasoning that is not obvious from the code — a choice of
convention, a numerical subtlety, a rejected alternative. Do not narrate what
the next line does.

**Lesson copy.** Plain, specific, and honest about limits. Every analogy states
where it stops working. Avoid the phrasing that is easy to write and easy to
misread; that is most of the work.

## Pull requests

- One coherent change per pull request.
- Say what a reviewer should look at hardest.
- If you changed the mathematics, say how you know it is right.
- If you changed lesson copy, say what misreading you were guarding against.

## Adding a lesson section

The steps, and the tests that will catch you if you miss one, are in
[docs/architecture.md](docs/architecture.md#adding-a-lesson-section).

## Scope

Version 1 covers one- and two-qubit systems deliberately. Beyond two qubits the
educational value falls while interface complexity rises sharply, so
"support n qubits" is not a direction this project wants to go. Depth on the
existing scope is welcome; breadth beyond it probably is not.
