"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  type IconProps,
  type Operation,
  type FormValues,
  type OperationPayload,
  type JobProgress,
  type View,
  type PipelineStep,
} from "@/lib/studio/types";
import { evalCondition, defaultValues, makeUid } from "@/lib/studio/helpers";
import { createStudioClient } from "@/lib/studio/api";
import { Icons } from "@/components/studio/Icons";
import { useStudioStyles } from "@/components/studio/useStudioStyles";
import { Sheet } from "@/components/studio/Sheet";
import { Field } from "@/components/studio/Field";
import { NavButton } from "@/components/studio/NavButton";
import { Empty } from "@/components/studio/Empty";
import { useAsync } from "@/hooks/studio/useAsync";
import { useJobPoll } from "@/hooks/studio/useJobPoll";
import { CatalogView } from "@/components/studio/views/CatalogView";
import { PipelineView } from "@/components/studio/views/PipelineView";
import { RunView } from "@/components/studio/views/RunView";
import { ResultView } from "@/components/studio/views/ResultView";

/* ---------------------------- page-specific types --------------------------- */

type SheetKind = null | "configure" | "info" | "formats" | "subs";

type MediaFormat = {
  id: string;
  label: string;
  ext: string;
  size: string;
  note: string;
};

type Subtitle = {
  lang: string;
  label: string;
  auto: boolean;
};

type MediaInfo = {
  url: string;
  kind: "audio" | "video";
  id: string;
  title: string;
  uploader: string;
  duration: string;
  views: string;
  uploadedAt: string;
  thumbnail: string;
  formats: MediaFormat[];
  subtitles: Subtitle[];
};

/* ---------------------------------- API ----------------------------------- */

const API = createStudioClient({
  runUrl: "/api/op/run",
  jobUrl: (id) => `/api/op/job/${id}`,
  downloadUrl: (id) => `/api/op/download?jobId=${encodeURIComponent(id)}`,
});

const inspectUrl = async (url: string): Promise<MediaInfo> => {
  const res = await fetch("/api/op/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Failed to inspect");
  return data.info as MediaInfo;
};

/* ------------------------------- registry --------------------------------- */

const TIERS: Record<number, string> = {
  1: "Basic Downloads",
  2: "Quality & Selection",
  3: "Files & Metadata",
  4: "Auth & Subtitles",
  5: "Preset Pipelines",
  6: "Expert",
};

const TIER_FILTERS = [
  { id: "all", label: "All" },
  { id: "basic", label: "Basic" },
  { id: "quality", label: "Quality" },
  { id: "files", label: "Files" },
  { id: "auth", label: "Auth" },
  { id: "presets", label: "Presets" },
  { id: "expert", label: "Expert" },
] as const;

type TierFilter = (typeof TIER_FILTERS)[number]["id"];

const OPERATIONS: Operation[] = [
  /* ... paste the full OPERATIONS array from the previous op page verbatim ... */
];

/* ------------------------------- helpers --------------------------------- */

function acceptsSource(op: Operation, kind: "audio" | "video"): boolean {
  return op.accepts === "both" || op.accepts === kind;
}

function shortUrl(u: string): string {
  return u.length > 44 ? u.slice(0, 41) + "..." : u;
}

function headerTitle(v: View): string {
  return {
    home: "Downloads",
    catalog: "Operations",
    pipeline: "Pipeline",
    run: "Working",
    result: "Done",
  }[v];
}

function headerSub(
  v: View,
  pipeline: PipelineStep[],
  info: MediaInfo | null,
  job: JobProgress | null
): string {
  if (v === "home") return info ? shortUrl(info.title) : "paste a URL to start";
  if (v === "catalog") return String(pipeline.length) + " in pipeline";
  if (v === "pipeline")
    return pipeline.length ? String(pipeline.length) + " steps" : "empty";
  if (v === "run")
    return job ? job.status + " · " + String(job.percent) + "%" : "starting...";
  return "output ready";
}

/* ---------------------------------- page ---------------------------------- */

export default function OpPage() {
  useStudioStyles();

  const [view, setView] = useState<View>("home");
  const [sheet, setSheet] = useState<SheetKind>(null);

  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<MediaInfo | null>(null);
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

  const inspect = useAsync<MediaInfo>();
  const runJob = useAsync<string>();

  const visibleOps = useMemo(() => {
    const ranges: Record<TierFilter, [number, number]> = {
      all: [1, 6],
      basic: [1, 1],
      quality: [2, 2],
      files: [3, 3],
      auth: [4, 4],
      presets: [5, 5],
      expert: [6, 6],
    };
    const [lo, hi] = ranges[tierFilter];
    const q = search.trim().toLowerCase();
    return OPERATIONS.filter((op) => {
      if (op.tier < lo || op.tier > hi) return false;
      if (info && !acceptsSource(op, info.kind)) return false;
      if (!q) return true;
      return (op.name + op.description + op.category).toLowerCase().includes(q);
    });
  }, [tierFilter, search, info]);

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
        (o) => o.favorite && (!info || acceptsSource(o, info.kind))
      ),
    [info]
  );

  async function handleInspect() {
    if (!url.trim()) return;
    const result = await inspect.run(() => inspectUrl(url.trim()));
    if (result) setInfo(result);
  }

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
    setPipeline((p) => p.filter((s) => s.uid !== uid));
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
    if (!info || pipeline.length === 0) return;
    const operations: OperationPayload[] = pipeline.map((s) => ({
      id: s.op.id,
      params: s.values,
    }));
    const result = await runJob.run(() =>
      API.run([{ id: "main", role: "main" }], operations)
    );
    if (result) {
      setJobId(result);
      setView("run");
    }
  }

  function resetAll() {
    setJobId(null);
    setPipeline([]);
    setView("home");
  }

  useEffect(() => {
    if (view === "run" && job?.status === "completed") {
      const t = setTimeout(() => setView("result"), 500);
      return () => clearTimeout(t);
    }
  }, [view, job]);

  const quickPicks: { id: string; label: string; icon: ComponentType<IconProps> }[] = [
    { id: "quick-best", label: "Best", icon: Icons.Bolt },
    { id: "audio-mp3", label: "MP3", icon: Icons.Music },
    { id: "resolution-cap", label: "1080p", icon: Icons.Video },
    { id: "section-download", label: "Cut", icon: Icons.Scissors },
  ];

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="iconbtn"
          onClick={() => (view === "home" ? resetAll() : setView("home"))}
          aria-label="Back"
          type="button"
        >
          {view === "home" ? <Icons.Bolt /> : <Icons.Back />}
        </button>
        <div className="title">
          <span className="titleMain">{headerTitle(view)}</span>
          <span className="titleSub">{headerSub(view, pipeline, info, job)}</span>
        </div>
      </header>

      <main className="main">
        {view === "home" && (
          <div className="pad">
            <section className="card urlCard">
              <div className="urlHead">
                <Icons.Link />
                <span>Source URL</span>
              </div>
              <input
                className="urlInput"
                placeholder="YouTube, TikTok, Twitter, SoundCloud, direct URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url && !inspect.loading) handleInspect();
                }}
              />
              <button
                className="primaryBtn"
                onClick={handleInspect}
                disabled={!url || inspect.loading}
                type="button"
              >
                {inspect.loading ? "Inspecting..." : "Inspect"}
              </button>
              {inspect.error && (
                <div className="errorBox">
                  <Icons.Warn /> {inspect.error}
                </div>
              )}
            </section>

            {info && (
              <section className="card mediaCard">
                <div className="mediaThumb">
                  <Icons.Play size={28} />
                  <span className="mediaDuration">{info.duration}</span>
                </div>
                <div className="mediaMeta">
                  <span className="mediaTitle">{info.title}</span>
                  <span className="mediaSub">{info.uploader}</span>
                  <span className="mediaStats">
                    {info.views} · {info.uploadedAt} · {info.kind}
                  </span>
                </div>
                <div className="mediaActions">
                  <button
                    className="miniBtn"
                    type="button"
                    onClick={() => setSheet("formats")}
                  >
                    <Icons.Video size={14} /> {info.formats.length} formats
                  </button>
                  <button
                    className="miniBtn"
                    type="button"
                    onClick={() => setSheet("subs")}
                  >
                    <Icons.Subtitle size={14} /> {info.subtitles.length} subs
                  </button>
                  <button
                    className="miniBtn"
                    type="button"
                    onClick={() => setSheet("info")}
                  >
                    <Icons.Info size={14} /> Details
                  </button>
                </div>
              </section>
            )}

            {info && (
              <section>
                <div className="rowHead">
                  <h3 className="sectionTitle">Quick Actions</h3>
                </div>
                <div className="quickGrid">
                  {quickPicks.map((qp) => {
                    const op = OPERATIONS.find((o) => o.id === qp.id);
                    if (!op || !acceptsSource(op, info.kind)) return null;
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

            {info && favorites.length > 0 && (
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
            source={info}
            sourceKind={info?.kind}
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
          <RunView source={info} pipeline={pipeline} job={job} error={pollError} />
        )}

        {view === "result" && (
          <ResultView
            source={info}
            job={job}
            downloadUrl={API.downloadUrl}
            titleComplete="Download complete"
            titleFailed="Download failed"
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

      {sheet === "configure" && selectedOp && (
        <ConfigureSheet
          op={selectedOp}
          values={values}
          setValue={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onClose={() => {
            setSheet(null);
            setSelectedOp(null);
          }}
          onAdd={addToPipeline}
        />
      )}

      {sheet === "info" && info && (
        <Sheet
          title="Media Info"
          onClose={() => setSheet(null)}
          note="Metadata returned by the inspector."
        >
          <InfoList info={info} />
        </Sheet>
      )}

      {sheet === "formats" && info && (
        <Sheet
          title="Available Formats"
          badge={String(info.formats.length) + " formats"}
          onClose={() => setSheet(null)}
          note="Enumerated from the extractor."
        >
          <FormatList formats={info.formats} />
        </Sheet>
      )}

      {sheet === "subs" && info && (
        <Sheet
          title="Subtitles"
          badge={String(info.subtitles.length) + " languages"}
          onClose={() => setSheet(null)}
          note="Manual and auto-generated captions."
        >
          <SubList subs={info.subtitles} />
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

function InfoList({ info }: { info: MediaInfo }) {
  const rows: [string, string][] = [
    ["ID", info.id],
    ["Title", info.title],
    ["Uploader", info.uploader],
    ["Kind", info.kind],
    ["Duration", info.duration],
    ["Views", info.views],
    ["Uploaded", info.uploadedAt],
    ["Formats", String(info.formats.length)],
    ["Subtitles", String(info.subtitles.length)],
  ];
  return (
    <div className="infoList">
      {rows.map(([k, v]) => (
        <div key={k} className="infoRow">
          <span className="infoKey">{k}</span>
          <span className="infoVal">{v}</span>
        </div>
      ))}
    </div>
  );
}

function FormatList({ formats }: { formats: MediaFormat[] }) {
  return (
    <div className="formatList">
      {formats.map((f) => (
        <div key={f.id} className="formatRow">
          <span className="formatId">{f.id}</span>
          <div className="formatBody">
            <span className="formatLabel">{f.label}</span>
            <span className="formatMeta">
              {f.ext} · {f.size} · {f.note}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SubList({ subs }: { subs: Subtitle[] }) {
  return (
    <div className="formatList">
      {subs.map((s, i) => (
        <div key={s.lang + i} className="formatRow">
          <span className="formatId">{s.lang}</span>
          <div className="formatBody">
            <span className="formatLabel">{s.label}</span>
            <span className="formatMeta">
              {s.auto ? "auto-generated" : "manual"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
