"use client";

import type { PipelineStep, SourceRef } from "@/lib/studio/types";
import { Icons } from "../Icons";
import { Stat } from "../Stat";

export function PipelineView({
  source,
  sourceKind,
  sourceSizeBytes,
  pipeline,
  onAdd,
  onRemove,
  onMove,
  onRun,
  running,
  error,
  onEdit,
}: {
  source: SourceRef;
  sourceKind?: string;
  sourceSizeBytes?: number;
  pipeline: PipelineStep[];
  onAdd: () => void;
  onRemove: (uid: string) => void;
  onMove: (i: number, d: -1 | 1) => void;
  onRun: () => void;
  running: boolean;
  error: string | null;
  onEdit: (step: PipelineStep) => void;
}) {
  const displayName = source?.name ?? source?.title ?? null;

  return (
    <div className="pad">
      <section className="flowWrap">
        <div className="flowNode">
          <div className="flowNodeIcon">
            {sourceKind === "audio" ? (
              <Icons.Music />
            ) : sourceKind === "image" ? (
              <Icons.Image />
            ) : (
              <Icons.File />
            )}
          </div>
          <div className="flowNodeBody">
            <span className="flowNodeLabel">Source</span>
            <span className="flowNodeValue">
              {displayName ?? "No source loaded"}
            </span>
          </div>
        </div>

        {pipeline.length === 0 && (
          <div className="flowEmpty">
            <Icons.Flow size={26} />
            <p>No steps yet</p>
            <span>Add operations to build your pipeline.</span>
          </div>
        )}

        {pipeline.map((step, i) => {
          const Icon = step.op.icon;
          return (
            <div key={step.uid} className="flowRow">
              <div className="flowLine" />
              <div className="flowNode">
                <div className="flowReorder">
                  <button
                    type="button"
                    onClick={() => onMove(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <Icons.Up />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMove(i, 1)}
                    disabled={i === pipeline.length - 1}
                    aria-label="Move down"
                  >
                    <Icons.Down />
                  </button>
                </div>
                <div className="flowNodeIcon flowNodeIconOp">
                  <Icon size={18} />
                </div>
                <button
                  type="button"
                  className="flowNodeBody flowNodeBodyBtn"
                  onClick={() => onEdit(step)}
                >
                  <span className="flowNodeLabel">Step {i + 1}</span>
                  <span className="flowNodeValue">{step.op.name}</span>
                </button>
                <button
                  type="button"
                  className="flowDelete"
                  onClick={() => onRemove(step.uid)}
                  aria-label="Remove"
                >
                  <Icons.Trash />
                </button>
              </div>
            </div>
          );
        })}

        <div className="flowRow">
          <div className="flowLine" />
          <button type="button" className="flowAdd" onClick={onAdd}>
            <Icons.Plus /> Add Operation
          </button>
        </div>
      </section>

      {pipeline.length > 0 && (
        <section className="card statsCard">
          <Stat label="Steps" value={String(pipeline.length)} />
          <Stat label="Source" value={sourceKind ?? "–"} />
          <Stat
            label="Input"
            value={sourceSizeBytes !== undefined ? formatBytes(sourceSizeBytes) : "–"}
          />
        </section>
      )}

      {error && (
        <div className="errorBox">
          <Icons.Warn /> {error}
        </div>
      )}

      <button
        type="button"
        className="primaryBtn"
        onClick={onRun}
        disabled={!source || pipeline.length === 0 || running}
      >
        {running ? "Starting…" : "Start"}
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}
