"""
Run one or more ffmpeg passes described by a JSON job, writing progress to a
status file as it goes.

Usage:
  python3 ffmpeg.py <status_file> <output_dir> <options_json>

<options_json> shape:
{
  "passes": [
    { "name": "scale", "args": ["-i", "/in.mp4", "-vf", "...", "/out.mp4"] },
    ...
  ]
}
"""
import json
import os
import re
import subprocess
import sys
import time
import traceback


DURATION_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")
TIME_RE = re.compile(r"time=\s*(\d+):(\d+):(\d+(?:\.\d+)?)")


def write_status(path: str, data: dict):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f)
    os.replace(tmp, path)


def to_secs(h, m, s):
    return int(h) * 3600 + int(m) * 60 + float(s)


def list_outputs(output_dir: str):
    out = []
    for name in sorted(os.listdir(output_dir)):
        full = os.path.join(output_dir, name)
        if os.path.isfile(full) and not name.endswith(".trf"):
            out.append({"name": name, "sizeBytes": os.path.getsize(full)})
    return out


def main():
    status_file, output_dir, options_json = sys.argv[1], sys.argv[2], sys.argv[3]
    opts = json.loads(options_json)
    passes = opts.get("passes", [])
    total = max(len(passes), 1)

    state = {
        "status": "starting",
        "progress": 0,
        "step": "Queued",
        "stepIndex": 0,
        "totalSteps": total,
        "log": "",
        "error": None,
        "outputs": [],
    }
    write_status(status_file, state)

    def append_log(line: str):
        cur = (state.get("log") or "") + "\n" + line
        if len(cur) > 8000:
            cur = cur[-8000:]
        state["log"] = cur.strip()

    try:
        for i, p in enumerate(passes):
            name = p.get("name", f"pass {i + 1}")
            args = p.get("args", [])
            state.update({
                "status": "running",
                "step": name,
                "stepIndex": i,
            })
            append_log(f"[pass {i + 1}/{total}] {name}")
            write_status(status_file, state)

            cmd = ["ffmpeg", "-y", "-hide_banner"] + args
            append_log(" ".join(cmd))

            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )

            duration_s = None
            last_write = 0.0

            for line in proc.stderr:  # type: ignore[union-attr]
                stripped = line.rstrip()
                if stripped:
                    append_log(stripped)

                dm = DURATION_RE.search(line)
                if dm:
                    duration_s = to_secs(dm.group(1), dm.group(2), dm.group(3))

                tm = TIME_RE.search(line)
                if tm and duration_s:
                    cur_s = to_secs(tm.group(1), tm.group(2), tm.group(3))
                    frac = min(1.0, cur_s / duration_s)
                    overall = ((i + frac) / total) * 100
                    state["progress"] = round(overall, 1)
                    now = time.time()
                    if now - last_write > 0.3:
                        write_status(status_file, state)
                        last_write = now

            rc = proc.wait()
            if rc != 0:
                state["status"] = "error"
                state["error"] = f"ffmpeg exited with code {rc} during '{name}'"
                write_status(status_file, state)
                return

        state.update({
            "status": "done",
            "progress": 100,
            "step": "Done",
            "outputs": list_outputs(output_dir),
        })
        write_status(status_file, state)

    except Exception as e:  # noqa: BLE001
        state.update({"status": "error", "error": str(e)})
        append_log(f"error: {e}")
        write_status(status_file, state)
        traceback.print_exc(file=sys.stderr)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc(file=sys.stderr)
