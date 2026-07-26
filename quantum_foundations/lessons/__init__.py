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
    SubsystemSummary,
    bell_build_steps,
    best_product_overlap_with_bell,
    observable_summaries,
    pauli_actions,
    phase_comparison,
    polarisation_transmission,
    product_versus_bell,
    subsystem_summary,
    tensor_expansion,
    tilted_example_state,
)

__all__ = [
    "CANONICAL_STATES",
    "Concept",
    "LESSON_SECTIONS",
    "LessonSection",
    "MisconceptionGuard",
    "ObservableSummary",
    "SubsystemSummary",
    "bell_build_steps",
    "best_product_overlap_with_bell",
    "observable_summaries",
    "pauli_actions",
    "phase_comparison",
    "polarisation_transmission",
    "product_versus_bell",
    "section_by_id",
    "section_ids",
    "subsystem_summary",
    "tensor_expansion",
    "tilted_example_state",
]
