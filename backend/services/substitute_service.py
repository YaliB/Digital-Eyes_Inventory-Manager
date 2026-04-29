"""pgvector cosine similarity search for substitute product suggestions."""

import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.schemas.analyze import SubstituteProduct

logger = logging.getLogger(__name__)


async def find_substitutes(
    missing_product_name: str | None,
    category: str,
    db: AsyncSession,
    limit: int = 3,
) -> list[SubstituteProduct]:
    """
    Return substitute products for a gap using pgvector cosine similarity.

    Strategy:
      1. Try a pgvector similarity search on product embeddings (requires the
         products table to have an `embedding` vector column).
      2. Fall back to a plain category-match query if pgvector is unavailable
         or the embedding column doesn't exist yet.

    Returns up to `limit` SubstituteProduct objects, empty list on any error.
    """
    # ── pgvector path ─────────────────────────────────────────────────────────
    if missing_product_name:
        try:
            from backend.ai.embeddings import get_embedding  # noqa: PLC0415

            query_vec = await get_embedding(
                f"{missing_product_name}. Category: {category}"
            )
            vec_literal = f"[{','.join(str(v) for v in query_vec)}]"

            result = await db.execute(
                text("""
                    SELECT
                        p.id::text        AS sku,
                        p.name            AS name,
                        COALESCE(p.category, :category) AS category,
                        COALESCE(i.quantity, 0)          AS warehouse_qty,
                        1 - (p.embedding <=> :vec::vector) AS similarity_score
                    FROM products p
                    LEFT JOIN inventory i ON i.product_id = p.id
                    WHERE p.embedding IS NOT NULL
                    ORDER BY p.embedding <=> :vec::vector
                    LIMIT :limit
                """),
                {"vec": vec_literal, "category": category, "limit": limit},
            )
            rows = result.fetchall()
            if rows:
                return [
                    SubstituteProduct(
                        sku=row.sku,
                        name=row.name,
                        category=row.category,
                        warehouse_qty=row.warehouse_qty,
                        similarity_score=round(float(row.similarity_score), 3),
                    )
                    for row in rows
                ]
        except Exception as exc:
            logger.debug(
                "pgvector substitutes unavailable (%s), falling back to category match",
                exc,
            )

    # ── category-match fallback ───────────────────────────────────────────────
    try:
        result = await db.execute(
            text("""
                SELECT
                    p.id::text        AS sku,
                    p.name            AS name,
                    COALESCE(p.category, :category) AS category,
                    COALESCE(i.quantity, 0)          AS warehouse_qty
                FROM products p
                LEFT JOIN inventory i ON i.product_id = p.id
                WHERE LOWER(COALESCE(p.category, '')) = LOWER(:category)
                LIMIT :limit
            """),
            {"category": category, "limit": limit},
        )
        rows = result.fetchall()
        return [
            SubstituteProduct(
                sku=row.sku,
                name=row.name,
                category=row.category,
                warehouse_qty=row.warehouse_qty,
                similarity_score=0.0,
            )
            for row in rows
        ]
    except Exception as exc:
        logger.warning("Category-match substitute search failed: %s", exc)
        return []
