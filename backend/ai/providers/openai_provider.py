"""
OpenAI implementation of the AI provider interfaces.
Uses GPT-4o for vision and text-embedding-3-small for embeddings.
"""

import base64
import json
import logging

from openai import AsyncOpenAI

from backend.ai.providers.base import BaseEmbeddingProvider, BaseVisionProvider

logger = logging.getLogger(__name__)


def _encode_image(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


def _normalize_media_type(media_type: str | None) -> str:
    if media_type in {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}:
        return "image/jpeg" if media_type == "image/jpg" else media_type
    return "image/jpeg"


class OpenAIVisionProvider(BaseVisionProvider):
    """GPT-4o vision provider."""

    def __init__(self, model: str = "gpt-4o"):
        self.client = AsyncOpenAI()  # reads OPENAI_API_KEY from env
        self.model = model

    async def compare_shelves(
        self,
        baseline_bytes: bytes,
        comparison_bytes: bytes,
        system_prompt: str,
        user_prompt: str,
    ) -> dict:
        logger.info("OpenAI GPT-4o: comparing shelf images...")

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "IMAGE 1 (BASELINE — morning fully stocked):",
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{_encode_image(baseline_bytes)}",
                            "detail": "high",
                        },
                    },
                    {"type": "text", "text": "IMAGE 2 (CURRENT STATE):"},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{_encode_image(comparison_bytes)}",
                            "detail": "high",
                        },
                    },
                    {"type": "text", "text": user_prompt},
                ],
            }
        ]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            max_tokens=2000,
            temperature=0,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        logger.info("OpenAI response received (%d chars)", len(raw))

        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("OpenAI returned invalid JSON: %s", raw[:200])
            raise ValueError(f"OpenAI returned invalid JSON: {e}") from e

    async def analyze_single_shelf(
        self,
        image_bytes: bytes,
        system_prompt: str,
        user_prompt: str,
        media_type: str = "image/jpeg",
    ) -> dict:
        logger.info("OpenAI GPT-4o: analyzing single shelf image...")

        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{_normalize_media_type(media_type)};base64,{_encode_image(image_bytes)}",
                            "detail": "high",
                        },
                    },
                    {"type": "text", "text": user_prompt},
                ],
            }
        ]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            max_tokens=2000,
            temperature=0,
            response_format={"type": "json_object"},
        )

        raw = response.choices[0].message.content
        logger.info("OpenAI single-image response received (%d chars)", len(raw))

        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("OpenAI returned invalid single-image JSON: %s", raw[:200])
            raise ValueError(f"OpenAI returned invalid JSON: {e}") from e


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """OpenAI text-embedding-3-small provider."""

    def __init__(self, model: str = "text-embedding-3-small"):
        self.client = AsyncOpenAI()
        self.model = model
        self._dimension = 1536

    async def embed(self, text: str) -> list[float]:
        logger.info("OpenAI embedding: %s...", text[:60])
        response = await self.client.embeddings.create(
            model=self.model,
            input=text,
            dimensions=self._dimension,
        )
        return response.data[0].embedding

    @property
    def dimension(self) -> int:
        return self._dimension
