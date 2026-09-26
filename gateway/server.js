import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = process.env.PORT || 8080;

// On Railway, set these to the internal hostnames, e.g.
//   http://node-svc.railway.internal:3000
//   http://py-svc.railway.internal:8000
// Locally, point them at whatever ports you run each service on.
const NODE_SVC_URL = process.env.NODE_SVC_URL || "http://localhost:3001";
const PY_SVC_URL = process.env.PY_SVC_URL || "http://localhost:8000";

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "gateway" });
});

app.use(
  "/api/node",
  createProxyMiddleware({
    target: NODE_SVC_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/node": "" },
  })
);

app.use(
  "/api/py",
  createProxyMiddleware({
    target: PY_SVC_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/py": "" },
  })
);

app.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
  console.log(`  -> /api/node/*  proxies to ${NODE_SVC_URL}`);
  console.log(`  -> /api/py/*    proxies to ${PY_SVC_URL}`);
});
