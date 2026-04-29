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


# ── Confidence-gated scoring ──────────────────────────────────────────────────

_URGENCY_TO_SEVERITY = {"HIGH": "fully_out", "MEDIUM": "low_stock", "LOW": "low_stock"}
_CONFIDENCE_FLOAT = {"HIGH": 0.9, "MEDIUM": 0.65, "LOW": 0.35}


def _single_image_to_analyze_response(
    single: dict,
    shelf_id: str,
    method: str,
    confidence: str,
) -> AnalyzeResponse:
    """
    Convert a single-image AI result (friend's format) into an AnalyzeResponse
    so the frontend only needs to handle one schema regardless of which path was taken.
    """
    fill: int = _normalize_fill_percentage(single.get("overall_fill_percentage", 0))
    summary: str = single.get("summary", "")
    restocking: list[dict] = single.get("restocking_list", [])
    sections: list[dict] = single.get("sections", [])
    status: str = single.get("status", "PARTIAL")

    # Normalize score against AI's own status declaration to prevent middle-value drift.
    # e.g. AI says status=FULL but overall_fill_percentage=70 — that's a contradiction.
    if status == "FULL":
        fill = max(fill, 90)
        restocking = []   # FULL means no restocking needed
    elif status == "EMPTY":
        fill = min(fill, 19)

    # Convert restocking items → DetectedGap objects (no bounding boxes — single image)
    conf_float = _CONFIDENCE_FLOAT.get(confidence, 0.5)
    gaps: list[DetectedGap] = [
        DetectedGap(
            gap_id=i + 1,
            location_description=item.get("location", ""),
            bbox_relative=[],
            severity=_URGENCY_TO_SEVERITY.get(item.get("urgency", "LOW"), "low_stock"),
            confidence=conf_float,
            visual_evidence=item.get("reason", ""),
            estimated_missing_product=item.get("item"),
            missing_product=None,
            substitutes=[],
        )
        for i, item in enumerate(restocking)
    ]

    # Build prioritized actions sorted by urgency
    sorted_items = sorted(
        restocking,
        key=lambda x: {"HIGH": 0, "MEDIUM": 1, "LOW": 2}.get(x.get("urgency", "LOW"), 1),
    )
    actions = [
        f"[{item.get('urgency', 'LOW')}] Restock {item.get('item', '?')} — {item.get('location', '')} ({item.get('reason', '')})"
        for item in sorted_items
    ]

    # Try to infer category from visible products
    all_products: list[str] = []
    for sec in sections:
        all_products.extend(sec.get("products_present", []))
    category = all_products[0].lower() if all_products else "general"

    return AnalyzeResponse(
        shelf_id=shelf_id,
        baseline_id=None,
        shelf_health_score=fill,
        shelf_health_label=score_to_label(fill),
        shelf_health_color=score_to_color(fill),
        category_detected=category,
        gaps=gaps,
        prioritized_actions=actions,
        overall_summary=summary,
        gaps_count=len(gaps),
        analysis_method=method,
        ai_confidence=confidence,
    )


async def _persist_smart_scan(
    shelf_id: str,
    result: AnalyzeResponse,
    extra: dict,
    db: AsyncSession,
) -> None:
    """Save an AnalyzeResponse from the smart/single-image path to the scans table."""
    scan_id = uuid4()
    created_at = datetime.now(timezone.utc)
    result_payload = {
        "category_detected": result.category_detected,
        "gaps": [g.model_dump() for g in result.gaps],
        "prioritized_actions": result.prioritized_actions,
        "overall_summary": result.overall_summary,
        "analysis_method": result.analysis_method,
        "ai_confidence": result.ai_confidence,
        **extra,
    }
    try:
        await db.rollback()
        await db.execute(
            text("""
                INSERT INTO scans (id, shelf_id, baseline_id, shelf_health_score, gaps_count, result_json, created_at)
                VALUES (:id, :shelf_id, :baseline_id, :health_score, :gaps_count, CAST(:result_json AS jsonb), :created_at)
            """),
            {
                "id": str(scan_id),
                "shelf_id": shelf_id,
                "baseline_id": None,
                "health_score": result.shelf_health_score,
                "gaps_count": result.gaps_count,
                "result_json": json.dumps(result_payload),
                "created_at": created_at,
            },
        )
        await db.commit()
        logger.info(
            "Smart scan saved: method=%s confidence=%s shelf=%s score=%d gaps=%d",
            result.analysis_method, result.ai_confidence, shelf_id,
            result.shelf_health_score, result.gaps_count,
        )
    except Exception as exc:
        logger.error("Failed to persist smart scan: %s", exc, exc_info=True)
        await db.rollback()


async def run_smart_analysis(
    shelf_id: str,
    image_bytes: bytes,
    media_type: str,
    db: AsyncSession,
) -> AnalyzeResponse:
    """
    Confidence-gated dual-approach analysis.

    Step 1 — Single-image (your friend's method):
        Send ONE photo to GPT-4o with the auditing prompt.
        Returns confidence: HIGH | MEDIUM | LOW.

    Step 2 — Baseline comparison fallback (only if confidence == LOW):
        Fetch the stored baseline for this shelf.
        Send BOTH images for gap-by-gap comparison.
        This path is richer: bounding boxes, substitute products, etc.

    Step 3 — Graceful degradation:
        If baseline doesn't exist and confidence is LOW, return the
        single-image result anyway with a "single_image_fallback" label.
    """
    # ── Step 1: single-image analysis ────────────────────────────────────────
    single_raw: dict | None = None
    confidence = "LOW"

    try:
        single_raw = await ai_analyze_single_shelf(image_bytes, media_type)
        confidence = single_raw.get("confidence", "LOW")
        logger.info(
            "Single-image analysis: confidence=%s fill=%s shelf=%s",
            confidence, single_raw.get("overall_fill_percentage"), shelf_id,
        )
    except Exception as exc:
        logger.warning(
            "Single-image analysis failed for shelf=%s, falling back to baseline: %s",
            shelf_id, exc,
        )

    if confidence in ("HIGH", "MEDIUM") and single_raw is not None:
        # ── High/medium confidence — return single-image result ───────────
        result = _single_image_to_analyze_response(
            single_raw, shelf_id, method="single_image", confidence=confidence
        )
        extra = {
            "status": single_raw.get("status"),
            "fill_percentage": single_raw.get("overall_fill_percentage"),
            "sections": single_raw.get("sections", []),
        }
        await _persist_smart_scan(shelf_id, result, extra, db)
        return result

    # ── Step 2: LOW confidence — attempt baseline comparison ─────────────────
    logger.info(
        "Low confidence (%s), attempting baseline fallback for shelf=%s",
        confidence, shelf_id,
    )

    baseline_result = await db.execute(
        text("""
            SELECT id, image_data FROM baselines
            WHERE shelf_id = :shelf_id
            ORDER BY captured_at DESC LIMIT 1
        """),
        {"shelf_id": shelf_id},
    )
    baseline_row = baseline_result.fetchone()

    if baseline_row is not None:
        try:
            # Two-image comparison — richer result with bboxes & substitutes
            analysis = await run_analysis(shelf_id, image_bytes, db)
            analysis.analysis_method = "baseline_comparison"
            analysis.ai_confidence = confidence  # show what triggered the fallback
            return analysis
        except Exception as exc:
            logger.warning("Baseline comparison also failed: %s", exc)

    # ── Step 3: Graceful degradation ─────────────────────────────────────────
    if single_raw is not None:
        logger.warning(
            "No baseline and low confidence — returning single-image result for shelf=%s", shelf_id
        )
        result = _single_image_to_analyze_response(
            single_raw, shelf_id, method="single_image_fallback", confidence=confidence
        )
        extra = {
            "status": single_raw.get("status"),
            "fill_percentage": single_raw.get("overall_fill_percentage"),
            "sections": single_raw.get("sections", []),
        }
        await _persist_smart_scan(shelf_id, result, extra, db)
        return result

    raise ValueError(
        "Analysis failed: single-image analysis could not complete. Please try again."
    )
