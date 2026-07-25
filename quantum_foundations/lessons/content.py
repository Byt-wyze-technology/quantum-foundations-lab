"""The canonical lesson spine.

Specification reference: §2 (repository layout), §7 (lesson schema), §21
("lesson, README and tests use the same terminology").

The interactive lesson is built in TypeScript, because its sections are live
visuals. This module holds the part that must not drift: the order of the
sections, the concept each one teaches, its title, the misconception it guards
against and the glossary terms it relies on. Documentation, figure scripts and
tests all read the spine from here, and
``tests/integration/test_lesson_consistency.py`` checks that the frontend's
section list still matches it.
"""

from dataclasses import dataclass
from typing import Literal

Concept = Literal[
    "classical-bit",
    "qubit",
    "polarisation",
    "phase",
    "pauli",
    "unitary",
    "tensor",
    "measurement",
    "observable",
    "entanglement",
    "bell",
    "epr",
]


@dataclass(frozen=True)
class MisconceptionGuard:
    """A phrasing to avoid, paired with the phrasing to use instead.

    Both halves are kept. Naming only the correction leaves the wrong idea
    intact, which is why §8.1 shows the two together.
    """

    wrong: str
    right: str


@dataclass(frozen=True)
class LessonSection:
    """One section of the guided lesson."""

    id: str
    index: int
    concept: Concept
    title: str
    misconception: MisconceptionGuard
    glossary_terms: tuple[str, ...]
    #: The specification section that defines this lesson module.
    spec_section: str


LESSON_SECTIONS: tuple[LessonSection, ...] = (
    LessonSection(
        id="classical-bit",
        index=1,
        concept="classical-bit",
        title="Two positions, or every direction.",
        misconception=MisconceptionGuard(
            wrong="A qubit is both 0 and 1 at the same time.",
            right=(
                "A qubit can occupy a state whose measurement probabilities are "
                "described by amplitudes for 0 and 1."
            ),
        ),
        glossary_terms=("Qubit", "Amplitude", "Bloch sphere"),
        spec_section="8.1",
    ),
    LessonSection(
        id="polarisation-spin",
        index=2,
        concept="polarisation",
        title="You already own a measuring device.",
        misconception=MisconceptionGuard(
            wrong="An electron's spin is a tiny ball turning on its axis.",
            right=(
                "Spin is an intrinsic quantum degree of freedom. The arrow represents "
                "a state and a measurement orientation, not a small object rotating in space."
            ),
        ),
        glossary_terms=("Measurement", "Shot"),
        spec_section="8.2",
    ),
    LessonSection(
        id="amplitudes-phase",
        index=3,
        concept="phase",
        title="The number that hides, then decides.",
        misconception=MisconceptionGuard(
            wrong="Phase is a bookkeeping detail you can ignore.",
            right=(
                "Global phase is unobservable, but relative phase is physical — it is "
                "the whole difference between |+⟩ and |−⟩."
            ),
        ),
        glossary_terms=("Amplitude", "Relative phase", "Global phase"),
        spec_section="8.3",
    ),
    LessonSection(
        id="pauli",
        index=4,
        concept="pauli",
        title="Three turns, and the matrices that name them.",
        misconception=MisconceptionGuard(
            wrong="If the probability bars do not move, the gate did nothing.",
            right=(
                "A gate can change the relative phase while leaving one basis's "
                "probabilities untouched — and another basis will show the difference at once."
            ),
        ),
        glossary_terms=("Unitary", "Relative phase"),
        spec_section="8.4",
    ),
    LessonSection(
        id="unitary",
        index=5,
        concept="unitary",
        title="Every move can be unmade.",
        misconception=MisconceptionGuard(
            wrong="Any matrix can act as a quantum gate.",
            right=(
                "Only unitary matrices are gates. Anything else fails to preserve total "
                "probability, and this interface will report it instead of applying it."
            ),
        ),
        glossary_terms=("Unitary",),
        spec_section="8.5",
    ),
    LessonSection(
        id="measurement",
        index=6,
        concept="measurement",
        title="Asking a question changes the answer.",
        misconception=MisconceptionGuard(
            wrong="Measurement reveals the value the qubit secretly had all along.",
            right=(
                "Measurement produces one of the allowed readings and leaves the system "
                "in the matching state. There was no hidden reading beforehand."
            ),
        ),
        glossary_terms=("Measurement", "Shot", "Expectation value"),
        spec_section="8.7",
    ),
    LessonSection(
        id="observables",
        index=7,
        concept="observable",
        title="A matrix that is a question, not a move.",
        misconception=MisconceptionGuard(
            wrong="The expectation value is what the instrument shows.",
            right=(
                "The instrument shows an eigenvalue. The expectation value is the average "
                "of many such readings, and often is not one of them."
            ),
        ),
        glossary_terms=("Hermitian observable", "Expectation value"),
        spec_section="8.8",
    ),
)


def section_by_id(section_id: str) -> LessonSection:
    """Look up a section, raising a clear error rather than an IndexError."""
    for section in LESSON_SECTIONS:
        if section.id == section_id:
            return section
    known = ", ".join(section.id for section in LESSON_SECTIONS)
    raise KeyError(f"Unknown lesson section {section_id!r}. Known sections: {known}.")


def section_ids() -> tuple[str, ...]:
    """The section ids, in lesson order."""
    return tuple(section.id for section in LESSON_SECTIONS)
