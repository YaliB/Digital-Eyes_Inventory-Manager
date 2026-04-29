"""Computes the 0-100 shelf health score from detected gaps."""


def compute_health_score(gaps: list[dict]) -> int:
    """
    Derive a shelf health score (0-100) from the list of detected gaps.

    Uses the AI-provided shelf_health_score when present; otherwise
    calculates from gap severity counts so the service works even if
    the AI omits that field.

    Severity weights:
      fully_out  → -15 points per gap
      low_stock  →  -5 points per gap
      unknown    →  -8 points per gap
    """
    if not gaps:
        return 100

    penalty = 0
    for gap in gaps:
        severity = gap.get("severity", "unknown")
        if severity == "fully_out":
            penalty += 15
        elif severity == "low_stock":
            penalty += 5
        else:
            penalty += 8

    score = max(0, 100 - penalty)
    return int(score)


def score_to_label(score: int) -> str:
    """Map a 0-100 health score to a human-readable status label."""
    if score >= 80:
        return "Good"
    if score >= 50:
        return "Warning"
    return "Critical"


def score_to_color(score: int) -> str:
    """Map a 0-100 health score to a UI colour token."""
    if score >= 80:
        return "green"
    if score >= 50:
        return "yellow"
    return "red"
