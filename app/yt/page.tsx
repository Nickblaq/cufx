// app/yt/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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

type MediaFormat = { id: string; label: string; ext: string; size: string; note: string };
type Subtitle = { lang: string; label: string; auto: boolean };

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
  1: "Basic",
  2: "Quality",
  3: "Files",
  4: "Auth & Subs",
  5: "Presets",
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
  /* ─── Tier 1 ─────────────────────────────────────────────────────────── */
  { id: "quick-best", name: "Quick Download", description: "Best video + best audio, merged.", tier: 1, category: "download", accepts: "video", icon: Icons.Bolt, favorite: true, params: [] },
  {
    id: "audio-mp3", name: "Audio · MP3", description: "Extract audio as MP3.", tier: 1, category: "audio", accepts: "both", icon: Icons.Music, favorite: true,
    params: [{
      key: "quality", type: "enum", label: "Quality", default: "0",
      options: [
        { value: "0", label: "Best (V0)" },
        { value: "2", label: "High (V2)" },
        { value: "5", label: "Medium (V5)" },
        { value: "320K", label: "CBR 320k" },
        { value: "192K", label: "CBR 192k" },
      ],
    }],
  },
  { id: "audio-m4a", name: "Audio · M4A", description: "Extract audio as M4A.", tier: 1, category: "audio", accepts: "both", icon: Icons.Music, params: [] },
  { id: "video-mp4", name: "Video · MP4", description: "Best MP4 available.", tier: 1, category: "video", accepts: "video", icon: Icons.Video, params: [] },
  { id: "video-webm", name: "Video · WebM", description: "Best WebM available.", tier: 1, category: "video", accepts: "video", icon: Icons.Video, params: [] },
  {
    id: "custom-format", name: "Custom Format", description: "Raw -f selector.", tier: 1, category: "download", accepts: "both", icon: Icons.Terminal,
    params: [{ key: "format", type: "string", label: "Format", placeholder: "bv*[height<=1080]+ba/b", helpText: "yt-dlp -f value." }],
  },

  /* ─── Tier 2 ─────────────────────────────────────────────────────────── */
  {
    id: "resolution-cap", name: "Resolution Cap", description: "Best under a max height.", tier: 2, category: "quality", accepts: "video", icon: Icons.Video, favorite: true,
    params: [{
      key: "maxHeight", type: "enum", label: "Max Height", default: "1080",
      options: [
        { value: "360", label: "360p" },
        { value: "480", label: "480p" },
        { value: "720", label: "720p" },
        { value: "1080", label: "1080p" },
        { value: "1440", label: "1440p" },
        { value: "2160", label: "4K" },
      ],
    }],
  },
  { id: "filesize-cap", name: "Filesize Cap", description: "Limit to max size.", tier: 2, category: "quality", accepts: "both", icon: Icons.Archive, params: [{ key: "maxSize", type: "integer", label: "Max Size", default: 500, min: 10, max: 10000, unit: "MB" }] },
  {
    id: "codec-pref", name: "Codec Preference", description: "Prefer codecs.", tier: 2, category: "quality", accepts: "video", icon: Icons.Settings,
    params: [
      {
        key: "vcodec", type: "enum", label: "Video", default: "any",
        options: [
          { value: "any", label: "Any" },
          { value: "h264", label: "H.264" },
          { value: "h265", label: "H.265" },
          { value: "vp9", label: "VP9" },
          { value: "av01", label: "AV1" },
        ],
      },
      {
        key: "acodec", type: "enum", label: "Audio", default: "any",
        options: [
          { value: "any", label: "Any" },
          { value: "opus", label: "Opus" },
          { value: "aac", label: "AAC" },
          { value: "mp3", label: "MP3" },
          { value: "flac", label: "FLAC" },
        ],
      },
    ],
  },
  {
    id: "section-download", name: "Section / Clip", description: "Download a time range.", tier: 2, category: "quality", accepts: "both", icon: Icons.Scissors, favorite: true,
    params: [
      { key: "section", type: "string", label: "Section", placeholder: "*05:00-25:00", helpText: "Time range with * prefix." },
      { key: "forceKeyframes", type: "boolean", label: "Force keyframes (slower, cleaner cuts)", default: true },
    ],
  },
  {
    id: "rate-limit", name: "Rate Limit", description: "Cap download speed.", tier: 2, category: "quality", accepts: "both", icon: Icons.Globe,
    params: [
      { key: "rate", type: "string", label: "Max Rate", default: "1M" },
      { key: "concurrent", type: "integer", label: "Concurrent Fragments", default: 4, min: 1, max: 32 },
    ],
  },

  /* ─── Tier 3 ─────────────────────────────────────────────────────────── */
  {
    id: "output-template", name: "Filename Template", description: "Customize output filename.", tier: 3, category: "files", accepts: "both", icon: Icons.Archive,
    params: [
      { key: "template", type: "string", label: "Template", default: "%(title)s.%(ext)s", helpText: "%(title)s, %(id)s, %(uploader)s, %(upload_date)s, %(ext)s" },
      { key: "restrict", type: "boolean", label: "ASCII-safe names", default: false },
    ],
  },
  {
    id: "thumbnail-download", name: "Save Thumbnail", description: "Save cover image alongside.", tier: 3, category: "metadata", accepts: "both", icon: Icons.Image,
    params: [
      { key: "all", type: "boolean", label: "All sizes", default: false },
      { key: "format", type: "enum", label: "Format", default: "jpg", options: [{ value: "jpg", label: "JPEG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WebP" }] },
    ],
  },
  { id: "info-json", name: "Info JSON", description: "Write metadata sidecar.", tier: 3, category: "metadata", accepts: "both", icon: Icons.Info, favorite: true, params: [{ key: "comments", type: "boolean", label: "Include comments", default: false }] },
  { id: "download-archive", name: "Download Archive", description: "Skip already-downloaded items.", tier: 3, category: "metadata", accepts: "both", icon: Icons.Archive, params: [{ key: "archiveFile", type: "string", label: "Archive File", default: "archive.txt" }] },

  /* ─── Tier 4 ─────────────────────────────────────────────────────────── */
  {
    id: "cookies-browser", name: "Cookies from Browser", description: "Load auth cookies.", tier: 4, category: "auth", accepts: "both", icon: Icons.Lock, favorite: true,
    params: [
      {
        key: "browser", type: "enum", label: "Browser", default: "chrome",
        options: [
          { value: "chrome", label: "Chrome" },
          { value: "firefox", label: "Firefox" },
          { value: "edge", label: "Edge" },
          { value: "brave", label: "Brave" },
          { value: "safari", label: "Safari" },
        ],
      },
      { key: "profile", type: "string", label: "Profile", placeholder: "Default", advanced: true },
    ],
  },
  { id: "cookies-file", name: "Cookies File", description: "Use a Netscape cookies.txt.", tier: 4, category: "auth", accepts: "both", icon: Icons.Lock, params: [{ key: "cookieFile", type: "string", label: "Path", placeholder: "/path/cookies.txt" }] },
  { id: "proxy-config", name: "Proxy", description: "Route traffic through a proxy.", tier: 4, category: "auth", accepts: "both", icon: Icons.Globe, params: [{ key: "proxy", type: "string", label: "Proxy URL", placeholder: "socks5://127.0.0.1:1080" }] },
  {
    id: "sub-download", name: "Subtitles", description: "Download subtitles.", tier: 4, category: "subs", accepts: "video", icon: Icons.Subtitle, favorite: true,
    params: [
      { key: "langs", type: "string", label: "Languages", default: "en", placeholder: "en,ja or all" },
      { key: "format", type: "enum", label: "Format", default: "srt", options: [{ value: "srt", label: "SRT" }, { value: "ass", label: "ASS" }, { value: "vtt", label: "VTT" }, { value: "best", label: "Best" }] },
    ],
  },
  { id: "embed-subs", name: "Embed Subtitles", description: "Mux subs into media.", tier: 4, category: "subs", accepts: "video", icon: Icons.Subtitle, params: [{ key: "langs", type: "string", label: "Languages", default: "en" }] },
  { id: "embed-thumbnail", name: "Embed Thumbnail", description: "Attach cover art.", tier: 4, category: "metadata", accepts: "both", icon: Icons.Image, params: [] },
  { id: "embed-metadata", name: "Embed Metadata", description: "Write title/artist/date tags.", tier: 4, category: "metadata", accepts: "both", icon: Icons.Info, params: [{ key: "chapters", type: "boolean", label: "Include chapters", default: true }] },

  /* ─── Tier 5 ─────────────────────────────────────────────────────────── */
  {
    id: "music-pipeline", name: "Music Pipeline", description: "MP3 + metadata + cover art.", tier: 5, category: "chain", accepts: "both", icon: Icons.Music, favorite: true, chainSteps: ["audio-mp3", "embed-thumbnail", "embed-metadata"],
    params: [{
      key: "quality", type: "enum", label: "Quality", default: "320K",
      options: [{ value: "128K", label: "128k" }, { value: "192K", label: "192k" }, { value: "256K", label: "256k" }, { value: "320K", label: "320k" }],
    }],
  },
  {
    id: "archive-pipeline", name: "Archive Pipeline", description: "Video + subs + thumb + JSON + archive.", tier: 5, category: "chain", accepts: "video", icon: Icons.Archive, chainSteps: ["quick-best", "sub-download", "thumbnail-download", "info-json", "download-archive"],
    params: [
      { key: "subLangs", type: "string", label: "Subtitle Languages", default: "en" },
      { key: "archiveFile", type: "string", label: "Archive File", default: "archive.txt" },
    ],
  },
  { id: "social-clip", name: "Social Clip", description: "1080p + subs embedded.", tier: 5, category: "chain", accepts: "video", icon: Icons.Video, chainSteps: ["resolution-cap", "sub-download", "embed-subs"], params: [{ key: "subLangs", type: "string", label: "Subtitle Languages", default: "en" }] },

  /* ─── Tier 6 ─────────────────────────────────────────────────────────── */
  {
    id: "sponsorblock-mark", name: "SponsorBlock Mark", description: "Mark sponsor sections.", tier: 6, category: "expert", accepts: "video", icon: Icons.Shield,
    params: [{
      key: "categories", type: "multiselect", label: "Categories", default: ["sponsor", "intro", "outro"],
      options: [
        { value: "sponsor", label: "Sponsor" },
        { value: "intro", label: "Intro" },
        { value: "outro", label: "Outro" },
        { value: "selfpromo", label: "Self-promo" },
        { value: "filler", label: "Filler" },
      ],
    }],
  },
  {
    id: "sponsorblock-remove", name: "SponsorBlock Remove", description: "Cut sponsor sections.", tier: 6, category: "expert", accepts: "video", icon: Icons.Shield,
    params: [{
      key: "categories", type: "multiselect", label: "Remove", default: ["sponsor"],
      options: [
        { value: "sponsor", label: "Sponsor" },
        { value: "intro", label: "Intro" },
        { value: "outro", label: "Outro" },
        { value: "selfpromo", label: "Self-promo" },
        { value: "filler", label: "Filler" },
      ],
    }],
  },
  {
    id: "extractor-args", name: "Extractor Args", description: "Custom extractor args.", tier: 6, category: "expert", accepts: "both", icon: Icons.Terminal,
    params: [
      { key: "extractor", type: "enum", label: "Extractor", default: "youtube", options: [{ value: "youtube", label: "YouTube" }, { value: "generic", label: "Generic" }, { value: "tiktok", label: "TikTok" }, { value: "twitter", label: "Twitter/X" }] },
      { key: "args", type: "string", label: "Arguments", placeholder: "player_client=default,-web" },
    ],
  },
  {
    id: "split-chapters", name: "Split by Chapters", description: "Split into per-chapter files.", tier: 6, category: "expert", accepts: "both", icon: Icons.Flow,
    params: [{ key: "template", type: "string", label: "Chapter Template", default: "%(title)s - %(section_number)02d - %(section_title)s.%(ext)s" }],
  },
];

/* ------------------------------- helpers --------------------------------- */

function acceptsSource(op: Operation, kind: "audio" | "video"): boolean {
  return op.accepts === "both" || op.accepts === kind;
}

const HEADER_TITLES: Record<View, string> = {
  home: "YouTube",
  catalog: "Operations",
  pipeline: "Pipeline",
  run: "Working",
  result: "Done",
};

function headerSub(
  v: View,
  pipeline: PipelineStep[],
  info: MediaInfo | null,
  job: JobProgress | null
): string {
  if (v === "home") return info ? info.title.slice(0, 40) : "paste a URL";
  if (v === "catalog") return `${pipeline.length} queued`;
  if (v === "pipeline") return pipeline.length ? `${pipeline.length} steps` : "empty";
  if (v === "run") return job ? `${job.status} · ${Math.round(job.percent)}%` : "starting…";
  return "output ready";
}

/* ---------------------------------- page ---------------------------------- */

export default function YtPage() {
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
  const { job, error: pollError } = useJobPoll(pollingActive ? jobId : null, API.job);

  const inspect = useAsync<MediaInfo>();
  const runJob = useAsync<string>();

  const visibleOps = useMemo(() => {
    const ranges: Record<TierFilter, [number, number]> = {
      all: [1, 6], basic: [1, 1], quality: [2, 2], files: [3, 3],
      auth: [4, 4], presets: [5, 5], expert: [6, 6],
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
    () => OPERATIONS.filter((o) => o.favorite && (!info || acceptsSource(o, info.kind))),
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
    { id: "section-download", label: "Clip", icon: Icons.Scissors },
  ];

  return (
    <div className="app yt-compact">
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
          <span className="titleMain">{HEADER_TITLES[view]}</span>
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
                placeholder="Paste a YouTube URL…"
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
                {inspect.loading ? "Inspecting…" : "Inspect"}
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
                  <button className="miniBtn" type="button" onClick={() => setSheet("formats")}>
                    <Icons.Video size={14} /> {info.formats.length} formats
                  </button>
                  <button className="miniBtn" type="button" onClick={() => setSheet("subs")}>
                    <Icons.Subtitle size={14} /> {info.subtitles.length} subs
                  </button>
                  <button className="miniBtn" type="button" onClick={() => setSheet("info")}>
                    <Icons.Info size={14} /> Details
                  </button>
                </div>
              </section>
            )}

            {info && (
              <section>
                <div className="rowHead">
                  <h3 className="sectionTitle">Quick</h3>
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
                    All
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
                  <span className="pipelinePreviewTitle">
                    {pipeline.length === 0
                      ? "Chain operations"
                      : `${pipeline.length} step${pipeline.length === 1 ? "" : "s"} queued`}
                  </span>
                  <span className="pipelinePreviewSub">
                    {pipeline.length === 0
                      ? "Queue multiple steps and run them in sequence"
                      : pipeline.map((s) => s.op.name).join(" → ")}
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
        <Sheet title="Media Info" onClose={() => setSheet(null)} note="Metadata from the inspector.">
          <InfoList info={info} />
        </Sheet>
      )}

      {sheet === "formats" && info && (
        <Sheet
          title="Formats"
          badge={`${info.formats.length} available`}
          onClose={() => setSheet(null)}
          note="Enumerated from the extractor."
        >
          <FormatList formats={info.formats} />
        </Sheet>
      )}

      {sheet === "subs" && info && (
        <Sheet
          title="Subtitles"
          badge={`${info.subtitles.length} languages`}
          onClose={() => setSheet(null)}
          note="Manual and auto-generated captions."
        >
          <SubList subs={info.subtitles} />
        </Sheet>
      )}

      {/* Compact overrides — scoped to the yt page only */}
      <style jsx>{`
        :global(.yt-compact .pad) {
          gap: 12px;
          padding: 4px 16px 20px;
        }
        :global(.yt-compact .rowHead) {
          padding: 0 4px 6px;
        }
        :global(.yt-compact .card) {
          padding: 12px;
        }
        :global(.yt-compact .urlCard) {
          gap: 8px;
        }
        :global(.yt-compact .quickGrid) {
          gap: 6px;
        }
        :global(.yt-compact .quickCard) {
          padding: 10px 6px;
        }
        :global(.yt-compact .favScroll) {
          gap: 8px;
        }
        :global(.yt-compact .favCard) {
          min-width: 118px;
          padding: 10px;
          gap: 6px;
        }
        :global(.yt-compact .mediaThumb) {
          height: 130px;
        }
        :global(.yt-compact .mediaCard) {
          gap: 10px;
          padding: 10px;
        }
        :global(.yt-compact .pipelinePreview) {
          padding: 12px;
        }
      `}</style>
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
    const m = new Map<string, Operation["params"]>();
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
