"""Orchestrates the full analyze flow: image → AI → DB → response."""

import json
import logging
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.ai.vision import (
    analyze_shelf as ai_analyze_shelf,
    analyze_single_shelf as ai_analyze_single_shelf,
)
from backend.schemas.analyze import (
    AnalyzeResponse,
    DetectedGap,
    RestockingItem,
    ShelfSection,
    SingleImageAnalyzeResponse,
)
from backend.services.health_score import compute_health_score, score_to_color, score_to_label
from backend.services.substitute_service import find_substitutes

logger = logging.getLogger(__name__)


def _normalize_fill_percentage(value: object) -> int:
    try:
        fill_percentage = int(float(value))
    except (TypeError, ValueError):
        return 0
    return max(0, min(100, fill_percentage))


async def run_analysis(
    shelf_id: str,
    comparison_bytes: bytes,
    db: AsyncSession,
) -> AnalyzeResponse:
    """
    Full analysis pipeline:
      1. Fetch the latest baseline image for `shelf_id` from the DB.
      2. Send both images to the AI vision service.
      3. Enrich each detected gap with substitute products.
      4. Persist the scan result.
      5. Return a structured AnalyzeResponse.

    Raises ValueError if no baseline exists for the given shelf.
    """
    # ── 1. Fetch latest baseline ──────────────────────────────────────────────
    result = await db.execute(
        text("""
            SELECT id, image_data
            FROM baselines
            WHERE shelf_id = :shelf_id
            ORDER BY captured_at DESC
            LIMIT 1
        """),
        {"shelf_id": shelf_id},
    )
    baseline_row = result.fetchone()
    if baseline_row is None:
        raise ValueError(
            f"No baseline found for shelf '{shelf_id}'. "
            "Upload a baseline photo first."
        )

    baseline_id = str(baseline_row.id)
    baseline_bytes: bytes = baseline_row.image_data

    # ── 2. AI vision analysis ─────────────────────────────────────────────────
    logger.info("Running AI analysis for shelf=%s baseline=%s", shelf_id, baseline_id)
    ai_result = await ai_analyze_shelf(
        baseline_bytes=baseline_bytes,
        comparison_bytes=comparison_bytes,
    )

    # ── 3. Health score ───────────────────────────────────────────────────────
    raw_gaps: list[dict] = ai_result.get("gaps", [])
    ai_score: int | None = ai_result.get("shelf_health_score")

    if isinstance(ai_score, int) and 0 <= ai_score <= 100:
        health_score = ai_score
    else:
        health_score = compute_health_score(raw_gaps)

    category_detected: str = ai_result.get("category_detected", "unknown")
    prioritized_actions: list[str] = ai_result.get("prioritized_actions", [])
    overall_summary: str = ai_result.get("overall_summary", "")

    # ── 4. Enrich gaps with substitutes ──────────────────────────────────────
    enriched_gaps: list[DetectedGap] = []
    for gap_dict in raw_gaps:
        missing_name: str | None = gap_dict.get("estimated_missing_product")
        try:
            substitutes = await find_substitutes(
                missing_product_name=missing_name,
                category=category_detected,
                db=db,
            )
        except Exception as exc:
            logger.warning("find_substitutes raised unexpectedly: %s", exc)
            await db.rollback()
            substitutes = []

        # Try to resolve missing product info — optional, never crashes analysis
        missing_product_info: dict | None = None
        if missing_name:
            try:
                prod_result = await db.execute(
                    text("""
                        SELECT p.sku, p.name, p.category,
                               COALESCE(p.warehouse_qty, 0) AS qty
                        FROM products p
                        WHERE LOWER(p.name) LIKE LOWER(:name)
                        LIMIT 1
                    """),
                    {"name": f"%{missing_name}%"},
                )
                prod_row = prod_result.fetchone()
                if prod_row:
                    missing_product_info = {
                        "sku": prod_row.sku,
                        "name": prod_row.name,
                        "category": prod_row.category,
                        "warehouse_qty": prod_row.qty,
                    }
            except Exception as exc:
                logger.warning(
                    "Product lookup failed for '%s', continuing without it: %s",
                    missing_name, exc,
                )
                await db.rollback()

        enriched_gaps.append(
            DetectedGap(
                gap_id=gap_dict.get("gap_id", len(enriched_gaps) + 1),
                location_description=gap_dict.get("location_description", ""),
                bbox_relative=gap_dict.get("bbox_relative", []),
                severity=gap_dict.get("severity", "unknown"),
                confidence=float(gap_dict.get("confidence", 0.0)),
                visual_evidence=gap_dict.get("visual_evidence", ""),
                estimated_missing_product=missing_name,
                missing_product=missing_product_info,
                substitutes=substitutes,
            )
        )

    # ── 5. Persist scan ───────────────────────────────────────────────────────
    scan_id = uuid4()
    created_at = datetime.now(timezone.utc)

    try:
        result_payload = {
            "category_detected": category_detected,
            "gaps": [g.model_dump() for g in enriched_gaps],
            "prioritized_actions": prioritized_actions,
            "overall_summary": overall_summary,
        }

        await db.rollback()  # clear any lingering failed-tx state from gap enrichment
        await db.execute(
            text("""
                INSERT INTO scans (
                    id, shelf_id, baseline_id,
                    shelf_health_score, gaps_count,
                    result_json, created_at
                ) VALUES (
                    :id, :shelf_id, :baseline_id,
                    :health_score, :gaps_count,
                    CAST(:result_json AS jsonb), :created_at
                )
            """),
            {
                "id": str(scan_id),
                "shelf_id": shelf_id,
                "baseline_id": baseline_id,
                "health_score": health_score,
                "gaps_count": len(enriched_gaps),
                "result_json": json.dumps(result_payload),
                "created_at": created_at,
            },
        )
        await db.commit()
        logger.info(
            "Scan saved: id=%s shelf=%s score=%d gaps=%d",
            scan_id, shelf_id, health_score, len(enriched_gaps),
        )
    except Exception as exc:
        logger.error("Failed to persist scan for shelf=%s: %s", shelf_id, exc, exc_info=True)
        await db.rollback()
        # Do not raise — return result even if persistence fails

    # ── 6. Build response ─────────────────────────────────────────────────────
    return AnalyzeResponse(
        shelf_id=shelf_id,
        baseline_id=baseline_id,
        shelf_health_score=health_score,
        shelf_health_label=score_to_label(health_score),
        shelf_health_color=score_to_color(health_score),
        category_detected=category_detected,
        gaps=enriched_gaps,
        prioritized_actions=prioritized_actions,
        overall_summary=overall_summary,
        gaps_count=len(enriched_gaps),
    )


async def run_single_image_analysis(
    shelf_id: str,
    image_bytes: bytes,
    media_type: str,
    db: AsyncSession,
) -> SingleImageAnalyzeResponse:
    """
    Single-image analysis pipeline:
      1. Send the image to the AI vision service.
      2. Normalize the response into the API schema.
      3. Persist the scan result without a baseline.
      4. Return a structured SingleImageAnalyzeResponse.
    """
    logger.info("Running single-image AI analysis for shelf=%s", shelf_id)
    ai_result = await ai_analyze_single_shelf(
        image_bytes=image_bytes,
        media_type=media_type,
    )

    fill_percentage = _normalize_fill_percentage(ai_result.get("overall_fill_percentage"))
    sections = [
        ShelfSection(
            location=str(section.get("location", "")),
            state=str(section.get("state", "UNKNOWN")),
            products_present=[str(item) for item in section.get("products_present", [])],
            gaps_detected=bool(section.get("gaps_detected", False)),
            notes=str(section.get("notes")) if section.get("notes") else None,
        )
        for section in ai_result.get("sections", [])
        if isinstance(section, dict)
    ]
    restocking_list = [
        RestockingItem(
            item=str(item.get("item", "")),
            location=str(item.get("location", "")),
            urgency=str(item.get("urgency", "LOW")),
            reason=str(item.get("reason", "")),
        )
        for item in ai_result.get("restocking_list", [])
        if isinstance(item, dict)
    ]

    scan_id = uuid4()
    created_at = datetime.now(timezone.utc)
    result_payload = {
        "analysis_type": "single_image",
        "status": str(ai_result.get("status", "PARTIAL")),
        "confidence": str(ai_result.get("confidence", "MEDIUM")),
        "summary": str(ai_result.get("summary", "")),
        "restocking_required": bool(ai_result.get("restocking_required", bool(restocking_list))),
        "sections": [section.model_dump() for section in sections],
        "restocking_list": [item.model_dump() for item in restocking_list],
        "overall_fill_percentage": fill_percentage,
    }

    try:
        await db.execute(
            text("""
                INSERT INTO scans (
                    id, shelf_id, baseline_id,
                    shelf_health_score, gaps_count,
                    result_json, created_at
                ) VALUES (
                    :id, :shelf_id, :baseline_id,
                    :health_score, :gaps_count,
                    CAST(:result_json AS jsonb), :created_at
                )
            """),
            {
                "id": str(scan_id),
                "shelf_id": shelf_id,
                "baseline_id": None,
                "health_score": fill_percentage,
                "gaps_count": len(restocking_list),
                "result_json": json.dumps(result_payload),
                "created_at": created_at,
            },
        )
        await db.commit()
        logger.info(
            "Single-image scan saved: id=%s shelf=%s score=%d restocking_items=%d",
            scan_id, shelf_id, fill_percentage, len(restocking_list),
        )
    except Exception as exc:
        logger.error("Failed to persist single-image scan for shelf=%s: %s", shelf_id, exc, exc_info=True)
        await db.rollback()

    return SingleImageAnalyzeResponse(
        shelf_id=shelf_id,
        scan_id=str(scan_id),
        status=result_payload["status"],
        confidence=result_payload["confidence"],
        summary=result_payload["summary"],
        restocking_required=result_payload["restocking_required"],
        sections=sections,
        restocking_list=restocking_list,
        overall_fill_percentage=fill_percentage,
        shelf_health_score=fill_percentage,
        shelf_health_label=score_to_label(fill_percentage),
        shelf_health_color=score_to_color(fill_percentage),
    )
