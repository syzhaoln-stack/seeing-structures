"""Synchronize fallback embeds and visible clock labels from audited video times."""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[1]
AUDITS = (
    ROOT / "research" / "video-audit-f0-f5-m0-m1.json",
    ROOT / "research" / "video-audit-m2-m7-x1-x3.json",
)
ARTICLE = re.compile(r"<article\b.*?</article>", re.DOTALL)
IFRAME_URL = re.compile(
    r'(?P<prefix><iframe\b[^>]*?\s)(?P<attribute>data-src|src)="(?P<url>[^"]+)"'
)
INERT_IFRAME = re.compile(
    r'(?P<iframe><iframe\b[^>]*?\sdata-src="(?P<url>[^"]+)"[^>]*></iframe>)'
    r'(?:\s*<noscript class="video-fallback">.*?</noscript>)?',
    re.DOTALL,
)
HUMAN_CLOCK = re.compile(r"(?P<prefix>(?:从)?约)(?P<clock>\d{2}:\d{2})(?P<suffix>起|开始)?")


def load_items() -> dict[str, dict[str, Any]]:
    items: dict[str, dict[str, Any]] = {}
    for path in AUDITS:
        raw = json.loads(path.read_text(encoding="utf-8"))
        records = raw.get("items") or raw.get("videos") if isinstance(raw, dict) else raw
        for item in records or []:
            items[item["id"]] = item
    return items


def canonical_start(item: dict[str, Any]) -> int:
    return int(item.get("clipStart", item.get("start", 0)))


def clock(seconds: int) -> str:
    minutes, secs = divmod(max(0, seconds), 60)
    return f"{minutes:02d}:{secs:02d}"


def identify(url: str) -> str | None:
    parsed = urlsplit(url)
    if "youtube" in parsed.netloc:
        match = re.search(r"/embed/([^/?#]+)", parsed.path)
        return match.group(1) if match else None
    if "bilibili.com" in parsed.netloc:
        return dict(parse_qsl(parsed.query)).get("bvid")
    return None


def timed_url(url: str, start: int) -> str:
    parsed = urlsplit(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if "youtube" in parsed.netloc:
        query["start"] = str(start)
    elif "bilibili.com" in parsed.netloc:
        query["t"] = str(start)
        query.setdefault("autoplay", "0")
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))


def source_url(video_id: str, start: int) -> str:
    if video_id.startswith("BV"):
        return f"https://www.bilibili.com/video/{video_id}/?t={start}"
    return f"https://www.youtube.com/watch?v={video_id}&t={start}s"


def rewrite_fragment(
    text: str,
    items: dict[str, dict[str, Any]],
    seen: set[str],
    update_clock: bool,
) -> str:
    matches = list(IFRAME_URL.finditer(text))
    ids = [identify(match.group("url")) for match in matches]
    ids = [video_id for video_id in ids if video_id in items]
    if not ids:
        return text
    if update_clock and len(ids) != 1:
        raise ValueError(f"Expected one video per article, found {ids}")

    def replace_url(match: re.Match[str]) -> str:
        video_id = identify(match.group("url"))
        if video_id not in items:
            return match.group(0)
        seen.add(video_id)
        url = timed_url(match.group("url"), canonical_start(items[video_id]))
        return f'{match.group("prefix")}data-src="{url}"'

    rewritten = IFRAME_URL.sub(replace_url, text)

    def add_fallback(match: re.Match[str]) -> str:
        video_id = identify(match.group("url"))
        if video_id not in items:
            return match.group(0)
        start = canonical_start(items[video_id])
        href = html.escape(source_url(video_id, start), quote=True)
        label = f"在原平台打开核心时刻 {clock(start)}"
        return (
            f'{match.group("iframe")}<noscript class="video-fallback">'
            f'<p><a href="{href}">{label}</a></p></noscript>'
        )

    rewritten = INERT_IFRAME.sub(add_fallback, rewritten)
    if update_clock:
        start = canonical_start(items[ids[0]])
        if start == 0:
            rewritten = HUMAN_CLOCK.sub("从开头", rewritten)
        else:
            rewritten = HUMAN_CLOCK.sub(
                lambda match: f"{match.group('prefix')}{clock(start)}{match.group('suffix') or ''}",
                rewritten,
            )
    return rewritten


def rewrite_page(path: Path, items: dict[str, dict[str, Any]]) -> tuple[str, set[str]]:
    source = path.read_text(encoding="utf-8")
    seen: set[str] = set()
    spans: list[tuple[int, int, str]] = []
    for match in ARTICLE.finditer(source):
        block = rewrite_fragment(match.group(0), items, seen, update_clock=True)
        spans.append((match.start(), match.end(), block))

    pieces: list[str] = []
    cursor = 0
    for start, end, block in spans:
        pieces.append(rewrite_fragment(source[cursor:start], items, seen, update_clock=False))
        pieces.append(block)
        cursor = end
    pieces.append(rewrite_fragment(source[cursor:], items, seen, update_clock=False))
    return "".join(pieces), seen


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    items = load_items()
    pages = sorted({ROOT / item["page"] for item in items.values()})
    all_seen: set[str] = set()
    changed: list[str] = []

    for path in pages:
        rewritten, seen = rewrite_page(path, items)
        all_seen.update(seen)
        source = path.read_text(encoding="utf-8")
        if rewritten != source:
            changed.append(path.relative_to(ROOT).as_posix())
            if not args.check:
                path.write_text(rewritten, encoding="utf-8")

    missing = sorted(set(items) - all_seen)
    if missing:
        raise SystemExit(f"Missing embedded IDs: {', '.join(missing)}")
    if args.check and changed:
        raise SystemExit("Unsynchronized video times: " + ", ".join(changed))
    action = "already synchronized" if not changed else "updated"
    print(f"Video fallback times {action}: pages={len(pages)} videos={len(all_seen)}")
    if changed:
        print("Changed: " + ", ".join(changed))


if __name__ == "__main__":
    main()
