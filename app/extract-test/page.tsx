"use client";

import { useState } from "react";

export default function ExtractTestPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  async function run() {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/extract-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setResult(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "monospace", maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ fontSize: 18 }}>Extract test (raw)</h1>
      <p style={{ fontSize: 13, color: "#666" }}>
        Isolated test harness — hits /api/extract-info directly, shows the raw response.
      </p>
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a video or playlist URL"
        style={{ width: "100%", padding: 8, marginTop: 12, fontFamily: "monospace", boxSizing: "border-box" }}
      />
      <button
        onClick={run}
        disabled={loading || !url.trim()}
        style={{ marginTop: 12, padding: "8px 16px", cursor: "pointer" }}
      >
        {loading ? "Resolving…" : "Resolve"}
      </button>
      <pre
        style={{
          marginTop: 20,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          background: "#f2f2f2",
          padding: 12,
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        {result}
      </pre>
    </main>
  );
}
