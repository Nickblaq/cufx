# cufx — Next.js calling Python via subprocess

One process (Next.js), one port. No sidecar server, no internal proxy, no
port matching. Python code lives in `/python` as standalone scripts; API
routes run them on demand via `child_process.execFile` and read back JSON.

```
cufx-next/
├── railpack.json         # node + python, single build, single start
├── package.json
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/
│       ├── hello-py/route.ts        # calls python/hello.py
│       └── ytdlp-check/route.ts     # calls python/ytdlp_check.py
├── lib/callPython.ts     # shared helper: run a script, parse its JSON stdout
├── python/
│   ├── hello.py
│   └── ytdlp_check.py
└── requirements.txt
```

## How to add a new Python function

1. Write a script in `python/`, e.g. `python/my_task.py`, that prints one
   JSON object to stdout:
   ```python
   import json
   print(json.dumps({"result": 42}))
   ```
2. Add any packages it needs to `requirements.txt`.
3. Call it from a route:
   ```ts
   const data = await callPython("my_task.py", ["optional", "args"]);
   ```
   Args show up in the script as `sys.argv[1:]`.

## Deploy (Railway)

1. New Project → Deploy from GitHub repo → this repo.
2. One service, root directory = repo root (default). Nothing else to set.
3. Generate domain → when it asks for a port, Next.js reads `PORT`
   automatically, so leave the default Railway suggests (or 8080 if it asks).
4. Deploy.

## Test

```
GET https://<your-domain>/api/hello-py
GET https://<your-domain>/api/ytdlp-check
```

Both should return JSON. `ytdlp-check` confirms yt-dlp is installed and
Node is reachable from Python's subprocess environment.
