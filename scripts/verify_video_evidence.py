"""Fail closed when the 51 video-evidence cards drift out of sync."""

from __future__ import annotations

import json
import html
import re
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlsplit


ROOT = Path(__file__).resolve().parents[1]
AUDITS = (
    ROOT / "research" / "video-audit-f0-f5-m0-m1.json",
    ROOT / "research" / "video-audit-m2-m7-x1-x3.json",
)
MANIFEST = ROOT / "assets" / "video-evidence-manifest.js"
FRAMES = ROOT / "assets" / "video-frames"
TARGET_PAGES = (
    *sorted((ROOT / "foundations").glob("f*.qmd")),
    *sorted((ROOT / "chapters").glob("m*.qmd")),
    *sorted((ROOT / "extensions").glob("x*.qmd")),
)


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def load_audits() -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for path in AUDITS:
        raw = json.loads(path.read_text(encoding="utf-8"))
        records = raw.get("items") or raw.get("videos") if isinstance(raw, dict) else raw
        items.extend(records or [])
    return items


def load_manifest() -> dict[str, dict[str, Any]]:
    code = (
        "globalThis.VIDEO_EVIDENCE_MANIFEST={};"
        f"require({json.dumps(str(MANIFEST))});"
        "process.stdout.write(JSON.stringify(globalThis.VIDEO_EVIDENCE_MANIFEST));"
    )
    result = subprocess.run(
        ["node", "-e", code],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


def embedded_records(path: Path) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    records: list[dict[str, Any]] = []
    for attributes in re.findall(r"<iframe\b([^>]*)>", text):
        data_src = re.search(r'\bdata-src="([^"]+)"', attributes)
        active_src = re.search(r'(?<!data-)\bsrc="([^"]+)"', attributes)
        match = data_src or active_src
        if not match:
            continue
        url = html.unescape(match.group(1))
        parsed = urlsplit(url)
        video_id = ""
        if "youtube" in parsed.netloc:
            video_id = re.search(r"/embed/([^/?#]+)", parsed.path).group(1)
        elif "bilibili.com" in parsed.netloc:
            video_id = parse_qs(parsed.query).get("bvid", [""])[0]
        if not video_id:
            continue
        query = parse_qs(parsed.query)
        records.append(
            {
                "id": video_id,
                "attribute": "data-src" if data_src else "src",
                "start": int((query.get("start") or query.get("t") or ["0"])[0]),
            }
        )
    return records


def source_video_id(url: str) -> str:
    parsed = urlsplit(url)
    if "youtube.com" in parsed.netloc:
        return parse_qs(parsed.query).get("v", [""])[0]
    if "youtu.be" in parsed.netloc:
        return parsed.path.strip("/").split("/")[0]
    if "bilibili.com" in parsed.netloc:
        match = re.search(r"/(BV[\w]+)", parsed.path, re.IGNORECASE)
        return match.group(1) if match else ""
    return ""


def main() -> None:
    errors: list[str] = []
    audits = load_audits()
    audits_by_id = {item["id"]: item for item in audits}
    manifest = load_manifest()
    ids = [item.get("id", "") for item in audits]
    counts = Counter(ids)

    if len(audits) != 51:
        fail(errors, f"audit count is {len(audits)}, expected 51")
    duplicates = sorted(video_id for video_id, count in counts.items() if count > 1)
    if duplicates:
        fail(errors, f"duplicate audit IDs: {', '.join(duplicates)}")

    qmd_by_page: dict[str, list[str]] = {}
    for path in TARGET_PAGES:
        page = path.relative_to(ROOT).as_posix()
        records = embedded_records(path)
        page_ids = [record["id"] for record in records]
        qmd_by_page[page] = page_ids
        if len(page_ids) != 3:
            fail(errors, f"{page} contains {len(page_ids)} embedded videos, expected 3")
        fallback_count = path.read_text(encoding="utf-8").count(
            '<noscript class="video-fallback">'
        )
        if fallback_count != 3:
            fail(errors, f"{page} has {fallback_count} noscript video fallbacks, expected 3")
        for record in records:
            item = audits_by_id.get(record["id"])
            if not item:
                continue
            expected_start = int(item.get("clipStart", item.get("start", 0)))
            if record["attribute"] != "data-src":
                fail(errors, f"{record['id']} still has an active iframe src in {page}")
            if record["start"] != expected_start:
                fail(
                    errors,
                    f"{record['id']} fallback starts at {record['start']}, expected {expected_start}",
                )

    source_ids = [video_id for page_ids in qmd_by_page.values() for video_id in page_ids]
    if Counter(source_ids) != Counter(ids):
        missing = sorted(set(ids) - set(source_ids))
        extra = sorted(set(source_ids) - set(ids))
        fail(errors, f"QMD/audit mismatch; missing={missing}, extra={extra}")

    expected_keys = {
        f"{'bilibili' if item['id'].startswith('BV') else 'youtube'}:{item['id']}"
        for item in audits
    }
    if set(manifest) != expected_keys:
        missing = sorted(expected_keys - set(manifest))
        extra = sorted(set(manifest) - expected_keys)
        fail(errors, f"manifest key mismatch; missing={missing}, extra={extra}")

    expected_frames: set[str] = set()
    rights_skipped = 0
    modes = Counter()
    for item in audits:
        video_id = item["id"]
        for field in ("page", "title", "source", "url", "duration", "focus"):
            if not item.get(field):
                fail(errors, f"{video_id} is missing required audit field {field}")
        if source_video_id(str(item.get("url", ""))) != video_id:
            fail(errors, f"{video_id} does not match its source URL")
        page = item.get("page", "")
        mode = item.get("mode")
        modes[mode] += 1
        if video_id not in qmd_by_page.get(page, []):
            fail(errors, f"{video_id} is audited for {page} but is not embedded there")
        if mode not in {"still", "stepper", "motion"}:
            fail(errors, f"{video_id} has invalid mode {mode!r}")

        start = int(item.get("clipStart", item.get("start", 0)))
        end = int(item.get("clipEnd", item.get("end", 0)))
        frame_time = int(item.get("frameTime", -1))
        duration = int(item.get("duration", 0))
        if not 0 <= start < end <= duration:
            fail(errors, f"{video_id} has invalid source range {start}-{end}/{duration}")
        if not int(item.get("start", 0)) <= frame_time <= int(item.get("end", 0)):
            fail(errors, f"{video_id} frameTime {frame_time} is outside its audited core range")
        if mode == "motion" and end - start > 90:
            fail(errors, f"{video_id} motion duration is {end - start}s (>90s)")
        if mode == "motion" and not start <= frame_time < end:
            fail(errors, f"{video_id} motion keyframe {frame_time}s is outside {start}-{end}s")
        if mode == "motion":
            for minutes, seconds in re.findall(
                r"(?<!\d)(\d{1,2}):([0-5]\d)(?!\d)", str(item.get("task", ""))
            ):
                task_time = int(minutes) * 60 + int(seconds)
                if not start <= task_time < end:
                    fail(
                        errors,
                        f"{video_id} task time {minutes}:{seconds} is outside {start}-{end}s",
                    )
        if not 2 <= len(item.get("labels") or []) <= 4:
            fail(errors, f"{video_id} needs 2-4 labels")
        if not 2 <= len(item.get("narration") or []) <= 4:
            fail(errors, f"{video_id} needs 2-4 narration steps")
        if not str(item.get("task", "")).strip():
            fail(errors, f"{video_id} has no student task")
        if "\ufffd" in json.dumps(item, ensure_ascii=False):
            fail(errors, f"{video_id} contains Unicode replacement characters")

        key = f"{'bilibili' if video_id.startswith('BV') else 'youtube'}:{video_id}"
        entry = manifest.get(key, {})
        if entry.get("mode") != mode:
            fail(errors, f"{video_id} mode differs between audit and manifest")
        if (entry.get("start"), entry.get("end"), entry.get("frameTime")) != (
            start,
            end,
            frame_time,
        ):
            fail(errors, f"{video_id} time fields differ between audit and manifest")
        expected_manifest_fields = {
            "title": item.get("focus"),
            "sourceTitle": item.get("title"),
            "labels": item.get("labels"),
            "narration": item.get("narration"),
            "task": item.get("task"),
            "credit": item.get("source"),
            "url": item.get("url"),
            "duration": item.get("duration"),
            "sourcePage": item.get("page"),
        }
        for field, expected in expected_manifest_fields.items():
            if entry.get(field) != expected:
                fail(errors, f"{video_id} {field} differs between audit and manifest")

        if item.get("rightsNote"):
            rights_skipped += 1
            if entry.get("rightsNote") != item.get("rightsNote"):
                fail(errors, f"{video_id} rightsNote differs between audit and manifest")
            if "poster" in entry:
                fail(errors, f"{video_id} has rightsNote but manifest still declares a poster")
            if (FRAMES / f"{video_id}.webp").exists():
                fail(errors, f"{video_id} has rightsNote but a local frame is present")
        else:
            expected_frames.add(f"{video_id}.webp")
            if entry.get("poster") != f"assets/video-frames/{video_id}.webp":
                fail(errors, f"{video_id} is missing its manifest poster")

    actual_frames = {path.name for path in FRAMES.glob("*.webp")}
    if actual_frames != expected_frames:
        missing = sorted(expected_frames - actual_frames)
        extra = sorted(actual_frames - expected_frames)
        fail(errors, f"frame set mismatch; missing={missing}, extra={extra}")

    if errors:
        print("VIDEO EVIDENCE VERIFICATION FAILED")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print(
        "VIDEO EVIDENCE VERIFIED | "
        f"pages={len(TARGET_PAGES)} videos={len(audits)} frames={len(actual_frames)} "
        f"rights-skipped={rights_skipped} modes={dict(sorted(modes.items()))}"
    )


if __name__ == "__main__":
    main()
