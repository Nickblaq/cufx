// app/ffmpeg/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/* ============================== TOKENS ============================== */
const TOKENS = `
:root {
  --bg: #f7f6f2;
  --surface: #ffffff;
  --surface-2: #fbfaf7;
  --border: #e7e5de;
  --border-strong: #d6d3c9;
  --ink: #14171a;
  --ink-soft: #5b6065;
  --ink-mute: #8a8f95;
  --accent: #4f46e5;
  --accent-soft: #eef2ff;
  --render: #2e9c7a;
  --render-soft: #e8f8f1;
  --warn: #d97706;
  --warn-soft: #fef4e6;
  --danger: #dc2626;
  --danger-soft: #fdeaea;
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  --radius: 14px;
  --radius-lg: 20px;
}
`;

/* ============================== ICONS ============================== */
type IconProps = { size?: number };
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const I = {
  Back: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M15 5 8 12l7 7" /></svg>
  ),
  Close: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  Chevron: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m6 9 6 6 6-6" /></svg>
  ),
  ChevronRight: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m9 6 6 6-6 6" /></svg>
  ),
  Play: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.3v13.4a1 1 0 0 0 1.53.85l10.7-6.7a1 1 0 0 0 0-1.7L9.53 4.45A1 1 0 0 0 8 5.3Z" /></svg>
  ),
  Pause: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
  ),
  Check: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m5 12 5 5L20 7" /></svg>
  ),
  Plus: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 5v14M5 12h14" /></svg>
  ),
  Minus: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M5 12h14" /></svg>
  ),
  Bolt: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" /></svg>
  ),
  Search: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  Home: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" /></svg>
  ),
  Grid: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
  ),
  Flow: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="12" r="2.5" /><circle cx="6" cy="18" r="2.5" /><path d="M8.5 6h4a3 3 0 0 1 3 3v.5M8.5 18h4a3 3 0 0 0 3-3v-.5" /></svg>
  ),
  Clock: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>
  ),
  Settings: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>
  ),
  Drag: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="9" cy="6" r="1.4" fill="currentColor" /><circle cx="15" cy="6" r="1.4" fill="currentColor" /><circle cx="9" cy="12" r="1.4" fill="currentColor" /><circle cx="15" cy="12" r="1.4" fill="currentColor" /><circle cx="9" cy="18" r="1.4" fill="currentColor" /><circle cx="15" cy="18" r="1.4" fill="currentColor" /></svg>
  ),
  Up: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m6 15 6-6 6 6" /></svg>
  ),
  Down: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m6 9 6 6 6-6" /></svg>
  ),
  Trash: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" /></svg>
  ),
  Edit: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 20h4l10-10-4-4L4 16Z" /><path d="m13 7 4 4" /></svg>
  ),
  Download: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14" /></svg>
  ),
  Share: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></svg>
  ),
  Video: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></svg>
  ),
  Audio: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></svg>
  ),
  Image: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
  ),
  File: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5" /></svg>
  ),
  Upload: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 19V8m0 0-4 4m4-4 4 4M5 5h14" /></svg>
  ),
  Sparkle: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
  ),
  Warn: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></svg>
  ),
  Info: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
  ),
  Terminal: ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m5 8 4 4-4 4M13 16h6" /></svg>
  ),
  Convert: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 8h13l-3-3M20 16H7l3 3" /></svg>
  ),
  Trim: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M6 3v14a2 2 0 0 0 2 2h14M18 3v14a2 2 0 0 1-2 2H2" /></svg>
  ),
  Scale: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 4h7M4 4v7M20 20h-7M20 20v-7" /><rect x="9" y="9" width="6" height="6" rx="1" /></svg>
  ),
  Volume: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M17 8a5 5 0 0 1 0 8" /></svg>
  ),
  Chroma: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Preset: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M12 3l2.4 5.4 5.6.6-4.2 4 1.2 5.6L12 15.8 7 18.6l1.2-5.6-4.2-4 5.6-.6Z" /></svg>
  ),
  History: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 12a8 8 0 1 0 3-6.3" /><path d="M4 5v4h4" /><path d="M12 8v4l3 2" /></svg>
  ),
  Folder: ({ size = 20 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M3 7a1 1 0 0 1 1-1h4l2 2h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" /></svg>
  ),
  More: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></svg>
  ),
};

/* ============================== TYPES ============================== */
type ParamType =
  | "string" | "number" | "integer" | "boolean" | "enum" | "multiselect"
  | "time" | "duration" | "color" | "size" | "bitrate" | "expression" | "codec";

type Option = { value: string; label: string };
type Condition = { param: string; operator: "eq" | "neq" | "truthy" | "falsy" | "gt" | "lt"; value?: unknown };

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

type Source = {
  id: string;
  name: string;
  kind: "video" | "audio" | "image";
  duration: string;
  size: string;
  meta: string;
};

type Job = {
  id: string;
  name: string;
  status: "completed" | "running" | "failed";
  when: string;
  duration: string;
  size: string;
  steps: string[];
  progress?: number;
};

type View = "home" | "catalog" | "pipeline" | "run" | "result" | "history";
type Sheet = null | "configure" | "source";

/* ============================== DATA ============================== */
const TIER_LABELS: Record<number, string> = {
  1: "Basic Operations",
  2: "Intermediate Operations",
  3: "Advanced Video Operations",
  4: "Advanced Audio Operations",
  5: "Complex Chained Operations",
  6: "Specialized / Expert",
};

const TIER_GROUPS = [
  { id: "all", label: "All" },
  { id: "basic", label: "Basic" },
  { id: "intermediate", label: "Inter." },
  { id: "video", label: "Video" },
  { id: "audio", label: "Audio" },
  { id: "chains", label: "Chains" },
  { id: "expert", label: "Expert" },
] as const;

const OPERATIONS: Operation[] = [
  /* ---- Tier 1: Basic ---- */
  {
    id: "convert", name: "Format Conversion", description: "Convert any media file from one container/codec format to another.",
    tier: 1, category: "container", icon: I.Convert, favorite: true,
    params: [
      { key: "format", type: "enum", label: "Container Format", group: "Container", default: "mp4",
        options: [{ value: "mp4", label: "MP4" }, { value: "mkv", label: "Matroska (MKV)" }, { value: "webm", label: "WebM" }, { value: "mov", label: "QuickTime (MOV)" }, { value: "avi", label: "AVI" }] },
      { key: "videoCodec", type: "codec", label: "Video Codec", group: "Video", default: "libx264" },
      { key: "audioCodec", type: "codec", label: "Audio Codec", group: "Audio", default: "aac" },
    ],
  },
  {
    id: "trim", name: "Precise Trimming", description: "Cut a specific time range from any media file with frame accuracy.",
    tier: 1, category: "video", icon: I.Trim, favorite: true,
    params: [
      { key: "start", type: "time", label: "Start Time", group: "Range", default: "00:00:00", helpText: "Timecode (HH:MM:SS.ms) or seconds." },
      { key: "end", type: "time", label: "End Time", group: "Range", default: "" },
      { key: "duration", type: "duration", label: "Duration", group: "Range", default: "", helpText: "Alternative to End Time.", showIf: { param: "end", operator: "falsy" } },
      { key: "mode", type: "enum", label: "Trim Mode", group: "Mode", default: "reencode",
        options: [{ value: "reencode", label: "Re-encode (frame accurate)" }, { value: "copy", label: "Stream copy (fast)" }] },
    ],
  },
  {
    id: "extract-audio", name: "Extract Audio", description: "Pull the audio track out of a video into a standalone file.",
    tier: 1, category: "audio", icon: I.Audio,
    params: [
      { key: "format", type: "enum", label: "Audio Format", default: "mp3",
        options: [{ value: "mp3", label: "MP3" }, { value: "wav", label: "WAV" }, { value: "flac", label: "FLAC" }, { value: "aac", label: "AAC" }] },
      { key: "bitrate", type: "bitrate", label: "Bitrate", default: "192k" },
    ],
  },
  {
    id: "extract-video", name: "Extract Video", description: "Strip audio and keep only the video stream.",
    tier: 1, category: "video", icon: I.Video,
    params: [{ key: "codec", type: "codec", label: "Codec", default: "copy" }],
  },
  {
    id: "thumbnail", name: "Thumbnail Extraction", description: "Grab a preview image from any point in a video.",
    tier: 1, category: "video", icon: I.Image,
    params: [
      { key: "at", type: "time", label: "At Time", default: "00:00:05" },
      { key: "format", type: "enum", label: "Format", default: "jpg", options: [{ value: "jpg", label: "JPEG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WebP" }] },
    ],
  },
  {
    id: "concat", name: "Concatenate", description: "Join multiple media files end-to-end into one continuous output.",
    tier: 1, category: "container", icon: I.Flow,
    params: [{ key: "mode", type: "enum", label: "Mode", default: "copy", options: [{ value: "copy", label: "Stream copy (fast)" }, { value: "reencode", label: "Re-encode" }] }],
  },
  {
    id: "inspect", name: "Media Inspection", description: "Dump all stream, codec, and container metadata.",
    tier: 1, category: "analysis", icon: I.Info,
    params: [{ key: "format", type: "enum", label: "Output", default: "text", options: [{ value: "text", label: "Text" }, { value: "json", label: "JSON" }] }],
  },
  {
    id: "gif", name: "GIF Export", description: "Turn any video segment into a looping animated GIF.",
    tier: 1, category: "video", icon: I.Image,
    params: [
      { key: "start", type: "time", label: "Start", default: "00:00:00" },
      { key: "duration", type: "duration", label: "Duration", default: "3" },
      { key: "fps", type: "integer", label: "FPS", default: 12, min: 5, max: 30 },
      { key: "width", type: "integer", label: "Width (px)", default: 480, min: 120, max: 1280 },
    ],
  },

  /* ---- Tier 2: Intermediate ---- */
  {
    id: "scale", name: "Video Resize / Scale", description: "Change resolution using high-quality Lanczos, bicubic, or spline scalers.",
    tier: 2, category: "video", icon: I.Scale, favorite: true,
    params: [
      { key: "size", type: "size", label: "Output Size", group: "Dimensions", default: "1280x720", presets: ["640x360", "1280x720", "1920x1080", "3840x2160"], helpText: "Use -1 for auto." },
      { key: "scaler", type: "enum", label: "Scaling Algorithm", group: "Quality", default: "lanczos",
        options: [{ value: "fast_bilinear", label: "Fast Bilinear" }, { value: "bilinear", label: "Bilinear" }, { value: "bicubic", label: "Bicubic" }, { value: "lanczos", label: "Lanczos" }, { value: "spline", label: "Spline" }] },
      { key: "forceAspect", type: "boolean", label: "Preserve Aspect Ratio", group: "Dimensions", default: true },
    ],
  },
  {
    id: "fps", name: "Frame Rate Conversion", description: "Convert between 24, 25, 30, 50, 60 fps with proper frame handling.",
    tier: 2, category: "video", icon: I.Video,
    params: [
      { key: "fps", type: "enum", label: "Frame Rate", default: "30",
        options: [{ value: "24", label: "24 fps" }, { value: "25", label: "25 fps" }, { value: "30", label: "30 fps" }, { value: "50", label: "50 fps" }, { value: "60", label: "60 fps" }] },
    ],
  },
  {
    id: "volume", name: "Volume Adjustment", description: "Apply gain in dB, linear multipliers, or dynamic expressions.",
    tier: 2, category: "audio", icon: I.Volume, favorite: true,
    params: [
      { key: "gain", type: "number", label: "Gain", default: 0, min: -60, max: 60, step: 0.5, unit: "dB" },
      { key: "precision", type: "enum", label: "Precision", default: "float", advanced: true,
        options: [{ value: "fixed", label: "Fixed-point" }, { value: "float", label: "Float (32-bit)" }, { value: "double", label: "Double (64-bit)" }] },
      { key: "useExpression", type: "boolean", label: "Use Dynamic Expression", default: false },
      { key: "expression", type: "expression", label: "Volume Expression", default: "1.0", showIf: { param: "useExpression", operator: "truthy" }, helpText: "Variables: t (frame time), n (frame number)." },
    ],
  },
  {
    id: "crop", name: "Video Cropping", description: "Cut away unwanted borders or regions with precise coordinates.",
    tier: 2, category: "video", icon: I.Trim,
    params: [
      { key: "w", type: "integer", label: "Width", default: 1280, min: 1 },
      { key: "h", type: "integer", label: "Height", default: 720, min: 1 },
      { key: "x", type: "integer", label: "X Offset", default: 0 },
      { key: "y", type: "integer", label: "Y Offset", default: 0 },
    ],
  },
  {
    id: "rotate", name: "Rotation & Flip", description: "Rotate 90°/180°/270° or flip horizontally/vertically.",
    tier: 2, category: "video", icon: I.Scale,
    params: [
      { key: "dir", type: "enum", label: "Transform", default: "90cw",
        options: [{ value: "90cw", label: "90° clockwise" }, { value: "90ccw", label: "90° counter-clockwise" }, { value: "180", label: "180°" }, { value: "hflip", label: "Flip horizontal" }, { value: "vflip", label: "Flip vertical" }] },
    ],
  },
  {
    id: "overlay", name: "Image / Logo Overlay", description: "Composite a watermark, logo, or PNG over video with alpha support.",
    tier: 2, category: "video", icon: I.Image,
    params: [
      { key: "position", type: "enum", label: "Position", default: "br",
        options: [{ value: "tl", label: "Top-left" }, { value: "tr", label: "Top-right" }, { value: "bl", label: "Bottom-left" }, { value: "br", label: "Bottom-right" }, { value: "center", label: "Center" }] },
      { key: "margin", type: "integer", label: "Margin (px)", default: 16, min: 0, max: 100 },
      { key: "opacity", type: "number", label: "Opacity", default: 1, min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: "subtitle", name: "Hardcoded Subtitles", description: "Burn subtitle files permanently into video frames via libass.",
    tier: 2, category: "subtitle", icon: I.File,
    params: [
      { key: "fontSize", type: "integer", label: "Font Size", default: 24, min: 8, max: 120 },
      { key: "color", type: "color", label: "Font Color", default: "#FFFFFF" },
      { key: "outline", type: "integer", label: "Outline", default: 2, min: 0, max: 8 },
    ],
  },
  {
    id: "metadata", name: "Metadata Editing", description: "Modify title, artist, language, and custom tags on any stream.",
    tier: 2, category: "metadata", icon: I.File,
    params: [
      { key: "title", type: "string", label: "Title", default: "" },
      { key: "artist", type: "string", label: "Artist", default: "" },
      { key: "language", type: "string", label: "Language (ISO 639-2)", default: "eng" },
      { key: "comment", type: "string", label: "Comment", default: "" },
    ],
  },
  {
    id: "speed", name: "Speed Adjustment", description: "Apply fast or slow motion via presentation timestamp manipulation.",
    tier: 2, category: "video", icon: I.Bolt,
    params: [
      { key: "factor", type: "number", label: "Speed Factor", default: 1, min: 0.25, max: 4, step: 0.25, unit: "×" },
      { key: "keepPitch", type: "boolean", label: "Preserve Audio Pitch", default: true },
    ],
  },

  /* ---- Tier 3: Advanced Video ---- */
  {
    id: "denoise", name: "Video Denoising", description: "Reduce video noise using hqdn3d, nlmeans, bm3d, or fftdnoiz.",
    tier: 3, category: "video", icon: I.Sparkle,
    params: [
      { key: "strength", type: "enum", label: "Strength", default: "medium", options: [{ value: "light", label: "Light" }, { value: "medium", label: "Medium" }, { value: "strong", label: "Strong" }] },
      { key: "algo", type: "enum", label: "Algorithm", default: "hqdn3d", advanced: true, options: [{ value: "hqdn3d", label: "hqdn3d (fast)" }, { value: "nlmeans", label: "nlmeans (quality)" }, { value: "bm3d", label: "bm3d (best)" }] },
    ],
  },
  {
    id: "sharpen", name: "Sharpening", description: "Enhance edge detail using unsharp, cas, or convolution kernels.",
    tier: 3, category: "video", icon: I.Sparkle,
    params: [
      { key: "amount", type: "number", label: "Amount", default: 1, min: 0, max: 3, step: 0.1 },
      { key: "size", type: "integer", label: "Kernel Size", default: 5, min: 3, max: 23, step: 2 },
    ],
  },
  {
    id: "blur", name: "Blurring", description: "Apply Gaussian, box, or bilateral blur with per-plane control.",
    tier: 3, category: "video", icon: I.Sparkle,
    params: [
      { key: "radius", type: "integer", label: "Radius (px)", default: 5, min: 1, max: 50 },
      { key: "type", type: "enum", label: "Blur Type", default: "gblur", options: [{ value: "gblur", label: "Gaussian" }, { value: "boxblur", label: "Box" }, { value: "bilateral", label: "Bilateral (edge preserving)" }] },
    ],
  },
  {
    id: "chromakey", name: "Chroma Keying", description: "Remove green/blue screens using chromakey or colorkey filters.",
    tier: 3, category: "video", icon: I.Chroma,
    params: [
      { key: "color", type: "color", label: "Key Color", default: "#00FF00" },
      { key: "similarity", type: "number", label: "Similarity", default: 0.3, min: 0.01, max: 1, step: 0.01, helpText: "0.01 = exact, 1.0 = everything." },
      { key: "blend", type: "number", label: "Edge Blend", default: 0.1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "pip", name: "Picture-in-Picture", description: "Overlay a scaled secondary video onto the main stream.",
    tier: 3, category: "video", icon: I.Video,
    params: [
      { key: "corner", type: "enum", label: "Position", default: "br", options: [{ value: "tl", label: "Top-left" }, { value: "tr", label: "Top-right" }, { value: "bl", label: "Bottom-left" }, { value: "br", label: "Bottom-right" }] },
      { key: "scale", type: "number", label: "Scale", default: 0.25, min: 0.1, max: 0.5, step: 0.05 },
    ],
  },
  {
    id: "stabilize", name: "Video Stabilization", description: "Two-pass deshake via vidstabdetect and vidstabtransform.",
    tier: 3, category: "video", icon: I.Sparkle, chainSteps: ["vidstabdetect", "vidstabtransform"],
    params: [
      { key: "shakiness", type: "integer", label: "Shakiness", group: "Detection", default: 5, min: 1, max: 10, helpText: "1 = slight, 10 = strong." },
      { key: "accuracy", type: "integer", label: "Detection Accuracy", group: "Detection", default: 15, min: 1, max: 15, advanced: true },
      { key: "smoothing", type: "integer", label: "Smoothing Frames", group: "Transform", default: 10, min: 0, max: 100 },
      { key: "zoom", type: "number", label: "Zoom %", group: "Transform", default: 0, min: -50, max: 100, unit: "%" },
    ],
  },
  {
    id: "hdr2sdr", name: "HDR → SDR Tone Mapping", description: "Convert HDR10/HLG content to SDR using zscale and tonemap.",
    tier: 3, category: "video", icon: I.Sparkle,
    params: [
      { key: "algo", type: "enum", label: "Tone Mapping", default: "hable", options: [{ value: "clip", label: "Clip" }, { value: "hable", label: "Hable (recommended)" }, { value: "reinhard", label: "Reinhard" }, { value: "mobius", label: "Mobius" }] },
      { key: "peak", type: "integer", label: "Target Peak (nits)", default: 100, min: 80, max: 1000 },
    ],
  },
  {
    id: "colorgrade", name: "Color Correction", description: "Adjust brightness, contrast, saturation, and gamma per-channel.",
    tier: 3, category: "video", icon: I.Sparkle,
    params: [
      { key: "brightness", type: "number", label: "Brightness", default: 0, min: -1, max: 1, step: 0.05 },
      { key: "contrast", type: "number", label: "Contrast", default: 1, min: 0, max: 3, step: 0.05 },
      { key: "saturation", type: "number", label: "Saturation", default: 1, min: 0, max: 3, step: 0.05 },
      { key: "gamma", type: "number", label: "Gamma", default: 1, min: 0.1, max: 10, step: 0.1 },
    ],
  },
  {
    id: "crop-detect", name: "Auto Crop Detection", description: "Detect black borders with cropdetect and crop them automatically.",
    tier: 3, category: "video", icon: I.Trim,
    params: [
      { key: "limit", type: "integer", label: "Black Threshold", default: 24, min: 0, max: 255 },
      { key: "round", type: "integer", label: "Round To", default: 16, min: 2, max: 64 },
    ],
  },
  {
    id: "deinterlace", name: "Deinterlacing", description: "Convert interlaced footage to progressive using yadif, bwdif, or w3fdif.",
    tier: 3, category: "video", icon: I.Video,
    params: [
      { key: "algo", type: "enum", label: "Algorithm", default: "yadif", options: [{ value: "yadif", label: "Yadif" }, { value: "bwdif", label: "BWDIF" }, { value: "w3fdif", label: "W3FDIF" }] },
      { key: "mode", type: "enum", label: "Mode", default: "send_frame", options: [{ value: "send_frame", label: "Same framerate" }, { value: "send_field", label: "Double framerate" }] },
    ],
  },

  /* ---- Tier 4: Advanced Audio ---- */
  {
    id: "loudnorm", name: "Loudness Normalization", description: "Normalize to -23/-16/-14 LUFS with true-peak limiting (EBU R128).",
    tier: 4, category: "audio", icon: I.Volume, favorite: true,
    params: [
      { key: "target", type: "enum", label: "Target Loudness", default: "-16", options: [{ value: "-23", label: "-23 LUFS (broadcast)" }, { value: "-16", label: "-16 LUFS (podcast)" }, { value: "-14", label: "-14 LUFS (streaming)" }] },
      { key: "truePeak", type: "number", label: "Max True Peak", default: -2, min: -9, max: 0, unit: "dBTP" },
      { key: "lra", type: "number", label: "Loudness Range Target", default: 7, min: 1, max: 50, unit: "LU" },
    ],
  },
  {
    id: "compressor", name: "Dynamic Range Compression", description: "Apply acompressor with threshold, ratio, attack, and release.",
    tier: 4, category: "audio", icon: I.Volume,
    params: [
      { key: "threshold", type: "number", label: "Threshold", default: -20, min: -60, max: 0, unit: "dB" },
      { key: "ratio", type: "number", label: "Ratio", default: 2, min: 1, max: 20, step: 0.5 },
      { key: "attack", type: "integer", label: "Attack (ms)", default: 20, min: 1, max: 2000 },
      { key: "release", type: "integer", label: "Release (ms)", default: 250, min: 1, max: 9000 },
      { key: "makeup", type: "number", label: "Makeup Gain", default: 1, min: 1, max: 64, step: 0.5 },
    ],
  },
  {
    id: "noise-reduce", name: "Noise Reduction", description: "Reduce broadband noise with afftdn, anlmdn, or RNN-based denoising.",
    tier: 4, category: "audio", icon: I.Sparkle,
    params: [
      { key: "method", type: "enum", label: "Method", default: "spectral", options: [{ value: "spectral", label: "Spectral (afftdn)" }, { value: "nonlocal", label: "Non-local means (anlmdn)" }, { value: "rnn", label: "RNN (arnndn)" }] },
      { key: "strength", type: "number", label: "Reduction (dB)", default: 12, min: 0.01, max: 97 },
    ],
  },
  {
    id: "eq", name: "Parametric Equalizer", description: "Apply multi-band EQ via equalizer or anequalizer filters.",
    tier: 4, category: "audio", icon: I.Volume,
    params: [
      { key: "band", type: "enum", label: "Band", default: "mid", options: [{ value: "bass", label: "Bass" }, { value: "mid", label: "Mid" }, { value: "treble", label: "Treble" }] },
      { key: "gain", type: "number", label: "Gain", default: 0, min: -20, max: 20, unit: "dB" },
      { key: "freq", type: "integer", label: "Frequency", default: 1000, min: 20, max: 20000, unit: "Hz" },
      { key: "q", type: "number", label: "Q Factor", default: 1, min: 0.1, max: 10, step: 0.1 },
    ],
  },
  {
    id: "de-ess", name: "De-essing", description: "Reduce sibilance (harsh \"s\" sounds) with the deesser filter.",
    tier: 4, category: "audio", icon: I.Volume,
    params: [
      { key: "intensity", type: "number", label: "Intensity", default: 0.5, min: 0, max: 1, step: 0.05 },
      { key: "amount", type: "number", label: "Ducking Amount", default: 0.5, min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: "karaoke", name: "Karaoke Vocal Removal", description: "Cancel center-channel vocals using stereotools or pan.",
    tier: 4, category: "audio", icon: I.Volume,
    params: [
      { key: "strength", type: "number", label: "Strength", default: 1, min: 0.5, max: 1, step: 0.05 },
    ],
  },

  /* ---- Tier 5: Chains ---- */
  {
    id: "youtube-preset", name: "YouTube Upload Preset", description: "Scale to 1080p, H.264 CRF 18, AAC 192k, faststart MP4.",
    tier: 5, category: "chain", icon: I.Preset, favorite: true, chainSteps: ["scale", "convert"],
    params: [
      { key: "resolution", type: "enum", label: "Resolution", group: "Output", default: "1080p", options: [{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }, { value: "1440p", label: "1440p" }, { value: "4k", label: "4K" }] },
      { key: "crf", type: "integer", label: "Quality (CRF)", group: "Quality", default: 18, min: 0, max: 51, helpText: "Lower = better quality." },
      { key: "audioBitrate", type: "bitrate", label: "Audio Bitrate", group: "Quality", default: "192k" },
      { key: "faststart", type: "boolean", label: "Faststart (web optimized)", group: "Output", default: true },
    ],
  },
  {
    id: "tiktok-preset", name: "TikTok / Reels Vertical", description: "Crop to 9:16, scale to 1080×1920, normalize loudness, export MP4.",
    tier: 5, category: "chain", icon: I.Preset, chainSteps: ["crop", "scale", "loudnorm"],
    params: [
      { key: "fit", type: "enum", label: "Fit Mode", default: "crop", options: [{ value: "crop", label: "Crop center" }, { value: "pad", label: "Pad with blur" }] },
      { key: "targetLufs", type: "enum", label: "Loudness", default: "-14", options: [{ value: "-14", label: "-14 LUFS" }, { value: "-16", label: "-16 LUFS" }] },
    ],
  },
  {
    id: "dvd-rip", name: "DVD Ripping Pipeline", description: "Extract main title, deinterlace, crop, encode H.264, mux with subtitles.",
    tier: 5, category: "chain", icon: I.Preset, chainSteps: ["deinterlace", "crop-detect", "convert"],
    params: [
      { key: "quality", type: "integer", label: "Quality (CRF)", default: 20, min: 14, max: 28 },
      { key: "preserveSubs", type: "boolean", label: "Preserve Subtitles", default: true },
    ],
  },
  {
    id: "slideshow", name: "Photo Slideshow", description: "Build video from still images with transitions and background music.",
    tier: 5, category: "chain", icon: I.Image, chainSteps: ["concat", "convert"],
    params: [
      { key: "durationPer", type: "number", label: "Seconds Per Image", default: 3, min: 0.5, max: 30, step: 0.5 },
      { key: "transition", type: "enum", label: "Transition", default: "fade", options: [{ value: "fade", label: "Cross-fade" }, { value: "none", label: "None" }, { value: "slide", label: "Slide" }] },
    ],
  },
  {
    id: "vhs-cleanup", name: "VHS Digitization Cleanup", description: "Denoise, deinterlace, stabilize, color-correct, deblock, encode.",
    tier: 5, category: "chain", icon: I.Preset, chainSteps: ["deinterlace", "denoise", "stabilize", "colorgrade", "convert"],
    params: [
      { key: "aggressiveness", type: "enum", label: "Cleanup Strength", default: "medium", options: [{ value: "light", label: "Light" }, { value: "medium", label: "Medium" }, { value: "aggressive", label: "Aggressive" }] },
    ],
  },

  /* ---- Tier 6: Expert ---- */
  {
    id: "scene-detect", name: "Scene Change Detection", description: "Detect cuts and chapter boundaries with scdet.",
    tier: 6, category: "analysis", icon: I.Search,
    params: [{ key: "threshold", type: "number", label: "Threshold", default: 10, min: 0, max: 100 }],
  },
  {
    id: "psnr", name: "Quality Metrics (PSNR/SSIM)", description: "Compute objective quality scores against a reference.",
    tier: 6, category: "analysis", icon: I.Info,
    params: [{ key: "metric", type: "enum", label: "Metric", default: "psnr", options: [{ value: "psnr", label: "PSNR" }, { value: "ssim", label: "SSIM" }, { value: "vmaf", label: "VMAF" }] }],
  },
  {
    id: "command-preview", name: "FFmpeg Command Preview", description: "Inspect the exact ffmpeg command that will be executed.",
    tier: 6, category: "analysis", icon: I.Terminal,
    params: [{ key: "pretty", type: "boolean", label: "Pretty Print", default: true }],
  },
  {
    id: "bitstream", name: "Bitstream Filtering", description: "Apply h264_mp4toannexb, hevc_mp4toannexb, dovi_rpu, and more.",
    tier: 6, category: "container", icon: I.Terminal,
    params: [
      { key: "filter", type: "enum", label: "Bitstream Filter", default: "h264_mp4toannexb", options: [{ value: "h264_mp4toannexb", label: "h264_mp4toannexb" }, { value: "hevc_mp4toannexb", label: "hevc_mp4toannexb" }, { value: "dovi_rpu", label: "dovi_rpu" }, { value: "extract_extradata", label: "extract_extradata" }] },
    ],
  },
];

const SAMPLE_SOURCES: Source[] = [
  { id: "s1", name: "vacation_2024.mp4", kind: "video", duration: "12:34", size: "1.2 GB", meta: "1920×1080 · 29.97 fps · H.264" },
  { id: "s2", name: "podcast_ep42.wav", kind: "audio", duration: "48:12", size: "512 MB", meta: "48 kHz · stereo · PCM" },
  { id: "s3", name: "screen_recording.mov", kind: "video", duration: "04:21", size: "340 MB", meta: "2560×1440 · 60 fps · ProRes" },
  { id: "s4", name: "cover_art.png", kind: "image", duration: "—", size: "2.1 MB", meta: "2048×2048 · RGBA" },
];

const SAMPLE_JOBS: Job[] = [
  { id: "j1", name: "YouTube Upload", status: "completed", when: "2 min ago", duration: "42s", size: "184 MB", steps: ["Scale 1080p", "H.264 CRF 18", "AAC 192k"] },
  { id: "j2", name: "Trim + Normalize", status: "running", when: "Running", duration: "—", size: "—", steps: ["Trim 00:30–02:00", "Loudness -16 LUFS"], progress: 62 },
  { id: "j3", name: "Stabilize Clip", status: "failed", when: "1 hour ago", duration: "12s", size: "—", steps: ["vidstabdetect", "vidstabtransform"] },
  { id: "j4", name: "Extract Audio", status: "completed", when: "Yesterday", duration: "8s", size: "12 MB", steps: ["Extract MP3 192k"] },
];

/* ============================== HELPERS ============================== */
function evaluateCondition(cond: Condition | undefined, values: FormValues): boolean {
  if (!cond) return true;
  const v = values[cond.param];
  switch (cond.operator) {
    case "eq": return v === cond.value;
    case "neq": return v !== cond.value;
    case "gt": return typeof v === "number" && v > (cond.value as number);
    case "lt": return typeof v === "number" && v < (cond.value as number);
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
      case "color": out[p.key] = "#000000"; break;
      default: out[p.key] = ""; break;
    }
  }
  return out;
}

function buildPreviewCommand(op: Operation, values: FormValues, source?: Source | null): string {
  const args: string[] = [];
  if (source) args.push(`-i "${source.name}"`);
  const flag: Record<string, string> = {
    format: "-f", videoCodec: "-c:v", audioCodec: "-c:a",
    gain: "-af volume=", size: "-vf scale=", scaler: "",
  };
  for (const p of op.params) {
    const v = values[p.key];
    if (v === "" || v === undefined || v === null) continue;
    const f = flag[p.key];
    if (p.key === "gain") args.push(`-af "volume=${v}dB"`);
    else if (p.key === "size") args.push(`-vf "scale=${v}"`);
    else if (f && f !== "" && f !== "-c:v" && f !== "-c:a") args.push(`${f}${v}`);
    else if (p.key === "videoCodec") args.push(`-c:v ${v}`);
    else if (p.key === "audioCodec") args.push(`-c:a ${v}`);
  }
  const outName = source ? source.name.replace(/\.[^.]+$/, "_out.mp4") : "output.mp4";
  args.push(`"${outName}"`);
  return `ffmpeg ${args.join(" ")}`;
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ============================== ROOT APP ============================== */
export default function OperationStudio() {
  const [view, setView] = useState<View>("home");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [source, setSource] = useState<Source | null>(SAMPLE_SOURCES[0]);
  const [pipeline, setPipeline] = useState<{ id: string; op: Operation; values: FormValues }[]>([]);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<(typeof TIER_GROUPS)[number]["id"]>("all");
  const [jobs, setJobs] = useState<Job[]>(SAMPLE_JOBS);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);

  const tierRange = (id: string): [number, number] => {
    switch (id) {
      case "basic": return [1, 1];
      case "intermediate": return [2, 2];
      case "video": return [3, 3];
      case "audio": return [4, 4];
      case "chains": return [5, 5];
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
    setValues(defaultValues(op));
    setSheet("configure");
  }

  function addToPipeline() {
    if (!selectedOp) return;
    setPipeline((p) => [...p, { id: Math.random().toString(36).slice(2), op: selectedOp, values }]);
    setSheet(null);
    setSelectedOp(null);
  }

  function removeFromPipeline(id: string) {
    setPipeline((p) => p.filter((step) => step.id !== id));
  }

  function moveStep(index: number, dir: -1 | 1) {
    setPipeline((p) => {
      const next = [...p];
      const target = index + dir;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function startRun() {
    if (!pipeline.length) return;
    setView("run");
    setProgress(0);
    setRunning(true);
  }

  useEffect(() => {
    if (view !== "run" || !running) return;
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(t); setRunning(false); return 100; }
        return Math.min(p + Math.random() * 8 + 2, 100);
      });
    }, 220);
    return () => clearInterval(t);
  }, [view, running]);

  useEffect(() => {
    if (progress >= 100 && running === false && view === "run") {
      const timer = setTimeout(() => setView("result"), 700);
      return () => clearTimeout(timer);
    }
  }, [progress, running, view]);

  return (
    <div className="app">
      <style>{TOKENS}</style>

      {/* ---------- top bar ---------- */}
      <header className="topbar">
        <button className="iconbtn" aria-label="Back" onClick={() => (view === "home" ? null : setView("home"))}>
          {view === "home" ? <I.Sparkle /> : <I.Back />}
        </button>
        <div className="title">
          <span className="titleMain">{topTitle(view)}</span>
          <span className="titleSub">{topSubtitle({ view, pipeline, source })}</span>
        </div>
        <button className="ghostbtn" onClick={() => setView("history")} aria-label="History"><I.History /></button>
      </header>

      {/* ---------- main view ---------- */}
      <main className="main">
        {view === "home" && (
          <HomeView
            jobs={jobs}
            source={source}
            onPickSource={() => setSheet("source")}
            onBrowse={() => setView("catalog")}
            onOpenOp={openConfigure}
            onOpenJob={() => setView("result")}
            onOpenPipeline={() => setView("pipeline")}
          />
        )}
        {view === "catalog" && (
          <CatalogView
            ops={groupedByTier}
            search={search}
            setSearch={setSearch}
            tierFilter={tierFilter}
            setTierFilter={setTierFilter}
            onOpenOp={openConfigure}
          />
        )}
        {view === "pipeline" && (
          <PipelineView
            source={source}
            pipeline={pipeline}
            onPickSource={() => setSheet("source")}
            onAdd={() => setView("catalog")}
            onRemove={removeFromPipeline}
            onMove={moveStep}
            onRun={startRun}
            onEdit={(step) => { setSelectedOp(step.op); setValues(step.values); setSheet("configure"); }}
          />
        )}
        {view === "run" && (
          <RunView source={source} pipeline={pipeline} progress={progress} running={running} />
        )}
        {view === "result" && (
          <ResultView
            source={source}
            pipeline={pipeline}
            onAgain={() => { setView("run"); setProgress(0); setRunning(true); }}
            onHome={() => setView("home")}
            onSave={() => {
              setJobs((j) => [{ id: Math.random().toString(36).slice(2), name: "New Render", status: "completed", when: "just now", duration: "38s", size: "142 MB", steps: pipeline.map((s) => s.op.name) }, ...j]);
              setPipeline([]);
              setView("home");
            }}
          />
        )}
        {view === "history" && (
          <HistoryView jobs={jobs} onOpen={() => setView("result")} />
        )}
      </main>

      {/* ---------- bottom nav ---------- */}
      <nav className="bottomNav">
        <NavBtn active={view === "home"} label="Home" onClick={() => setView("home")} icon={<I.Home />} />
        <NavBtn active={view === "catalog"} label="Ops" onClick={() => setView("catalog")} icon={<I.Grid />} />
        <NavBtn active={view === "pipeline"} label="Pipeline" badge={pipeline.length} onClick={() => setView("pipeline")} icon={<I.Flow />} />
        <NavBtn active={view === "history"} label="History" onClick={() => setView("history")} icon={<I.Clock />} />
      </nav>

      {/* ---------- sheets ---------- */}
      {sheet === "configure" && selectedOp && (
        <ConfigureSheet
          op={selectedOp}
          values={values}
          setValue={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
          source={source}
          onClose={() => { setSheet(null); setSelectedOp(null); }}
          onAdd={addToPipeline}
        />
      )}
      {sheet === "source" && (
        <SourceSheet
          current={source}
          onPick={(s) => { setSource(s); setSheet(null); }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

/* ============================== TITLE HELPERS ============================== */
function topTitle(view: View) {
  return { home: "Operation Studio", catalog: "Operations", pipeline: "Pipeline", run: "Running", result: "Output", history: "History" }[view];
}
function topSubtitle({ view, pipeline, source }: { view: View; pipeline: { op: Operation }[]; source: Source | null }) {
  if (view === "home") return source ? `source: ${source.name}` : "ffmpeg · no source";
  if (view === "catalog") return `${pipeline.length} step${pipeline.length === 1 ? "" : "s"} in pipeline`;
  if (view === "pipeline") return pipeline.length ? `${pipeline.length} operation${pipeline.length === 1 ? "" : "s"}` : "empty pipeline";
  if (view === "run") return "processing…";
  if (view === "result") return "complete";
  return "past runs";
}

/* ============================== HOME VIEW ============================== */
function HomeView({
  jobs, source, onPickSource, onBrowse, onOpenOp, onOpenJob, onOpenPipeline,
}: {
  jobs: Job[];
  source: Source | null;
  onPickSource: () => void;
  onBrowse: () => void;
  onOpenOp: (op: Operation) => void;
  onOpenJob: () => void;
  onOpenPipeline: () => void;
}) {
  const favorites = OPERATIONS.filter((o) => o.favorite);
  const recent = jobs.slice(0, 3);

  return (
    <div className="pad">
      {/* source card */}
      <section className="card sourceCard" onClick={onPickSource}>
        <div className="sourceCardTop">
          <div className="sourceIcon">
            {source?.kind === "audio" ? <I.Audio /> : source?.kind === "image" ? <I.Image /> : <I.Video />}
          </div>
          <div className="sourceMeta">
            <span className="sourceLabel">Input Source</span>
            <span className="sourceName">{source?.name ?? "No source selected"}</span>
            <span className="sourceInfo">
              {source ? `${source.duration} · ${source.size} · ${source.meta}` : "Tap to add media"}
            </span>
          </div>
          <I.ChevronRight />
        </div>
        {!source && (
          <button className="sourceBtn">
            <I.Upload /> <span>Upload Media</span>
          </button>
        )}
      </section>

      {/* quick actions */}
      <section>
        <div className="rowHead">
          <h3 className="sectionTitle">Quick Actions</h3>
        </div>
        <div className="quickGrid">
          <button className="quickCard" onClick={() => onOpenOp(OPERATIONS[0])}>
            <I.Convert /> <span>Convert</span>
          </button>
          <button className="quickCard" onClick={() => onOpenOp(OPERATIONS.find((o) => o.id === "youtube-preset")!)}>
            <I.Preset /> <span>YouTube</span>
          </button>
          <button className="quickCard" onClick={() => onOpenOp(OPERATIONS.find((o) => o.id === "trim")!)}>
            <I.Trim /> <span>Trim</span>
          </button>
          <button className="quickCard" onClick={() => onOpenOp(OPERATIONS.find((o) => o.id === "loudnorm")!)}>
            <I.Volume /> <span>Normalize</span>
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
                <span className="favIcon"><Icon size={18} /></span>
                <span className="favName">{op.name}</span>
                <span className="favTier">Tier {op.tier}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* pipeline preview */}
      <section>
        <div className="rowHead">
          <h3 className="sectionTitle">Pipeline</h3>
          <button className="rowAction" onClick={onOpenPipeline}>Open</button>
        </div>
        <button className="card pipelinePreview" onClick={onOpenPipeline}>
          <I.Flow />
          <div className="pipelinePreviewText">
            <span className="pipelinePreviewTitle">Build a pipeline</span>
            <span className="pipelinePreviewSub">Chain multiple operations into one click</span>
          </div>
          <I.ChevronRight />
        </button>
      </section>

      {/* recent jobs */}
      <section>
        <div className="rowHead">
          <h3 className="sectionTitle">Recent</h3>
        </div>
        <div className="jobList">
          {recent.map((job) => (
            <button key={job.id} className="card jobCard" onClick={onOpenJob}>
              <div className={`jobStatus jobStatus-${job.status}`}>
                {job.status === "completed" ? <I.Check /> : job.status === "running" ? <I.Bolt /> : <I.Warn />}
              </div>
              <div className="jobBody">
                <span className="jobName">{job.name}</span>
                <span className="jobSub">{job.when} · {job.duration} · {job.size}</span>
              </div>
              <I.ChevronRight />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ============================== CATALOG VIEW ============================== */
function CatalogView({
  ops, search, setSearch, tierFilter, setTierFilter, onOpenOp,
}: {
  ops: [number, Operation[]][];
  search: string;
  setSearch: (s: string) => void;
  tierFilter: string;
  setTierFilter: (t: (typeof TIER_GROUPS)[number]["id"]) => void;
  onOpenOp: (op: Operation) => void;
}) {
  return (
    <div className="pad">
      <div className="searchWrap">
        <I.Search />
        <input
          className="searchInput"
          placeholder="Search operations…"
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

/* ============================== PIPELINE VIEW ============================== */
function PipelineView({
  source, pipeline, onPickSource, onAdd, onRemove, onMove, onRun, onEdit,
}: {
  source: Source | null;
  pipeline: { id: string; op: Operation; values: FormValues }[];
  onPickSource: () => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  onRun: () => void;
  onEdit: (step: { id: string; op: Operation; values: FormValues }) => void;
}) {
  return (
    <div className="pad">
      <section className="flowWrap">
        {/* source node */}
        <button className="flowNode flowNodeSource" onClick={onPickSource}>
          <div className="flowNodeIcon"><I.Folder /></div>
          <div className="flowNodeBody">
            <span className="flowNodeLabel">Source</span>
            <span className="flowNodeValue">{source?.name ?? "No source"}</span>
          </div>
          <I.ChevronRight />
        </button>

        {pipeline.length === 0 && (
          <div className="flowEmpty">
            <I.Flow size={28} />
            <p>No operations yet</p>
            <span>Add one to start building your pipeline.</span>
          </div>
        )}

        {pipeline.map((step, i) => {
          const Icon = step.op.icon;
          return (
            <div key={step.id} className="flowRow">
              <div className="flowLine" />
              <div className="flowNode flowNodeOp">
                <div className="flowReorder">
                  <button onClick={() => onMove(i, -1)} disabled={i === 0} aria-label="Move up"><I.Up size={14} /></button>
                  <button onClick={() => onMove(i, 1)} disabled={i === pipeline.length - 1} aria-label="Move down"><I.Down size={14} /></button>
                </div>
                <div className="flowNodeIcon flowNodeIconOp"><Icon size={18} /></div>
                <div className="flowNodeBody" onClick={() => onEdit(step)}>
                  <span className="flowNodeLabel">Step {i + 1}</span>
                  <span className="flowNodeValue">{step.op.name}</span>
                </div>
                <button className="flowDelete" onClick={() => onRemove(step.id)} aria-label="Remove"><I.Trash size={14} /></button>
              </div>
            </div>
          );
        })}

        {/* add node */}
        <div className="flowRow">
          <div className="flowLine" />
          <button className="flowAdd" onClick={onAdd}>
            <I.Plus /> Add Operation
          </button>
        </div>

        {/* output node */}
        {pipeline.length > 0 && (
          <>
            <div className="flowLine" />
            <div className="flowNode flowNodeOut">
              <div className="flowNodeIcon flowNodeIconOut"><I.Download /></div>
              <div className="flowNodeBody">
                <span className="flowNodeLabel">Output</span>
                <span className="flowNodeValue">{source?.name.replace(/\.[^.]+$/, "_out.mp4") ?? "output.mp4"}</span>
              </div>
            </div>
          </>
        )}
      </section>

      {/* stats */}
      {pipeline.length > 0 && (
        <section className="card statsCard">
          <Stat label="Steps" value={String(pipeline.length)} />
          <Stat label="Est. Time" value={formatDuration(pipeline.length * 12)} />
          <Stat label="Est. Size" value={`${(pipeline.length * 42).toFixed(0)} MB`} />
        </section>
      )}

      {/* run button */}
      <button className="primaryBtn" onClick={onRun} disabled={!pipeline.length || !source}>
        <I.Play size={16} /> Run Pipeline
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

/* ============================== RUN VIEW ============================== */
function RunView({
  source, pipeline, progress, running,
}: {
  source: Source | null;
  pipeline: { id: string; op: Operation; values: FormValues }[];
  progress: number;
  running: boolean;
}) {
  const activeIndex = Math.min(Math.floor((progress / 100) * pipeline.length), pipeline.length - 1);
  const logs = useRef<string[]>([]);

  useEffect(() => {
    const line = `[${new Date().toISOString().slice(11, 19)}] frame=${Math.floor(progress * 25)} fps=${(25 + Math.random() * 5).toFixed(1)} speed=${(1 + Math.random() * 0.4).toFixed(2)}x`;
    logs.current.push(line);
    if (logs.current.length > 60) logs.current.shift();
  }, [progress]);

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
            <span className="runState">{running ? "Processing" : "Finishing"}</span>
          </div>
        </div>
        <div className="runMeta">
          <span className="runSource">{source?.name}</span>
          <span className="runStep">Step {activeIndex + 1} of {pipeline.length} · {pipeline[activeIndex]?.op.name}</span>
        </div>
      </section>

      <section className="card logCard">
        <div className="logHead">
          <I.Terminal /> <span>Live Output</span>
        </div>
        <pre className="logBody">
{logs.current.slice(-8).join("\n") || "Waiting for ffmpeg output…"}
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

/* ============================== RESULT VIEW ============================== */
function ResultView({
  info, job, onAgain, onHome,
}: {
  info: MediaInfo | null;
  job: JobProgress | null;
  onAgain: () => void;
  onHome: () => void;
}) {
  const ok = job?.status === "completed";
  const outputs = job?.outputs ?? [];
  const primary = outputs[0];

  async function downloadAndSave(url: string, fallbackName: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Download failed (${res.status})`);
      const blob = await res.blob();
      // Try to read filename from Content-Disposition, fall back to the
      // output's own name.
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="?([^"]+)"?/);
      const name = m?.[1] ?? fallbackName;
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error("[download]", err);
    }
  }

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
            <span className="videoInfo">{formatBytes(primary.sizeBytes)}</span>
          </div>
        </section>
      )}

      {primary && (
        <button
          className="primaryBtn"
          onClick={() => downloadAndSave(primary.url, primary.name)}
        >
          <Icons.Download size={18} /> Save to device
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
                  className="outputRow"
                  onClick={() => downloadAndSave(o.url, o.name)}
                  style={{ width: "100%", border: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}
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
        <button className="primaryBtn" onClick={onHome}>Back to Home</button>
        <button className="ghostBtnWide" onClick={onAgain}>Start Another</button>
      </div>
    </div>
  );
}

/* ============================== HISTORY VIEW ============================== */
function HistoryView({ jobs, onOpen }: { jobs: Job[]; onOpen: () => void }) {
  return (
    <div className="pad">
      <div className="jobList">
        {jobs.map((job) => (
          <button key={job.id} className="card jobCard" onClick={onOpen}>
            <div className={`jobStatus jobStatus-${job.status}`}>
              {job.status === "completed" ? <I.Check /> : job.status === "running" ? <I.Bolt /> : <I.Warn />}
            </div>
            <div className="jobBody">
              <span className="jobName">{job.name}</span>
              <span className="jobSub">{job.steps.join(" → ")}</span>
              <span className="jobMeta">{job.when} · {job.duration} · {job.size}</span>
            </div>
            <I.ChevronRight />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================== CONFIGURE SHEET ============================== */
function ConfigureSheet({
  op, values, setValue, source, onClose, onAdd,
}: {
  op: Operation;
  values: FormValues;
  setValue: (k: string, v: unknown) => void;
  source: Source | null;
  onClose: () => void;
  onAdd: () => void;
}) {
  const visibleParams = op.params.filter((p) => evaluateCondition(p.showIf, values));
  const groups = useMemo(() => {
    const map = new Map<string, Param[]>();
    for (const p of visibleParams) {
      const g = p.group ?? "General";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return [...map.entries()];
  }, [visibleParams]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCommand, setShowCommand] = useState(false);
  const cmd = buildPreviewCommand(op, values, source);

  return (
    <div className="sheetOverlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <div className="sheetHead">
          <div className="sheetHeadLeft">
            <span className="sheetTitle">{op.name}</span>
            <span className="sheetBadge">tier {op.tier} · {op.category}</span>
          </div>
          <button className="closebtn" onClick={onClose} aria-label="Close"><I.Close /></button>
        </div>

        <p className="sheetNote">{op.description}</p>

        {op.chainSteps && (
          <div className="chainNote">
            <I.Flow size={14} />
            <span>Chain: {op.chainSteps.join(" → ")}</span>
          </div>
        )}

        <div className="sheetBody">
          {groups.map(([group, params]) => (
            <fieldset key={group} className="fieldGroup">
              <legend className="groupLabel">{group}</legend>
              {params.map((p) => <Field key={p.key} param={p} value={values[p.key]} onChange={(v) => setValue(p.key, v)} />)}
            </fieldset>
          ))}
        </div>

        <button className="advancedToggle" onClick={() => setShowCommand((s) => !s)}>
          <I.Terminal size={14} /> {showCommand ? "Hide" : "Show"} FFmpeg command
        </button>
        {showCommand && <pre className="cmdPreview">{cmd}</pre>}

        <button className="primaryBtn" onClick={onAdd}><I.Plus /> Add to Pipeline</button>
      </div>
    </div>
  );
}

/* ============================== SOURCE SHEET ============================== */
function SourceSheet({
  current, onPick, onClose,
}: {
  current: Source | null;
  onPick: (s: Source) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheetOverlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetHandle" />
        <div className="sheetHead">
          <span className="sheetTitle">Select Source</span>
          <button className="closebtn" onClick={onClose} aria-label="Close"><I.Close /></button>
        </div>
        <p className="sheetNote">Pick a media file from your library or upload a new one.</p>

        <button className="uploadCard">
          <I.Upload size={26} />
          <span className="uploadTitle">Upload Media</span>
          <span className="uploadSub">Drop files here or tap to browse</span>
        </button>

        <div className="sourceList">
          {SAMPLE_SOURCES.map((s) => {
            const active = current?.id === s.id;
            const Icon = s.kind === "audio" ? I.Audio : s.kind === "image" ? I.Image : I.Video;
            return (
              <button key={s.id} className={`sourceRow ${active ? "sourceRowActive" : ""}`} onClick={() => onPick(s)}>
                <div className="sourceIconSm"><Icon size={18} /></div>
                <div className="sourceRowBody">
                  <span className="sourceRowName">{s.name}</span>
                  <span className="sourceRowMeta">{s.duration} · {s.size} · {s.meta}</span>
                </div>
                {active && <I.Check />}
              </button>
            );
          })}
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
          <input type="number" min={param.min} max={param.max} step={param.type === "integer" ? 1 : param.step ?? "any"} value={(value as number) ?? 0} onChange={(e) => onChange(Number(e.target.value))} />
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
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );
    case "time":
    case "duration":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <input type="text" placeholder={param.type === "time" ? "00:00:00.000" : "seconds"} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );
    case "color":
      return (
        <label className="field">
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
            <span className="fieldValue">{String(value ?? "#000000")}</span>
          </div>
          <input type="color" value={typeof value === "string" ? value.slice(0, 7) : "#000000"} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "size":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <input type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          {param.presets && (
            <div className="chipRow">
              {param.presets.map((p) => (
                <button key={p} type="button" className={`preset ${value === p ? "presetActive" : ""}`} onClick={() => onChange(p)}>{p}</button>
              ))}
            </div>
          )}
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );
    case "bitrate":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <input type="text" placeholder="192k" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "expression":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <textarea rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );
    case "codec":
      return (
        <label className="field">
          <div className="fieldHead"><span className="fieldLabel">{param.label}</span></div>
          <input type="text" placeholder="libx264" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
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
function Styles() { return null; }

/* ============================== STYLE BLOCK ============================== */
const STYLES = `
.app {
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-sans);
  display: flex;
  flex-direction: column;
  padding-bottom: 76px;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px 8px;
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 5;
}
.iconbtn {
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink);
  flex-shrink: 0;
  cursor: pointer;
}
.ghostbtn {
  border: none; background: transparent; color: var(--ink-soft);
  padding: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.title { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.titleMain { font-size: 15px; font-weight: 600; line-height: 1.2; }
.titleSub { font-size: 12px; color: var(--ink-soft); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.main { flex: 1; overflow-y: auto; }
.pad { padding: 6px 16px 24px; display: flex; flex-direction: column; gap: 18px; }

/* --- generic card --- */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px;
}
.rowHead { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px 8px; }
.sectionTitle { font-size: 13px; font-weight: 600; color: var(--ink); margin: 0; letter-spacing: 0.01em; }
.rowAction { background: transparent; border: none; color: var(--accent); font-size: 12.5px; font-weight: 500; cursor: pointer; }

/* --- source card --- */
.sourceCard {
  display: flex; flex-direction: column; gap: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 14px;
  cursor: pointer;
  text-align: left;
}
.sourceCardTop { display: flex; align-items: center; gap: 12px; }
.sourceIcon {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.sourceMeta { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sourceLabel { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-mute); font-weight: 600; }
.sourceName { font-size: 14px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sourceInfo { font-size: 12px; color: var(--ink-soft); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sourceBtn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--ink); color: #fff; border: none;
  padding: 10px 16px; border-radius: 999px;
  font-size: 13.5px; font-weight: 600; cursor: pointer;
}

/* --- quick actions --- */
.quickGrid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.quickCard {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 14px 6px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); cursor: pointer;
  font-size: 11.5px; font-weight: 500; color: var(--ink);
}
.quickCard > svg { color: var(--accent); }

/* --- favorites --- */
.favScroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 2px; }
.favCard {
  min-width: 132px; display: flex; flex-direction: column; gap: 8px;
  padding: 12px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); cursor: pointer; text-align: left;
}
.favIcon {
  width: 32px; height: 32px; border-radius: 9px;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
}
.favName { font-size: 13px; font-weight: 600; line-height: 1.3; }
.favTier { font-size: 11px; color: var(--ink-mute); font-family: var(--font-mono); }

/* --- pipeline preview --- */
.pipelinePreview { display: flex; align-items: center; gap: 12px; cursor: pointer; text-align: left; }
.pipelinePreview > svg:first-child { color: var(--accent); flex-shrink: 0; }
.pipelinePreviewText { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.pipelinePreviewTitle { font-size: 14px; font-weight: 600; }
.pipelinePreviewSub { font-size: 12px; color: var(--ink-soft); }

/* --- jobs --- */
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
.jobName { font-size: 13.5px; font-weight: 600; }
.jobSub { font-size: 12px; color: var(--ink-soft); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jobMeta { font-size: 11px; color: var(--ink-mute); font-family: var(--font-mono); }

/* --- catalog --- */
.searchWrap {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  color: var(--ink-soft);
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
  padding: 12px; border-radius: var(--radius); border: 1px solid var(--border);
  background: var(--surface); text-align: left; cursor: pointer;
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

/* --- pipeline flow --- */
.flowWrap { display: flex; flex-direction: column; gap: 0; padding: 4px 0; }
.flowRow { display: flex; flex-direction: column; align-items: stretch; }
.flowLine { width: 2px; height: 20px; background: var(--border-strong); margin: 0 auto; border-radius: 1px; }
.flowNode {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--border);
  text-align: left; width: 100%; cursor: pointer;
}
.flowNodeSource { cursor: pointer; }
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
.flowReorder {
  display: flex; flex-direction: column; gap: 2px; margin-right: 2px;
}
.flowReorder button {
  border: none; background: transparent; color: var(--ink-mute);
  padding: 2px; cursor: pointer; border-radius: 4px;
}
.flowReorder button:disabled { opacity: 0.3; cursor: default; }
.flowReorder button:not(:disabled):hover { background: var(--bg); color: var(--ink); }
.flowDelete {
  border: none; background: transparent; color: var(--ink-mute);
  padding: 6px; cursor: pointer; border-radius: 6px;
}
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

/* --- stats --- */
.statsCard { display: flex; justify-content: space-around; gap: 8px; padding: 14px 8px; }
.stat { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
.statValue { font-size: 16px; font-weight: 700; font-family: var(--font-mono); }
.statLabel { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-mute); font-weight: 600; }

/* --- buttons --- */
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

/* --- run view --- */
.runHeader { display: flex; align-items: center; gap: 20px; padding: 20px; }
.runRingWrap { position: relative; width: 110px; height: 110px; flex-shrink: 0; }
.runRing { width: 100%; height: 100%; }
.runRingText {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px;
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
  max-height: 180px; overflow-y: auto;
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

/* --- result view --- */
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
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.videoMeta { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.videoName { font-size: 13.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.videoInfo { font-size: 12px; color: var(--ink-soft); font-family: var(--font-mono); }
.resultActions { display: flex; flex-direction: column; gap: 8px; }

/* --- sheets --- */
.sheetOverlay {
  position: fixed; inset: 0;
  background: rgba(20, 23, 26, 0.32);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 40;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
.sheet {
  width: 100%; max-width: 560px;
  max-height: 88vh; overflow-y: auto;
  background: var(--surface);
  border-radius: 20px 20px 0 0;
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
.groupLabel {
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--ink-mute); font-weight: 600; padding: 0 0 4px;
}
.advancedToggle {
  margin-top: 16px; display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: none;
  color: var(--accent); font-size: 12.5px; font-weight: 500;
  cursor: pointer; padding: 6px 0;
}
.cmdPreview {
  margin: 8px 0 0; padding: 12px;
  background: #0e0f11; color: #d1d5db;
  font-family: var(--font-mono); font-size: 11.5px;
  border-radius: 10px; line-height: 1.5;
  white-space: pre-wrap; word-break: break-all;
  overflow-x: auto;
}
.sheet .primaryBtn { margin-top: 20px; }

/* --- fields --- */
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
textarea { resize: vertical; font-family: var(--font-mono); font-size: 12.5px; }
input[type="color"] {
  width: 100%; height: 40px; padding: 3px;
  border-radius: 10px; border: 1px solid var(--border); background: var(--bg);
}
.checkboxRow { display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
.checkboxRow input { width: 18px; height: 18px; accent-color: var(--accent); }

.chipRow { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
.preset {
  border: 1px solid var(--border); background: var(--bg);
  padding: 6px 12px; border-radius: 999px;
  font-size: 12px; font-family: var(--font-mono); color: var(--ink);
  cursor: pointer; white-space: nowrap;
}
.presetActive { background: var(--ink); color: #fff; border-color: var(--ink); }

/* --- source sheet --- */
.uploadCard {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  width: 100%; padding: 22px;
  border: 1px dashed var(--border-strong); border-radius: var(--radius);
  background: var(--surface-2); color: var(--ink-soft);
  cursor: pointer; margin-bottom: 14px;
}
.uploadCard:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.uploadTitle { font-size: 13.5px; font-weight: 600; margin-top: 4px; }
.uploadSub { font-size: 11.5px; color: var(--ink-mute); }
.sourceList { display: flex; flex-direction: column; gap: 6px; }
.sourceRow {
  display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: var(--radius);
  background: var(--surface); border: 1px solid var(--border);
  text-align: left; cursor: pointer; color: var(--ink);
}
.sourceRowActive { border-color: var(--accent); background: var(--accent-soft); }
.sourceIconSm {
  width: 34px; height: 34px; border-radius: 10px;
  background: var(--bg); color: var(--ink-soft);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.sourceRowActive .sourceIconSm { background: #fff; color: var(--accent); }
.sourceRowBody { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sourceRowName { font-size: 13.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sourceRowMeta { font-size: 11.5px; color: var(--ink-soft); font-family: var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* --- bottom nav --- */
.bottomNav {
  position: fixed; bottom: 0; left: 0; right: 0;
  display: flex; justify-content: space-around; align-items: center;
  padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
  background: var(--surface);
  border-top: 1px solid var(--border);
  z-index: 30;
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

/* --- desktop --- */
@media (min-width: 720px) {
  .app { max-width: 720px; margin: 0 auto; border-left: 1px solid var(--border); border-right: 1px solid var(--border); min-height: 100vh; }
  .quickGrid { grid-template-columns: repeat(4, 1fr); }
}
`;

/* ============================== INJECT STYLES ============================== */
if (typeof document !== "undefined" && !document.getElementById("opstudio-styles")) {
  const el = document.createElement("style");
  el.id = "opstudio-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}
