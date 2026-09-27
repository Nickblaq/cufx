"""
Resolve a URL with yt-dlp WITHOUT downloading. Prints a single
normalized JSON object describing either a video or a playlist.

Always exits 0 — success/failure is encoded in the JSON body itself
("type": "video" | "playlist" | "error"), never in the process exit code.

Usage: python3 ytdlp_resolve.py <url>
"""
import json
import sys

import yt_dlp


def pick_video_formats(info: dict):
    """Reduce yt-dlp's raw format list to one entry per height,
    preferring the format with audio already muxed in when yt-dlp
    reports more than one candidate at the same height."""
    raw = info.get("formats") or []
    by_height: dict[int, dict] = {}

    for f in raw:
        height = f.get("height")
        vcodec = f.get("vcodec")
        if not height or vcodec in (None, "none"):
            continue  # audio-only or no video track

        has_audio = f.get("acodec") not in (None, "none")
        size = f.get("filesize") or f.get("filesize_approx")
        candidate = {
            "formatId": f.get("format_id"),
            "height": height,
            "ext": f.get("ext"),
            "vcodec": (vcodec or "").split(".")[0],
            "hasAudio": has_audio,
            "filesizeBytes": size,
            "fps": f.get("fps"),
        }

        existing = by_height.get(height)
        if existing is None:
            by_height[height] = candidate
            continue

        # Prefer a format that already has audio (progressive), then
        # prefer the one with the larger reported filesize.
        existing_score = (existing["hasAudio"], existing["filesizeBytes"] or 0)
        candidate_score = (candidate["hasAudio"], candidate["filesizeBytes"] or 0)
        if candidate_score > existing_score:
            by_height[height] = candidate

    return sorted(by_height.values(), key=lambda x: x["height"], reverse=True)


def pick_subtitles(info: dict):
    out = []
    for code, tracks in (info.get("subtitles") or {}).items():
        if tracks:
            out.append({"code": code, "auto": False, "label": tracks[0].get("name") or code})
    for code, tracks in (info.get("automatic_captions") or {}).items():
        if tracks:
            out.append({"code": code, "auto": True, "label": tracks[0].get("name") or code})
    return out


def emit_error(message: str):
    print(json.dumps({"type": "error", "message": message}))


def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        emit_error("No URL provided")
        return

    url = sys.argv[1].strip()

    # quiet=True is load-bearing: with verbose/quiet=False, yt-dlp writes
    # debug and progress text to stdout ahead of our JSON line below,
    # which breaks JSON.parse on the Node side for every single call.
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "noplaylist": False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        emit_error(f"Could not resolve this link: {e}")
        return

    if info is None:
        emit_error("yt-dlp returned no data for this link")
        return

    if info.get("_type") == "playlist":
        entries = []
        for e in info.get("entries") or []:
            if e is None:
                continue
            entries.append({
                "id": e.get("id"),
                "url": e.get("url") or e.get("id"),
                "title": e.get("title"),
                "duration": e.get("duration"),
            })
        result = {
            "type": "playlist",
            "title": info.get("title"),
            "uploader": info.get("uploader"),
            "entries": entries,
        }
        print(json.dumps(result))
        return

    # extract_flat gave us a shallow record for some extractors;
    # re-resolve fully to get real formats/thumbnail/subtitles.
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as ydl2:
            full = ydl2.extract_info(url, download=False)
    except Exception as e:
        emit_error(f"Could not read video details: {e}")
        return

    if full is None:
        emit_error("yt-dlp returned no data for this video")
        return

    result = {
        "type": "video",
        "title": full.get("title"),
        "uploader": full.get("uploader"),
        "duration": full.get("duration"),
        "thumbnail": full.get("thumbnail"),
        "viewCount": full.get("view_count"),
        "uploadDate": full.get("upload_date"),
        "videoFormats": pick_video_formats(full),
        "hasAudio": any(
            (f.get("acodec") not in (None, "none")) for f in (full.get("formats") or [])
        ),
        "subtitles": pick_subtitles(full),
    }
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # last-resort catch — should be unreachable
        emit_error(f"Unexpected error: {e}")
