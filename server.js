import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

// Railway injects PORT automatically — this is unavoidable, not a var you set.
const PORT = process.env.PORT || 8080;

// Python runs inside this same container, on a fixed local port.
const PY_PORT = 8000;

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "node" });
});

app.get("/hello", (req, res) => {
  res.json({ message: "hello from node", node_version: process.version });
});

// Everything under /api/py/* is handed off to the Python process.
app.use(
  "/api/py",
  createProxyMiddleware({
    target: `http://localhost:${PY_PORT}`,
    changeOrigin: true,
    pathRewrite: { "^/api/py": "" },
  })
);

app.listen(PORT, () => {
  console.log(`Node listening on ${PORT}, proxying /api/py/* -> localhost:${PY_PORT}`);
});
