"""
Resolve a URL with yt-dlp WITHOUT downloading anything, and print a single
normalized JSON object describing either a single video or a playlist.

Usage: python3 ytdlp_resolve.py <url>
"""
import json
import sys

import yt_dlp


def pick_video_formats(info: dict):
    """Reduce yt-dlp's raw format list to one real entry per resolution,
    preferring progressive/mp4 formats and always keeping real filesize
    when yt-dlp reports it (filesize or filesize_approx)."""
    raw = info.get("formats") or []
    by_height: dict[int, dict] = {}

    for f in raw:
        height = f.get("height")
        vcodec = f.get("vcodec")
        if not height or vcodec in (None, "none"):
            continue  # audio-only or no video track

        size = f.get("filesize") or f.get("filesize_approx")
        candidate = {
            "formatId": f["format_id"],
            "height": height,
            "ext": f.get("ext"),
            "vcodec": vcodec.split(".")[0],
            "hasAudio": f.get("acodec") not in (None, "none"),
            "filesizeBytes": size,
            "fps": f.get("fps"),
        }

        existing = by_height.get(height)
        if existing is None:
            by_height[height] = candidate
            continue

        # Prefer a format that already has audio muxed in (progressive),
        # then prefer the one yt-dlp actually reports a real size for.
        existing_score = (existing["hasAudio"], existing["filesizeBytes"] is not None)
        candidate_score = (candidate["hasAudio"], candidate["filesizeBytes"] is not None)
        if candidate_score > existing_score:
            by_height[height] = candidate

    return sorted(by_height.values(), key=lambda f: -f["height"])


def pick_subtitles(info: dict):
    out = []
    for code, tracks in (info.get("subtitles") or {}).items():
        if tracks:
            out.append({"code": code, "auto": False, "label": tracks[0].get("name") or code})
    for code, tracks in (info.get("automatic_captions") or {}).items():
        if tracks:
            out.append({"code": code, "auto": True, "label": tracks[0].get("name") or code})
    return out


def main():
    url = sys.argv[1]
    ydl_opts = {
        'verbose': True,
        "quiet": False,
        "no_warnings": True,
        "skip_download": True,
        "extract_flat": "in_playlist",  # don't resolve every entry's formats up front
        "noplaylist": False,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if info.get("_type") == "playlist" or info.get("entries") is not None:
        entries = []
        for e in info.get("entries") or []:
            if e is None:
                continue
            entries.append({
                "id": e.get("id"),
                "url": e.get("url") or e.get("webpage_url") or e.get("id"),
                "title": e.get("title") or "Untitled",
                "duration": e.get("duration"),
            })
        result = {
            "type": "playlist",
            "title": info.get("title") or "Untitled playlist",
            "uploader": info.get("uploader") or info.get("channel") or "Unknown",
            "entries": entries,
        }
    else:
        # extract_flat gave us a shallow record for single videos too in some
        # extractors; re-resolve fully (not flat) to get real formats/subs.
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as ydl2:
            full = ydl2.extract_info(url, download=False)
        result = {
            "type": "video",
            "title": full.get("title") or "Untitled",
            "uploader": full.get("uploader") or full.get("channel") or "Unknown",
            "duration": full.get("duration") or 0,
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
    except Exception as e:  # noqa: BLE001 - surface any extractor error as JSON
        print(json.dumps({"type": "error", "message": str(e)}))
        sys.exit(1)
