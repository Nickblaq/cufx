# Multi-runtime Railway test repo

Three independent services, one public entrypoint (`gateway`), routing to
`node-svc` and `py-svc` over Railway's private network.

```
gateway/          Node/Express — public, proxies /api/node/* and /api/py/*
services/
  node-svc/       Node/Express — private, plain API
  py-svc/         FastAPI + yt-dlp — private, needs Node too (for yt-dlp)
```

## Deploying to Railway

Create **3 services** from this one repo, each with a different Root Directory:

| Service   | Root Directory        | Public domain |
|-----------|------------------------|----------------|
| gateway   | `gateway`               | yes            |
| node-svc  | `services/node-svc`     | no             |
| py-svc    | `services/py-svc`       | no             |

1. New Project → Deploy from GitHub repo → pick this repo.
2. For each service, set **Settings → Root Directory** to the path above.
3. Only generate a public domain for `gateway` (Settings → Networking).
4. Make sure all 3 services are in the same Railway **project + environment**
   (private networking only resolves within that scope).
5. On `gateway`, set env vars:
   ```
   NODE_SVC_URL=http://node-svc.railway.internal:3000
   PY_SVC_URL=http://py-svc.railway.internal:8000
   ```
   (use the actual internal ports Railway assigns — check each service's
   Settings → Networking → Private Networking for the exact hostname/port)
6. Deploy all three.

## Verifying it works

Once deployed, hit the gateway's public URL:

```
GET https://<gateway-domain>/health
GET https://<gateway-domain>/api/node/health
GET https://<gateway-domain>/api/node/hello
GET https://<gateway-domain>/api/py/health
GET https://<gateway-domain>/api/py/hello
GET https://<gateway-domain>/api/py/ytdlp-check   # confirms yt-dlp + node both work in py-svc
```

If `/api/node/*` and `/api/py/*` both respond through the single gateway
domain, the architecture is confirmed end-to-end.

## Running locally (optional, before deploying)

Three terminals:

```bash
# terminal 1
cd services/node-svc && npm install && PORT=3001 npm start

# terminal 2
cd services/py-svc && pip install -r requirements.txt && uvicorn main:app --port 8000

# terminal 3
cd gateway && npm install && npm start
```

Then hit `http://localhost:8080/health`, `/api/node/hello`, `/api/py/hello`,
`/api/py/ytdlp-check` the same way.
