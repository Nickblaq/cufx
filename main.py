import subprocess
import sys

from fastapi import FastAPI

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok", "service": "python"}


@app.get("/hello")
def hello():
    return {"message": "hello from python", "python_version": sys.version}


@app.get("/ytdlp-check")
def ytdlp_check():
    """Confirms yt-dlp is importable and Node is reachable from this same container."""
    try:
        import yt_dlp
        ytdlp_version = yt_dlp.version.__version__
    except Exception as e:
        ytdlp_version = f"error: {e}"

    try:
        node_version = subprocess.check_output(
            ["node", "--version"], stderr=subprocess.STDOUT
        ).decode().strip()
    except Exception as e:
        node_version = f"error: {e}"

    return {"yt_dlp_version": ytdlp_version, "node_version": node_version}
