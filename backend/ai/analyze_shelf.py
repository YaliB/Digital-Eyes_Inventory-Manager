"""
CLI utility for single-image shelf analysis.
Uses the project's shared AI provider and prompts.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from backend.ai.vision import analyze_single_shelf


def detect_media_type(image_path: str) -> str:
    """Infer the image media type from the file suffix."""
    suffix = Path(image_path).suffix.lower()
    media_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
    }
    return media_map.get(suffix, "image/jpeg")


def load_api_key_from_dotenv() -> str:
    """Load OPENAI_API_KEY strictly from a local .env file next to this script."""
    dotenv_path = Path(__file__).resolve().parent / ".env"
    if not dotenv_path.is_file():
        raise EnvironmentError(
            f"Missing .env file at: {dotenv_path}. "
            "Create it and add OPENAI_API_KEY=<your_key>."
        )

    with open(dotenv_path, "r", encoding="utf-8") as file:
        for raw_line in file:
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


async def run_cli_analysis(image_path: str) -> dict:
    """Load the image and analyze it through the shared backend AI flow."""
    if not os.getenv("OPENAI_API_KEY"):
        os.environ["OPENAI_API_KEY"] = load_api_key_from_dotenv()

    with open(image_path, "rb") as file:
        image_bytes = file.read()

    return await analyze_single_shelf(
        image_bytes=image_bytes,
        media_type=detect_media_type(image_path),
    )


def print_report(result: dict, image_path: str) -> None:
    """Pretty-print the analysis result to stdout."""
    status = result.get("status", "UNKNOWN")
    fill = result.get("overall_fill_percentage", "?")
    confidence = result.get("confidence", "?")
    summary = result.get("summary", "")
    restocking_list = result.get("restocking_list", [])

    status_icon = {"FULL": "OK", "PARTIAL": "WARN", "EMPTY": "ALERT"}.get(status, "?")

    print("=" * 60)
    print("  SHELF ANALYSIS REPORT")
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
        for section in sections:
            gap = "gaps" if section.get("gaps_detected") else "ok"
            print(f"    [{section.get('state', '?'):5}] {section.get('location', '')} - {gap}")
            if section.get("notes"):
                print(f"           Note: {section['notes']}")
            products = section.get("products_present", [])
            if products:
                print(f"           Products: {', '.join(products)}")
        print()

    if restocking_list:
        print("  RESTOCKING LIST:")
        for index, item in enumerate(restocking_list, 1):
            urgency = item.get("urgency", "?")
            print(
                f"    {index:2}. [{urgency:6}] {item.get('item', '')} @ {item.get('location', '')}"
            )
            print(f"          Reason: {item.get('reason', '')}")
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
        result = asyncio.run(run_cli_analysis(image_path))
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
