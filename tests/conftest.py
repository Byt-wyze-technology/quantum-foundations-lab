"""Shared pytest configuration."""

import numpy as np
import pytest
from hypothesis import HealthCheck, settings

settings.register_profile(
    "default",
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
settings.load_profile("default")


@pytest.fixture
def rng() -> np.random.Generator:
    """A seeded generator, so every sampling test is reproducible (§19)."""
    return np.random.default_rng(20250725)
