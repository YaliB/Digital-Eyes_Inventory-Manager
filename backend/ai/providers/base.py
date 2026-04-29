"""
Abstract AI provider interface.
Any vision or embedding provider must implement this contract.
Adding a new provider = create a new file in this folder, implement the class.
Never import OpenAI directly outside of providers/.
"""

from abc import ABC, abstractmethod


class BaseVisionProvider(ABC):
    """Abstract interface for vision/image analysis providers."""

    @abstractmethod
    async def compare_shelves(
        self,
        baseline_bytes: bytes,
        comparison_bytes: bytes,
        system_prompt: str,
        user_prompt: str,
    ) -> dict:
        """
        Compare two shelf images and return structured gap analysis.

        Args:
            baseline_bytes: morning baseline photo bytes
            comparison_bytes: current comparison photo bytes
            system_prompt: the ShelfGuard system instructions
            user_prompt: the user-facing comparison instruction

        Returns:
            Parsed dict matching the ShelfAnalysisResult schema
        """
        ...

    @abstractmethod
    async def analyze_single_shelf(
        self,
        image_bytes: bytes,
        system_prompt: str,
        user_prompt: str,
        media_type: str = "image/jpeg",
    ) -> dict:
        """
        Analyze a single shelf image and return a structured stock report.

        Args:
            image_bytes: shelf image bytes
            system_prompt: the system instructions for single-image analysis
            user_prompt: the user-facing analysis instructions
            media_type: MIME type for the uploaded image

        Returns:
            Parsed dict matching the single-image shelf analysis schema
        """
        ...


class BaseEmbeddingProvider(ABC):
    """Abstract interface for text embedding providers."""

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """
        Generate an embedding vector for the given text.

        Args:
            text: product description to embed

        Returns:
            List of floats representing the embedding vector
        """
        ...

    @property
    @abstractmethod
    def dimension(self) -> int:
        """The vector dimension this provider produces (e.g. 1536 for OpenAI)."""
        ...
