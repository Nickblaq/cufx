import json
import subprocess


def main():
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

    print(json.dumps({
        "yt_dlp_version": ytdlp_version,
        "node_version": node_version,
    }))


if __name__ == "__main__":
    main()
