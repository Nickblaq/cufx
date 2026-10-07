// app/op/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════════ */

type IconProps = { size?: number };

type ParamType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "enum"
  | "multiselect"
  | "textarea";

type Option = { value: string; label: string };
type Condition = { param: string; operator: "eq" | "neq" | "truthy" | "falsy"; value?: unknown };
type MediaKind = "audio" | "video" | "both";

type Param = {
  key: string;
  type: ParamType;
  label: string;
  group?: string;
  default?: unknown;
  options?: Option[];
  placeholder?: string;
  helpText?: string;
  advanced?: boolean;
  showIf?: Condition;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

type Operation = {
  id: string;
  name: string;
  description: string;
  tier: number;
  category: string;
  accepts: MediaKind;
  icon: ComponentType<IconProps>;
  chainSteps?: string[];
  favorite?: boolean;
  params: Param[];
};

type FormValues = Record<string, unknown>;

type OperationPayload = { id: string; params: FormValues };

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

type JobStatus = "queued" | "running" | "completed" | "failed";

type JobProgress = {
  jobId: string;
  status: JobStatus;
  percent: number;
  step?: string;
  stepIndex?: number;
  totalSteps?: number;
  log?: string;
  error?: string;
  outputs?: { name: string; url: string; sizeBytes?: number }[];
};

type View = "home" | "catalog" | "pipeline" | "run" | "result";
type SheetKind = null | "configure" | "info" | "formats" | "subs";

type PipelineStep = { uid: string; op: Operation; values: FormValues };

/* ══════════════════════════════════════════════════════════════════════════
   ICONS
   ══════════════════════════════════════════════════════════════════════════ */

const s = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const Icons = {
  Back: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M15 5 8 12l7 7" /></svg>
  ),
  Close: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  Chevron: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="m9 6 6 6-6 6" /></svg>
  ),
  Play: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.3v13.4a1 1 0 0 0 1.53.85l10.7-6.7a1 1 0 0 0 0-1.7L9.53 4.45A1 1 0 0 0 8 5.3Z" /></svg>
  ),
  Check: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="m5 12 5 5L20 7" /></svg>
  ),
  Plus: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M12 5v14M5 12h14" /></svg>
  ),
  Search: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  Link: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>
  ),
  Download: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" /></svg>
  ),
  Music: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>
  ),
  Video: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>
  ),
  Subtitle: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15h6M7 11h4M15 15h2" /></svg>
  ),
  Image: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
  ),
  Archive: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></svg>
  ),
  Lock: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  ),
  Globe: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
  ),
  Shield: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" /></svg>
  ),
  Bolt: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" /></svg>
  ),
  Terminal: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="m5 8 4 4-4 4M13 16h6" /></svg>
  ),
  Clock: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>
  ),
  Trash: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" /></svg>
  ),
  Home: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" /></svg>
  ),
  Grid: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
  ),
  Flow: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="12" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.5 6h4a3 3 0 0 1 3 3v.5M8.5 18h4a3 3 0 0 0 3-3v-.5" /></svg>
  ),
  Up: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="m6 15 6-6 6 6" /></svg>
  ),
  Down: ({ size = 14 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="m6 9 6 6 6-6" /></svg>
  ),
  Warn: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg>
  ),
  Info: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  ),
  Scissors: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" /></svg>
  ),
  Settings: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>
  ),
};

/* ══════════════════════════════════════════════════════════════════════════
   OPERATIONS REGISTRY
   ══════════════════════════════════════════════════════════════════════════ */

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
  /* ─── Tier 1 ─────────────────────────────────────────────────────────── */
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

  /* ─── Tier 2 ─────────────────────────────────────────────────────────── */
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

  /* ─── Tier 3 ─────────────────────────────────────────────────────────── */
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

  /* ─── Tier 4 ─────────────────────────────────────────────────────────── */
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

  /* ─── Tier 5 ─────────────────────────────────────────────────────────── */
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

  /* ─── Tier 6 ─────────────────────────────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

function evalCondition(cond: Condition | undefined, values: FormValues): boolean {
  if (!cond) return true;
  const v = values[cond.param];
  switch (cond.operator) {
    case "eq": return v === cond.value;
    case "neq": return v !== cond.value;
    case "truthy": return Boolean(v);
    case "falsy": return !v;
    default: return true;
  }
}

function defaultValues(op: Operation): FormValues {
  const out: FormValues = {};
  for (const p of op.params) {
    if (p.default !== undefined) { out[p.key] = p.default; continue; }
    switch (p.type) {
      case "number":
      case "integer": out[p.key] = p.min ?? 0; break;
      case "boolean": out[p.key] = false; break;
      case "enum": out[p.key] = p.options?.[0]?.value ?? ""; break;
      case "multiselect": out[p.key] = []; break;
      default: out[p.key] = ""; break;
    }
  }
  return out;
}

function acceptsSource(op: Operation, kind: "audio" | "video"): boolean {
  return op.accepts === "both" || op.accepts === kind;
}

function shortUrl(u: string): string {
  return u.length > 44 ? u.slice(0, 41) + "..." : u;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(1) + " " + units[i];
}

/* ══════════════════════════════════════════════════════════════════════════
   API CLIENT
   ══════════════════════════════════════════════════════════════════════════ */

const API = {
  async inspect(url: string): Promise<MediaInfo> {
    const res = await fetch("/api/op/inspect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to inspect");
    return data.info as MediaInfo;
  },

  async run(url: string, operations: OperationPayload[]): Promise<string> {
    const res = await fetch("/api/op/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, operations }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to start job");
    return data.jobId as string;
  },

  async job(jobId: string): Promise<JobProgress> {
    const res = await fetch("/api/op/job/" + jobId);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch job");
    return data.job as JobProgress;
  },
};

/* ══════════════════════════════════════════════════════════════════════════
   HOOKS
   ══════════════════════════════════════════════════════════════════════════ */

function useAsync<T>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const run = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { loading, error, data, run, reset, setData };
}

function useJobPoll(jobId: string | null): {
  job: JobProgress | null;
  error: string | null;
} {
  const [job, setJob] = useState<JobProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!jobId) { setJob(null); setError(null); return; }
    let cancelled = false;

    const tick = async () => {
      try {
        const j = await API.job(jobId);
        if (cancelled) return;
        setJob(j);
        if (j.status === "completed" || j.status === "failed") return;
        timer.current = setTimeout(tick, 1000);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Polling failed");
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [jobId]);

  return { job, error };
}

/* ══════════════════════════════════════════════════════════════════════════
   PRIMITIVES
   ══════════════════════════════════════════════════════════════════════════ */

function Sheet({
  title,
  badge,
  note,
  onClose,
  children,
}: {
  title: string;
  badge?: string;
  note?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="sheetOverlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <div className="sheetHead">
          <div className="sheetHeadLeft">
            <span className="sheetTitle">{title}</span>
            {badge && <span className="sheetBadge">{badge}</span>}
          </div>
          <button className="closebtn" onClick={onClose} aria-label="Close">
            <Icons.Close />
          </button>
        </div>
        {note && <p className="sheetNote">{note}</p>}
        <div className="sheetBody">{children}</div>
      </div>
    </div>
  );
}

function Field({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (param.type) {
    case "string":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <input
            type="text"
            placeholder={param.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "number":
    case "integer":
      return (
        <label className="field">
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
            <span className="fieldValue">
              {String(value ?? 0)}{param.unit ? " " + param.unit : ""}
            </span>
          </div>
          <input
            type="number"
            min={param.min}
            max={param.max}
            step={param.type === "integer" ? 1 : param.step ?? "any"}
            value={(value as number) ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "boolean":
      return (
        <label className="checkboxRow">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{param.label}</span>
        </label>
      );

    case "enum":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            {param.options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "multiselect": {
      const arr = (value as string[]) ?? [];
      return (
        <div className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <div className="multiGrid">
            {param.options?.map((o) => {
              const on = arr.includes(o.value);
              return (
                <label key={o.value} className={"multiChip " + (on ? "multiOn" : "")}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...arr, o.value]
                        : arr.filter((x) => x !== o.value);
                      onChange(next);
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    case "textarea":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <textarea
            rows={3}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    default:
      return null;
  }
}

function OperationCard({
  op,
  onOpen,
  disabled,
}: {
  op: Operation;
  onOpen: () => void;
  disabled?: boolean;
}) {
  const Icon = op.icon;
  return (
    <button className="opCard" onClick={onOpen} disabled={disabled}>
      <span className="opIcon"><Icon /></span>
      <span className="opBody">
        <span className="opName">
          {op.name}
          {op.chainSteps && <span className="chainBadge">chain</span>}
        </span>
        <span className="opDesc">{op.description}</span>
        <span className="opMeta">
          tier {op.tier} · {op.category} · {op.accepts}
        </span>
      </span>
      <Icons.Chevron />
    </button>
  );
}

function NavButton({
  active, label, icon, onClick, badge,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button className={"navBtn " + (active ? "navActive" : "")} onClick={onClick}>
      <span className="navIcon">
        {icon}
        {badge !== undefined && badge > 0 && <span className="navBadge">{badge}</span>}
      </span>
      <span className="navLabel">{label}</span>
    </button>
  );
}

function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <p>{title}</p>
      {hint && <span>{hint}</span>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */

export default function OpPage() {
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
  const { job, error: pollError } = useJobPoll(view === "run" || view === "result" ? jobId : null);

  const inspect = useAsync<MediaInfo>();
  const runJob = useAsync<string>();

  /* ── Derived ─────────────────────────────────────────────────────────── */
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

  /* ── Actions ─────────────────────────────────────────────────────────── */
  async function handleInspect() {
    if (!url.trim()) return;
    const result = await inspect.run(() => API.inspect(url.trim()));
    if (result) setInfo(result);
  }

  function openConfigure(op: Operation) {
    setSelectedOp(op);
    const dv = defaultValues(op);
    setValues(dv);
    setSheet("configure");
  }

  function addToPipeline() {
    if (!selectedOp) return;
    setPipeline((p) => [
      ...p,
      { uid: crypto.randomUUID(), op: selectedOp, values },
    ]);
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
      const tmp = next[index];
      next[index] = next[t];
      next[t] = tmp;
      return next;
    });
  }

  async function handleRun() {
    if (!info || pipeline.length === 0) return;
    const operations: OperationPayload[] = pipeline.map((s) => ({
      id: s.op.id,
      params: s.values,
    }));
    const result = await runJob.run(() => API.run(info.url, operations));
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

  /* ── Auto-advance on completion ─────────────────────────────────────── */
  useEffect(() => {
    if (view === "run" && job?.status === "completed") {
      const t = setTimeout(() => setView("result"), 500);
      return () => clearTimeout(t);
    }
    if (view === "run" && job?.status === "failed") {
      // stay on run view but no auto-advance
    }
  }, [view, job]);

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="app">
      <header className="topbar">
        <button
          className="iconbtn"
          onClick={() => (view === "home" ? resetAll() : setView("home"))}
          aria-label="Back"
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
          <HomeView
            url={url}
            setUrl={setUrl}
            info={info}
            loading={inspect.loading}
            error={inspect.error}
            onInspect={handleInspect}
            onOpenOp={openConfigure}
            onBrowse={() => setView("catalog")}
            onOpenPipeline={() => setView("pipeline")}
            onOpenFormats={() => setSheet("formats")}
            onOpenSubs={() => setSheet("subs")}
            onOpenInfo={() => setSheet("info")}
            favorites={favorites}
          />
        )}

        {view === "catalog" && (
          <CatalogView
            grouped={grouped}
            search={search}
            setSearch={setSearch}
            tierFilter={tierFilter}
            setTierFilter={setTierFilter}
            onOpenOp={openConfigure}
          />
        )}

        {view === "pipeline" && (
          <PipelineView
            info={info}
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
          <RunView info={info} pipeline={pipeline} job={job} error={pollError} />
        )}

        {view === "result" && (
          <ResultView
            info={info}
            job={job}
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
          active={view === "home"} label="Home" icon={<Icons.Home />}
          onClick={() => setView("home")}
        />
        <NavButton
          active={view === "catalog"} label="Ops" icon={<Icons.Grid />}
          onClick={() => setView("catalog")}
        />
        <NavButton
          active={view === "pipeline"} label="Pipeline" icon={<Icons.Flow />}
          badge={pipeline.length}
          onClick={() => setView("pipeline")}
        />
      </nav>

      {sheet === "configure" && selectedOp && (
        <ConfigureSheet
          op={selectedOp}
          values={values}
          setValue={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onClose={() => { setSheet(null); setSelectedOp(null); }}
          onAdd={addToPipeline}
        />
      )}

      {sheet === "info" && info && (
        <Sheet title="Media Info" onClose={() => setSheet(null)} note="Metadata returned by the inspector.">
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

/* ══════════════════════════════════════════════════════════════════════════
   HEADER HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

function headerTitle(v: View): string {
  return { home: "Downloads", catalog: "Operations", pipeline: "Pipeline", run: "Working", result: "Done" }[v];
}

function headerSub(
  v: View,
  pipeline: PipelineStep[],
  info: MediaInfo | null,
  job: JobProgress | null
): string {
  if (v === "home") return info ? shortUrl(info.title) : "paste a URL to start";
  if (v === "catalog") return String(pipeline.length) + " in pipeline";
  if (v === "pipeline") return pipeline.length ? String(pipeline.length) + " steps" : "empty";
  if (v === "run") return job ? job.status + " · " + String(job.percent) + "%" : "starting...";
  return "output ready";
}

/* ══════════════════════════════════════════════════════════════════════════
   VIEWS
   ══════════════════════════════════════════════════════════════════════════ */

function HomeView({
  url, setUrl, info, loading, error, onInspect, onOpenOp, onBrowse, onOpenPipeline,
  onOpenFormats, onOpenSubs, onOpenInfo, favorites,
}: {
  url: string;
  setUrl: (s: string) => void;
  info: MediaInfo | null;
  loading: boolean;
  error: string | null;
  onInspect: () => void;
  onOpenOp: (op: Operation) => void;
  onBrowse: () => void;
  onOpenPipeline: () => void;
  onOpenFormats: () => void;
  onOpenSubs: () => void;
  onOpenInfo: () => void;
  favorites: Operation[];
}) {
  const quickPicks: { id: string; label: string; icon: ComponentType<IconProps> }[] = [
    { id: "quick-best", label: "Best", icon: Icons.Bolt },
    { id: "audio-mp3", label: "MP3", icon: Icons.Music },
    { id: "resolution-cap", label: "1080p", icon: Icons.Video },
    { id: "section-download", label: "Cut", icon: Icons.Scissors },
  ];

  return (
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
            if (e.key === "Enter" && url && !loading) onInspect();
          }}
        />
        <button className="primaryBtn" onClick={onInspect} disabled={!url || loading}>
          {loading ? "Inspecting..." : "Inspect"}
        </button>
        {error && (
          <div className="errorBox">
            <Icons.Warn /> {error}
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
            <button className="miniBtn" onClick={onOpenFormats}>
              <Icons.Video size={14} /> {info.formats.length} formats
            </button>
            <button className="miniBtn" onClick={onOpenSubs}>
              <Icons.Subtitle size={14} /> {info.subtitles.length} subs
            </button>
            <button className="miniBtn" onClick={onOpenInfo}>
              <Icons.Info size={14} /> Details
            </button>
          </div>
        </section>
      )}

      {info && (
        <section>
          <div className="rowHead"><h3 className="sectionTitle">Quick Actions</h3></div>
          <div className="quickGrid">
            {quickPicks.map((qp) => {
              const op = OPERATIONS.find((o) => o.id === qp.id);
              if (!op || !acceptsSource(op, info.kind)) return null;
              const Icon = qp.icon;
              return (
                <button key={qp.id} className="quickCard" onClick={() => onOpenOp(op)}>
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
            <button className="rowAction" onClick={onBrowse}>See all</button>
          </div>
          <div className="favScroll">
            {favorites.map((op) => {
              const Icon = op.icon;
              return (
                <button key={op.id} className="favCard" onClick={() => onOpenOp(op)}>
                  <span className="favIcon"><Icon size={16} /></span>
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
          <button className="rowAction" onClick={onOpenPipeline}>Open</button>
        </div>
        <button className="card pipelinePreview" onClick={onOpenPipeline}>
          <Icons.Flow />
          <div className="pipelinePreviewText">
            <span className="pipelinePreviewTitle">Chain operations</span>
            <span className="pipelinePreviewSub">Queue multiple steps and run them in sequence</span>
          </div>
          <Icons.Chevron />
        </button>
      </section>
    </div>
  );
}

function CatalogView({
  grouped, search, setSearch, tierFilter, setTierFilter, onOpenOp,
}: {
  grouped: [number, Operation[]][];
  search: string;
  setSearch: (s: string) => void;
  tierFilter: TierFilter;
  setTierFilter: (t: TierFilter) => void;
  onOpenOp: (op: Operation) => void;
}) {
  return (
    <div className="pad">
      <div className="searchWrap">
        <Icons.Search />
        <input
          className="searchInput"
          placeholder="Search operations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="filterScroll">
        {TIER_FILTERS.map((f) => (
          <button
            key={f.id}
            className={"filterChip " + (tierFilter === f.id ? "filterActive" : "")}
            onClick={() => setTierFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grouped.length === 0 && (
        <Empty title="No operations match" hint="Try a different filter or search term." />
      )}

      <div className="catalog">
        {grouped.map(([tier, ops]) => (
          <section key={tier} className="tierSection">
            <h3 className="tierHead">{TIERS[tier]}</h3>
            <ul className="opList">
              {ops.map((op) => (
                <li key={op.id}>
                  <OperationCard op={op} onOpen={() => onOpenOp(op)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function PipelineView({
  info, pipeline, onAdd, onRemove, onMove, onRun, running, error, onEdit,
}: {
  info: MediaInfo | null;
  pipeline: PipelineStep[];
  onAdd: () => void;
  onRemove: (uid: string) => void;
  onMove: (i: number, d: -1 | 1) => void;
  onRun: () => void;
  running: boolean;
  error: string | null;
  onEdit: (step: PipelineStep) => void;
}) {
  return (
    <div className="pad">
      <section className="flowWrap">
        <div className="flowNode">
          <div className="flowNodeIcon"><Icons.Link /></div>
          <div className="flowNodeBody">
            <span className="flowNodeLabel">Source</span>
            <span className="flowNodeValue">{info?.title ?? "No source loaded"}</span>
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
                  <button onClick={() => onMove(i, -1)} disabled={i === 0} aria-label="Move up">
                    <Icons.Up />
                  </button>
                  <button onClick={() => onMove(i, 1)} disabled={i === pipeline.length - 1} aria-label="Move down">
                    <Icons.Down />
                  </button>
                </div>
                <div className="flowNodeIcon flowNodeIconOp"><Icon size={18} /></div>
                <div className="flowNodeBody" onClick={() => onEdit(step)}>
                  <span className="flowNodeLabel">Step {i + 1}</span>
                  <span className="flowNodeValue">{step.op.name}</span>
                </div>
                <button className="flowDelete" onClick={() => onRemove(step.uid)} aria-label="Remove">
                  <Icons.Trash />
                </button>
              </div>
            </div>
          );
        })}

        <div className="flowRow">
          <div className="flowLine" />
          <button className="flowAdd" onClick={onAdd}>
            <Icons.Plus /> Add Operation
          </button>
        </div>
      </section>

      {pipeline.length > 0 && (
        <section className="card statsCard">
          <Stat label="Steps" value={String(pipeline.length)} />
          <Stat label="Source" value={info?.kind ?? "-"} />
          <Stat label="Duration" value={info?.duration ?? "-"} />
        </section>
      )}

      {error && (
        <div className="errorBox"><Icons.Warn /> {error}</div>
      )}

      <button
        className="primaryBtn"
        onClick={onRun}
        disabled={!info || !pipeline.length || running}
      >
        {running ? "Starting..." : "Start"}
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="statValue">{value}</span>
      <span className="statLabel">{label}</span>
    </div>
  );
}

function RunView({
  info, pipeline, job, error,
}: {
  info: MediaInfo | null;
  pipeline: PipelineStep[];
  job: JobProgress | null;
  error: string | null;
}) {
  const percent = job?.percent ?? 0;
  const activeIndex = job?.stepIndex ?? Math.min(
    Math.floor((percent / 100) * Math.max(pipeline.length, 1)),
    Math.max(pipeline.length - 1, 0)
  );
  const circumference = 2 * Math.PI * 52;

  return (
    <div className="pad">
      <section className="card runHeader">
        <div className="runRingWrap">
          <svg viewBox="0 0 120 120" className="runRing">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="52"
              fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"
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
          <span className="runSource">{info?.title ?? "..."}</span>
          <span className="runStep">
            {job?.step ? job.step : `Step ${activeIndex + 1} of ${pipeline.length}`}
          </span>
        </div>
      </section>

      {error && <div className="errorBox"><Icons.Warn /> {error}</div>}

      {job?.error && <div className="errorBox"><Icons.Warn /> {job.error}</div>}

      <section className="card logCard">
        <div className="logHead">
          <Icons.Terminal /> <span>Live Output</span>
        </div>
        <pre className="logBody">{job?.log || "Waiting for output..."}</pre>
      </section>

      <section className="stepList">
        {pipeline.map((s, i) => (
          <div
            key={s.uid}
            className={
              "stepRow " +
              (i < activeIndex ? "stepDone" : i === activeIndex ? "stepActive" : "")
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
            <span className="stepName">{s.op.name}</span>
            {i === activeIndex && job?.status === "running" && (
              <span className="stepPct">{Math.round(percent)}%</span>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function ResultView({
  info, job, onAgain, onHome,
}: {
  info: MediaInfo | null;
  job: JobProgress | null;
  onAgain: () => void;
  onHome: () => void;
}) {
  const ok = job?.status === "completed";
  const primary = job?.outputs?.[0];

  return (
    <div className="pad">
      <section className="card resultHero">
        <div className={"resultIcon " + (ok ? "" : "resultIconFail")}>
          {ok ? <Icons.Check size={28} /> : <Icons.Warn size={28} />}
        </div>
        <h2 className="resultTitle">{ok ? "Download complete" : "Download failed"}</h2>
        <p className="resultSub">{job?.error || info?.title || ""}</p>
      </section>

      {primary && (
        <section className="card videoPreview">
          <div className="videoThumb"><Icons.Play size={28} /></div>
          <div className="videoMeta">
            <span className="videoName">{primary.name}</span>
            <span className="videoInfo">
              {formatBytes(primary.sizeBytes)}
            </span>
          </div>
        </section>
      )}

      {job?.outputs && job.outputs.length > 0 && (
        <section>
          <div className="rowHead"><h3 className="sectionTitle">All outputs</h3></div>
          <ul className="outputList">
            {job.outputs.map((o) => (
              <li key={o.name}>
                <a className="outputRow" href={o.url} download>
                  <Icons.Download size={16} />
                  <span className="outputName">{o.name}</span>
                  <span className="outputSize">{formatBytes(o.sizeBytes)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="resultActions">
        <button className="primaryBtn" onClick={onHome}>Back to Home</button>
        <button className="ghostBtnWide" onClick={onAgain}>Start Another</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SHEETS
   ══════════════════════════════════════════════════════════════════════════ */

function ConfigureSheet({
  op, values, setValue, onClose, onAdd,
}: {
  op: Operation;
  values: FormValues;
  setValue: (k: string, v: unknown) => void;
  onClose: () => void;
  onAdd: () => void;
}) {
  const visible = op.params.filter((p) => evalCondition(p.showIf, values));
  const groups = useMemo(() => {
    const m = new Map<string, Param[]>();
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
        <fieldset key={group} className="fieldGroup">
          <legend className="groupLabel">{group}</legend>
          {params.map((p) => (
            <Field
              key={p.key}
              param={p}
              value={values[p.key]}
              onChange={(v) => setValue(p.key, v)}
            />
          ))}
        </fieldset>
      ))}

      <button className="primaryBtn" onClick={onAdd}>
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
            <span className="formatMeta">{f.ext} · {f.size} · {f.note}</span>
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
            <span className="formatMeta">{s.auto ? "auto-generated" : "manual"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════════════════ */

const STYLES = `
:root {
  --bg:#f7f6f2; --surface:#fff; --surface-2:#fbfaf7;
  --border:#e7e5de; --border-strong:#d6d3c9;
  --ink:#14171a; --ink-soft:#5b6065; --ink-mute:#8a8f95;
  --accent:#4f46e5; --accent-soft:#eef2ff;
  --render:#2e9c7a; --render-soft:#e8f8f1;
  --warn:#d97706; --warn-soft:#fef4e6;
  --danger:#dc2626; --danger-soft:#fdeaea;
  --font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --font-mono:"SF Mono",ui-monospace,Menlo,Consolas,monospace;
  --radius:14px; --radius-lg:20px;
}
.app{min-height:100vh;background:var(--bg);color:var(--ink);font-family:var(--font-sans);display:flex;flex-direction:column;padding-bottom:76px}
.topbar{display:flex;align-items:center;gap:10px;padding:14px 16px 8px;position:sticky;top:0;background:var(--bg);z-index:5}
.iconbtn{width:36px;height:36px;border-radius:10px;border:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--ink);flex-shrink:0;cursor:pointer}
.title{flex:1;display:flex;flex-direction:column;min-width:0}
.titleMain{font-size:15px;font-weight:600;line-height:1.2}
.titleSub{font-size:12px;color:var(--ink-soft);font-family:var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.main{flex:1;overflow-y:auto}
.pad{padding:6px 16px 24px;display:flex;flex-direction:column;gap:18px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px}
.rowHead{display:flex;justify-content:space-between;align-items:baseline;padding:0 4px 8px}
.sectionTitle{font-size:13px;font-weight:600;color:var(--ink);margin:0}
.rowAction{background:transparent;border:none;color:var(--accent);font-size:12.5px;font-weight:500;cursor:pointer}
.empty{text-align:center;padding:40px 12px;color:var(--ink-mute);display:flex;flex-direction:column;gap:6px}
.empty p{font-size:13.5px;font-weight:600;color:var(--ink-soft);margin:0}
.empty span{font-size:12px}

.urlCard{display:flex;flex-direction:column;gap:10px}
.urlHead{display:flex;align-items:center;gap:8px;color:var(--ink-soft);font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.urlInput{width:100%;padding:11px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg);font-size:14px;font-family:var(--font-mono);color:var(--ink);-webkit-appearance:none}
.errorBox{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:var(--danger-soft);color:var(--danger);font-size:12.5px;font-weight:500}

.mediaCard{display:flex;flex-direction:column;gap:12px;padding:12px}
.mediaThumb{position:relative;height:150px;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#1e293b,#334155);display:flex;align-items:center;justify-content:center;color:#fff}
.mediaDuration{position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,.7);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;font-family:var(--font-mono)}
.mediaMeta{display:flex;flex-direction:column;gap:3px}
.mediaTitle{font-size:14px;font-weight:600;line-height:1.3}
.mediaSub{font-size:12.5px;color:var(--ink-soft)}
.mediaStats{font-size:11.5px;color:var(--ink-mute);font-family:var(--font-mono)}
.mediaActions{display:flex;gap:6px;flex-wrap:wrap}
.miniBtn{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:999px;background:var(--bg);border:1px solid var(--border);font-size:11.5px;color:var(--ink-soft);cursor:pointer;font-family:var(--font-mono)}
.miniBtn:hover{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}

.quickGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.quickCard{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 6px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:11.5px;font-weight:500;color:var(--ink)}
.quickCard > svg{color:var(--accent)}

.favScroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:2px}
.favCard{min-width:132px;display:flex;flex-direction:column;gap:8px;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;text-align:left}
.favIcon{width:30px;height:30px;border-radius:9px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center}
.favName{font-size:12.5px;font-weight:600;line-height:1.3}
.favTier{font-size:11px;color:var(--ink-mute);font-family:var(--font-mono)}

.pipelinePreview{display:flex;align-items:center;gap:12px;cursor:pointer;text-align:left}
.pipelinePreview > svg:first-child{color:var(--accent);flex-shrink:0}
.pipelinePreviewText{flex:1;display:flex;flex-direction:column;gap:2px}
.pipelinePreviewTitle{font-size:14px;font-weight:600}
.pipelinePreviewSub{font-size:12px;color:var(--ink-soft)}

.searchWrap{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--ink-soft)}
.searchInput{flex:1;border:none;outline:none;background:transparent;font-size:14px;color:var(--ink);font-family:var(--font-sans)}
.filterScroll{display:flex;gap:6px;overflow-x:auto;padding:2px 0}
.filterChip{padding:6px 12px;border-radius:999px;background:var(--surface);border:1px solid var(--border);font-size:12.5px;color:var(--ink-soft);cursor:pointer;white-space:nowrap}
.filterActive{background:var(--ink);color:#fff;border-color:var(--ink)}

.catalog{display:flex;flex-direction:column;gap:18px}
.tierSection{display:flex;flex-direction:column;gap:8px}
.tierHead{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-weight:600;margin:0;padding-left:4px}
.opList{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.opCard{width:100%;display:flex;gap:12px;align-items:center;padding:12px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);text-align:left;cursor:pointer}
.opCard:disabled{opacity:.45;cursor:not-allowed}
.opIcon{width:36px;height:36px;border-radius:10px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.opBody{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.opName{font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:6px}
.opDesc{font-size:12px;color:var(--ink-soft);line-height:1.4}
.opMeta{font-size:11px;font-family:var(--font-mono);color:var(--ink-mute);margin-top:2px}
.chainBadge{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;background:var(--render-soft);color:var(--render);padding:2px 6px;border-radius:4px}

.flowWrap{display:flex;flex-direction:column}
.flowRow{display:flex;flex-direction:column;align-items:stretch}
.flowLine{width:2px;height:20px;background:var(--border-strong);margin:0 auto;border-radius:1px}
.flowNode{display:flex;align-items:center;gap:12px;padding:12px;border-radius:var(--radius);background:var(--surface);border:1px solid var(--border);text-align:left;width:100%}
.flowNodeIcon{width:36px;height:36px;border-radius:10px;background:var(--bg);color:var(--ink-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.flowNodeIconOp{background:var(--accent-soft);color:var(--accent)}
.flowNodeIconOut{background:var(--render-soft);color:var(--render)}
.flowNodeBody{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0;cursor:pointer}
.flowNodeLabel{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-weight:600}
.flowNodeValue{font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.flowReorder{display:flex;flex-direction:column;gap:2px}
.flowReorder button{border:none;background:transparent;color:var(--ink-mute);padding:2px;cursor:pointer;border-radius:4px}
.flowReorder button:disabled{opacity:.3;cursor:default}
.flowDelete{border:none;background:transparent;color:var(--ink-mute);padding:6px;cursor:pointer;border-radius:6px}
.flowDelete:hover{background:var(--danger-soft);color:var(--danger)}
.flowAdd{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:var(--radius);background:var(--surface-2);border:1px dashed var(--border-strong);color:var(--ink-soft);font-size:13px;font-weight:500;cursor:pointer}
.flowAdd:hover{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.flowEmpty{text-align:center;padding:24px;color:var(--ink-mute);display:flex;flex-direction:column;align-items:center;gap:6px}
.flowEmpty p{font-size:13px;font-weight:600;color:var(--ink-soft);margin:4px 0 0}
.flowEmpty span{font-size:12px}

.statsCard{display:flex;justify-content:space-around;gap:8px;padding:14px 8px}
.stat{display:flex;flex-direction:column;align-items:center;gap:2px;flex:1}
.statValue{font-size:16px;font-weight:700;font-family:var(--font-mono)}
.statLabel{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-weight:600}

.primaryBtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px 18px;background:var(--ink);color:#fff;border:none;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-sans)}
.primaryBtn:disabled{opacity:.4;cursor:default}
.ghostBtnWide{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 18px;background:var(--surface);color:var(--ink);border:1px solid var(--border);border-radius:999px;font-size:13.5px;font-weight:600;cursor:pointer}

.runHeader{display:flex;align-items:center;gap:20px;padding:20px}
.runRingWrap{position:relative;width:110px;height:110px;flex-shrink:0}
.runRing{width:100%;height:100%}
.runRingText{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.runPct{font-size:22px;font-weight:700;font-family:var(--font-mono)}
.runState{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-weight:600}
.runMeta{display:flex;flex-direction:column;gap:4px;min-width:0}
.runSource{font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.runStep{font-size:12px;color:var(--ink-soft);line-height:1.4}

.logCard{padding:0;overflow:hidden}
.logHead{display:flex;align-items:center;gap:6px;padding:10px 14px;border-bottom:1px solid var(--border);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-weight:600}
.logBody{margin:0;padding:12px 14px;font-family:var(--font-mono);font-size:11.5px;color:#d1d5db;line-height:1.55;background:#0e0f11;white-space:pre-wrap;word-break:break-all;max-height:220px;overflow-y:auto}

.stepList{display:flex;flex-direction:column;gap:6px}
.stepRow{display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);font-size:13px}
.stepDone{opacity:.55}
.stepActive{border-color:var(--accent);background:var(--accent-soft)}
.stepDot{width:22px;height:22px;border-radius:50%;background:var(--bg);color:var(--ink-soft);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
.stepDone .stepDot{background:var(--render-soft);color:var(--render)}
.stepActive .stepDot{background:var(--accent);color:#fff}
.stepName{flex:1;font-weight:500}
.stepPct{font-family:var(--font-mono);font-size:12px;color:var(--accent);font-weight:700}

.resultHero{display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px 16px;text-align:center}
.resultIcon{width:56px;height:56px;border-radius:50%;background:var(--render-soft);color:var(--render);display:flex;align-items:center;justify-content:center}
.resultIconFail{background:var(--danger-soft);color:var(--danger)}
.resultTitle{font-size:17px;font-weight:700;margin:8px 0 0}
.resultSub{font-size:12.5px;color:var(--ink-soft);margin:0;line-height:1.5}
.videoPreview{display:flex;gap:12px;align-items:center}
.videoThumb{width:96px;height:64px;border-radius:10px;background:linear-gradient(135deg,#1e293b,#334155);color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.videoMeta{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0}
.videoName{font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.videoInfo{font-size:12px;color:var(--ink-soft);font-family:var(--font-mono)}
.outputList{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.outputRow{display:flex;align-items:center;gap:10px;padding:12px;border-radius:var(--radius);background:var(--surface);border:1px solid var(--border);text-decoration:none;color:var(--ink)}
.outputRow:hover{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
.outputName{flex:1;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.outputSize{font-size:11.5px;color:var(--ink-mute);font-family:var(--font-mono)}
.resultActions{display:flex;flex-direction:column;gap:8px}

.sheetOverlay{position:fixed;inset:0;background:rgba(20,23,26,.32);display:flex;align-items:flex-end;justify-content:center;z-index:40;animation:fadeIn .15s ease}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.sheet{width:100%;max-width:560px;max-height:88vh;overflow-y:auto;background:var(--surface);border-radius:20px 20px 0 0;padding:10px 18px 24px;border:1px solid var(--border);border-bottom:none;animation:slideUp .2s ease}
@keyframes slideUp{from{transform:translateY(20px)}to{transform:translateY(0)}}
.sheetHandle{width:36px;height:4px;border-radius:2px;background:var(--border);margin:4px auto 12px}
.sheetHead{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
.sheetHeadLeft{display:flex;flex-direction:column;gap:2px;min-width:0}
.sheetTitle{font-size:16px;font-weight:700}
.sheetBadge{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-weight:600;font-family:var(--font-mono)}
.closebtn{border:none;background:transparent;color:var(--ink-soft);padding:6px;cursor:pointer;border-radius:8px}
.closebtn:hover{background:var(--bg)}
.sheetNote{font-size:12.5px;color:var(--ink-soft);line-height:1.55;margin:0 0 14px}
.sheetBody{display:flex;flex-direction:column;gap:16px}
.chainNote{display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;background:var(--render-soft);color:var(--render);font-size:12px;font-weight:500;margin-bottom:14px}
.fieldGroup{border:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.groupLabel{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-weight:600;padding:0 0 4px}

.field{display:flex;flex-direction:column;gap:6px}
.fieldHead{display:flex;justify-content:space-between;align-items:baseline;font-size:13px}
.fieldLabel{color:var(--ink-soft)}
.fieldValue{font-family:var(--font-mono);font-size:12px;color:var(--ink)}
.fieldHelp{font-size:11.5px;color:var(--ink-mute);margin:0;line-height:1.4}
input[type="text"],input[type="number"],textarea,select{width:100%;padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg);color:var(--ink);font-size:14px;font-family:var(--font-sans);-webkit-appearance:none;appearance:none;box-sizing:border-box}
select{padding-right:34px;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235b6065' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>");background-repeat:no-repeat;background-position:right 12px center}
textarea{resize:vertical;font-family:var(--font-mono);font-size:12.5px}
.checkboxRow{display:flex;align-items:center;gap:10px;font-size:13.5px}
.checkboxRow input{width:18px;height:18px;accent-color:var(--accent)}
.multiGrid{display:flex;flex-wrap:wrap;gap:6px}
.multiChip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:var(--bg);border:1px solid var(--border);font-size:12px;color:var(--ink-soft);cursor:pointer}
.multiChip input{display:none}
.multiOn{background:var(--accent);color:#fff;border-color:var(--accent)}

.infoList{display:flex;flex-direction:column;gap:8px}
.infoRow{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)}
.infoRow:last-child{border-bottom:none}
.infoKey{font-size:12px;color:var(--ink-mute);text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.infoVal{font-size:13px;text-align:right;font-family:var(--font-mono);word-break:break-word}
.formatList{display:flex;flex-direction:column;gap:6px}
.formatRow{display:flex;align-items:center;gap:12px;padding:10px;border-radius:10px;background:var(--bg);border:1px solid var(--border)}
.formatId{min-width:44px;text-align:center;font-family:var(--font-mono);font-size:12px;font-weight:700;padding:4px 8px;background:var(--accent-soft);color:var(--accent);border-radius:6px}
.formatBody{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.formatLabel{font-size:13px;font-weight:600}
.formatMeta{font-size:11.5px;color:var(--ink-mute);font-family:var(--font-mono)}

.bottomNav{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:space-around;align-items:center;padding:8px 8px calc(8px + env(safe-area-inset-bottom,0px));background:var(--surface);border-top:1px solid var(--border);z-index:30}
.navBtn{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 12px;background:transparent;border:none;cursor:pointer;color:var(--ink-mute)}
.navActive{color:var(--accent)}
.navIcon{position:relative;display:flex}
.navBadge{position:absolute;top:-4px;right:-8px;min-width:16px;height:16px;padding:0 4px;background:var(--accent);color:#fff;border-radius:8px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono)}
.navLabel{font-size:10.5px;font-weight:500}

@media (min-width:720px){
  .app{max-width:720px;margin:0 auto;border-left:1px solid var(--border);border-right:1px solid var(--border)}
}
`;

if (typeof document !== "undefined" && !document.getElementById("op-page-styles")) {
  const el = document.createElement("style");
  el.id = "op-page-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}
