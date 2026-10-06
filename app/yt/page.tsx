// app/ytdlp/page.tsx
"use client";

import { useMemo, useState } from "react";

/* ============================== ICONS ============================== */
type IconProps = { size?: number };
const stroke = {
  fill: "none", stroke: "currentColor", strokeWidth: 1.6,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

const I = {
  Back: ({ size = 20 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M15 5 8 12l7 7" /></svg>),
  Close: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M6 6l12 12M18 6 6 18" /></svg>),
  Chevron: ({ size = 16 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m6 9 6 6 6-6" /></svg>),
  ChevronRight: ({ size = 16 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m9 6 6 6-6 6" /></svg>),
  Play: ({ size = 20 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.3v13.4a1 1 0 0 0 1.53.85l10.7-6.7a1 1 0 0 0 0-1.7L9.53 4.45A1 1 0 0 0 8 5.3Z" /></svg>),
  Check: ({ size = 16 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m5 12 5 5L20 7" /></svg>),
  Plus: ({ size = 16 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 5v14M5 12h14" /></svg>),
  Search: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></svg>),
  Link: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>),
  Download: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" /></svg>),
  Music: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>),
  Video: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>),
  Subtitle: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15h6M7 11h4M15 15h2M17 11h0" /></svg>),
  Thumbnail: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>),
  Archive: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></svg>),
  Lock: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>),
  Cookie: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M21 12a9 9 0 1 1-9-9c0 2 1 3 3 3s3-1 3 1c0 2 1 3 3 3Z" /><circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="14" cy="15" r="1" fill="currentColor" /><circle cx="9" cy="15" r="1" fill="currentColor" /></svg>),
  Globe: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>),
  Sparkle: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>),
  Bolt: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" /></svg>),
  Shield: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m12 3 8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z" /></svg>),
  Terminal: ({ size = 16 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m5 8 4 4-4 4M13 16h6" /></svg>),
  Clock: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>),
  Folder: ({ size = 18 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M3 7a1 1 0 0 1 1-1h4l2 2h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /></svg>),
  Trash: ({ size = 14 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" /></svg>),
  Home: ({ size = 22 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" /></svg>),
  Grid: ({ size = 22 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>),
  Flow: ({ size = 22 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="12" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.5 6h4a3 3 0 0 1 3 3v.5M8.5 18h4a3 3 0 0 0 3-3v-.5" /></svg>),
  History: ({ size = 22 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 12a8 8 0 1 0 3-6.3" /><path d="M4 5v4h4" /><path d="M12 8v4l3 2" /></svg>),
  Up: ({ size = 14 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m6 15 6-6 6 6" /></svg>),
  Down: ({ size = 14 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m6 9 6 6 6-6" /></svg>),
  Edit: ({ size = 14 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 20h4l10-10-4-4L4 16Z" /><path d="m13 7 4 4" /></svg>),
  Warning: ({ size = 16 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg>),
  Info: ({ size = 16 }: IconProps) => (<svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>),
};

/* ============================== TYPES ============================== */
type ParamType = "string" | "number" | "integer" | "boolean" | "enum" | "multiselect" | "time" | "duration" | "color" | "size" | "text-long";
type Option = { value: string; label: string };
type Condition = { param: string; operator: "eq" | "neq" | "truthy" | "falsy"; value?: unknown };

type Param = {
  key: string;
  type: ParamType;
  label: string;
  group?: string;
  default?: unknown;
  options?: Option[];
  presets?: string[];
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
  icon: React.ComponentType<IconProps>;
  chainSteps?: string[];
  params: Param[];
  favorite?: boolean;
};

type FormValues = Record<string, unknown>;

type MediaInfo = {
  id: string;
  title: string;
  uploader: string;
  duration: string;
  views: string;
  uploadedAt: string;
  thumbnail: string;
  formats: { id: string; label: string; ext: string; size: string; note: string }[];
  subtitles: { lang: string; label: string; auto: boolean }[];
};

type Job = {
  id: string;
  title: string;
  url: string;
  status: "completed" | "running" | "failed";
  when: string;
  size: string;
  steps: string[];
  progress?: number;
};

type View = "home" | "catalog" | "pipeline" | "run" | "result" | "history";
type Sheet = null | "configure" | "info" | "formats" | "subs";

/* ============================== DATA ============================== */
const TIER_LABELS: Record<number, string> = {
  1: "Basic Downloads",
  2: "Quality & Selection",
  3: "Files & Metadata",
  4: "Auth, Subs & Post",
  5: "Preset Pipelines",
  6: "Expert / SponsorBlock",
};

const TIER_GROUPS = [
  { id: "all", label: "All" },
  { id: "basic", label: "Basic" },
  { id: "quality", label: "Quality" },
  { id: "files", label: "Files" },
  { id: "auth", label: "Auth" },
  { id: "presets", label: "Presets" },
  { id: "expert", label: "Expert" },
] as const;

const OPERATIONS: Operation[] = [
  /* ===== Tier 1: Basic ===== */
  {
    id: "quick-best", name: "Quick Download (Best)", description: "Grab the best video + audio in one shot.",
    tier: 1, category: "download", icon: I.Bolt, favorite: true,
    params: [
      { key: "url", type: "string", label: "Video URL", placeholder: "https://youtube.com/watch?v=…" },
    ],
  },
  {
    id: "best-merge", name: "Best Video + Audio (Merge)", description: "Download best video-only and best audio-only, merge with ffmpeg.",
    tier: 1, category: "download", icon: I.Video, favorite: true,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "container", type: "enum", label: "Output Container", default: "mp4",
        options: [{ value: "mp4", label: "MP4" }, { value: "mkv", label: "MKV" }, { value: "webm", label: "WebM" }] },
    ],
  },
  {
    id: "audio-mp3", name: "Audio Only (MP3)", description: "Extract audio as MP3 with -x --audio-format mp3.",
    tier: 1, category: "audio", icon: I.Music, favorite: true,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "quality", type: "enum", label: "Quality", default: "0", options: [
        { value: "0", label: "Best (V0)" },
        { value: "2", label: "High (V2)" },
        { value: "5", label: "Medium (V5)" },
        { value: "9", label: "Low (V9)" },
        { value: "320K", label: "CBR 320k" },
        { value: "192K", label: "CBR 192k" },
      ] },
    ],
  },
  {
    id: "audio-m4a", name: "Audio Only (M4A/AAC)", description: "Extract audio as M4A preserving AAC quality.",
    tier: 1, category: "audio", icon: I.Music,
    params: [{ key: "url", type: "string", label: "Video URL" }],
  },
  {
    id: "video-mp4", name: "Video Only (MP4)", description: "Download best MP4 format without merging.",
    tier: 1, category: "video", icon: I.Video,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "quality", type: "enum", label: "Quality", default: "best", options: [
        { value: "best", label: "Best available" },
        { value: "1080", label: "Up to 1080p" },
        { value: "720", label: "Up to 720p" },
        { value: "480", label: "Up to 480p" },
      ] },
    ],
  },
  {
    id: "video-webm", name: "Video Only (WebM)", description: "Download best WebM format for free codecs.",
    tier: 1, category: "video", icon: I.Video,
    params: [{ key: "url", type: "string", label: "Video URL" }],
  },
  {
    id: "custom-format", name: "Custom Format String", description: "Pass a raw -f selector for full control.",
    tier: 1, category: "download", icon: I.Terminal,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "format", type: "string", label: "Format Selector", placeholder: "bv*[height<=1080]+ba/b", helpText: "Raw yt-dlp -f value." },
    ],
  },
  {
    id: "list-formats", name: "List Available Formats", description: "Enumerate all formats with -F before downloading.",
    tier: 1, category: "inspect", icon: I.Info,
    params: [{ key: "url", type: "string", label: "Video URL" }],
  },

  /* ===== Tier 2: Quality & Selection ===== */
  {
    id: "resolution-cap", name: "Resolution Cap", description: "Download best video up to a max height (480p, 720p, 1080p, 4K).",
    tier: 2, category: "quality", icon: I.Video, favorite: true,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "maxHeight", type: "enum", label: "Max Height", default: "1080", options: [
        { value: "360", label: "360p" },
        { value: "480", label: "480p" },
        { value: "720", label: "720p" },
        { value: "1080", label: "1080p" },
        { value: "1440", label: "1440p" },
        { value: "2160", label: "4K (2160p)" },
      ] },
      { key: "fps", type: "enum", label: "Prefer FPS", default: "any", options: [
        { value: "any", label: "Any" },
        { value: "30", label: "≥ 30 fps" },
        { value: "60", label: "≥ 60 fps" },
      ] },
    ],
  },
  {
    id: "filesize-cap", name: "Filesize Cap", description: "Limit download to a maximum size in MB.",
    tier: 2, category: "quality", icon: I.Archive,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "maxSize", type: "integer", label: "Max Size", default: 500, min: 10, max: 10000, unit: "MB" },
    ],
  },
  {
    id: "format-sort", name: "Format Sort Custom", description: "Order formats by resolution, codec, fps, size, or bitrate.",
    tier: 2, category: "quality", icon: I.Sparkle,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "sort", type: "multiselect", label: "Sort Priority", default: ["res", "fps", "vcodec"], options: [
        { value: "res", label: "Resolution" },
        { value: "fps", label: "Frame rate" },
        { value: "vcodec", label: "Video codec" },
        { value: "acodec", label: "Audio codec" },
        { value: "size", label: "Size" },
        { value: "br", label: "Bitrate" },
        { value: "proto", label: "Protocol" },
        { value: "ext", label: "Extension" },
      ] },
    ],
  },
  {
    id: "codec-pref", name: "Codec Preference", description: "Prefer H.264, H.265, VP9, AV1 for video; Opus, AAC, MP3 for audio.",
    tier: 2, category: "quality", icon: I.Video,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "vcodec", type: "enum", label: "Video Codec", default: "any", options: [
        { value: "any", label: "Any" },
        { value: "h264", label: "H.264 (max compatibility)" },
        { value: "h265", label: "H.265 / HEVC" },
        { value: "vp9", label: "VP9" },
        { value: "av01", label: "AV1" },
      ] },
      { key: "acodec", type: "enum", label: "Audio Codec", default: "any", options: [
        { value: "any", label: "Any" },
        { value: "opus", label: "Opus" },
        { value: "aac", label: "AAC / M4A" },
        { value: "mp3", label: "MP3" },
        { value: "flac", label: "FLAC" },
      ] },
    ],
  },
  {
    id: "playlist-range", name: "Playlist Items Range", description: "Download specific items from a playlist using index ranges.",
    tier: 2, category: "selection", icon: I.Grid,
    params: [
      { key: "url", type: "string", label: "Playlist URL" },
      { key: "range", type: "string", label: "Item Range", placeholder: "1:10", helpText: "e.g. 1:10, 5, -3::2 (negative counts from end)" },
    ],
  },
  {
    id: "playlist-order", name: "Playlist Reverse / Random", description: "Change playlist processing order.",
    tier: 2, category: "selection", icon: I.Flow,
    params: [
      { key: "url", type: "string", label: "Playlist URL" },
      { key: "order", type: "enum", label: "Order", default: "forward", options: [
        { value: "forward", label: "Forward" },
        { value: "reverse", label: "Reverse" },
        { value: "random", label: "Random" },
      ] },
    ],
  },
  {
    id: "channel-download", name: "Channel / User Download", description: "Download all uploads from a channel or user URL.",
    tier: 2, category: "selection", icon: I.Grid,
    params: [
      { key: "url", type: "string", label: "Channel URL" },
      { key: "limit", type: "integer", label: "Max Videos", default: 50, min: 1, max: 10000 },
    ],
  },
  {
    id: "date-filter", name: "Date Range Filter", description: "Download only videos uploaded between two dates.",
    tier: 2, category: "selection", icon: I.Clock,
    params: [
      { key: "url", type: "string", label: "Video or Playlist URL" },
      { key: "after", type: "string", label: "After Date", placeholder: "20240101", helpText: "YYYYMMDD or today-2weeks" },
      { key: "before", type: "string", label: "Before Date", placeholder: "20241231" },
    ],
  },
  {
    id: "view-filter", name: "View Count Filter", description: "Filter videos by minimum or maximum view count.",
    tier: 2, category: "selection", icon: I.Info,
    params: [
      { key: "url", type: "string", label: "Playlist URL" },
      { key: "minViews", type: "integer", label: "Min Views", default: 1000, min: 0 },
    ],
  },
  {
    id: "max-downloads", name: "Max Downloads Cap", description: "Abort after downloading N files.",
    tier: 2, category: "selection", icon: I.Archive,
    params: [
      { key: "url", type: "string", label: "Playlist URL" },
      { key: "max", type: "integer", label: "Max Downloads", default: 10, min: 1, max: 10000 },
    ],
  },

  /* ===== Tier 3: Files & Metadata ===== */
  {
    id: "output-template", name: "Output Template", description: "Custom filename template with title, id, uploader, date fields.",
    tier: 3, category: "files", icon: I.Folder,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "template", type: "string", label: "Output Template", default: "%(title)s [%(id)s].%(ext)s",
        helpText: "Fields: %(title)s %(id)s %(uploader)s %(upload_date)s %(ext)s" },
      { key: "restrict", type: "boolean", label: "Restrict Filenames (ASCII only)", default: false },
    ],
  },
  {
    id: "separate-paths", name: "Separate Paths", description: "Save videos, subtitles, and thumbnails to different folders.",
    tier: 3, category: "files", icon: I.Folder,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "home", type: "string", label: "Home Path", default: "~/Downloads" },
      { key: "subtitlePath", type: "string", label: "Subtitle Path", default: "~/Downloads/subs" },
      { key: "thumbnailPath", type: "string", label: "Thumbnail Path", default: "~/Downloads/thumbs" },
    ],
  },
  {
    id: "windows-safe", name: "Windows-Safe Filenames", description: "Sanitize filenames for Windows compatibility.",
    tier: 3, category: "files", icon: I.Folder,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "windowsNames", type: "boolean", label: "Force Windows-safe names", default: true },
      { key: "trimLength", type: "integer", label: "Max Filename Length", default: 200, min: 20, max: 250 },
    ],
  },
  {
    id: "restrict-filenames", name: "Restrict Filenames", description: "Force ASCII-only filenames without spaces or special chars.",
    tier: 3, category: "files", icon: I.Folder,
    params: [{ key: "url", type: "string", label: "Video URL" }],
  },
  {
    id: "thumbnail-download", name: "Thumbnail Download", description: "Save the cover image alongside the video.",
    tier: 3, category: "metadata", icon: I.Thumbnail,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "all", type: "boolean", label: "Download all thumbnail sizes", default: false },
      { key: "format", type: "enum", label: "Convert To", default: "jpg", options: [
        { value: "jpg", label: "JPEG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WebP" },
      ] },
    ],
  },
  {
    id: "info-json", name: "Info JSON Export", description: "Write full metadata to a .info.json file.",
    tier: 3, category: "metadata", icon: I.Info, favorite: true,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "clean", type: "boolean", label: "Clean internal fields", default: true },
      { key: "comments", type: "boolean", label: "Include comments (slow)", default: false },
    ],
  },
  {
    id: "description-export", name: "Description Export", description: "Write video description to a .description file.",
    tier: 3, category: "metadata", icon: I.Info,
    params: [{ key: "url", type: "string", label: "Video URL" }],
  },
  {
    id: "comments-export", name: "Comments Export", description: "Fetch and save YouTube comments to the infojson.",
    tier: 3, category: "metadata", icon: I.Info,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "sort", type: "enum", label: "Sort By", default: "top", options: [
        { value: "top", label: "Top" }, { value: "new", label: "Newest" },
      ] },
      { key: "maxComments", type: "integer", label: "Max Comments", default: 1000, min: 1, max: 100000 },
    ],
  },
  {
    id: "download-archive", name: "Download Archive", description: "Track downloaded IDs in a file to skip already-saved videos.",
    tier: 3, category: "metadata", icon: I.Archive,
    params: [
      { key: "url", type: "string", label: "Playlist URL" },
      { key: "archiveFile", type: "string", label: "Archive File", default: "archive.txt" },
      { key: "forceWrite", type: "boolean", label: "Force write entries even on simulate", default: false, advanced: true },
    ],
  },
  {
    id: "rate-limit", name: "Rate Limit", description: "Cap download speed (e.g., 1M, 500K).",
    tier: 3, category: "network", icon: I.Globe,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "rate", type: "string", label: "Max Rate", default: "1M", placeholder: "1M / 500K / 4.2M" },
      { key: "concurrent", type: "integer", label: "Concurrent Fragments", default: 4, min: 1, max: 32 },
    ],
  },

  /* ===== Tier 4: Auth, Subs & Post ===== */
  {
    id: "user-pass", name: "Username / Password Login", description: "Authenticate with -u/-p.",
    tier: 4, category: "auth", icon: I.Lock,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "username", type: "string", label: "Username" },
      { key: "password", type: "string", label: "Password" },
    ],
  },
  {
    id: "cookies-file", name: "Cookies File", description: "Load Netscape cookies from a file for private content.",
    tier: 4, category: "auth", icon: I.Cookie,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "cookieFile", type: "string", label: "Cookies File Path", placeholder: "/path/to/cookies.txt" },
    ],
  },
  {
    id: "cookies-browser", name: "Cookies from Browser", description: "Extract cookies directly from Chrome, Firefox, Edge, etc.",
    tier: 4, category: "auth", icon: I.Cookie, favorite: true,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "browser", type: "enum", label: "Browser", default: "chrome", options: [
        { value: "chrome", label: "Chrome" }, { value: "firefox", label: "Firefox" },
        { value: "edge", label: "Edge" }, { value: "brave", label: "Brave" },
        { value: "safari", label: "Safari" }, { value: "chromium", label: "Chromium" },
        { value: "opera", label: "Opera" }, { value: "vivaldi", label: "Vivaldi" },
      ] },
      { key: "profile", type: "string", label: "Profile Name (optional)", placeholder: "Default" },
      { key: "container", type: "string", label: "Container (Firefox)", placeholder: "none", advanced: true },
    ],
  },
  {
    id: "netrc-auth", name: "Netrc Authentication", description: "Use .netrc credentials file for extractor logins.",
    tier: 4, category: "auth", icon: I.Lock,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "netrcLocation", type: "string", label: "Netrc Path", default: "~/.netrc" },
    ],
  },
  {
    id: "proxy-config", name: "Proxy Configuration", description: "Route traffic through HTTP, HTTPS, or SOCKS proxy.",
    tier: 4, category: "network", icon: I.Globe,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "proxy", type: "string", label: "Proxy URL", placeholder: "socks5://127.0.0.1:1080" },
      { key: "geoProxy", type: "string", label: "Geo-verification Proxy", advanced: true },
      { key: "forceIP", type: "enum", label: "Force IP", default: "any", options: [
        { value: "any", label: "Any" }, { value: "ipv4", label: "IPv4" }, { value: "ipv6", label: "IPv6" },
      ] },
    ],
  },
  {
    id: "impersonate", name: "Impersonate Browser", description: "Spoof TLS fingerprint to bypass bot detection.",
    tier: 4, category: "network", icon: I.Shield,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "client", type: "enum", label: "Client", default: "chrome", options: [
        { value: "chrome", label: "Chrome" }, { value: "safari", label: "Safari" },
        { value: "edge", label: "Edge" }, { value: "any", label: "Any available" },
      ] },
      { key: "os", type: "enum", label: "OS", default: "any", advanced: true, options: [
        { value: "any", label: "Any" }, { value: "windows-10", label: "Windows 10" },
        { value: "macos", label: "macOS" }, { value: "linux", label: "Linux" },
      ] },
    ],
  },
  {
    id: "sub-download", name: "Subtitle Download", description: "Download subtitles in chosen language(s).",
    tier: 4, category: "subtitle", icon: I.Subtitle, favorite: true,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "langs", type: "string", label: "Languages", default: "en", placeholder: "en,ja,es  or  all,-live_chat" },
      { key: "format", type: "enum", label: "Format", default: "srt", options: [
        { value: "srt", label: "SRT" }, { value: "ass", label: "ASS" },
        { value: "vtt", label: "VTT" }, { value: "lrc", label: "LRC" }, { value: "best", label: "Best available" },
      ] },
    ],
  },
  {
    id: "auto-subs", name: "Auto-Subtitle Download", description: "Download auto-generated captions.",
    tier: 4, category: "subtitle", icon: I.Subtitle,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "langs", type: "string", label: "Languages", default: "en" },
    ],
  },
  {
    id: "sub-convert", name: "Subtitle Format Conversion", description: "Convert subtitles to SRT, ASS, VTT, or LRC.",
    tier: 4, category: "subtitle", icon: I.Subtitle,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "targetFormat", type: "enum", label: "Target Format", default: "srt", options: [
        { value: "srt", label: "SRT" }, { value: "ass", label: "ASS" },
        { value: "vtt", label: "VTT" }, { value: "lrc", label: "LRC" },
      ] },
    ],
  },
  {
    id: "embed-subs", name: "Embed Subtitles", description: "Mux subtitles into MP4/MKV/WebM.",
    tier: 4, category: "subtitle", icon: I.Subtitle,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "langs", type: "string", label: "Languages", default: "en" },
      { key: "keepFiles", type: "boolean", label: "Keep separate subtitle files", default: false },
    ],
  },
  {
    id: "embed-thumbnail", name: "Embed Thumbnail", description: "Attach thumbnail as cover art.",
    tier: 4, category: "metadata", icon: I.Thumbnail,
    params: [{ key: "url", type: "string", label: "Video URL" }],
  },
  {
    id: "embed-metadata", name: "Embed Metadata", description: "Write title, artist, date tags into the media file.",
    tier: 4, category: "metadata", icon: I.Info,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "chapters", type: "boolean", label: "Include chapters", default: true },
      { key: "infoJson", type: "boolean", label: "Attach: infojson to MKV", default: false },
 "192K"    ],
  },

  /* ===== Tier 5: Preset Pipelines ===== */
", label  {
    id: "music-pipeline", name: "YouTube Music Pipeline", description: "Download audio, convert to MP3 320k, embed metadata + thumbnail.",
    tier: 5, category: "chain", icon: I.Music, favorite: true, chainSteps: ["audio-mp3", "embed-thumbnail", "embed-metadata"],
    params: [
      { key: "url", type: "string", label: "YouTube Music URL" },
      { key: "quality", type: "enum", label: "Audio Quality", default: "320K", options: [
        { value: "128K", label: "128 kbps" }, { value: "192 kbps" },
        { value: "256K", label: "256 kbps" }, { value: "320K", label: "320 kbps" },
      ] },
      { key: "embedCover", type: "boolean", label: "Embed cover art", default: true },
    ],
  },
  {
    id: "podcast-pipeline", name: "Podcast Episode", description: "Download audio, convert to MP3, embed cover art, save infojson.",
    tier: 5, category: "chain", icon: I.Music, chainSteps: ["audio-mp3", "info-json", "embed-thumbnail"],
    params: [
      { key: "url", type: "string", label: "Podcast Episode URL" },
      { key: "bitrate", type: "enum", label: "Bitrate", default: "128K", options: [
        { value: "96K", label: "96 kbps" }, { value: "128K", label: "128 kbps" }, { value: "192K", label: "192 kbps" },
      ] },
    ],
  },
  {
    id: "archival-youtube", name: "Archival YouTube", description: "Best video + subs + thumb + info.json + comments + archive tracking.",
    tier: 5, category: "chain", icon: I.Archive, chainSteps: ["best-merge", "sub-download", "thumbnail-download", "info-json", "download-archive"],
    params: [
      { key: "url", type: "string", label: "Video or Playlist URL" },
      { key: "subLangs", type: "string", label: "Subtitle Languages", default: "en" },
      { key: "withComments", type: "boolean", label: "Include comments", default: false },
      { key: "archiveFile", type: "string", label: "Archive File", default: "youtube-archive.txt" },
    ],
  },
  {
    id: "channel-archive", name: "Channel Archive", description: "Download entire channel with archive, thumbnails, and metadata.",
    tier: 5, category: "chain", icon: I.Archive, chainSteps: ["channel-download", "thumbnail-download", "info-json", "download-archive"],
    params: [
      { key: "url", type: "string", label: "Channel URL" },
      { key: "maxHeight", type: "enum", label: "Max Height", default: "1080", options: [
        { value: "720", label: "720p" }, { value: "1080", label: "1080p" }, { value: "2160", label: "4K" },
      ] },
      { key: "limit", type: "integer", label: "Max Videos", default: 500, min: 1, max: 100000 },
    ],
  },
  {
    id: "social-clip", name: "Social Media Clip", description: "Download, remux to MP4, cap at 1080p, embed subs.",
    tier: 5, category: "chain", icon: I.Video, chainSteps: ["resolution-cap", "sub-download", "embed-subs"],
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "subLangs", type: "string", label: "Subtitle Languages", default: "en" },
    ],
  },
  {
    id: "course-ripper", name: "Course / Playlist Ripper", description: "Download playlist into chapter-organized folders with metadata.",
    tier: 5, category: "chain", icon: I.Grid, chainSteps: ["playlist-range", "output-template", "info-json"],
    params: [
      { key: "url", type: "string", label: "Playlist / Course URL" },
      { key: "folderTemplate", type: "string", label: "Folder Template", default: "%(playlist)s/%(playlist_index)s - %(title)s.%(ext)s" },
    ],
  },
  {
    id: "music-album", name: "Music Album Download", description: "Download as audio, tag with track/artist/album, save as M4A.",
    tier: 5, category: "chain", icon: I.Music, chainSteps: ["audio-m4a", "embed-thumbnail", "embed-metadata"],
    params: [
      { key: "url", type: "string", label: "Playlist / Album URL" },
      { key: "template", type: "string", label: "Track Template", default: "%(playlist)s/%(playlist_index)s - %(title)s.%(ext)s" },
    ],
  },
  {
    id: "subs-only", name: "Subtitle-Only Extraction", description: "Download only subtitles and convert to SRT.",
    tier: 5, category: "chain", icon: I.Subtitle, chainSteps: ["sub-download", "sub-convert"],
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "langs", type: "string", label: "Languages", default: "en,ja,es" },
    ],
  },

  /* ===== Tier 6: Expert ===== */
  {
    id: "sponsorblock-mark", name: "SponsorBlock Mark", description: "Mark sponsor, intro, outro sections as chapters.",
    tier: 6, category: "sponsorblock", icon: I.Shield, favorite: true,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "categories", type: "multiselect", label: "Categories", default: ["sponsor", "intro", "outro", "selfpromo"], options: [
        { value: "sponsor", label: "Sponsor" },
        { value: "intro", label: "Intro" },
        { value: "outro", label: "Outro" },
        { value: "selfpromo", label: "Self-promotion" },
        { value: "preview", label: "Preview" },
        { value: "filler", label: "Filler" },
        { value: "interaction", label: "Interaction reminder" },
        { value: "music_offtopic", label: "Non-music section" },
      ] },
    ],
  },
  {
    id: "sponsorblock-remove", name: "SponsorBlock Remove", description: "Cut sponsor segments from the downloaded video.",
    tier: 6, category: "sponsorblock", icon: I.Shield,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "categories", type: "multiselect", label: "Remove Categories", default: ["sponsor"], options: [
        { value: "sponsor", label: "Sponsor" },
        { value: "intro", label: "Intro" },
        { value: "outro", label: "Outro" },
        { value: "selfpromo", label: "Self-promotion" },
        { value: "preview", label: "Preview" },
        { value: "filler", label: "Filler" },
      ] },
      { key: "forceKeyframes", type: "boolean", label: "Force keyframes at cuts (slow)", default: true },
    ],
  },
  {
    id: "section-download", name: "Section Download", description: "Download only a time range or chapter via --download-sections.",
    tier: 6, category: "expert", icon: I.Clock,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "section", type: "string", label: "Section Expression", placeholder: "*10:15-20:30  or  intro", helpText: "Use * prefix for time ranges, otherwise chapter title regex." },
      { key: "forceKeyframes", type: "boolean", label: "Force keyframes at boundaries", default: true },
    ],
  },
  {
    id: "split-chapters", name: "Split by Chapters", description: "Split downloaded video into per-chapter files.",
    tier: 6, category: "expert", icon: I.Flow,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "template", type: "string", label: "Chapter Template", default: "%(title)s - %(section_number)02d - %(section_title)s.%(ext)s" },
    ],
  },
  {
    id: "remove-chapters", name: "Remove Chapters", description: "Strip chapters matching a regex pattern.",
    tier: 6, category: "expert", icon: I.Trash,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "regex", type: "string", label: "Chapter Regex", placeholder: "^(Sponsor|Ad|Promo)" },
    ],
  },
  {
    id: "extractor-args", name: "Extractor Arguments", description: "Pass custom args to specific extractors (youtube, tiktok, etc.).",
    tier: 6, category: "expert", icon: I.Terminal,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "extractor", type: "enum", label: "Extractor", default: "youtube", options: [
        { value: "youtube", label: "YouTube" },
        { value: "youtube-tab", label: "YouTube Tab / Playlist" },
        { value: "generic", label: "Generic" },
        { value: "tiktok", label: "TikTok" },
        { value: "twitter", label: "Twitter / X" },
        { value: "soundcloud", label: "SoundCloud" },
      ] },
      { key: "args", type: "string", label: "Args", placeholder: "player_client=default,-web;skip=hls" },
    ],
  },
  {
    id: "print-template", name: "Custom Print Template", description: "Emit specific metadata fields to stdout.",
    tier: 6, category: "expert", icon: I.Terminal,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "template", type: "string", label: "Print Template", default: "%(title)s | %(duration_string)s | %(uploader)s" },
      { key: "when", type: "enum", label: "When", default: "video", options: [
        { value: "video", label: "Before download" },
        { value: "after_move", label: "After download" },
        { value: "pre_process", label: "After extraction" },
      ] },
    ],
  },
  {
    id: "verbose-debug", name: "Verbose / Debug Mode", description: "Print debug info for troubleshooting extraction.",
    tier: 6, category: "expert", icon: I.Terminal,
    params: [
      { key: "url", type: "string", label: "Video URL" },
      { key: "writePages", type: "boolean", label: "Save downloaded pages to disk", default: false },
      { key: "printTraffic", type: "boolean", label: "Print HTTP traffic", default: false },
    ],
  },
];

const SAMPLE_INFO: MediaInfo = {
  id: "dQw4w9WgXcQ",
  title: "Sample Video — 4K HDR Nature Documentary",
  uploader: "Nature Channel · 2.4M subscribers",
  duration: "12:34",
  views: "3.2M views",
  uploadedAt: "2024-08-15",
  thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  formats: [
    { id: "137", label: "1080p MP4 (H.264)", ext: "mp4", size: "184 MB", note: "video only" },
    { id: "248", label: "1080p WebM (VP9)", ext: "webm", size: "156 MB", note: "video only" },
    { id: "271", label: "1440p WebM (VP9)", ext: "webm", size: "312 MB", note: "video only" },
    { id: "313", label: "2160p WebM (VP9)", ext: "webm", size: "672 MB", note: "video only" },
    { id: "140", label: "128k AAC (M4A)", ext: "m4a", size: "12 MB", note: "audio only" },
    { id: "251", label: "160k Opus (WebM)", ext: "webm", size: "14 MB", note: "audio only" },
  ],
  subtitles: [
    { lang: "en", label: "English", auto: false },
    { lang: "es", label: "Spanish", auto: false },
    { lang: "fr", label: "French", auto: false },
    { lang: "en", label: "English (auto)", auto: true },
    { lang: "ja", label: "Japanese (auto)", auto: true },
  ],
};

const SAMPLE_JOBS: Job[] = [
  { id: "j1", title: "Nature Documentary", url: "youtube.com/watch?v=dQw4w9WgXcQ", status: "completed", when: "5 min ago", size: "196 MB", steps: ["Best Merge", "Embed Subs"] },
  { id: "j2", title: "Podcast Ep. 42", url: "soundcloud.com/ep42", status: "running", when: "Running", size: "—", steps: ["Audio MP3", "Embed Metadata"], progress: 45 },
  { id: "j3", title: "Music Playlist 2024", url: "youtube.com/playlist?list=…", status: "completed", when: "Yesterday", size: "1.2 GB", steps: ["Playlist Range", "Archive"] },
  { id: "j4", title: "Twitter Clip", url: "twitter.com/i/status/…", status: "failed", when: "2 hours ago", size: "—", steps: ["Quick Download"] },
];

/* ============================== HELPERS ============================== */
function evaluateCondition(cond: Condition | undefined, values: FormValues): boolean {
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
      case "color": out[p.key] = "#000000"; break;
      default: out[p.key] = ""; break;
    }
  }
  return out;
}

function buildPreviewCommand(op: Operation, values: FormValues): string {
  const args: string[] = [];
  if (op.chainSteps) args.push(`# chain: ${op.chainSteps.join(" → ")}`);
  const flagMap: Record<string, string> = {
    format: "-f", maxHeight: "-S", container: "--merge-output-format",
    template: "-o", lang: "--sub-langs", langs: "--sub-langs",
    rate: "-r", concurrent: "-N", maxSize: "--max-filesize",
    username: "-u", password: "-p", browser: "--cookies-from-browser",
  };
  for (const p of op.params) {
    if (p.key === "url") continue;
    const v = values[p.key];
    if (v === "" || v === undefined || v === null || (Array.isArray(v) && !v.length)) continue;
    if (p.key === "maxHeight") args.push(`-S "res:${v},fps"`);
    else if (p.key === "categories" && Array.isArray(v)) args.push(`--sponsorblock-mark "${v.join(",")}"`);
    else if (p.key === "sort" && Array.isArray(v)) args.push(`-S "${v.join(",")}"`);
    else if (flagMap[p.key]) args.push(`${flagMap[p.key]} ${v}`);
  }
  const url = (values.url as string) || "URL";
  args.push(`"${url}"`);
  return `yt-dlp ${args.join(" ")}`;
}

/* ============================== ROOT APP ============================== */
export default function YtDlpStudio() {
  const [view, setView] = useState<View>("home");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [urlLoaded, setUrlLoaded] = useState(true);
  const [info] = useState<MediaInfo>(SAMPLE_INFO);
  const [pipeline, setPipeline] = useState<{ id: string; op: Operation; values: FormValues }[]>([]);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<(typeof TIER_GROUPS)[number]["id"]>("all");
  const [jobs] = useState<Job[]>(SAMPLE_JOBS);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);

  const tierRange = (id: string): [number, number] => {
    switch (id) {
      case "basic": return [1, 1];
      case "quality": return [2, 2];
      case "files": return [3, 3];
      case "auth": return [4, 4];
      case "presets": return [5, 5];
      case "expert": return [6, 6];
      default: return [1, 6];
    }
  };

  const visibleOps = useMemo(() => {
    const [lo, hi] = tierRange(tierFilter);
    const q = search.trim().toLowerCase();
    return OPERATIONS.filter((op) => {
      if (op.tier < lo || op.tier > hi) return false;
      if (!q) return true;
      return (op.name + op.description + op.category).toLowerCase().includes(q);
    });
  }, [tierFilter, search]);

  const groupedByTier = useMemo(() => {
    const map = new Map<number, Operation[]>();
    for (const op of visibleOps) {
      if (!map.has(op.tier)) map.set(op.tier, []);
      map.get(op.tier)!.push(op);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [visibleOps]);

  function openConfigure(op: Operation) {
    setSelectedOp(op);
    const dv = defaultValues(op);
    if (op.params.some((p) => p.key === "url")) dv.url = url;
    setValues(dv);
    setSheet("configure");
  }

  function addToPipeline() {
    if (!selectedOp) return;
    setPipeline((p) => [...p, { id: Math.random().toString(36).slice(2), op: selectedOp, values }]);
    setSheet(null);
    setSelectedOp(null);
  }

  function removeFromPipeline(id: string) {
    setPipeline((p) => p.filter((s) => s.id !== id));
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

  function startRun() {
    if (!pipeline.length || !url) return;
    setView("run");
    setProgress(0);
    setRunning(true);
  }

  // simulate progress
  useMemo(() => {
    if (view !== "run" || !running) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(id); setRunning(false); return 100; }
        return Math.min(p + Math.random() * 7 + 3, 100);
      });
    }, 240);
    return () => clearInterval(id);
  }, [view, running]);

  return (
    <div className="app">
      {/* ---------- top bar ---------- */}
      <header className="topbar">
        <button className="iconbtn" onClick={() => (view === "home" ? null : setView("home"))} aria-label="Back">
          {view === "home" ? <I.Bolt /> : <I.Back />}
        </button>
        <div className="title">
          <span className="titleMain">{topTitle(view)}</span>
          <span className="titleSub">{topSubtitle({ view, pipeline, url })}</span>
        </div>
        <button className="ghostbtn" onClick={() => setView("history")} aria-label="History"><I.History /></button>
      </header>

      <main className="main">
        {view === "home" && (
          <HomeView
            url={url} setUrl={setUrl} urlLoaded={urlLoaded} info={info}
            onLoad={() => setUrlLoaded(true)}
            onOpenInfo={() => setSheet("info")}
            onOpenFormats={() => setSheet("formats")}
            onOpenSubs={() => setSheet("subs")}
            onBrowse={() => setView("catalog")}
            onOpenOp={openConfigure}
            onOpenJob={() => setView("result")}
            onOpenPipeline={() => setView("pipeline")}
            jobs={jobs}
          />
        )}
        {view === "catalog" && (
          <CatalogView
            ops={groupedByTier} search={search} setSearch={setSearch}
            tierFilter={tierFilter} setTierFilter={setTierFilter}
            onOpenOp={openConfigure}
          />
        )}
        {view === "pipeline" && (
          <PipelineView
            url={url} info={info} pipeline={pipeline}
            onAdd={() => setView("catalog")}
            onRemove={removeFromPipeline} onMove={moveStep}
            onRun={startRun}
            onEdit={(step) => { setSelectedOp(step.op); setValues(step.values); setSheet("configure"); }}
          />
        )}
        {view === "run" && (
          <RunView url={url} pipeline={pipeline} progress={progress} running={running} />
        )}
        {view === "result" && (
          <ResultView
            info={info} pipeline={pipeline}
            onAgain={() => { setView("run"); setProgress(0); setRunning(true); }}
            onHome={() => setView("home")}
          />
        )}
        {view === "history" && <HistoryView jobs={jobs} onOpen={() => setView("result")} />}
      </main>

      {/* ---------- bottom nav ---------- */}
      <nav className="bottomNav">
        <NavBtn active={view === "home"} label="Home" onClick={() => setView("home")} icon={<I.Home />} />
        <NavBtn active={view === "catalog"} label="Ops" onClick={() => setView("catalog")} icon={<I.Grid />} />
        <NavBtn active={view === "pipeline"} label="Pipeline" badge={pipeline.length} onClick={() => setView("pipeline")} icon={<I.Flow />} />
        <NavBtn active={view === "history"} label="History" onClick={() => setView("history")} icon={<I.History />} />
      </nav>

      {/* ---------- sheets ---------- */}
      {sheet === "configure" && selectedOp && (
        <ConfigureSheet
          op={selectedOp} values={values}
          setValue={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onClose={() => { setSheet(null); setSelectedOp(null); }}
          onAdd={addToPipeline}
        />
      )}
      {sheet === "info" && <InfoSheet info={info} onClose={() => setSheet(null)} />}
      {sheet === "formats" && <FormatsSheet info={info} onClose={() => setSheet(null)} />}
      {sheet === "subs" && <SubsSheet info={info} onClose={() => setSheet(null)} />}
    </div>
  );
}

/* ============================== TITLE HELPERS ============================== */
function topTitle(view: View) {
  return { home: "yt-dlp Studio", catalog: "Operations", pipeline: "Pipeline", run: "Downloading", result: "Complete", history: "History" }[view];
}
function topSubtitle({ view, pipeline, url }: { view: View; pipeline: { op: Operation }[]; url: string }) {
  if (view === "home") return url ? `source: ${short(url)}` : "no URL loaded";
  if (view === "catalog") return `${pipeline.length} step${pipeline.length === 1 ? "" : "s"} queued`;
  if (view === "pipeline") return pipeline.length ? `${pipeline.length} operation${pipeline.length === 1 ? "" : "s"}` : "empty pipeline";
  if (view === "run") return "processing…";
  if (view === "result") return "ready to save";
  return "past downloads";
}
function short(s: string) { return s.length > 40 ? s.slice(0, 37) + "…" : s; }

/* ============================== HOME VIEW ============================== */
function HomeView({
  url, setUrl, urlLoaded, info, onLoad, onOpenInfo, onOpenFormats, onOpenSubs,
  onBrowse, onOpenOp, onOpenJob, onOpenPipeline, jobs,
}: {
  url: string; setUrl: (s: string) => void; urlLoaded: boolean; info: MediaInfo;
  onLoad: () => void;
  onOpenInfo: () => void; onOpenFormats: () => void; onOpenSubs: () => void;
  onBrowse: () => void; onOpenOp: (op: Operation) => void;
  onOpenJob: () => void; onOpenPipeline: () => void;
  jobs: Job[];
}) {
  const favorites = OPERATIONS.filter((o) => o.favorite);
  const recent = jobs.slice(0, 3);

  return (
    <div className="pad">
      {/* URL input */}
      <section className="card urlCard">
        <div className="urlHead">
          <I.Link /> <span>Video URL</span>
        </div>
        <input
          className="urlInput"
          placeholder="Paste YouTube, TikTok, Twitter, SoundCloud URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="sourceBtn" onClick={onLoad} disabled={!url}>
          <I.Download size={14} /> Load Info
        </button>
      </section>

      {/* media preview */}
      {urlLoaded && (
        <section className="card mediaCard">
          <div className="mediaThumb">
            <div className="mediaThumbInner"><I.Play size={26} /></div>
            <span className="mediaDuration">{info.duration}</span>
          </div>
          <div className="mediaMeta">
            <span className="mediaTitle">{info.title}</span>
            <span className="mediaSub">{info.uploader}</span>
            <span className="mediaStats">{info.views} · {info.uploadedAt}</span>
          </div>
          <div className="mediaActions">
            <button className="miniBtn" onClick={onOpenFormats}><I.Video size={14} /> {info.formats.length} formats</button>
            <button className="miniBtn" onClick={onOpenSubs}><I.Subtitle size={14} /> {info.subtitles.length} subs</button>
            <button className="miniBtn" onClick={onOpenInfo}><I.Info size={14} /> Info</button>
          </div>
        </section>
      )}

      {/* quick actions */}
      <section>
        <div className="rowHead">
          <h3 className="sectionTitle">Quick Downloads</h3>
        </div>
        <div className="quickGrid">
          <button className="quickCard" onClick={() => onOpenOp(OPERATIONS.find((o) => o.id === "quick-best")!)}>
            <I.Bolt /><span>Best</span>
          </button>
          <button className="quickCard" onClick={() => onOpenOp(OPERATIONS.find((o) => o.id === "audio-mp3")!)}>
            <I.Music /><span>MP3</span>
          </button>
          <button className="quickCard" onClick={() => onOpenOp(OPERATIONS.find((o) => o.id === "resolution-cap")!)}>
            <I.Video /><span>1080p</span>
          </button>
          <button className="quickCard" onClick={() => onOpenOp(OPERATIONS.find((o) => o.id === "sub-download")!)}>
            <I.Subtitle /><span>Subs</span>
          </button>
        </div>
      </section>

      {/* favorites */}
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

      {/* pipeline CTA */}
      <section>
        <div className="rowHead">
          <h3 className="sectionTitle">Pipeline</h3>
          <button className="rowAction" onClick={onOpenPipeline}>Open</button>
        </div>
        <button className="card pipelinePreview" onClick={onOpenPipeline}>
          <I.Flow />
          <div className="pipelinePreviewText">
            <span className="pipelinePreviewTitle">Build a download pipeline</span>
            <span className="pipelinePreviewSub">Chain download → convert → embed</span>
          </div>
          <I.ChevronRight />
        </button>
      </section>

      {/* recent jobs */}
      <section>
        <div className="rowHead"><h3 className="sectionTitle">Recent</h3></div>
        <div className="jobList">
          {recent.map((job) => (
            <button key={job.id} className="card jobCard" onClick={onOpenJob}>
              <div className={`jobStatus jobStatus-${job.status}`}>
                {job.status === "completed" ? <I.Check /> : job.status === "running" ? <I.Bolt /> : <I.Warning />}
              </div>
              <div className="jobBody">
                <span className="jobName">{job.title}</span>
                <span className="jobSub">{job.when} · {job.size}</span>
              </div>
              <I.ChevronRight />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ============================== CATALOG ============================== */
function CatalogView({
  ops, search, setSearch, tierFilter, setTierFilter, onOpenOp,
}: {
  ops: [number, Operation[]][]; search: string; setSearch: (s: string) => void;
  tierFilter: string; setTierFilter: (t: (typeof TIER_GROUPS)[number]["id"]) => void;
  onOpenOp: (op: Operation) => void;
}) {
  return (
    <div className="pad">
      <div className="searchWrap">
        <I.Search />
        <input
          className="searchInput"
          placeholder="Search yt-dlp operations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="filterScroll">
        {TIER_GROUPS.map((g) => (
          <button
            key={g.id}
            className={`filterChip ${tierFilter === g.id ? "filterActive" : ""}`}
            onClick={() => setTierFilter(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <div className="catalog">
        {ops.length === 0 && <p className="empty">No operations match your search.</p>}
        {ops.map(([tier, list]) => (
          <section key={tier} className="tierSection">
            <h3 className="tierHead">{TIER_LABELS[tier]}</h3>
            <ul className="opList">
              {list.map((op) => {
                const Icon = op.icon;
                return (
                  <li key={op.id}>
                    <button className="opCard" onClick={() => onOpenOp(op)}>
                      <span className="opIcon"><Icon /></span>
                      <span className="opBody">
                        <span className="opName">
                          {op.name}
                          {op.chainSteps && <span className="chainBadge">chain</span>}
                        </span>
                        <span className="opDesc">{op.description}</span>
                        <span className="opMeta">tier {op.tier} · {op.category}</span>
                      </span>
                      <I.ChevronRight />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ============================== PIPELINE ============================== */
function PipelineView({
  url, info, pipeline, onAdd, onRemove, onMove, onRun, onEdit,
}: {
  url: string; info: MediaInfo; pipeline: { id: string; op: Operation; values: FormValues }[];
  onAdd: () => void; onRemove: (id: string) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRun: () => void;
  onEdit: (step: { id: string; op: Operation; values: FormValues }) => void;
}) {
  return (
    <div className="pad">
      <section className="flowWrap">
        {/* source node */}
        <div className="flowNode flowNodeSource">
          <div className="flowNodeIcon"><I.Link /></div>
          <div className="flowNodeBody">
            <span className="flowNodeLabel">Source URL</span>
            <span className="flowNodeValue">{info.title}</span>
          </div>
        </div>

        {pipeline.length === 0 && (
          <div className="flowEmpty">
            <I.Flow size={28} />
            <p>No operations yet</p>
            <span>Add one to start building your download pipeline.</span>
          </div>
        )}

        {pipeline.map((step, i) => {
          const Icon = step.op.icon;
          return (
            <div key={step.id} className="flowRow">
              <div className="flowLine" />
              <div className="flowNode flowNodeOp">
                <div className="flowReorder">
                  <button onClick={() => onMove(i, -1)} disabled={i === 0}><I.Up /></button>
                  <button onClick={() => onMove(i, 1)} disabled={i === pipeline.length - 1}><I.Down /></button>
                </div>
                <div className="flowNodeIcon flowNodeIconOp"><Icon size={18} /></div>
                <div className="flowNodeBody" onClick={() => onEdit(step)}>
                  <span className="flowNodeLabel">Step {i + 1}</span>
                  <span className="flowNodeValue">{step.op.name}</span>
                </div>
                <button className="flowDelete" onClick={() => onRemove(step.id)}><I.Trash /></button>
              </div>
            </div>
          );
        })}

        <div className="flowRow">
          <div className="flowLine" />
          <button className="flowAdd" onClick={onAdd}><I.Plus /> Add Operation</button>
        </div>

        {pipeline.length > 0 && (
          <>
            <div className="flowLine" />
            <div className="flowNode flowNodeOut">
              <div className="flowNodeIcon flowNodeIconOut"><I.Download /></div>
              <div className="flowNodeBody">
                <span className="flowNodeLabel">Output</span>
                <span className="flowNodeValue">{info.title}.mp4</span>
              </div>
            </div>
          </>
        )}
      </section>

      {pipeline.length > 0 && (
        <section className="card statsCard">
          <Stat label="Steps" value={String(pipeline.length)} />
          <Stat label="Source" value={info.duration} />
          <Stat label="Est. Size" value={`${(pipeline.length * 42).toFixed(0)} MB`} />
        </section>
      )}

      <button className="primaryBtn" onClick={onRun} disabled={!pipeline.length || !url}>
        <I.Play size={16} /> Start Download
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

/* ============================== RUN ============================== */
function RunView({
  url, pipeline, progress, running,
}: {
  url: string; pipeline: { id: string; op: Operation; values: FormValues }[];
  progress: number; running: boolean;
}) {
  const activeIndex = Math.min(Math.floor((progress / 100) * pipeline.length), pipeline.length - 1);
  return (
    <div className="pad">
      <section className="card runHeader">
        <div className="runRingWrap">
          <svg viewBox="0 0 120 120" className="runRing">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="runRingText">
            <span className="runPct">{Math.round(progress)}%</span>
            <span className="runState">{running ? "Downloading" : "Finalizing"}</span>
          </div>
        </div>
        <div className="runMeta">
          <span className="runSource">{short(url)}</span>
          <span className="runStep">Step {activeIndex + 1} of {pipeline.length} · {pipeline[activeIndex]?.op.name}</span>
        </div>
      </section>

      <section className="card logCard">
        <div className="logHead"><I.Terminal /> <span>Live Output</span></div>
        <pre className="logBody">
{`[download] Destination: video.f137.mp4
[download] ${Math.round(progress * 1.84 * 1000) / 1000}MiB at ${(2.4 + Math.random()).toFixed(1)}MiB/s ETA 00:0${Math.max(0, 9 - Math.floor(progress / 12))}
[download] Destination: video.f140.m4a
[download] 100% of ~12MiB in 00:0${Math.max(0, 5 - Math.floor(progress / 20))}
[Merger] Merging formats into "video.mp4"
[EmbedSubtitle] Embedding subtitles in "video.mp4"`}
        </pre>
      </section>

      <section className="stepList">
        {pipeline.map((s, i) => (
          <div key={s.id} className={`stepRow ${i < activeIndex ? "stepDone" : i === activeIndex ? "stepActive" : ""}`}>
            <div className="stepDot">
              {i < activeIndex ? <I.Check size={12} /> : i === activeIndex ? <I.Bolt size={12} /> : <span>{i + 1}</span>}
            </div>
            <span className="stepName">{s.op.name}</span>
            {i === activeIndex && <span className="stepPct">{Math.round(progress)}%</span>}
          </div>
        ))}
      </section>
    </div>
  );
}

/* ============================== RESULT ============================== */
function ResultView({
  info, pipeline, onAgain, onHome,
}: {
  info: MediaInfo; pipeline: { id: string; op: Operation }[];
  onAgain: () => void; onHome: () => void;
}) {
  return (
    <div className="pad">
      <section className="card resultHero">
        <div className="resultIcon"><I.Check size={28} /></div>
        <h2 className="resultTitle">Download complete</h2>
        <p className="resultSub">{pipeline.map((s) => s.op.name).join(" → ")}</p>
      </section>

      <section className="card videoPreview">
        <div className="videoThumb"><I.Play size={30} /></div>
        <div className="videoMeta">
          <span className="videoName">{info.title}.mp4</span>
          <span className="videoInfo">1920×1080 · H.264 + AAC · 196 MB</span>
        </div>
      </section>

      <section className="card statsCard">
        <Stat label="Duration" value={info.duration} />
        <Stat label="Size" value="196 MB" />
        <Stat label="Bitrate" value="3.8 Mb/s" />
      </section>

      <div className="resultActions">
        <button className="primaryBtn"><I.Download size={16} /> Save to Library</button>
        <button className="ghostBtnWide" onClick={onAgain}><I.Bolt size={14} /> Download Again</button>
        <button className="ghostBtnWide" onClick={onHome}>Back to Home</button>
      </div>
    </div>
  );
}

/* ============================== HISTORY ============================== */
function HistoryView({ jobs, onOpen }: { jobs: Job[]; onOpen: () => void }) {
  return (
    <div className="pad">
      <div className="jobList">
        {jobs.map((job) => (
          <button key={job.id} className="card jobCard" onClick={onOpen}>
            <div className={`jobStatus jobStatus-${job.status}`}>
              {job.status === "completed" ? <I.Check /> : job.status === "running" ? <I.Bolt /> : <I.Warning />}
            </div>
            <div className="jobBody">
              <span className="jobName">{job.title}</span>
              <span className="jobSub">{job.steps.join(" → ")}</span>
              <span className="jobMeta">{job.when} · {job.size}</span>
            </div>
            <I.ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================== SHEETS ============================== */
function ConfigureSheet({
  op, values, setValue, onClose, onAdd,
}: {
  op: Operation; values: FormValues; setValue: (k: string, v: unknown) => void;
  onClose: () => void; onAdd: () => void;
}) {
  const visible = op.params.filter((p) => evaluateCondition(p.showIf, values));
  const groups = useMemo(() => {
    const m = new Map<string, Param[]>();
    for (const p of visible) {
      const g = p.group ?? "General";
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(p);
    }
    return [...m.entries()];
  }, [visible]);

  const [showCommand, setShowCommand] = useState(false);
  const cmd = buildPreviewCommand(op, values);

  return (
    <div className="sheetOverlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <div className="sheetHead">
          <div className="sheetHeadLeft">
            <span className="sheetTitle">{op.name}</span>
            <span className="sheetBadge">tier {op.tier} · {op.category}</span>
          </div>
          <button className="closebtn" onClick={onClose}><I.Close /></button>
        </div>
        <p className="sheetNote">{op.description}</p>

        {op.chainSteps && (
          <div className="chainNote"><I.Flow size={14} /><span>Chain: {op.chainSteps.join(" → ")}</span></div>
        )}

        <div className="sheetBody">
          {groups.map(([group, params]) => (
            <fieldset key={group} className="fieldGroup">
              <legend className="groupLabel">{group}</legend>
              {params.map((p) => (
                <Field key={p.key} param={p} value={values[p.key]} onChange={(v) => setValue(p.key, v)} />
              ))}
            </fieldset>
          ))}
        </div>

        <button className="advancedToggle" onClick={() => setShowCommand((s) => !s)}>
          <I.Terminal size={14} /> {showCommand ? "Hide" : "Show"} yt-dlp command
        </button>
        {showCommand && <pre className="cmdPreview">{cmd}</pre>}

        <button className="primaryBtn" onClick={onAdd}><I.Plus /> Add to Pipeline</button>
      </div>
    </div>
  );
}

function InfoSheet({ info, onClose }: { info: MediaInfo; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Video ID", info.id],
    ["Title", info.title],
    ["Uploader", info.uploader],
    ["Duration", info.duration],
    ["Views", info.views],
    ["Uploaded", info.uploadedAt],
    ["Formats", `${info.formats.length} available`],
    ["Subtitles", `${info.subtitles.length} languages`],
  ];
  return (
    <div className="sheetOverlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <div className="sheetHead">
          <span className="sheetTitle">Media Info</span>
          <button className="closebtn" onClick={onClose}><I.Close /></button>
        </div>
        <p className="sheetNote">Metadata extracted from the URL without downloading.</p>
        <div className="infoList">
          {rows.map(([k, v]) => (
            <div key={k} className="infoRow">
              <span className="infoKey">{k}</span>
              <span className="infoVal">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FormatsSheet({ info, onClose }: { info: MediaInfo; onClose: () => void }) {
  return (
    <div className="sheetOverlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <div className="sheetHead">
          <span className="sheetTitle">Available Formats</span>
          <button className="closebtn" onClick={onClose}><I.Close /></button>
        </div>
        <p className="sheetNote">yt-dlp detected {info.formats.length} downloadable formats.</p>
        <div className="formatList">
          {info.formats.map((f) => (
            <div key={f.id} className="formatRow">
              <span className="formatId">{f.id}</span>
              <div className="formatBody">
                <span className="formatLabel">{f.label}</span>
                <span className="formatMeta">{f.ext} · {f.size} · {f.note}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubsSheet({ info, onClose }: { info: MediaInfo; onClose: () => void }) {
  return (
    <div className="sheetOverlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <div className="sheetHead">
          <span className="sheetTitle">Subtitles</span>
          <button className="closebtn" onClick={onClose}><I.Close /></button>
        </div>
        <p className="sheetNote">Manual and auto-generated captions found.</p>
        <div className="formatList">
          {info.subtitles.map((s, i) => (
            <div key={i} className="formatRow">
              <span className="formatId">{s.lang}</span>
              <div className="formatBody">
                <span className="formatLabel">{s.label}</span>
                <span className="formatMeta">{s.auto ? "auto-generated" : "manual"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================== FIELD ============================== */
function Field({ param, value, onChange }: { param: Param; value: unknown; onChange: (v: unknown) => void }) {
  switch (param.type) {
    case "string":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <input type="text" placeholder={param.placeholder} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );
    case "number":
    case "integer":
      return (
        <label className="field">
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
            <span className="fieldValue">{String(value ?? 0)}{param.unit ? ` ${param.unit}` : ""}</span>
          </div>
          <input
            type="number" min={param.min} max={param.max}
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
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
          <span>{param.label}</span>
        </label>
      );
    case "enum":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <select value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
            {param.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      );
    case "multiselect": {
      const arr = (value as string[]) ?? [];
      return (
        <div className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <div className="multiGrid">
            {param.options?.map((o) => {
              const checked = arr.includes(o.value);
              return (
                <label key={o.value} className={`multiChip ${checked ? "multiOn" : ""}`}>
                  <input
                    type="checkbox" checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked ? [...arr, o.value] : arr.filter((v) => v !== o.value);
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
    default:
      return null;
  }
}

/* ============================== NAV BUTTON ============================== */
function NavBtn({ active, label, icon, onClick, badge }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void; badge?: number }) {
  return (
    <button className={`navBtn ${active ? "navActive" : ""}`} onClick={onClick}>
      <span className="navIcon">
        {icon}
        {badge !== undefined && badge > 0 && <span className="navBadge">{badge}</span>}
      </span>
      <span className="navLabel">{label}</span>
    </button>
  );
}

/* ============================== STYLES ============================== */
const STYLES = `
:root {
  --bg: #f7f6f2; --surface: #ffffff; --surface-2: #fbfaf7;
  --border: #e7e5de; --border-strong: #d6d3c9;
  --ink: #14171a; --ink-soft: #5b6065; --ink-mute: #8a8f95;
  --accent: #4f46e5; --accent-soft: #eef2ff;
  --render: #2e9c7a; --render-soft: #e8f8f1;
  --warn: #d97706; --warn-soft: #fef4e6;
  --danger: #dc2626; --danger-soft: #fdeaea;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  --radius: 14px; --radius-lg: 20px;
}
.app {
  min-height: 100vh; background: var(--bg); color: var(--ink);
  font-family: var(--font-sans); display: flex; flex-direction: column;
  padding-bottom: 76px;
}
.topbar {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px 8px; position: sticky; top: 0;
  background: var(--bg); z-index: 5;
}
.iconbtn {
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--surface);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink); flex-shrink: 0; cursor: pointer;
}
.ghostbtn { border: none; background: transparent; color: var(--ink-soft); padding: 6px; cursor: pointer; display: flex; }
.title { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.titleMain { font-size: 15px; font-weight: 600; line-height: 1.2; }
.titleSub { font-size: 12px; color: var(--ink-soft); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.main { flex: 1; overflow-y: auto; }
.pad { padding: 6px 16px 24px; display: flex; flex-direction: column; gap: 18px; }
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 14px;
}
.rowHead { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px 8px; }
.sectionTitle { font-size: 13px; font-weight: 600; color: var(--ink); margin: 0; }
.rowAction { background: transparent; border: none; color: var(--accent); font-size: 12.5px; font-weight: 500; cursor: pointer; }

/* URL card */
.urlCard { display: flex; flex-direction: column; gap: 10px; }
.urlHead { display: flex; align-items: center; gap: 8px; color: var(--ink-soft); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.urlInput {
  width: 100%; padding: 11px 14px; border-radius: 12px;
  border: 1px solid var(--border); background: var(--bg);
  font-size: 14px; font-family: var(--font-mono); color: var(--ink);
  -webkit-appearance: none;
}
.sourceBtn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--ink); color: #fff; border: none;
  padding: 10px 16px; border-radius: 999px;
  font-size: 13.5px; font-weight: 600; cursor: pointer;
}
.sourceBtn:disabled { opacity: 0.4; cursor: default; }

/* media preview */
.mediaCard { display: flex; flex-direction: column; gap: 12px; padding: 12px; }
.mediaThumb {
  position: relative; height: 140px; border-radius: 12px; overflow: hidden;
  background: linear-gradient(135deg, #1e293b, #334155);
  display: flex; align-items: center; justify-content: center;
}
.mediaThumbInner { color: #fff; }
.mediaDuration {
  position: absolute; bottom: 8px; right: 8px;
  background: rgba(0,0,0,0.7); color: #fff; font-size: 11px;
  padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono);
}
.mediaMeta { display: flex; flex-direction: column; gap: 3px; }
.mediaTitle { font-size: 14px; font-weight: 600; line-height: 1.3; }
.mediaSub { font-size: 12.5px; color: var(--ink-soft); }
.mediaStats { font-size: 11.5px; color: var(--ink-mute); font-family: var(--font-mono); }
.mediaActions { display: flex; gap: 6px; flex-wrap: wrap; }
.miniBtn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 10px; border-radius: 999px;
  background: var(--bg); border: 1px solid var(--border);
  font-size: 11.5px; color: var(--ink-soft); cursor: pointer;
  font-family: var(--font-mono);
}
.miniBtn:hover { background: var(--accent-soft); color: var(--accent); border-color: var(--accent); }

/* quick actions */
.quickGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.quickCard {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 6px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); cursor: pointer;
  font-size: 11.5px; font-weight: 500; color: var(--ink);
}
.quickCard > svg { color: var(--accent); }

/* favorites */
.favScroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 2px; }
.favCard {
  min-width: 132px; display: flex; flex-direction: column; gap: 8px;
  padding: 12px; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); cursor: pointer; text-align: left;
}
.favIcon {
  width: 30px; height: 30px; border-radius: 9px;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
}
.favName { font-size: 12.5px; font-weight: 600; line-height: 1.3; }
.favTier { font-size: 11px; color: var(--ink-mute); font-family: var(--font-mono); }

/* pipeline preview */
.pipelinePreview { display: flex; align-items: center; gap: 12px; cursor: pointer; text-align: left; }
.pipelinePreview > svg:first-child { color: var(--accent); flex-shrink: 0; }
.pipelinePreviewText { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.pipelinePreviewTitle { font-size: 14px; font-weight: 600; }
.pipelinePreviewSub { font-size: 12px; color: var(--ink-soft); }

/* jobs */
.jobList { display: flex; flex-direction: column; gap: 8px; }
.jobCard { display: flex; align-items: center; gap: 12px; cursor: pointer; text-align: left; }
.jobStatus {
  width: 32px; height: 32px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.jobStatus-completed { background: var(--render-soft); color: var(--render); }
.jobStatus-running { background: var(--warn-soft); color: var(--warn); }
.jobStatus-failed { background: var(--danger-soft); color: var(--danger); }
.jobBody { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.jobName { font-size: 13.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jobSub { font-size: 12px; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jobMeta { font-size: 11px; color: var(--ink-mute); font-family: var(--font-mono); }

/* catalog */
.searchWrap {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius); color: var(--ink-soft);
}
.searchInput {
  flex: 1; border: none; outline: none; background: transparent;
  font-size: 14px; color: var(--ink); font-family: var(--font-sans);
}
.filterScroll { display: flex; gap: 6px; overflow-x: auto; padding: 2px 0; }
.filterChip {
  padding: 6px 12px; border-radius: 999px;
  background: var(--surface); border: 1px solid var(--border);
  font-size: 12.5px; color: var(--ink-soft); cursor: pointer; white-space: nowrap;
}
.filterActive { background: var(--ink); color: #fff; border-color: var(--ink); }

.catalog { display: flex; flex-direction: column; gap: 18px; }
.tierSection { display: flex; flex-direction: column; gap: 8px; }
.tierHead { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-mute); font-weight: 600; margin: 0; padding-left: 4px; }
.opList { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.opCard {
  width: 100%; display: flex; gap: 12px; align-items: center;
  padding: 12px; border-radius: var(--radius);
  border: 1px solid var(--border); background: var(--surface);
  text-align: left; cursor: pointer;
}
.opIcon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.opBody { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.opName { font-size: 13.5px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.opDesc { font-size: 12px; color: var(--ink-soft); line-height: 1.4; }
.opMeta { font-size: 11px; font-family: var(--font-mono); color: var(--ink-mute); margin-top: 2px; }
.chainBadge {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  background: var(--render-soft); color: var(--render);
  padding: 2px 6px; border-radius: 4px;
}
.empty { text-align: center; padding: 40px 12px; color: var(--ink-mute); font-size: 13px; }

/* flow */
.flowWrap { display: flex; flex-direction: column; }
.flowRow { display: flex; flex-direction: column; align-items: stretch; }
.flowLine { width: 2px; height: 20px; background: var(--border-strong); margin: 0 auto; border-radius: 1px; }
.flowNode {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--border);
  text-align: left; width: 100%;
}
.flowNodeIcon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--bg); color: var(--ink-soft);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.flowNodeIconOp { background: var(--accent-soft); color: var(--accent); }
.flowNodeIconOut { background: var(--render-soft); color: var(--render); }
.flowNodeBody { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.flowNodeLabel { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-mute); font-weight: 600; }
.flowNodeValue { font-size: 13.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.flowReorder { display: flex; flex-direction: column; gap: 2px; }
.flowReorder button { border: none; background: transparent; color: var(--ink-mute); padding: 2px; cursor: pointer; border-radius: 4px; }
.flowReorder button:disabled { opacity: 0.3; cursor: default; }
.flowDelete { border: none; background: transparent; color: var(--ink-mute); padding: 6px; cursor: pointer; border-radius: 6px; }
.flowDelete:hover { background: var(--danger-soft); color: var(--danger); }
.flowAdd {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px; border-radius: var(--radius);
  background: var(--surface-2); border: 1px dashed var(--border-strong);
  color: var(--ink-soft); font-size: 13px; font-weight: 500; cursor: pointer;
}
.flowAdd:hover { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
.flowEmpty {
  text-align: center; padding: 24px; color: var(--ink-mute);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.flowEmpty p { font-size: 13px; font-weight: 600; color: var(--ink-soft); margin: 4px 0 0; }
.flowEmpty span { font-size: 12px; }

/* stats */
.statsCard { display: flex; justify-content: space-around; gap: 8px; padding: 14px 8px; }
.stat { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
.statValue { font-size: 16px; font-weight: 700; font-family: var(--font-mono); }
.statLabel { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-mute); font-weight: 600; }

/* buttons */
.primaryBtn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 13px 18px;
  background: var(--ink); color: #fff; border: none;
  border-radius: 999px; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: var(--font-sans);
}
.primaryBtn:disabled { opacity: 0.4; cursor: default; }
.ghostBtnWide {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 12px 18px;
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--border); border-radius: 999px;
  font-size: 13.5px; font-weight: 600; cursor: pointer;
}

/* run */
.runHeader { display: flex; align-items: center; gap: 20px; padding: 20px; }
.runRingWrap { position: relative; width: 110px; height: 110px; flex-shrink: 0; }
.runRing { width: 100%; height: 100%; }
.runRingText {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
}
.runPct { font-size: 22px; font-weight: 700; font-family: var(--font-mono); }
.runState { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-mute); font-weight: 600; }
.runMeta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.runSource { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.runStep { font-size: 12px; color: var(--ink-soft); line-height: 1.4; }
.logCard { padding: 0; overflow: hidden; }
.logHead {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px; border-bottom: 1px solid var(--border);
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-mute); font-weight: 600;
}
.logBody {
  margin: 0; padding: 12px 14px;
  font-family: var(--font-mono); font-size: 11.5px;
  color: var(--ink-soft); line-height: 1.55;
  background: #0e0f11;
  white-space: pre-wrap; word-break: break-all;
  max-height: 200px; overflow-y: auto;
}
.stepList { display: flex; flex-direction: column; gap: 6px; }
.stepRow {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  font-size: 13px;
}
.stepDone { opacity: 0.55; }
.stepActive { border-color: var(--accent); background: var(--accent-soft); }
.stepDot {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--bg); color: var(--ink-soft);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; flex-shrink: 0;
}
.stepDone .stepDot { background: var(--render-soft); color: var(--render); }
.stepActive .stepDot { background: var(--accent); color: #fff; }
.stepName { flex: 1; font-weight: 500; }
.stepPct { font-family: var(--font-mono); font-size: 12px; color: var(--accent); font-weight: 700; }

/* result */
.resultHero { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px 16px; text-align: center; }
.resultIcon {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--render-soft); color: var(--render);
  display: flex; align-items: center; justify-content: center;
}
.resultTitle { font-size: 17px; font-weight: 700; margin: 8px 0 0; }
.resultSub { font-size: 12.5px; color: var(--ink-soft); margin: 0; line-height: 1.5; }
.videoPreview { display: flex; gap: 12px; align-items: center; }
.videoThumb {
  width: 96px; height: 64px; border-radius: 10px;
  background: linear-gradient(135deg, #1e293b, #334155); color: #fff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.videoMeta { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.videoName { font-size: 13.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.videoInfo { font-size: 12px; color: var(--ink-soft); font-family: var(--font-mono); }
.resultActions { display: flex; flex-direction: column; gap: 8px; }

/* sheet */
.sheetOverlay {
  position: fixed; inset: 0;
  background: rgba(20, 23, 26, 0.32);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 40;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
.sheet {
  width: 100%; max-width: 560px; max-height: 88vh; overflow-y: auto;
  background: var(--surface); border-radius: 20px 20px 0 0;
  padding: 10px 18px 24px;
  border: 1px solid var(--border); border-bottom: none;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp { from { transform: translateY(20px) } to { transform: translateY(0) } }
.sheetHandle { width: 36px; height: 4px; border-radius: 2px; background: var(--border); margin: 4px auto 12px; }
.sheetHead { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.sheetHeadLeft { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sheetTitle { font-size: 16px; font-weight: 700; }
.sheetBadge { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-mute); font-weight: 600; font-family: var(--font-mono); }
.closebtn { border: none; background: transparent; color: var(--ink-soft); padding: 6px; cursor: pointer; border-radius: 8px; }
.closebtn:hover { background: var(--bg); }
.sheetNote { font-size: 12.5px; color: var(--ink-soft); line-height: 1.55; margin: 0 0 14px; }
.chainNote {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 12px; border-radius: 10px;
  background: var(--render-soft); color: var(--render);
  font-size: 12px; font-weight: 500; margin-bottom: 14px;
}
.sheetBody { display: flex; flex-direction: column; gap: 16px; }
.fieldGroup { border: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.groupLabel { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-mute); font-weight: 600; padding: 0 0 4px; }
.advancedToggle {
  margin-top: 16px; display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: none; color: var(--accent);
  font-size: 12.5px; font-weight: 500; cursor: pointer; padding: 6px 0;
}
.cmdPreview {
  margin: 8px 0 0; padding: 12px;
  background: #0e0f11; color: #d1d5db;
  font-family: var(--font-mono); font-size: 11.5px;
  border-radius: 10px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-all; overflow-x: auto;
}
.sheet .primaryBtn { margin-top: 20px; }

/* field */
.field { display: flex; flex-direction: column; gap: 6px; }
.fieldHead { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; }
.fieldLabel { color: var(--ink-soft); }
.fieldValue { font-family: var(--font-mono); font-size: 12px; color: var(--ink); }
.fieldHelp { font-size: 11.5px; color: var(--ink-mute); margin: 0; line-height: 1.4; }
input[type="text"], input[type="number"], textarea, select {
  width: 100%; padding: 9px 12px;
  border-radius: 10px; border: 1px solid var(--border);
  background: var(--bg); color: var(--ink);
  font-size: 14px; font-family: var(--font-sans);
  -webkit-appearance: none; appearance: none;
}
select {
  padding-right: 34px;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235b6065' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;
}
.checkboxRow { display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
.checkboxRow input { width: 18px; height: 18px; accent-color: var(--accent); }
.multiGrid { display: flex; flex-wrap: wrap; gap: 6px; }
.multiChip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px; border-radius: 999px;
  background: var(--bg); border: 1px solid var(--border);
  font-size: 12px; color: var(--ink-soft); cursor: pointer;
}
.multiChip input { display: none; }
.multiOn { background: var(--accent); color: #fff; border-color: var(--accent); }

/* info / formats lists */
.infoList { display: flex; flex-direction: column; gap: 8px; }
.infoRow { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.infoRow:last-child { border-bottom: none; }
.infoKey { font-size: 12px; color: var(--ink-mute); text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.infoVal { font-size: 13px; text-align: right; font-family: var(--font-mono); }
.formatList { display: flex; flex-direction: column; gap: 6px; }
.formatRow {
  display: flex; align-items: center; gap: 12px;
  padding: 10px; border-radius: 10px;
  background: var(--bg); border: 1px solid var(--border);
}
.formatId {
  min-width: 44px; text-align: center;
  font-family: var(--font-mono); font-size: 12px; font-weight: 700;
  padding: 4px 8px; background: var(--accent-soft); color: var(--accent);
  border-radius: 6px;
}
.formatBody { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.formatLabel { font-size: 13px; font-weight: 600; }
.formatMeta { font-size: 11.5px; color: var(--ink-mute); font-family: var(--font-mono); }

/* bottom nav */
.bottomNav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-around; align-items: center;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
  background: var(--surface); border-top: 1px solid var(--border); z-index: 30;
}
.navBtn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 12px; background: transparent; border: none; cursor: pointer;
  color: var(--ink-mute);
}
.navActive { color: var(--accent); }
.navIcon { position: relative; display: flex; }
.navBadge {
  position: absolute; top: -4px; right: -8px;
  min-width: 16px; height: 16px; padding: 0 4px;
  background: var(--accent); color: #fff;
  border-radius: 8px; font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono);
}
.navLabel { font-size: 10.5px; font-weight: 500; }

@media (min-width: 720px) {
  .app { max-width: 720px; margin: 0 auto; border-left: 1px solid var(--border); border-right: 1px solid var(--border); }
}
`;

if (typeof document !== "undefined" && !document.getElementById("ytdlp-studio-styles")) {
  const el = document.createElement("style");
  el.id = "ytdlp-studio-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}
