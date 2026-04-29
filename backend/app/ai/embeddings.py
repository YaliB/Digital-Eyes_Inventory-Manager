"""
Embedding service — uses the configured AI provider.
Swap AI_PROVIDER in .env to change the underlying embedding model.
"""

import logging

from app.ai.providers import get_embedding_provider

logger = logging.getLogger(__name__)


def build_product_text(name: str, category: str, description: str) -> str:
    return f"{name}. Category: {category}. {description}".strip()


async def get_embedding(text: str) -> list[float]:
    provider = get_embedding_provider()
    logger.info("Using embedding provider: %s", type(provider).__name__)
    return await provider.embed(text)


async def get_product_embedding(
    name: str,
    category: str,
    description: str,
) -> list[float]:
    text = build_product_text(name, category, description)
    return await get_embedding(text)
