"""
Supermarket Shelf Analyzer
Analyzes shelf images using OpenAI GPT-4 Vision to detect stock levels.
API key is read only from a local .env file.
"""

import base64
import sys
from pathlib import Path

from openai import OpenAI


SYSTEM_PROMPT = """You are an expert retail shelf-auditing AI with years of experience in
visual merchandising, planogram compliance, and inventory management.

Your task is to analyze supermarket shelf images and produce a precise, structured stock-level report.

Follow these rules strictly:
1. Carefully examine every shelf row/section visible in the image.
2. Identify product categories, product types, and any visible brand names or labels.
3. Look for empty spaces, gaps between products, missing facings, and partially depleted rows.
4. Base your assessment solely on what you can observe in the image.
5. Always respond in English.
6. Always use the exact JSON structure specified by the user — no extra keys, no markdown fences."""


ANALYSIS_PROMPT = """Analyze the supermarket shelf in this image and return a JSON object with the following structure:

{
  "status": "<one of: FULL | PARTIAL | EMPTY>",
  "confidence": "<one of: HIGH | MEDIUM | LOW>",
  "summary": "<one concise sentence describing the overall shelf state>",
  "restocking_required": <true | false>,
  "sections": [
    {
      "location": "<shelf row or area, e.g. 'Top shelf', 'Middle row – left side'>",
      "state": "<FULL | LOW | EMPTY>",
      "products_present": ["<product or category name>", ...],
      "gaps_detected": <true | false>,
      "notes": "<optional detail about what is missing or depleted>"
    }
  ],
  "restocking_list": [
    {
      "item": "<product name or category>",
      "location": "<shelf section where it belongs>",
      "urgency": "<HIGH | MEDIUM | LOW>",
      "reason": "<short explanation, e.g. 'Shelf completely empty', '2 facings missing'>"
    }
  ],
  "overall_fill_percentage": <estimated integer 0-100>
}

Rules:
- "status" must be FULL when fill ≥ 90 %, PARTIAL when 20 %–89 %, EMPTY when < 20 %.
- "restocking_list" must be empty [] only when status is FULL.
- When status is EMPTY, treat the entire visible shelf as a single restocking item if individual
  products cannot be identified, with urgency HIGH.
- Do NOT wrap the JSON in markdown code fences.
- Return ONLY the raw JSON object, nothing else."""


def encode_image(image_path: str) -> tuple[str, str]:
    """Return (base64_data, media_type) for the given image file."""
    suffix = Path(image_path).suffix.lower()
    media_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    media_type = media_map.get(suffix, "image/jpeg")
    with open(image_path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("utf-8")
    return data, media_type


def load_api_key_from_dotenv() -> str:
    """Load OPENAI_API_KEY strictly from .env file in the project directory."""
    dotenv_path = Path(__file__).resolve().parent / ".env"
    if not dotenv_path.is_file():
        raise EnvironmentError(
            f"Missing .env file at: {dotenv_path}. "
            "Create it and add OPENAI_API_KEY=<your_key>."
        )

    with open(dotenv_path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export "):].strip()

            if "=" not in line:
                continue

            key, value = line.split("=", 1)
            if key.strip() == "OPENAI_API_KEY":
                cleaned = value.strip().strip('"').strip("'")
                if cleaned:
                    return cleaned

    raise EnvironmentError(
        "OPENAI_API_KEY not found in .env file. "
        "Add OPENAI_API_KEY=<your_key> to .env."
    )


def analyze_shelf(image_path: str) -> dict:
    """
    Send the shelf image to OpenAI and return the parsed analysis dict.
    Raises ValueError if the API returns unexpected output.
    """
    api_key = load_api_key_from_dotenv()

    client = OpenAI(api_key=api_key)

    image_data, media_type = encode_image(image_path)

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_data}",
                            "detail": "high",
                        },
                    },
                    {"type": "text", "text": ANALYSIS_PROMPT},
                ],
            },
        ],
        max_tokens=1500,
        temperature=0,  # deterministic output for auditing
    )

    raw = response.choices[0].message.content.strip()

    import json
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Model returned non-JSON output.\n---\n{raw}\n---"
        ) from exc

    return result


def print_report(result: dict, image_path: str) -> None:
    """Pretty-print the analysis result to stdout."""
    import json

    status = result.get("status", "UNKNOWN")
    fill = result.get("overall_fill_percentage", "?")
    confidence = result.get("confidence", "?")
    summary = result.get("summary", "")
    restocking_list = result.get("restocking_list", [])

    status_icon = {"FULL": "✅", "PARTIAL": "⚠️", "EMPTY": "🚨"}.get(status, "❓")

    print("=" * 60)
    print(f"  SHELF ANALYSIS REPORT")
    print(f"  Image : {image_path}")
    print("=" * 60)
    print(f"  Status            : {status_icon}  {status}")
    print(f"  Fill level        : {fill}%")
    print(f"  Confidence        : {confidence}")
    print(f"  Summary           : {summary}")
    print(f"  Restocking needed : {'YES' if result.get('restocking_required') else 'NO'}")
    print()

    sections = result.get("sections", [])
    if sections:
        print("  SECTIONS:")
        for sec in sections:
            gap = "⚠️ gaps" if sec.get("gaps_detected") else "ok"
            print(f"    [{sec.get('state','?'):5}] {sec.get('location','')} — {gap}")
            if sec.get("notes"):
                print(f"           Note: {sec['notes']}")
            products = sec.get("products_present", [])
            if products:
                print(f"           Products: {', '.join(products)}")
        print()

    if restocking_list:
        print("  RESTOCKING LIST:")
        for idx, item in enumerate(restocking_list, 1):
            urgency = item.get("urgency", "?")
            urgency_icon = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(urgency, "⚪")
            print(
                f"    {idx:2}. {urgency_icon} [{urgency:6}] {item.get('item','')} "
                f"@ {item.get('location','')}"
            )
            print(f"          Reason: {item.get('reason','')}")
        print()
    else:
        print("  No restocking required. Shelf is well stocked.\n")

    print("  RAW JSON:")
    print(json.dumps(result, indent=4))
    print("=" * 60)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python analyze_shelf.py <image_path>")
        print("Example: python analyze_shelf.py pics/half.jpg")
        sys.exit(1)

    image_path = sys.argv[1]

    if not Path(image_path).is_file():
        print(f"Error: File not found: {image_path}")
        sys.exit(1)

    print(f"Analyzing shelf image: {image_path} ...")
    try:
        result = analyze_shelf(image_path)
        print_report(result, image_path)
    except EnvironmentError as exc:
        print(f"Configuration error: {exc}")
        print("Tip: create/update .env file with OPENAI_API_KEY=<your_key>.")
        sys.exit(2)
    except Exception as exc:
        print(f"Unexpected error: {exc}")
        sys.exit(3)


if __name__ == "__main__":
    main()
