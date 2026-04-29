"""
Vision service — uses the configured AI provider.
Swap AI_PROVIDER in .env to change the underlying model.
"""

import logging

from app.ai.prompts import (
    SHELF_COMPARISON_SYSTEM_PROMPT,
    SHELF_COMPARISON_USER_PROMPT,
)
from app.ai.providers import get_vision_provider

logger = logging.getLogger(__name__)


async def analyze_shelf(
    baseline_bytes: bytes,
    comparison_bytes: bytes,
) -> dict:
    """
    Analyze two shelf images using the configured AI provider.
    Returns structured gap analysis dict.
    """
    provider = get_vision_provider()
    logger.info("Using vision provider: %s", type(provider).__name__)

    result = await provider.compare_shelves(
        baseline_bytes=baseline_bytes,
        comparison_bytes=comparison_bytes,
        system_prompt=SHELF_COMPARISON_SYSTEM_PROMPT,
        user_prompt=SHELF_COMPARISON_USER_PROMPT,
    )

    required_keys = {"shelf_health_score", "gaps", "prioritized_actions"}
    missing = required_keys - result.keys()
    if missing:
        raise ValueError(f"AI provider response missing keys: {missing}")

    return result
