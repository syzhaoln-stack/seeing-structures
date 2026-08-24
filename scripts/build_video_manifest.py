"""Merge editorial video audits into the browser-side evidence manifest."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_AUDITS = (
    ROOT / "research" / "video-audit-f0-f5-m0-m1.json",
    ROOT / "research" / "video-audit-m2-m7-x1-x3.json",
)


def clock(seconds: float | int) -> str:
    value = max(0, int(seconds))
    hours, remainder = divmod(value, 3600)
    minutes, secs = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}" if hours else f"{minutes:02d}:{secs:02d}"


def audit_items(path: Path) -> list[dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return raw
    return raw.get("items") or raw.get("videos") or []


def provider_for(url: str) -> str:
    if "youtube.com" in url or "youtu.be" in url:
        return "youtube"
    if "bilibili.com" in url:
        return "bilibili"
    raise ValueError(f"Unsupported video provider: {url}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audits", nargs="*", type=Path, default=list(DEFAULT_AUDITS))
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "assets" / "video-evidence-manifest.js",
    )
    parser.add_argument("--allow-partial", action="store_true")
    args = parser.parse_args()

    audits: list[dict[str, Any]] = []
    for path in args.audits:
        if path.exists():
            audits.extend(audit_items(path))
        elif not args.allow_partial:
            raise FileNotFoundError(path)

    entries: dict[str, dict[str, Any]] = {}
    seen: set[str] = set()
    for audit in audits:
        video_id = audit["id"]
        if video_id in seen:
            raise ValueError(f"Duplicate audit record: {video_id}")
        seen.add(video_id)
        mode = audit.get("mode")
        if mode not in {"still", "motion", "stepper"}:
            raise ValueError(f"Invalid mode for {video_id}: {mode}")
        provider = provider_for(audit["url"])
        core_start = int(audit.get("start", 0))
        core_end = int(audit.get("end", 0))
        start = int(audit.get("clipStart", core_start))
        end = int(audit.get("clipEnd", core_end))
        frame_time = int(audit.get("frameTime", start))
        if end <= start:
            raise ValueError(f"Invalid clip range for {video_id}: {start}-{end}")
        if mode == "motion" and end - start > 90:
            raise ValueError(
                f"Motion clip exceeds 90 seconds for {video_id}: {start}-{end}"
            )
        if mode == "motion" and not start <= frame_time < end:
            raise ValueError(
                f"Motion keyframe is outside clip for {video_id}: "
                f"frame={frame_time}, clip={start}-{end}"
            )
        decision_reason = {
            "still": "关键关系能在一帧中完整读取，无需先播放整段。",
            "motion": "变化的先后顺序本身就是证据，单张截图不能替代。",
            "stepper": "原片以逐步推导为主；分步揭示与暂停预测比连续播放更清楚。",
        }[mode]
        key = f"{provider}:{video_id}"
        rights_note = audit.get("rightsNote")
        entry = {
            "mode": mode,
            "title": audit.get("focus") or audit["title"],
            "sourceTitle": audit["title"],
            "watch": audit.get("focus") or audit.get("task"),
            "why": decision_reason,
            "labels": audit.get("labels") or [],
            "narration": audit.get("narration") or [],
            "task": audit.get("task") or "看片前先预测，看片后只修正证据不支持的部分。",
            "start": start,
            "end": end,
            "coreStart": core_start,
            "coreEnd": core_end,
            "keyframe": clock(frame_time),
            "frameTime": frame_time,
            "credit": audit["source"],
            "creator": audit["source"],
            "publisher": "YouTube" if provider == "youtube" else "Bilibili",
            "url": audit["url"],
            "purpose": audit.get("task"),
            "duration": audit["duration"],
            "sourcePage": audit["page"],
            "boundary": rights_note
            or "本卡只保留一张低分辨率教学关键帧、原创中文标注和原平台时间链接；视频版权归原作者及发布平台。",
        }
        if not rights_note:
            entry["poster"] = f"assets/video-frames/{video_id}.webp"
        else:
            entry["rightsNote"] = rights_note
        entries[key] = entry

    banner = """/*
 * 由 scripts/build_video_manifest.py 根据逐条审看记录生成。
 * 不复制视频或完整字幕；只提供关键帧、中文导看和原平台时间片。
 */
globalThis.VIDEO_EVIDENCE_MANIFEST = {
  ...(globalThis.VIDEO_EVIDENCE_MANIFEST || {}),
"""
    body = json.dumps(entries, ensure_ascii=False, indent=2)[1:-1]
    args.output.write_text(f"{banner}{body}\n}};\n", encoding="utf-8")
    print(f"Wrote {len(entries)} entries to {args.output}")


if __name__ == "__main__":
    main()
