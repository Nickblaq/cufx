"""
Run a real yt-dlp download and continuously write progress to a status JSON
file so the Node API can poll it without blocking on this (potentially long)
process.

Usage:
  python3 ytdlp_download.py <status_file> <output_dir> <options_json>

<options_json> is a JSON string (see app/api/extract/start/route.ts for the
shape) describing the url, mode (video/audio), quality selection, and the
extras (subtitles, thumbnail, metadata, sponsorblock, chapters, clip range).
"""
import json
import sys
import time
import traceback

import yt_dlp
from yt_dlp.utils import download_range_func


def write_status(status_file: str, data: dict):
    tmp = status_file + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f)
    # atomic-ish replace so the Node side never reads a half-written file
    import os
    os.replace(tmp, status_file)


def main():
    status_file, output_dir, options_json = sys.argv[1], sys.argv[2], sys.argv[3]

    state = {"status": "starting", "progress": 0, "downloadedBytes": 0,
              "totalBytes": None, "speed": None, "eta": None, "error": None,
              "filename": None}
    write_status(status_file, state)

    try:
        opts = json.loads(options_json)
    except Exception as e:
        state.update({"status": "error", "error": f"Invalid job options: {e}"})
        write_status(status_file, state)
        return

    last_write = 0.0

    def hook(d):
        nonlocal last_write
        now = time.time()
        if d["status"] == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            downloaded = d.get("downloaded_bytes", 0)
            state.update({
                "status": "downloading",
                "progress": round((downloaded / total) * 100, 1) if total else state["progress"],
                "downloadedBytes": downloaded,
                "totalBytes": total,
                "speed": d.get("speed"),
                "eta": d.get("eta"),
            })
            # throttle disk writes to ~4/sec, progress updates arrive far more often
            if now - last_write > 0.25:
                write_status(status_file, state)
                last_write = now
        elif d["status"] == "finished":
            state.update({"status": "processing", "progress": 99})
            write_status(status_file, state)

    def pp_hook(d):
        if d["status"] == "started":
            state["status"] = f"post-processing ({d.get('postprocessor', '')})"
            write_status(status_file, state)

    ydl_opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "outtmpl": f"{output_dir}/%(title).150B [%(id)s].%(ext)s",
        "progress_hooks": [hook],
        "postprocessor_hooks": [pp_hook],
        "restrictfilenames": False,
    }

    postprocessors = []

    if opts["mode"] == "audio":
        ydl_opts["format"] = "bestaudio/best"
        target = opts.get("audioFormat", "m4a")
        if target != "best":
            postprocessors.append({
                "key": "FFmpegExtractAudio",
                "preferredcodec": target,
                "preferredquality": "0" if target in ("mp3", "opus") else None,
            })
    else:
        height = opts.get("height")
        if height:
            ydl_opts["format"] = (
                f"bestvideo[height<={height}]+bestaudio/best[height<={height}]"
            )
        else:
            ydl_opts["format"] = "bestvideo+bestaudio/best"
        ydl_opts["merge_output_format"] = "mp4"

    if opts.get("subsOn") and opts.get("subLangs"):
        auto_codes = [c.replace("-auto", "") for c in opts["subLangs"] if c.endswith("-auto")]
        manual_codes = [c for c in opts["subLangs"] if not c.endswith("-auto")]
        ydl_opts["writesubtitles"] = bool(manual_codes)
        ydl_opts["writeautomaticsub"] = bool(auto_codes)
        ydl_opts["subtitleslangs"] = manual_codes + auto_codes or ["en"]
        if opts.get("embedSubs"):
            ydl_opts["embedsubtitles"] = True
            postprocessors.append({"key": "FFmpegEmbedSubtitle"})

    if opts.get("embedThumb"):
        ydl_opts["writethumbnail"] = True
        postprocessors.append({"key": "EmbedThumbnail"})

    add_chapters = bool(opts.get("saveChapters"))
    if opts.get("embedMeta") or add_chapters:
        postprocessors.append({
            "key": "FFmpegMetadata",
            "add_metadata": bool(opts.get("embedMeta")),
            "add_chapters": add_chapters,
        })

    if opts.get("sponsorBlock"):
        postprocessors.append({
            "key": "SponsorBlock",
            "categories": {"sponsor"},
            "when": "after_filter",
        })
        postprocessors.append({
            "key": "ModifyChapters",
            "remove_sponsor_segments": {"sponsor"},
        })

    if opts.get("clipOn") and opts.get("clipStart") is not None and opts.get("clipEnd") is not None:
        start, end = float(opts["clipStart"]), float(opts["clipEnd"])
        ydl_opts["download_ranges"] = download_range_func(None, [(start, end)])
        ydl_opts["force_keyframes_at_cuts"] = True
        # The native downloader can't fetch a byte range mid-stream for most
        # protocols; yt-dlp's ffmpeg downloader (-ss/-to) is what actually
        # makes partial/clip downloads work.
        ydl_opts["external_downloader"] = "ffmpeg"

    if postprocessors:
        ydl_opts["postprocessors"] = postprocessors

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(opts["url"], download=True)
            final_path = ydl.prepare_filename(info)
            if opts.get("mode") == "audio" and opts.get("audioFormat") not in (None, "best"):
                # postprocessing swaps the extension
                import os
                base, _ = os.path.splitext(final_path)
                candidate = base + "." + opts["audioFormat"]
                if os.path.exists(candidate):
                    final_path = candidate

        import os
        state.update({
            "status": "done",
            "progress": 100,
            "filename": os.path.basename(final_path),
        })
        write_status(status_file, state)
    except Exception as e:  # noqa: BLE001
        state.update({"status": "error", "error": f"{e}"})
        write_status(status_file, state)
        traceback.print_exc(file=sys.stderr)
        # Exit 0 on purpose: this script's success/failure is read from the
        # status file, never from the process exit code (see ytdlp_resolve.py
        # for why — a non-zero exit here has no functional effect today since
        # nothing parses this script's exit code, but keeping every
        # Node<->Python bridge script on the same "exit code is meaningless"
        # contract avoids reintroducing that bug if this script is ever
        # awaited directly instead of polled via the status file.


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Last-resort catch: argv[1]/[2] missing entirely (can't even locate
        # the status file to write to). Print to stderr for the Node-side
        # child.stderr logger to pick up; still exit 0 per the standing rule.
        traceback.print_exc(file=sys.stderr)
