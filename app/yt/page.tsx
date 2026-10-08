"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, ComponentType, DragEvent } from "react";
import {
  type IconProps,
  type Operation,
  type FormValues,
  type OperationPayload,
  type JobProgress,
  type View,
  type PipelineStep,
} from "@/lib/studio/types";
import { evalCondition, defaultValues, formatBytes, makeUid } from "@/lib/studio/helpers";
import { createStudioClient } from "@/lib/studio/api";
import { Icons } from "@/components/studio/Icons";
import { useStudioStyles } from "@/components/studio/useStudioStyles";
import { Sheet } from "@/components/studio/Sheet";
import { Field } from "@/components/studio/Field";
import { NavButton } from "@/components/studio/NavButton";
import { useAsync } from "@/hooks/studio/useAsync";
import { useJobPoll } from "@/hooks/studio/useJobPoll";
import { CatalogView } from "@/components/studio/views/CatalogView";
import { PipelineView } from "@/components/studio/views/PipelineView";
import { RunView } from "@/components/studio/views/RunView";
import { ResultView } from "@/components/studio/views/ResultView";

/* ---------------------------- page-specific types --------------------------- */

type SheetKind = null | "configure" | "asset";

type AssetKind = "video" | "audio" | "image";

type Asset = {
  id: string;
  name: string;
  kind: AssetKind;
  sizeBytes: number;
  duration?: string;
  meta?: string;
};

/* ---------------------------------- API ----------------------------------- */

const API = createStudioClient({
  runUrl: "/api/ff/run",
  jobUrl: (id) => `/api/ff/job/${id}`,
  uploadUrl: "/api/ff/upload",
  downloadUrl: (id) => `/api/ff/download?jobId=${encodeURIComponent(id)}`,
});

/* ------------------------------- registry --------------------------------- */

const TIERS: Record<number, string> = {
  1: "Basic Operations",
  2: "Intermediate",
  3: "Advanced Video",
  4: "Advanced Audio",
  5: "Chained Presets",
  6: "Expert",
};

const TIER_FILTERS = [
  { id: "all", label: "All" },
  { id: "basic", label: "Basic" },
  { id: "intermediate", label: "Inter." },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "chains", label: "Chains" },
  { id: "expert", label: "Expert" },
] as const;

type TierFilter = (typeof TIER_FILTERS)[number]["id"];

const OPERATIONS: Operation[] = [
  /* ... paste the full OPERATIONS array from the previous ffmpeg page verbatim ... */
];

/* ------------------------------- helpers --------------------------------- */

function acceptsSource(op: Operation, kind: AssetKind): boolean {
  if (op.accepts === "both") return true;
  if (op.accepts === "audio") return kind === "audio";
  if (op.accepts === "video") return kind === "video" || kind === "image";
  return true;
}

const HEADER_TITLES: Record<View, string> = {
  home: "Media Studio",
  catalog: "Operations",
  pipeline: "Pipeline",
  run: "Working",
  result: "Done",
};

function headerSub(
  v: View,
  pipeline: PipelineStep[],
  asset: Asset | null,
  job: JobProgress | null
): string {
  switch (v) {
    case "home":
      return asset ? asset.name : "no source loaded";
    case "catalog":
      return `${pipeline.length} in pipeline`;
    case "pipeline":
      return pipeline.length ? `${pipeline.length} steps` : "empty";
    case "run":
      return job ? `${job.status} · ${Math.round(job.percent)}%` : "starting…";
    case "result":
      return job?.status === "completed" ? "output ready" : "finished";
    default:
      return "";
  }
}

/* ---------------------------------- page ---------------------------------- */

export default function FfmpegPage() {
  useStudioStyles();

  const [view, setView] = useState<View>("home");
  const [sheet, setSheet] = useState<SheetKind>(null);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  const [jobId, setJobId] = useState<string | null>(null);
  const pollingActive = view === "run" || view === "result";
  const { job, error: pollError } = useJobPoll(
    pollingActive ? jobId : null,
    API.job
  );

  const runJob = useAsync<string>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleOps = useMemo(() => {
    const ranges: Record<TierFilter, [number, number]> = {
      all: [1, 6],
      basic: [1, 1],
      intermediate: [2, 2],
      video: [3, 3],
      audio: [4, 4],
      chains: [5, 5],
      expert: [6, 6],
    };
    const [lo, hi] = ranges[tierFilter];
    const q = search.trim().toLowerCase();
    return OPERATIONS.filter((op) => {
      if (op.tier < lo || op.tier > hi) return false;
      if (asset && !acceptsSource(op, asset.kind)) return false;
      if (!q) return true;
      return (op.name + op.description + op.category).toLowerCase().includes(q);
    });
  }, [tierFilter, search, asset]);

  const grouped = useMemo(() => {
    const map = new Map<number, Operation[]>();
    for (const op of visibleOps) {
      if (!map.has(op.tier)) map.set(op.tier, []);
      map.get(op.tier)!.push(op);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [visibleOps]);

  const favorites = useMemo(
    () =>
      OPERATIONS.filter(
        (o) => o.favorite && (!asset || acceptsSource(o, asset.kind))
      ),
    [asset]
  );

  const handleFile = useCallback(async (file: File) => {
    setUploadPercent(0);
    try {
      const uploaded = await API.upload(file, (p) => setUploadPercent(p));
      setAsset(uploaded);
      setPipeline([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadPercent(null);
    }
  }, []);

  const onFilePick = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
      e.target.value = "";
    },
    [handleFile]
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  function openConfigure(op: Operation) {
    setSelectedOp(op);
    setValues(defaultValues(op));
    setSheet("configure");
  }

  function addToPipeline() {
    if (!selectedOp) return;
    setPipeline((p) => [...p, { uid: makeUid(), op: selectedOp, values }]);
    setSheet(null);
    setSelectedOp(null);
  }

  function removeStep(uid: string) {
    setPipeline((p) => p.filter((x) => x.uid !== uid));
  }

  function moveStep(index: number, dir: -1 | 1) {
    setPipeline((p) => {
      const next = [...p];
      const t = index + dir;
      if (t < 0 || t >= next.length) return p;
      [next[index], next[t]] = [next[t], next[index]];
      return next;
    });
  }

  async function handleRun() {
    if (!asset || pipeline.length === 0) return;
    const operations: OperationPayload[] = pipeline.map((step) => ({
      id: step.op.id,
      params: step.values,
    }));
    const result = await runJob.run(() =>
      API.run([{ id: asset.id, role: "main" }], operations)
    );
    if (result) {
      setJobId(result);
      setView("run");
    }
  }

  function resetAll() {
    setJobId(null);
    setPipeline([]);
    setAsset(null);
    setView("home");
  }

  useEffect(() => {
    if (view === "run" && job?.status === "completed") {
      const t = setTimeout(() => setView("result"), 500);
      return () => clearTimeout(t);
    }
  }, [view, job]);

  const headerPrimaryAction = useCallback(() => {
    if (view !== "home") setView("home");
  }, [view]);

  const quickPicks: { id: string; label: string; icon: ComponentType<IconProps> }[] = [
    { id: "convert", label: "Convert", icon: Icons.Archive },
    { id: "trim", label: "Trim", icon: Icons.Scissors },
    { id: "scale", label: "Scale", icon: Icons.Settings },
    { id: "youtube-preset", label: "YouTube", icon: Icons.Bolt },
  ];

  const isUploading = uploadPercent !== null && uploadPercent < 100;

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="iconbtn"
          onClick={headerPrimaryAction}
          aria-label={view === "home" ? "Home" : "Back"}
          type="button"
        >
          {view === "home" ? <Icons.Bolt /> : <Icons.Back />}
        </button>
        <div className="title">
          <span className="titleMain">{HEADER_TITLES[view]}</span>
          <span className="titleSub">
            {headerSub(view, pipeline, asset, job)}
          </span>
        </div>
      </header>

      <main className="main">
        {view === "home" && (
          <div className="pad">
            {!asset ? (
              <section
                className={"card dropCard" + (isUploading ? " dropCardBusy" : "")}
                onDragOver={(e) => e.preventDefault()}
                onDrop={isUploading ? undefined : onDrop}
                onClick={isUploading ? undefined : () => fileInputRef.current?.click()}
                role={isUploading ? undefined : "button"}
                tabIndex={isUploading ? undefined : 0}
                onKeyDown={(e) => {
                  if (isUploading) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                {isUploading ? (
                  <>
                    <div className="dropIcon">
                      <Icons.Upload />
                    </div>
                    <div className="dropTitle">Uploading…</div>
                    <div className="dropProgress">
                      <div
                        className="dropProgressBar"
                        style={{ width: `${uploadPercent}%` }}
                      />
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
                      Drop a video, audio, or image here, or tap to browse.
                    </span>
                  </>
                )}
              </section>
            ) : (
              <section
                className="card assetCard"
                onClick={() => setSheet("asset")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSheet("asset");
                  }
                }}
              >
                <div className="assetIcon">
                  {asset.kind === "audio" ? (
                    <Icons.Music />
                  ) : asset.kind === "image" ? (
                    <Icons.Image />
                  ) : (
                    <Icons.Video />
                  )}
                </div>
                <div className="assetMeta">
                  <span className="assetLabel">Source</span>
                  <span className="assetName">{asset.name}</span>
                  <span className="assetInfo">
                    {formatBytes(asset.sizeBytes)}
                    {asset.duration ? ` · ${asset.duration}` : ""}
                    {` · ${asset.kind}`}
                  </span>
                </div>
                <div className="assetActions">
                  <button
                    className="miniBtn"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Replace
                  </button>
                  <button
                    className="miniBtn miniBtnDanger"
                    type="button"
                    aria-label="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAsset(null);
                      setPipeline([]);
                    }}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </section>
            )}

            {asset && (
              <section>
                <div className="rowHead">
                  <h3 className="sectionTitle">Quick Actions</h3>
                </div>
                <div className="quickGrid">
                  {quickPicks.map((qp) => {
                    const op = OPERATIONS.find((o) => o.id === qp.id);
                    if (!op || !acceptsSource(op, asset.kind)) return null;
                    const Icon = qp.icon;
                    return (
                      <button
                        key={qp.id}
                        type="button"
                        className="quickCard"
                        onClick={() => openConfigure(op)}
                      >
                        <Icon />
                        <span>{qp.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {asset && favorites.length > 0 && (
              <section>
                <div className="rowHead">
                  <h3 className="sectionTitle">Favorites</h3>
                  <button
                    type="button"
                    className="rowAction"
                    onClick={() => setView("catalog")}
                  >
                    See all
                  </button>
                </div>
                <div className="favScroll">
                  {favorites.map((op) => {
                    const Icon = op.icon;
                    return (
                      <button
                        key={op.id}
                        type="button"
                        className="favCard"
                        onClick={() => openConfigure(op)}
                      >
                        <span className="favIcon">
                          <Icon size={16} />
                        </span>
                        <span className="favName">{op.name}</span>
                        <span className="favTier">Tier {op.tier}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <div className="rowHead">
                <h3 className="sectionTitle">Pipeline</h3>
                <button
                  type="button"
                  className="rowAction"
                  onClick={() => setView("pipeline")}
                >
                  Open
                </button>
              </div>
              <button
                type="button"
                className="card pipelinePreview"
                onClick={() => setView("pipeline")}
              >
                <Icons.Flow />
                <div className="pipelinePreviewText">
                  <span className="pipelinePreviewTitle">Chain operations</span>
                  <span className="pipelinePreviewSub">
                    Queue multiple steps and run them in sequence
                  </span>
                </div>
                <Icons.Chevron />
              </button>
            </section>
          </div>
        )}

        {view === "catalog" && (
          <CatalogView
            grouped={grouped}
            search={search}
            setSearch={setSearch}
            tierFilters={TIER_FILTERS}
            tierFilter={tierFilter}
            setTierFilter={setTierFilter as (t: string) => void}
            tierLabels={TIERS}
            onOpenOp={openConfigure}
          />
        )}

        {view === "pipeline" && (
          <PipelineView
            source={asset}
            sourceKind={asset?.kind}
            sourceSizeBytes={asset?.sizeBytes}
            pipeline={pipeline}
            onAdd={() => setView("catalog")}
            onRemove={removeStep}
            onMove={moveStep}
            onRun={handleRun}
            running={runJob.loading}
            error={runJob.error}
            onEdit={(step) => {
              setSelectedOp(step.op);
              setValues(step.values);
              setSheet("configure");
            }}
          />
        )}

        {view === "run" && (
          <RunView
            source={asset}
            pipeline={pipeline}
            job={job}
            error={pollError}
          />
        )}

        {view === "result" && (
          <ResultView
            source={asset}
            job={job}
            downloadUrl={API.downloadUrl}
            titleComplete="Processing complete"
            titleFailed="Processing failed"
            onAgain={() => {
              setJobId(null);
              setView("home");
            }}
            onHome={resetAll}
          />
        )}
      </main>

      <nav className="bottomNav">
        <NavButton
          active={view === "home"}
          label="Home"
          icon={<Icons.Home />}
          onClick={() => setView("home")}
        />
        <NavButton
          active={view === "catalog"}
          label="Ops"
          icon={<Icons.Grid />}
          onClick={() => setView("catalog")}
        />
        <NavButton
          active={view === "pipeline"}
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
          }}
          onAdd={addToPipeline}
        />
      )}

      {sheet === "asset" && asset && (
        <Sheet
          title="Source Asset"
          badge={asset.kind}
          onClose={() => setSheet(null)}
          note="This file will be processed by the server when you run the pipeline."
        >
          <div className="infoList">
            <div className="infoRow">
              <span className="infoKey">Name</span>
              <span className="infoVal">{asset.name}</span>
            </div>
            <div className="infoRow">
              <span className="infoKey">Kind</span>
              <span className="infoVal">{asset.kind}</span>
            </div>
            <div className="infoRow">
              <span className="infoKey">Size</span>
              <span className="infoVal">{formatBytes(asset.sizeBytes)}</span>
            </div>
            {asset.duration && (
              <div className="infoRow">
                <span className="infoKey">Duration</span>
                <span className="infoVal">{asset.duration}</span>
              </div>
            )}
            {asset.meta && (
              <div className="infoRow">
                <span className="infoKey">Details</span>
                <span className="infoVal">{asset.meta}</span>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ----------------------------- local components --------------------------- */

function ConfigureSheet({
  op,
  values,
  setValue,
  onClose,
  onAdd,
}: {
  op: Operation;
  values: FormValues;
  setValue: (k: string, v: unknown) => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  const visible = useMemo(
    () => op.params.filter((p) => evalCondition(p.showIf, values)),
    [op.params, values]
  );

  const groups = useMemo(() => {
    const m = new Map<string, typeof op.params>();
    for (const p of visible) {
      const g = p.group ?? "Options";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(p);
    }
    return Array.from(m.entries());
  }, [visible]);

  return (
    <Sheet
      title={op.name}
      badge={`tier ${op.tier} · ${op.category}`}
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
        <Icons.Plus /> Add to Pipeline
      </button>
    </Sheet>
  );
}
