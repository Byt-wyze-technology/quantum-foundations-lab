"""The frontend lesson and the Python lesson spine must not drift apart.

Specification reference: §21 — "lesson, README and tests use the same
terminology". The interactive sections live in TypeScript and the canonical
spine lives in Python; nothing stops the two diverging except a test that
notices, so this is that test.
"""

import re
from pathlib import Path

import pytest

from quantum_foundations.lessons import LESSON_SECTIONS, section_by_id, section_ids

SECTIONS_TSX = (
    Path(__file__).resolve().parents[2]
    / "apps"
    / "web"
    / "frontend"
    / "src"
    / "lesson"
    / "sections.tsx"
)


def _frontend_sections() -> list[dict[str, str]]:
    """Extract id, index, concept and title from the frontend section list."""
    source = SECTIONS_TSX.read_text(encoding="utf-8")
    # Each section literal opens with `id:` and runs to its `concept:` line.
    pattern = re.compile(
        r'\{\s*id:\s*"(?P<id>[^"]+)",\s*'
        r"index:\s*(?P<index>\d+),\s*"
        r'eyebrow:\s*"[^"]*",\s*'
        r'title:\s*"(?P<title>(?:\\.|[^"\\])*)",\s*'
        r"summary:\s*\n?\s*\"(?P<summary>(?:\\.|[^\"\\])*)\",\s*"
        r'concept:\s*"(?P<concept>[^"]+)"',
        re.MULTILINE,
    )
    return [match.groupdict() for match in pattern.finditer(source)]


@pytest.fixture(scope="module")
def frontend_sections() -> list[dict[str, str]]:
    sections = _frontend_sections()
    if not sections:
        pytest.fail(
            f"Could not parse any lesson sections from {SECTIONS_TSX}. "
            "If the file's formatting changed, update this test's pattern."
        )
    return sections


def test_frontend_file_exists():
    assert SECTIONS_TSX.is_file(), f"Expected the lesson sections at {SECTIONS_TSX}"


def test_section_ids_and_order_match(frontend_sections):
    assert tuple(entry["id"] for entry in frontend_sections) == section_ids()


def test_section_indices_match(frontend_sections):
    assert [int(entry["index"]) for entry in frontend_sections] == [
        section.index for section in LESSON_SECTIONS
    ]


def test_section_concepts_match(frontend_sections):
    assert [entry["concept"] for entry in frontend_sections] == [
        section.concept for section in LESSON_SECTIONS
    ]


def test_section_titles_match(frontend_sections):
    for entry in frontend_sections:
        assert entry["title"] == section_by_id(entry["id"]).title


def test_indices_are_sequential_from_one():
    assert [section.index for section in LESSON_SECTIONS] == list(
        range(1, len(LESSON_SECTIONS) + 1)
    )


def test_every_section_names_the_specification_module_it_implements():
    for section in LESSON_SECTIONS:
        assert re.fullmatch(r"8\.\d+", section.spec_section), section.id


def test_misconception_guards_are_complete():
    for section in LESSON_SECTIONS:
        assert section.misconception.wrong.strip()
        assert section.misconception.right.strip()
        assert section.misconception.wrong != section.misconception.right


def test_glossary_terms_are_declared():
    for section in LESSON_SECTIONS:
        assert section.glossary_terms, section.id
        assert len(set(section.glossary_terms)) == len(section.glossary_terms)
