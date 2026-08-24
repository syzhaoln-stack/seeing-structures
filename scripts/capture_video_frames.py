"""Capture one low-resolution teaching keyframe per audited video.

Only a single frame is retained.  Motion remains on the source platform and is
played through a timestamped embed; this script never republishes video clips.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
METADATA = ROOT / ".cache" / "video-metadata.json"
DEFAULT_AUDITS = (
    ROOT / "research" / "video-audit-f0-f5-m0-m1.json",
    ROOT / "research" / "video-audit-m2-m7-x1-x3.json",
)


def load_records(audit_paths: list[Path]) -> list[dict[str, Any]]:
    metadata = {}
    if METADATA.exists():
        metadata = {
            item["id"]: item
            for item in json.loads(METADATA.read_text(encoding="utf-8"))
        }
    audits: list[dict[str, Any]] = []
    for path in audit_paths:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            records = raw.get("items") or raw.get("videos") or []
        else:
            records = raw
        audits.extend(records)
    records = []
    for audit in audits:
        video_id = audit["id"]
        url = audit["url"]
        if "youtube.com" in url or "youtu.be" in url:
            platform = "youtube"
        elif "bilibili.com" in url:
            platform = "bilibili"
        else:
            raise ValueError(f"Unsupported video provider: {url}")
        records.append(
            {
                **metadata.get(video_id, {}),
                **audit,
                "platform": platform,
                "watch_url": url,
            }
        )
    return records


def run(command: list[str], timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=timeout,
    )


def youtube_frame(record: dict[str, Any], output: Path) -> None:
    media = run(
        [
            sys.executable,
            "-m",
            "yt_dlp",
            "-f",
            "worstvideo[height>=360][height<=720][ext=mp4]/"
            "worstvideo[height>=360][ext=mp4]/worstvideo[ext=mp4]/worst",
            "--get-url",
            "--no-warnings",
            record["watch_url"],
        ]
    ).stdout.splitlines()[0]
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            str(record["frameTime"]),
            "-i",
            media,
            "-frames:v",
            "1",
            "-vf",
            "scale=960:-2",
            "-q:v",
            "76",
            "-y",
            str(output),
        ]
    )


def downloaded_segment_frame(record: dict[str, Any], output: Path) -> None:
    segment_dir = ROOT / ".cache" / "video-frame-segments" / record["id"]
    if segment_dir.exists():
        shutil.rmtree(segment_dir)
    segment_dir.mkdir(parents=True, exist_ok=True)
    start = max(0.0, float(record["frameTime"]) - 0.35)
    end = start + 1.4
    template = segment_dir / "segment.%(ext)s"
    run(
        [
            sys.executable,
            "-m",
            "yt_dlp",
            "--no-warnings",
            "-f",
            "worstvideo[height>=360][height<=720]/worstvideo/worst",
            "--download-sections",
            f"*{start}-{end}",
            "--force-keyframes-at-cuts",
            "-o",
            str(template),
            record["watch_url"],
        ],
        timeout=180,
    )
    candidates = [p for p in segment_dir.iterdir() if p.is_file()]
    if not candidates:
        raise RuntimeError(f"No segment was downloaded for {record['id']}")
    run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            "0.35",
            "-i",
            str(candidates[0]),
            "-frames:v",
            "1",
            "-vf",
            "scale=960:-2",
            "-q:v",
            "76",
            "-y",
            str(output),
        ]
    )


def capture(record: dict[str, Any], output_dir: Path, force: bool) -> dict[str, str]:
    output = output_dir / f"{record['id']}.webp"
    if record.get("rightsNote"):
        return {
            "id": record["id"],
            "status": "rights-skipped",
            "output": "",
        }
    if output.exists() and not force:
        return {"id": record["id"], "status": "cached", "output": str(output)}
    try:
        if record["platform"] == "youtube":
            try:
                youtube_frame(record, output)
            except Exception:
                downloaded_segment_frame(record, output)
        else:
            downloaded_segment_frame(record, output)
        return {"id": record["id"], "status": "ok", "output": str(output)}
    except Exception as exc:
        return {"id": record["id"], "status": "error", "error": str(exc)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audits", nargs="*", type=Path, default=list(DEFAULT_AUDITS))
    parser.add_argument(
        "--output-dir", type=Path, default=ROOT / "assets" / "video-frames"
    )
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    records = load_records(args.audits)
    results = []
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        futures = {
            pool.submit(capture, record, args.output_dir, args.force): record
            for record in records
        }
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            print(f"[{result['status']}] {result['id']}", flush=True)

    failures = [result for result in results if result["status"] == "error"]
    skipped = [result for result in results if result["status"] == "rights-skipped"]
    print(
        f"Frames: {len(results) - len(failures) - len(skipped)}/{len(results)}; "
        f"rights-skipped: {len(skipped)}"
    )
    if failures:
        print(json.dumps(failures, ensure_ascii=False, indent=2))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
