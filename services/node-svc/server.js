import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "node-svc" });
});

app.get("/hello", (req, res) => {
  res.json({ message: "hello from node-svc", node_version: process.version });
});

app.listen(PORT, () => {
  console.log(`node-svc listening on port ${PORT}`);
});
