"""
AI provider factory.
Reads AI_PROVIDER from environment and returns the correct implementation.

To swap providers: change AI_PROVIDER in your .env file.
No code changes needed anywhere else.

Supported values:
  AI_PROVIDER=openai   (default) — requires OPENAI_API_KEY
  AI_PROVIDER=ollama   — requires Ollama running locally
"""

import os

from backend.ai.providers.base import BaseEmbeddingProvider, BaseVisionProvider


def get_vision_provider() -> BaseVisionProvider:
    provider = os.getenv("AI_PROVIDER", "openai").lower()

    if provider == "openai":
        from backend.ai.providers.openai_provider import OpenAIVisionProvider

        return OpenAIVisionProvider(model=os.getenv("OPENAI_VISION_MODEL", "gpt-4o"))

    if provider == "ollama":
        from backend.ai.providers.ollama_provider import OllamaVisionProvider

        return OllamaVisionProvider(model=os.getenv("OLLAMA_VISION_MODEL", "llava"))

    raise ValueError(f"Unknown AI_PROVIDER='{provider}'. " f"Supported: openai, ollama")


def get_embedding_provider() -> BaseEmbeddingProvider:
    provider = os.getenv("AI_PROVIDER", "openai").lower()

    if provider == "openai":
        from backend.ai.providers.openai_provider import OpenAIEmbeddingProvider

        return OpenAIEmbeddingProvider(
            model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        )

    if provider == "ollama":
        from backend.ai.providers.ollama_provider import OllamaEmbeddingProvider

        return OllamaEmbeddingProvider(
            model=os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
        )

    raise ValueError(f"Unknown AI_PROVIDER='{provider}'. " f"Supported: openai, ollama")
