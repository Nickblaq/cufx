"use client";

import { useState } from "react";
import type { JobProgress, SourceRef } from "@/lib/studio/types";
import { Icons } from "../Icons";

export function ResultView({
  source,
  job,
  downloadUrl,
  titleComplete,
  titleFailed,
  onAgain,
  onHome,
}: {
  source: SourceRef;
  job: JobProgress | null;
  downloadUrl: (jobId: string) => string;
  titleComplete: string;
  titleFailed: string;
  onAgain: () => void;
  onHome: () => void;
}) {
  const ok = job?.status === "completed";
  const outputs = job?.outputs ?? [];
  const primary = outputs[0];
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const displayName = source?.name ?? source?.title ?? "";

  async function downloadAndSave() {
    if (!job?.jobId || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(downloadUrl(job.jobId));
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Download failed (${res.status})`);
      }
      const blob = await res.blob();

      const cd = res.headers.get("Content-Disposition") || "";
      const utf8 = cd.match(/filename\*=UTF-8''([^;]+)/i);
      const ascii = cd.match(/filename="([^"]+)"/i);
      const name = utf8
        ? decodeURIComponent(utf8[1])
        : ascii?.[1] ?? primary?.name ?? "download";

      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pad">
      <section className="card resultHero">
        <div className={"resultIcon" + (ok ? "" : " resultIconFail")}>
          {ok ? <Icons.Check size={28} /> : <Icons.Warn size={28} />}
        </div>
        <h2 className="resultTitle">{ok ? titleComplete : titleFailed}</h2>
        <p className="resultSub">{job?.error || displayName}</p>
      </section>

      {primary && (
        <section className="card videoPreview">
          <div className="videoThumb">
            <Icons.Play size={28} />
          </div>
          <div className="videoMeta">
            <span className="videoName">{primary.name}</span>
            <span className="videoInfo">{formatBytes(primary.sizeBytes)}</span>
          </div>
        </section>
      )}

      {saveError && (
        <div className="errorBox">
          <Icons.Warn /> {saveError}
        </div>
      )}

      {ok && (
        <button
          type="button"
          className="primaryBtn"
          onClick={downloadAndSave}
          disabled={saving}
        >
          <Icons.Download size={18} />
          {saving ? "Preparing…" : "Save to device"}
        </button>
      )}

      {outputs.length > 1 && (
        <section>
          <div className="rowHead">
            <h3 className="sectionTitle">All outputs</h3>
            <span className="rowAction">{outputs.length} files</span>
          </div>
          <ul className="outputList">
            {outputs.map((o) => (
              <li key={o.name}>
                <button
                  type="button"
                  className="outputRow"
                  onClick={downloadAndSave}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    textAlign: "left",
                    font: "inherit",
                    color: "inherit",
                  }}
                >
                  <Icons.Download size={16} />
                  <span className="outputName">{o.name}</span>
                  <span className="outputSize">{formatBytes(o.sizeBytes)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="resultActions">
        <button type="button" className="primaryBtn" onClick={onHome}>
          Back to Home
        </button>
        <button type="button" className="ghostBtnWide" onClick={onAgain}>
          Start Another
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "–";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}
