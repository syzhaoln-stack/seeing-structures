"""Collect public metadata for video embeds used by the Quarto book.

The output is a cache for editorial review.  It deliberately does not download
or redistribute videos.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIRS = ("foundations", "chapters", "extensions")
IFRAME_RE = re.compile(
    r'<iframe\b[^>]*?\s(?:data-src|src)="(?P<src>[^"]+(?:youtube|bilibili)[^"]*)"'
    r'[^>]+title="(?P<title>[^"]*)"',
    re.IGNORECASE,
)


def parse_embed(src: str) -> tuple[str, str, int]:
    youtube = re.search(r"/embed/([^?&\"]+)", src)
    bilibili = re.search(r"bvid=([^&\"]+)", src)
    start = re.search(r"[?&](?:start|t)=(\d+)", src)
    if youtube:
        return "youtube", youtube.group(1), int(start.group(1)) if start else 0
    if bilibili:
        return "bilibili", bilibili.group(1), int(start.group(1)) if start else 0
    raise ValueError(f"Unsupported embed URL: {src}")


def inventory() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for source_dir in SOURCE_DIRS:
        for page in sorted((ROOT / source_dir).glob("*.qmd")):
            text = page.read_text(encoding="utf-8")
            for ordinal, match in enumerate(IFRAME_RE.finditer(text), start=1):
                src = match.group("src")
                platform, video_id, existing_start = parse_embed(src)
                watch_url = (
                    f"https://www.youtube.com/watch?v={video_id}"
                    if platform == "youtube"
                    else f"https://www.bilibili.com/video/{video_id}/"
                )
                items.append(
                    {
                        "page": page.relative_to(ROOT).as_posix(),
                        "ordinal": ordinal,
                        "platform": platform,
                        "id": video_id,
                        "watch_url": watch_url,
                        "embed_src": src,
                        "declared_title": match.group("title"),
                        "existing_start": existing_start,
                    }
                )
    return items


def fetch(item: dict[str, Any]) -> dict[str, Any]:
    command = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--skip-download",
        "--dump-single-json",
        "--no-warnings",
        item["watch_url"],
    ]
    try:
        completed = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=90,
        )
        raw = json.loads(completed.stdout)
        metadata = {
            "status": "ok",
            "title": raw.get("title"),
            "channel": raw.get("channel") or raw.get("uploader"),
            "duration": raw.get("duration"),
            "description": raw.get("description"),
            "chapters": raw.get("chapters") or [],
            "thumbnail": raw.get("thumbnail"),
            "subtitles": sorted((raw.get("subtitles") or {}).keys()),
            "automatic_captions": sorted(
                (raw.get("automatic_captions") or {}).keys()
            ),
        }
    except Exception as exc:  # keep the rest of the audit usable
        metadata = {"status": "error", "error": str(exc)}
    return {**item, **metadata}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / ".cache" / "video-metadata.json",
    )
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    items = inventory()
    results: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        futures = {pool.submit(fetch, item): item for item in items}
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            print(
                f"[{result['status']}] {result['page']} #{result['ordinal']} "
                f"{result['id']}",
                flush=True,
            )

    results.sort(key=lambda item: (item["page"], item["ordinal"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    failures = [item for item in results if item["status"] != "ok"]
    print(f"Wrote {len(results)} records to {args.output}")
    print(f"Metadata failures: {len(failures)}")


if __name__ == "__main__":
    main()
