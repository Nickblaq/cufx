"""
Resolve a URL with yt-dlp and print a single JSON object describing either
a video or a playlist.

Always exits 0. Success or failure is encoded in the JSON body itself
(`"type": "video" | "playlist" | "error"`), never in the process exit code —
that's the part that was breaking the previous implementation.

Usage: python3 extract_info.py <url>
"""
import json
import sys


def emit_error(message: str):
    print(json.dumps({"type": "error", "message": message}))


def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        emit_error("No URL provided")
        return

    url = sys.argv[1].strip()

    try:
        import yt_dlp
    except Exception as e:
        emit_error(f"yt-dlp is not available in this environment: {e}")
        return

    # Cheap first pass: detect video vs playlist without resolving every entry.
    flat_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",
        "noplaylist": False,
    }

    try:
        with yt_dlp.YoutubeDL(flat_opts) as ydl:
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
            "count": len(entries),
            "entries": entries,
        }
        print(json.dumps(result))
        return

    # Single video — the flat pass above gives a shallow record for some
    # extractors, so re-resolve fully to get real formats/thumbnail/etc.
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as ydl:
            full = ydl.extract_info(url, download=False)
    except Exception as e:
        emit_error(f"Could not read video details: {e}")
        return

    if full is None:
        emit_error("yt-dlp returned no data for this video")
        return

    formats = []
    seen_heights = set()
    for f in full.get("formats") or []:
        height = f.get("height")
        vcodec = f.get("vcodec")
        if not height or vcodec in (None, "none"):
            continue
        if height in seen_heights:
            continue
        seen_heights.add(height)
        formats.append({
            "formatId": f.get("format_id"),
            "height": height,
            "ext": f.get("ext"),
            "filesize": f.get("filesize") or f.get("filesize_approx"),
        })
    formats.sort(key=lambda x: x["height"], reverse=True)

    subtitles = []
    for code, tracks in (full.get("subtitles") or {}).items():
        if tracks:
            subtitles.append({"code": code, "auto": False})
    for code, tracks in (full.get("automatic_captions") or {}).items():
        if tracks:
            subtitles.append({"code": code, "auto": True})

    result = {
        "type": "video",
        "title": full.get("title"),
        "uploader": full.get("uploader"),
        "duration": full.get("duration"),
        "thumbnail": full.get("thumbnail"),
        "viewCount": full.get("view_count"),
        "uploadDate": full.get("upload_date"),
        "formats": formats,
        "subtitles": subtitles,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # last-resort catch — should be unreachable
        emit_error(f"Unexpected error: {e}")
