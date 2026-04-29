from typing import Any
from pydantic import BaseModel


class SubstituteProduct(BaseModel):
    sku: str
    name: str
    category: str
    warehouse_qty: int
    similarity_score: float


class DetectedGap(BaseModel):
    gap_id: int
    location_description: str
    bbox_relative: list[float]
    severity: str
    confidence: float
    visual_evidence: str
    estimated_missing_product: str | None
    missing_product: dict[str, Any] | None
    substitutes: list[SubstituteProduct]


class AnalyzeResponse(BaseModel):
    shelf_id: str
    baseline_id: str
    shelf_health_score: int
    shelf_health_label: str
    shelf_health_color: str
    category_detected: str
    gaps: list[DetectedGap]
    prioritized_actions: list[str]
    overall_summary: str
    gaps_count: int
