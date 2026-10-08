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
  {
    id: "quick-best",
    name: "Quick Download (Best)",
    description: "Best video and best audio merged automatically.",
    tier: 1, category: "download", accepts: "video",
    icon: Icons.Bolt, favorite: true,
    params: [],
  },
  {
    id: "audio-mp3",
    name: "Audio Only (MP3)",
    description: "Extract audio and convert to MP3.",
    tier: 1, category: "audio", accepts: "both",
    icon: Icons.Music, favorite: true,
    params: [
      {
        key: "quality", type: "enum", label: "Quality", default: "0",
        options: [
          { value: "0", label: "Best (V0)" },
          { value: "2", label: "High (V2)" },
          { value: "5", label: "Medium (V5)" },
          { value: "9", label: "Low (V9)" },
          { value: "320K", label: "CBR 320k" },
          { value: "192K", label: "CBR 192k" },
        ],
      },
    ],
  },
  {
    id: "audio-m4a",
    name: "Audio Only (M4A)",
    description: "Extract audio preserving AAC quality.",
    tier: 1, category: "audio", accepts: "both",
    icon: Icons.Music,
    params: [],
  },
  {
    id: "video-mp4",
    name: "Video (MP4)",
    description: "Download the best MP4 format available.",
    tier: 1, category: "video", accepts: "video",
    icon: Icons.Video,
    params: [],
  },
  {
    id: "video-webm",
    name: "Video (WebM)",
    description: "Download the best WebM format available.",
    tier: 1, category: "video", accepts: "video",
    icon: Icons.Video,
    params: [],
  },
  {
    id: "custom-format",
    name: "Custom Format String",
    description: "Pass a raw -f selector for full control.",
    tier: 1, category: "download", accepts: "both",
    icon: Icons.Terminal,
    params: [
      {
        key: "format", type: "string", label: "Format Selector",
        placeholder: "bv*[height<=1080]+ba/b",
        helpText: "Raw yt-dlp -f value.",
      },
    ],
  },
  {
    id: "resolution-cap",
    name: "Resolution Cap",
    description: "Best video up to a maximum height.",
    tier: 2, category: "quality", accepts: "video",
    icon: Icons.Video, favorite: true,
    params: [
      {
        key: "maxHeight", type: "enum", label: "Max Height", default: "1080",
        options: [
          { value: "360", label: "360p" },
          { value: "480", label: "480p" },
          { value: "720", label: "720p" },
          { value: "1080", label: "1080p" },
          { value: "1440", label: "1440p" },
          { value: "2160", label: "4K (2160p)" },
        ],
      },
    ],
  },
  {
    id: "filesize-cap",
    name: "Filesize Cap",
    description: "Limit download to a maximum size.",
    tier: 2, category: "quality", accepts: "both",
    icon: Icons.Archive,
    params: [
      { key: "maxSize", type: "integer", label: "Max Size", default: 500, min: 10, max: 10000, unit: "MB" },
    ],
  },
  {
    id: "codec-pref",
    name: "Codec Preference",
    description: "Prefer specific video and audio codecs.",
    tier: 2, category: "quality", accepts: "video",
    icon: Icons.Settings,
    params: [
      {
        key: "vcodec", type: "enum", label: "Video Codec", default: "any",
        options: [
          { value: "any", label: "Any" },
          { value: "h264", label: "H.264 (max compatibility)" },
          { value: "h265", label: "H.265 / HEVC" },
          { value: "vp9", label: "VP9" },
          { value: "av01", label: "AV1" },
        ],
      },
      {
        key: "acodec", type: "enum", label: "Audio Codec", default: "any",
        options: [
          { value: "any", label: "Any" },
          { value: "opus", label: "Opus" },
          { value: "aac", label: "AAC / M4A" },
          { value: "mp3", label: "MP3" },
          { value: "flac", label: "FLAC" },
        ],
      },
    ],
  },
  {
    id: "section-download",
    name: "Section Download",
    description: "Download only a time range or chapter.",
    tier: 2, category: "quality", accepts: "both",
    icon: Icons.Scissors, favorite: true,
    params: [
      {
        key: "section", type: "string", label: "Section Expression",
        placeholder: "*05:00-25:00",
        helpText: "Time range with * prefix, or chapter title regex.",
      },
      {
        key: "forceKeyframes", type: "boolean",
        label: "Force keyframes at boundaries (slower, cleaner cuts)",
        default: true,
      },
    ],
  },
  {
    id: "rate-limit",
    name: "Rate Limit",
    description: "Cap download speed and fragment concurrency.",
    tier: 2, category: "quality", accepts: "both",
    icon: Icons.Globe,
    params: [
      { key: "rate", type: "string", label: "Max Rate", default: "1M", placeholder: "1M, 500K, 4.2M" },
      { key: "concurrent", type: "integer", label: "Concurrent Fragments", default: 4, min: 1, max: 32 },
    ],
  },
  {
    id: "output-template",
    name: "Output Template",
    description: "Custom filename pattern using metadata fields.",
    tier: 3, category: "files", accepts: "both",
    icon: Icons.Archive,
    params: [
      {
        key: "template", type: "string", label: "Filename Template",
        default: "%(title)s [%(id)s].%(ext)s",
        helpText: "Fields: %(title)s %(id)s %(uploader)s %(upload_date)s %(ext)s",
      },
      { key: "restrict", type: "boolean", label: "Restrict to ASCII-safe names", default: false },
    ],
  },
  {
    id: "thumbnail-download",
    name: "Thumbnail Download",
    description: "Save the cover image alongside the media.",
    tier: 3, category: "metadata", accepts: "both",
    icon: Icons.Image,
    params: [
      { key: "all", type: "boolean", label: "Download all thumbnail sizes", default: false },
      {
        key: "format", type: "enum", label: "Convert To", default: "jpg",
        options: [
          { value: "jpg", label: "JPEG" },
          { value: "png", label: "PNG" },
          { value: "webp", label: "WebP" },
        ],
      },
    ],
  },
  {
    id: "info-json",
    name: "Info JSON Export",
    description: "Write full metadata to a .info.json file.",
    tier: 3, category: "metadata", accepts: "both",
    icon: Icons.Info, favorite: true,
    params: [
      { key: "comments", type: "boolean", label: "Include comments (slow)", default: false },
    ],
  },
  {
    id: "download-archive",
    name: "Download Archive",
    description: "Skip already-downloaded items via an archive file.",
    tier: 3, category: "metadata", accepts: "both",
    icon: Icons.Archive,
    params: [
      { key: "archiveFile", type: "string", label: "Archive File", default: "archive.txt" },
    ],
  },
  {
    id: "cookies-browser",
    name: "Cookies from Browser",
    description: "Load auth cookies from your local browser.",
    tier: 4, category: "auth", accepts: "both",
    icon: Icons.Lock, favorite: true,
    params: [
      {
        key: "browser", type: "enum", label: "Browser", default: "chrome",
        options: [
          { value: "chrome", label: "Chrome" },
          { value: "firefox", label: "Firefox" },
          { value: "edge", label: "Edge" },
          { value: "brave", label: "Brave" },
          { value: "safari", label: "Safari" },
          { value: "chromium", label: "Chromium" },
          { value: "opera", label: "Opera" },
          { value: "vivaldi", label: "Vivaldi" },
        ],
      },
      { key: "profile", type: "string", label: "Profile (optional)", placeholder: "Default", advanced: true },
    ],
  },
  {
    id: "cookies-file",
    name: "Cookies File",
    description: "Use a Netscape cookies.txt file.",
    tier: 4, category: "auth", accepts: "both",
    icon: Icons.Lock,
    params: [
      { key: "cookieFile", type: "string", label: "Path to cookies.txt", placeholder: "/path/cookies.txt" },
    ],
  },
  {
    id: "proxy-config",
    name: "Proxy Configuration",
    description: "Route traffic through a proxy.",
    tier: 4, category: "auth", accepts: "both",
    icon: Icons.Globe,
    params: [
      { key: "proxy", type: "string", label: "Proxy URL", placeholder: "socks5://127.0.0.1:1080" },
    ],
  },
  {
    id: "sub-download",
    name: "Subtitle Download",
    description: "Download subtitles in chosen languages.",
    tier: 4, category: "subs", accepts: "video",
    icon: Icons.Subtitle, favorite: true,
    params: [
      { key: "langs", type: "string", label: "Languages", default: "en", placeholder: "en,ja,es or all" },
      {
        key: "format", type: "enum", label: "Format", default: "srt",
        options: [
          { value: "srt", label: "SRT" },
          { value: "ass", label: "ASS" },
          { value: "vtt", label: "VTT" },
          { value: "lrc", label: "LRC" },
          { value: "best", label: "Best available" },
        ],
      },
    ],
  },
  {
    id: "embed-subs",
    name: "Embed Subtitles",
    description: "Mux subtitles into the media file.",
    tier: 4, category: "subs", accepts: "video",
    icon: Icons.Subtitle,
    params: [
      { key: "langs", type: "string", label: "Languages", default: "en" },
    ],
  },
  {
    id: "embed-thumbnail",
    name: "Embed Thumbnail",
    description: "Attach the thumbnail as cover art.",
    tier: 4, category: "metadata", accepts: "both",
    icon: Icons.Image,
    params: [],
  },
  {
    id: "embed-metadata",
    name: "Embed Metadata",
    description: "Write title, artist, and date tags into the file.",
    tier: 4, category: "metadata", accepts: "both",
    icon: Icons.Info,
    params: [
      { key: "chapters", type: "boolean", label: "Include chapters", default: true },
    ],
  },
  {
    id: "music-pipeline",
    name: "Music Download Pipeline",
    description: "Extract audio as MP3, embed metadata and cover art.",
    tier: 5, category: "chain", accepts: "both",
    icon: Icons.Music, favorite: true,
    chainSteps: ["audio-mp3", "embed-thumbnail", "embed-metadata"],
    params: [
      {
        key: "quality", type: "enum", label: "Audio Quality", default: "320K",
        options: [
          { value: "128K", label: "128 kbps" },
          { value: "192K", label: "192 kbps" },
          { value: "256K", label: "256 kbps" },
          { value: "320K", label: "320 kbps" },
        ],
      },
    ],
  },
  {
    id: "archive-pipeline",
    name: "Archival Pipeline",
    description: "Best video plus subs, thumbnail, metadata, and archive tracking.",
    tier: 5, category: "chain", accepts: "video",
    icon: Icons.Archive,
    chainSteps: ["quick-best", "sub-download", "thumbnail-download", "info-json", "download-archive"],
    params: [
      { key: "subLangs", type: "string", label: "Subtitle Languages", default: "en" },
      { key: "archiveFile", type: "string", label: "Archive File", default: "archive.txt" },
    ],
  },
  {
    id: "social-clip",
    name: "Social Clip",
    description: "Cap at 1080p, embed subtitles, quick download.",
    tier: 5, category: "chain", accepts: "video",
    icon: Icons.Video,
    chainSteps: ["resolution-cap", "sub-download", "embed-subs"],
    params: [
      { key: "subLangs", type: "string", label: "Subtitle Languages", default: "en" },
    ],
  },
  {
    id: "sponsorblock-mark",
    name: "SponsorBlock Mark",
    description: "Mark sponsor, intro, and outro sections as chapters.",
    tier: 6, category: "expert", accepts: "video",
    icon: Icons.Shield,
    params: [
      {
        key: "categories", type: "multiselect", label: "Categories",
        default: ["sponsor", "intro", "outro"],
        options: [
          { value: "sponsor", label: "Sponsor" },
          { value: "intro", label: "Intro" },
          { value: "outro", label: "Outro" },
          { value: "selfpromo", label: "Self-promotion" },
          { value: "preview", label: "Preview" },
          { value: "filler", label: "Filler" },
          { value: "interaction", label: "Interaction reminder" },
          { value: "music_offtopic", label: "Non-music section" },
        ],
      },
    ],
  },
  {
    id: "sponsorblock-remove",
    name: "SponsorBlock Remove",
    description: "Cut sponsor segments from the downloaded file.",
    tier: 6, category: "expert", accepts: "video",
    icon: Icons.Shield,
    params: [
      {
        key: "categories", type: "multiselect", label: "Remove Categories",
        default: ["sponsor"],
        options: [
          { value: "sponsor", label: "Sponsor" },
          { value: "intro", label: "Intro" },
          { value: "outro", label: "Outro" },
          { value: "selfpromo", label: "Self-promotion" },
          { value: "preview", label: "Preview" },
          { value: "filler", label: "Filler" },
        ],
      },
    ],
  },
  {
    id: "extractor-args",
    name: "Extractor Arguments",
    description: "Pass custom args to specific extractors.",
    tier: 6, category: "expert", accepts: "both",
    icon: Icons.Terminal,
    params: [
      {
        key: "extractor", type: "enum", label: "Extractor", default: "youtube",
        options: [
          { value: "youtube", label: "YouTube" },
          { value: "generic", label: "Generic" },
          { value: "tiktok", label: "TikTok" },
          { value: "twitter", label: "Twitter / X" },
          { value: "soundcloud", label: "SoundCloud" },
        ],
      },
      { key: "args", type: "string", label: "Arguments", placeholder: "player_client=default,-web" },
    ],
  },
  {
    id: "split-chapters",
    name: "Split by Chapters",
    description: "Split the download into per-chapter files.",
    tier: 6, category: "expert", accepts: "both",
    icon: Icons.Flow,
    params: [
      {
        key: "template", type: "string", label: "Chapter Template",
        default: "%(title)s - %(section_number)02d - %(section_title)s.%(ext)s",
      },
    ],
  },
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
