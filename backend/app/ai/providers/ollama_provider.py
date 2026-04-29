"""
Ollama local provider stub.
Enables running ShelfGuard with no OpenAI API key (free, local).
Swap in by setting AI_PROVIDER=ollama in .env

To use:
  1. Install Ollama: https://ollama.ai
  2. Pull a vision model: ollama pull llava
  3. Pull an embedding model: ollama pull nomic-embed-text
  4. Set AI_PROVIDER=ollama in .env
"""

import json
import logging

import httpx

from app.ai.providers.base import BaseEmbeddingProvider, BaseVisionProvider

logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = "http://localhost:11434"


class OllamaVisionProvider(BaseVisionProvider):
    """
    Ollama vision provider using LLaVA or similar local vision model.
    Note: Local models are less accurate than GPT-4o for complex shelf analysis.
    Good for development / cost-free testing.
    """

    def __init__(self, model: str = "llava"):
        self.model = model
        self.base_url = OLLAMA_BASE_URL

    async def compare_shelves(
        self,
        baseline_bytes: bytes,
        comparison_bytes: bytes,
        system_prompt: str,
        user_prompt: str,
    ) -> dict:
        import base64

        logger.info("Ollama %s: comparing shelf images...", self.model)

        b64_baseline = base64.b64encode(baseline_bytes).decode()
        b64_comparison = base64.b64encode(comparison_bytes).decode()

        payload = {
            "model": self.model,
            "prompt": f"{system_prompt}\n\n{user_prompt}",
            "images": [b64_baseline, b64_comparison],
            "stream": False,
            "format": "json",
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        try:
            return json.loads(data["response"])
        except (json.JSONDecodeError, KeyError) as e:
            raise ValueError(f"Ollama returned invalid response: {e}") from e


class OllamaEmbeddingProvider(BaseEmbeddingProvider):
    """
    Ollama embedding provider using nomic-embed-text.
    Dimension: 768 (different from OpenAI's 1536 — pgvector column must match).
    """

    def __init__(self, model: str = "nomic-embed-text"):
        self.model = model
        self.base_url = OLLAMA_BASE_URL
        self._dimension = 768  # nomic-embed-text dimension

    async def embed(self, text: str) -> list[float]:
        logger.info("Ollama embedding: %s...", text[:60])
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.model, "prompt": text},
            )
            response.raise_for_status()
            return response.json()["embedding"]

    @property
    def dimension(self) -> int:
        return self._dimension
