# cufx — single service, two runtimes

One container, one Railway service. Node is the only process exposed
publicly; Python runs alongside it inside the same container on a fixed
internal port (8000), reached only via `localhost`.

```
cufx/
├── railpack.json     # installs both node + python, runs start.sh
├── start.sh          # boots python in background, node in foreground
├── package.json      # node deps
├── server.js         # public entrypoint — /health, /hello, proxies /api/py/*
├── requirements.txt  # python deps (fastapi, uvicorn, yt-dlp)
└── main.py           # python app — /health, /hello, /ytdlp-check
```

## Deploy (Railway)

1. New Project → Deploy from GitHub repo → select `cufx`.
2. That's it — one service, root directory is the repo root (default).
3. Generate a public domain for it (Settings → Networking).
4. Deploy.

No extra settings, no manual env vars. `PORT` is injected by Railway
automatically for the node process; python's port (8000) is fixed in the
code since it never leaves the container.

## Test

Hit the one public domain Railway gives you:

```
GET https://<your-domain>/health              # node
GET https://<your-domain>/hello                # node
GET https://<your-domain>/api/py/health        # python, via proxy
GET https://<your-domain>/api/py/hello         # python, via proxy
GET https://<your-domain>/api/py/ytdlp-check   # confirms yt-dlp + node both work
```

If all five respond, both runtimes are running correctly in the single
service and the internal proxy is working.
