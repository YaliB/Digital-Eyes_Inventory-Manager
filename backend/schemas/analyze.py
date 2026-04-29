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
    baseline_id: str | None = None
    shelf_health_score: int
    shelf_health_label: str
    shelf_health_color: str
    category_detected: str
    gaps: list[DetectedGap]
    prioritized_actions: list[str]
    overall_summary: str
    gaps_count: int
    # Smart routing metadata
    analysis_method: str = "baseline_comparison"   # "single_image" | "single_image_fallback" | "baseline_comparison"
    ai_confidence: str | None = None               # "HIGH" | "MEDIUM" | "LOW" — populated for single-image paths


class ShelfSection(BaseModel):
    location: str
    state: str
    products_present: list[str]
    gaps_detected: bool
    notes: str | None = None


class RestockingItem(BaseModel):
    item: str
    location: str
    urgency: str
    reason: str


class SingleImageAnalyzeResponse(BaseModel):
    shelf_id: str
    scan_id: str | None = None
    status: str
    confidence: str
    summary: str
    restocking_required: bool
    sections: list[ShelfSection]
    restocking_list: list[RestockingItem]
    overall_fill_percentage: int
    shelf_health_score: int
    shelf_health_label: str
    shelf_health_color: str
