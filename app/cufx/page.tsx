"use client";

// app/cufx/page.tsx
//
// One entry point into the whole system. /op and /yt used to be two apps with
// two operation lists and two pipelines; /cufx is the single studio that works
// entirely in catalog ids:
//
//   pick a source (upload or URL)  →  build a pipeline  →  run on the server
//   (chaining step N+1 to step N's result)  →  save any output to device.
//
// Every operation here comes from the one shared catalog, and every result is a
// catalog object, so results can be chained without re-uploading.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  OPERATIONS,
  TIER_FILTERS,
  TIER_RANGES,
  acceptsKind,
  groupByTier,
  type CatalogOperation,
  type TierFilter,
} from "@/lib/catalog/operations";
import type {
  FormValues,
  Job,
  MediaKind,
  MediaObject,
  PipelineStep,
  StudioSource,
  View,
} from "@/lib/studio/types";
import { defaultValues, evalCondition, formatBytes, formatDuration } from "@/lib/studio/helpers";
import { studioApi } from "@/lib/studio/api";
import { useStudioStore, useUndoRedo } from "@/lib/studio/store";
import { Icons } from "@/components/studio/Icons";
import { OperationIcon } from "@/components/studio/OperationCard";
import { useStudioStyles } from "@/components/studio/useStudioStyles";
import { Sheet } from "@/components/studio/Sheet";
import { Field } from "@/components/studio/Field";
import { NavButton } from "@/components/studio/NavButton";
import { CatalogView } from "@/components/studio/views/CatalogView";
import { PipelineView } from "@/components/studio/views/PipelineView";
import { RunView } from "@/components/studio/views/RunView";
import { ResultView } from "@/components/studio/views/ResultView";

const HEADER_TITLES: Record<View, string> = {
  source: "New Pipeline",
  catalog: "Operations",
  pipeline: "Pipeline",
  run: "Working",
  result: "Done",
};

export default function CufxPage() {
  useStudioStyles();

  const source = useStudioStore((s) => s.source);
  const pipeline = useStudioStore((s) => s.pipeline);
  const view = useStudioStore((s) => s.view);
  const jobId = useStudioStore((s) => s.jobId);
  const setView = useStudioStore((s) => s.setView);
  const setJobId = useStudioStore((s) => s.setJobId);
  const setSource = useStudioStore((s) => s.setSource);
  const clearSource = useStudioStore((s) => s.clearSource);
  const addStep = useStudioStore((s) => s.addStep);
  const removeStep = useStudioStore((s) => s.removeStep);
  const moveStep = useStudioStore((s) => s.moveStep);
  const updateStep = useStudioStore((s) => s.updateStep);
  const clearPipeline = useStudioStore((s) => s.clearPipeline);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  const [sheet, setSheet] = useState<null | "configure">(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [selectedOp, setSelectedOp] = useState<CatalogOperation | null>(null);
  const [values, setValues] = useState<FormValues>({});

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [job, setJob] = useState<Job | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [pollNonce, setPollNonce] = useState(0);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [urlDraft, setUrlDraft] = useState(source.url ?? "");
  const [recent, setRecent] = useState<MediaObject[]>([]);
  const [recentError, setRecentError] = useState<string | null>(null);

  /* ------------------------------ catalog browser ------------------------ */

  const refreshRecent = useCallback(async () => {
    try {
      setRecent(await studioApi.listObjects({ limit: 24 }));
      setRecentError(null);
    } catch (err) {
      setRecentError(err instanceof Error ? err.message : "Failed to list catalog");
    }
  }, []);

  useEffect(() => {
    void refreshRecent();
  }, [refreshRecent]);

  /* --------------------------------- polling ----------------------------- */

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const next = await studioApi.getJob(jobId);
        if (cancelled) return;
        setJob(next);
        setJobError(null);
        if (next.status === "completed") {
          setView("result");
          void refreshRecent();
          return;
        }
        if (next.status === "failed") {
          setView("result");
          return;
        }
        timer = setTimeout(tick, 1000);
      } catch (err) {
        if (cancelled) return;
        setJobError(err instanceof Error ? err.message : "Polling failed");
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [jobId, pollNonce, setView, refreshRecent]);

  /* ---------------------------------- source ----------------------------- */

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadPercent(0);
      setStartError(null);
      try {
        const object = await studioApi.upload(file, (p) => setUploadPercent(p));
        setSource({
          objectId: object.id,
          name: object.name,
          kind: object.kind,
          sizeBytes: object.sizeBytes,
          url: null,
        });
        clearPipeline();
        setView("pipeline");
        void refreshRecent();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadPercent(null);
      }
    },
    [setSource, clearPipeline, setView, refreshRecent]
  );

  const onFilePick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) void handleUpload(f);
      e.target.value = "";
    },
    [handleUpload]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) void handleUpload(f);
    },
    [handleUpload]
  );

  function applyUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    setSource({ url, objectId: null, name: null, kind: null, sizeBytes: null });
    clearPipeline();
    setView("catalog");
  }

  function pickObject(object: MediaObject) {
    setSource({
      objectId: object.id,
      name: object.name,
      kind: object.kind,
      sizeBytes: object.sizeBytes,
      url: null,
    });
    clearPipeline();
    setView("pipeline");
  }

  /* --------------------------------- catalog ----------------------------- */

  const sourceKind: MediaKind | null = source.kind;
  const hasUrl = Boolean(source.url);

  const visibleOps = useMemo(() => {
    const [lo, hi] = TIER_RANGES[tierFilter];
    const q = search.trim().toLowerCase();
    return OPERATIONS.filter((op) => {
      if (op.tier < lo || op.tier > hi) return false;

      if (op.engine === "ytdlp") {
        if (!hasUrl) return false;
      } else {
        if (!source.objectId || !sourceKind) return false;
        if (!acceptsKind(op, sourceKind)) return false;
      }

      if (!q) return true;
      return (op.name + op.description + op.category).toLowerCase().includes(q);
    });
  }, [tierFilter, search, hasUrl, source.objectId, sourceKind]);

  const grouped = useMemo(() => groupByTier(visibleOps), [visibleOps]);

  const favorites = useMemo(
    () =>
      OPERATIONS.filter((op) => {
        if (!op.favorite) return false;
        if (op.engine === "ytdlp") return hasUrl;
        return Boolean(source.objectId && sourceKind && acceptsKind(op, sourceKind));
      }),
    [hasUrl, source.objectId, sourceKind]
  );

  function openConfigure(op: CatalogOperation, step?: PipelineStep) {
    setSelectedOp(op);
    setEditingUid(step?.uid ?? null);
    setValues(step?.values ?? defaultValues(op));
    setSheet("configure");
  }

  function commitStep() {
    if (!selectedOp) return;
    if (editingUid) updateStep(editingUid, values);
    else addStep(selectedOp.id, values);
    setSheet(null);
    setSelectedOp(null);
    setEditingUid(null);
  }

  /* ----------------------------------- run ------------------------------- */

  async function handleRun() {
    if (pipeline.length === 0) return;
    setStarting(true);
    setStartError(null);
    try {
      const id = await studioApi.createJob({
        sourceObjectId: source.objectId,
        sourceUrl: source.url,
        operations: pipeline.map((step) => ({ id: step.opId, params: step.values })),
      });
      setJobId(id);
      setView("run");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start job");
    } finally {
      setStarting(false);
    }
  }

  async function chainFrom(objectId: string) {
    try {
      const object = await studioApi.getObject(objectId);
      if (!object) return;
      setSource({
        objectId: object.id,
        name: object.name,
        kind: object.kind,
        sizeBytes: object.sizeBytes,
        url: null,
      });
      clearPipeline();
      setJobId(null);
      setView("pipeline");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to chain");
    }
  }

  function resetAll() {
    setJobId(null);
    clearSource();
    setView("source");
  }

  const sourceLabel = source.name ?? source.url ?? "no source loaded";
  const headerSub =
    view === "source"
      ? sourceLabel
      : view === "catalog"
        ? `${pipeline.length} in pipeline`
        : view === "pipeline"
          ? pipeline.length
            ? `${pipeline.length} steps`
            : "empty"
          : view === "run"
            ? job
              ? `${job.status} · ${Math.round(job.percent)}%`
              : "starting…"
            : job?.status === "completed"
              ? "output ready"
              : "finished";

  const isUploading = uploadPercent !== null && uploadPercent < 100;

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="iconbtn"
          type="button"
          onClick={() => (view === "source" ? undefined : setView("source"))}
          aria-label="Back"
        >
          {view === "source" ? <Icons.Bolt /> : <Icons.Back />}
        </button>
        <div className="title">
          <span className="titleMain">{HEADER_TITLES[view]}</span>
          <span className="titleSub">{headerSub}</span>
        </div>
      </header>

      <main className="main">
        {view === "source" && (
          <div className="pad">
            <section
              className={"card dropCard" + (isUploading ? " dropCardBusy" : "")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={isUploading ? undefined : onDrop}
              onClick={isUploading ? undefined : () => fileInputRef.current?.click()}
              role={isUploading ? undefined : "button"}
              tabIndex={isUploading ? undefined : 0}
            >
              {isUploading ? (
                <>
                  <div className="dropIcon">
                    <Icons.Upload />
                  </div>
                  <div className="dropTitle">Uploading…</div>
                  <div className="dropProgress">
                    <div className="dropProgressBar" style={{ width: `${uploadPercent}%` }} />
                  </div>
                  <span className="dropHint">{uploadPercent}%</span>
                </>
              ) : (
                <>
                  <div className="dropIcon">
                    <Icons.Upload />
                  </div>
                  <div className="dropTitle">Add a media file</div>
                  <span className="dropHint">
                    Drop a video, audio, or image here, or tap to browse. Files
                    land in the catalog as uploads.
                  </span>
                </>
              )}
            </section>

            <section className="card urlCard">
              <div className="urlHead">
                <Icons.Link size={14} /> <span>Or download from a URL</span>
              </div>
              <input
                className="urlInput"
                placeholder="https://…"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyUrl();
                }}
              />
              <button
                type="button"
                className="primaryBtn"
                onClick={applyUrl}
                disabled={!urlDraft.trim()}
              >
                Use this link
              </button>
            </section>

            {source.objectId && source.name && (
              <section className="card assetCard" onClick={() => setView("pipeline")}>
                <div className="assetIcon">
                  {source.kind === "audio" ? (
                    <Icons.Music />
                  ) : source.kind === "image" ? (
                    <Icons.Image />
                  ) : (
                    <Icons.Video />
                  )}
                </div>
                <div className="assetMeta">
                  <span className="assetLabel">Current source</span>
                  <span className="assetName">{source.name}</span>
                  <span className="assetInfo">
                    {formatBytes(source.sizeBytes)} · {source.kind} ·{" "}
                    {source.objectId.slice(0, 8)}
                  </span>
                </div>
                <Icons.Chevron />
              </section>
            )}

            <section>
              <div className="rowHead">
                <h3 className="sectionTitle">Recent catalog</h3>
                <button type="button" className="rowAction" onClick={refreshRecent}>
                  Refresh
                </button>
              </div>
              {recentError && (
                <div className="errorBox">
                  <Icons.Warn /> {recentError}
                </div>
              )}
              {recent.length === 0 && !recentError && (
                <div className="empty">
                  <p>Nothing in the catalog yet</p>
                  <span>Uploads and downloads will appear here.</span>
                </div>
              )}
              <ul className="recentList">
                {recent.map((object) => (
                  <li key={object.id}>
                    <button
                      type="button"
                      className="card assetCard recentRow"
                      onClick={() => pickObject(object)}
                    >
                      <div className="assetIcon">
                        {object.kind === "audio" ? (
                          <Icons.Music />
                        ) : object.kind === "image" ? (
                          <Icons.Image />
                        ) : object.kind === "subtitle" ? (
                          <Icons.Subtitle />
                        ) : (
                          <Icons.Video />
                        )}
                      </div>
                      <div className="assetMeta">
                        <span className="assetName">{object.name}</span>
                        <span className="assetInfo">
                          {object.origin} · {object.kind} ·{" "}
                          {formatBytes(object.sizeBytes)}
                          {object.durationSeconds
                            ? ` · ${formatDuration(object.durationSeconds)}`
                            : ""}
                        </span>
                      </div>
                      <Icons.Chevron />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {view === "catalog" && (
          <>
            {(!source.objectId && !source.url) && (
              <div className="pad">
                <div className="errorBox">
                  <Icons.Warn /> Pick a source first.
                </div>
              </div>
            )}
            {favorites.length > 0 && (
              <div className="pad">
                <div className="favScroll">
                  {favorites.map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      className="favCard"
                      onClick={() => openConfigure(op)}
                    >
                      <span className="favIcon">
                        <OperationIcon icon={op.icon} size={16} />
                      </span>
                      <span className="favName">{op.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <CatalogView
              grouped={grouped}
              search={search}
              setSearch={setSearch}
              tierFilters={TIER_FILTERS}
              tierFilter={tierFilter}
              setTierFilter={(t) => setTierFilter(t as TierFilter)}
              onOpenOp={(op) => openConfigure(op)}
            />
          </>
        )}

        {view === "pipeline" && (
          <PipelineView
            source={source}
            pipeline={pipeline}
            onAdd={() => setView("catalog")}
            onRemove={removeStep}
            onMove={moveStep}
            onRun={handleRun}
            onEdit={(step) => {
              const op = OPERATIONS.find((o) => o.id === step.opId);
              if (op) openConfigure(op, step);
            }}
            running={starting}
            error={startError}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onClear={clearPipeline}
          />
        )}

        {view === "run" && <RunView source={source} job={job} error={jobError} />}

        {view === "result" && (
          <ResultView
            job={job}
            downloadUrl={studioApi.downloadUrl}
            titleComplete="Pipeline complete"
            titleFailed="Pipeline failed"
            onAgain={() => {
              setJobId(null);
              clearPipeline();
              setView("pipeline");
            }}
            onHome={resetAll}
            onChain={chainFrom}
            onRetry={() => {
              if (!jobId) return;
              void fetch(`/api/jobs/${jobId}`, { method: "POST" }).then(() => {
                setView("run");
                setPollNonce((n) => n + 1);
              });
            }}
          />
        )}
      </main>

      <nav className="bottomNav">
        <NavButton
          active={view === "source"}
          label="Source"
          icon={<Icons.Home />}
          onClick={() => setView("source")}
        />
        <NavButton
          active={view === "catalog"}
          label="Ops"
          icon={<Icons.Grid />}
          onClick={() => setView("catalog")}
        />
        <NavButton
          active={view === "pipeline" || view === "run" || view === "result"}
          label="Pipeline"
          icon={<Icons.Flow />}
          badge={pipeline.length}
          onClick={() => setView("pipeline")}
        />
      </nav>

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={onFilePick}
        accept="video/*,audio/*,image/*"
      />

      {sheet === "configure" && selectedOp && (
        <ConfigureSheet
          op={selectedOp}
          values={values}
          setValue={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
          onClose={() => {
            setSheet(null);
            setSelectedOp(null);
            setEditingUid(null);
          }}
          onAdd={commitStep}
          editing={Boolean(editingUid)}
        />
      )}
    </div>
  );
}

/* ----------------------------- local component ----------------------------- */

function ConfigureSheet({
  op,
  values,
  setValue,
  onClose,
  onAdd,
  editing,
}: {
  op: CatalogOperation;
  values: FormValues;
  setValue: (k: string, v: unknown) => void;
  onClose: () => void;
  onAdd: () => void;
  editing: boolean;
}) {
  const visible = useMemo(
    () => op.params.filter((p) => evalCondition(p.showIf, values)),
    [op.params, values]
  );

  const groups = useMemo(() => {
    const m = new Map<string, typeof op.params>();
    for (const p of visible) {
      const g = p.group ?? "Options";
      const list = m.get(g);
      if (list) list.push(p);
      else m.set(g, [p]);
    }
    return Array.from(m.entries());
  }, [visible]);

  return (
    <Sheet
      title={op.name}
      badge={`${op.engine} · ${op.accepts.length ? op.accepts.join("/") : "url"}`}
      note={op.description}
      onClose={onClose}
    >
      {op.chainSteps && (
        <div className="chainNote">
          <Icons.Flow size={14} />
          <span>Chain: {op.chainSteps.join(" → ")}</span>
        </div>
      )}

      {groups.length === 0 && (
        <p className="fieldHelp">No options needed. Ready to add.</p>
      )}

      {groups.map(([group, params]) => (
        <div key={group} className="fieldGroup">
          <div className="groupLabel">{group}</div>
          {params.map((p) => (
            <Field
              key={p.key}
              param={p}
              value={values[p.key]}
              onChange={(v) => setValue(p.key, v)}
            />
          ))}
        </div>
      ))}

      <button type="button" className="primaryBtn" onClick={onAdd}>
        <Icons.Plus /> {editing ? "Update Step" : "Add to Pipeline"}
      </button>
    </Sheet>
  );
}
