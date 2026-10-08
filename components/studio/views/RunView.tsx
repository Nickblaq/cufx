"use client";

import type { JobProgress, PipelineStep, SourceRef } from "@/lib/studio/types";
import { Icons } from "../Icons";

export function RunView({
  source,
  pipeline,
  job,
  error,
}: {
  source: SourceRef;
  pipeline: PipelineStep[];
  job: JobProgress | null;
  error: string | null;
}) {
  const percent = job?.percent ?? 0;
  const activeIndex =
    job?.stepIndex ??
    Math.min(
      Math.floor((percent / 100) * Math.max(pipeline.length, 1)),
      Math.max(pipeline.length - 1, 0)
    );
  const circumference = 2 * Math.PI * 52;
  const displayName = source?.name ?? source?.title ?? "…";

  return (
    <div className="pad">
      <section className="card runHeader">
        <div className="runRingWrap">
          <svg viewBox="0 0 120 120" className="runRing">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--border)"
              strokeWidth="6"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percent / 100)}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="runRingText">
            <span className="runPct">{Math.round(percent)}%</span>
            <span className="runState">{job?.status ?? "queued"}</span>
          </div>
        </div>
        <div className="runMeta">
          <span className="runSource">{displayName}</span>
          <span className="runStep">
            {job?.step ?? `Step ${activeIndex + 1} of ${pipeline.length}`}
          </span>
        </div>
      </section>

      {error && (
        <div className="errorBox">
          <Icons.Warn /> {error}
        </div>
      )}

      {job?.error && (
        <div className="errorBox">
          <Icons.Warn /> {job.error}
        </div>
      )}

      <section className="card logCard">
        <div className="logHead">
          <Icons.Terminal /> <span>Live Output</span>
        </div>
        <pre className="logBody">{job?.log || "Waiting for output…"}</pre>
      </section>

      <section className="stepList">
        {pipeline.map((step, i) => (
          <div
            key={step.uid}
            className={
              "stepRow " +
              (i < activeIndex
                ? "stepDone"
                : i === activeIndex
                ? "stepActive"
                : "")
            }
          >
            <div className="stepDot">
              {i < activeIndex ? (
                <Icons.Check size={12} />
              ) : i === activeIndex ? (
                <Icons.Bolt size={12} />
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <span className="stepName">{step.op.name}</span>
            {i === activeIndex && job?.status === "running" && (
              <span className="stepPct">{Math.round(percent)}%</span>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
