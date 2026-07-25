"""Lesson spine and worked examples (§2, §7)."""

from .content import (
    LESSON_SECTIONS,
    Concept,
    LessonSection,
    MisconceptionGuard,
    section_by_id,
    section_ids,
)
from .examples import (
    CANONICAL_STATES,
    ObservableSummary,
    observable_summaries,
    pauli_actions,
    phase_comparison,
    polarisation_transmission,
    tilted_example_state,
)

__all__ = [
    "CANONICAL_STATES",
    "Concept",
    "LESSON_SECTIONS",
    "LessonSection",
    "MisconceptionGuard",
    "ObservableSummary",
    "observable_summaries",
    "pauli_actions",
    "phase_comparison",
    "polarisation_transmission",
    "section_by_id",
    "section_ids",
    "tilted_example_state",
]
