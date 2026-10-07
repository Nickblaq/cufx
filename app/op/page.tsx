// app/ffmpeg/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ComponentType, DragEvent, ReactNode } from "react";

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

type AssetKind = "video" | "audio" | "image";

type Asset = {
  id: string;
  name: string;
  kind: AssetKind;
  sizeBytes: number;
  duration?: string;
  meta?: string;
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
type SheetKind = null | "configure" | "asset";

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
  Upload: ({ size = 22 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M12 19V8m0 0-4 4m4-4 4 4M5 5h14" /></svg>
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
  Image: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m4 18 5-5 4 4 3-3 4 4" /></svg>
  ),
  File: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v5h5" /></svg>
  ),
  Archive: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></svg>
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
  Sparkle: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
  ),
  Type: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M4 6V4h16v2M9 20h6M12 4v16" /></svg>
  ),
  Crop: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M6 2v16h16M2 6h16v16" /></svg>
  ),
  Rotate: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><path d="M4 12a8 8 0 1 0 3-6.3" /><path d="M4 5v4h4" /></svg>
  ),
  Globe: ({ size = 18 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...s}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>
  ),
};

/* ══════════════════════════════════════════════════════════════════════════
   OPERATIONS REGISTRY
   ══════════════════════════════════════════════════════════════════════════ */

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
  /* ─── Tier 1: Basic ──────────────────────────────────────────────────── */
  {
    id: "convert",
    name: "Format Conversion",
    description: "Convert any media file between container and codec formats.",
    tier: 1, category: "container", accepts: "both",
    icon: Icons.Archive, favorite: true,
    params: [
      {
        key: "format", type: "enum", label: "Container", default: "mp4",
        options: [
          { value: "mp4", label: "MP4" },
          { value: "mkv", label: "Matroska (MKV)" },
          { value: "webm", label: "WebM" },
          { value: "mov", label: "QuickTime (MOV)" },
          { value: "avi", label: "AVI" },
        ],
      },
      { key: "videoCodec", type: "string", label: "Video Codec", group: "Codecs", default: "libx264", placeholder: "libx264 / libvpx-vp9 / copy" },
      { key: "audioCodec", type: "string", label: "Audio Codec", group: "Codecs", default: "aac", placeholder: "aac / libopus / copy" },
    ],
  },
  {
    id: "trim",
    name: "Precise Trim",
    description: "Cut a specific time range with frame accuracy.",
    tier: 1, category: "video", accepts: "both",
    icon: Icons.Scissors, favorite: true,
    params: [
      { key: "start", type: "string", label: "Start", group: "Range", default: "00:00:00", placeholder: "HH:MM:SS.ms", helpText: "Timecode or seconds." },
      { key: "end", type: "string", label: "End", group: "Range", default: "", placeholder: "HH:MM:SS.ms" },
      {
        key: "mode", type: "enum", label: "Mode", group: "Options", default: "reencode",
        options: [
          { value: "reencode", label: "Re-encode (frame accurate)" },
          { value: "copy", label: "Stream copy (fast, keyframe only)" },
        ],
      },
    ],
  },
  {
    id: "extract-audio",
    name: "Extract Audio",
    description: "Pull the audio track out as a standalone file.",
    tier: 1, category: "audio", accepts: "both",
    icon: Icons.Music,
    params: [
      {
        key: "format", type: "enum", label: "Audio Format", default: "mp3",
        options: [
          { value: "mp3", label: "MP3" },
          { value: "aac", label: "AAC / M4A" },
          { value: "wav", label: "WAV" },
          { value: "flac", label: "FLAC" },
          { value: "opus", label: "Opus" },
        ],
      },
      { key: "bitrate", type: "string", label: "Bitrate", default: "192k", placeholder: "128k / 192k / 320k" },
    ],
  },
  {
    id: "video-only",
    name: "Video Only",
    description: "Strip all audio and keep only the video stream.",
    tier: 1, category: "video", accepts: "video",
    icon: Icons.Video,
    params: [],
  },
  {
    id: "to-gif",
    name: "Export as GIF",
    description: "Turn a segment into a looping animated GIF.",
    tier: 1, category: "video", accepts: "video",
    icon: Icons.Image,
    params: [
      { key: "start", type: "string", label: "Start", default: "00:00:00" },
      { key: "duration", type: "integer", label: "Duration", default: 3, min: 1, max: 60, unit: "s" },
      { key: "fps", type: "integer", label: "FPS", default: 12, min: 5, max: 30 },
      { key: "width", type: "integer", label: "Width", default: 480, min: 120, max: 1280, unit: "px" },
    ],
  },
  {
    id: "thumbnail",
    name: "Extract Thumbnail",
    description: "Grab a single frame as an image.",
    tier: 1, category: "video", accepts: "both",
    icon: Icons.Image,
    params: [
      { key: "at", type: "string", label: "At Time", default: "00:00:05", placeholder: "HH:MM:SS or seconds" },
      {
        key: "format", type: "enum", label: "Format", default: "jpg",
        options: [
          { value: "jpg", label: "JPEG" },
          { value: "png", label: "PNG" },
          { value: "webp", label: "WebP" },
        ],
      },
    ],
  },
  {
    id: "concat",
    name: "Concatenate",
    description: "Join multiple source files end-to-end.",
    tier: 1, category: "container", accepts: "both",
    icon: Icons.Flow,
    params: [
      {
        key: "mode", type: "enum", label: "Mode", default: "reencode",
        options: [
          { value: "reencode", label: "Re-encode (safe)" },
          { value: "copy", label: "Stream copy (fast)" },
        ],
      },
    ],
  },
  {
    id: "inspect",
    name: "Inspect Media",
    description: "Dump stream, codec, and container metadata.",
    tier: 1, category: "analysis", accepts: "both",
    icon: Icons.Info,
    params: [],
  },

  /* ─── Tier 2: Intermediate ───────────────────────────────────────────── */
  {
    id: "scale",
    name: "Resize / Scale",
    description: "Change resolution with a quality scaler.",
    tier: 2, category: "video", accepts: "video",
    icon: Icons.Settings, favorite: true,
    params: [
      { key: "width", type: "integer", label: "Width", group: "Dimensions", default: 1280, min: 16, max: 7680, unit: "px preserving edges" },
      { key: ".",
height", type: "integer", label: "Height   ", group: "Dimensions", default: 720, min: 16, max: 4320, unit: "px" },
      { key: "preserveAspect", type: "boolean", label: "Preserve aspect ratio", group: "Dimensions", default: true },
      {
        key: "scaler", type: "enum", label: "Scaler", group: "Quality", default: "lanczos",
        options: [
          { value: "fast_bilinear", label: "Fast bilinear" },
          { value: "bilinear", label: "Bilinear" },
          { value: "bicubic", label: "Bicubic" },
          { value: "lanczos", label: "Lanczos" },
          { value: "spline", label: "Spline" },
        ],
      },
    ],
  },
  {
    id: "fps",
    name: "Frame Rate",
    description: "Convert the video to a different frame rate.",
    tier: 2, category: "video", accepts: "video",
    icon: Icons.Clock,
    params: [
      {
        key: "fps", type: "enum", label: "Frame Rate", default: "30",
        options: [
          { value: "24", label: "24 fps" },
          { value: "25", label: "25 fps" },
          { value: "30", label: "30 fps" },
          { value: "50", label: "50 fps" },
          { value: "60", label: "60 fps" },
        ],
      },
    ],
  },
  {
    id: "crop",
    name: "Crop",
    description: "Cut away borders or regions with precise coordinates.",
    tier: 2, category: "video", accepts: "video",
    icon: Icons.Crop,
    params: [
      { key: "w", type: "integer", label: "Width", default: 1280, min: 16 },
      { key: "h", type: "integer", label: "Height", default: 720, min: 16 },
      { key: "x", type: "integer", label: "X Offset", default: 0, min: 0 },
      { key: "y", type: "integer", label: "Y Offset", default: 0, min: 0 },
    ],
  },
  {
    id: "rotate",
    name: "Rotate / Flip",
    description: "Rotate by 90/180/270 or flip horizontally and vertically.",
    tier: 2, category: "video", accepts: "video",
    icon: Icons.Rotate,
    params: [
      {
        key: "dir", type: "enum", label: "Transform", default: "90cw",
        options: [
          { value: "90cw", label: "90 clockwise" },
          { value: "90ccw", label: "90 counter-clockwise" },
          { value: "180", label: "180 degrees" },
          { value: "hflip", label: "Flip horizontal" },
          { value: "vflip", label: "Flip vertical" },
        ],
      },
    ],
  },
  {
    id: "pad",
    name: "Pad",
    description: "Add borders around the video with a background color.",
    tier: 2, category: "video", accepts: "video",
    icon: Icons.Crop,
    params: [
      { key: "w", type: "integer", label: "Output Width", default: 1920, min: 16 },
      { key: "h", type: "integer", label: "Output Height", default: 1080, min: 16 },
      { key: "x", type: "integer", label: "X Offset", default: 0 },
      { key: "y", type: "integer", label: "Y Offset", default: 0 },
      { key: "color", type: "string", label: "Fill Color", default: "black", placeholder: "black / white / #RRGGBB" },
    ],
  },
  {
    id: "volume",
    name: "Volume",
    description: "Adjust audio gain by a fixed amount in dB.",
    tier: 2, category: "audio", accepts: "both",
    icon: Icons.Music,
    params: [
      { key: "gain", type: "number", label: "Gain", default: 0, min: -60, max: 60, step: 0.5, unit: "dB" },
    ],
  },
  {
    id: "metadata",
    name: "Metadata Tags",
    description: "Write title, artist, and language tags into the file.",
    tier: 2, category: "metadata", accepts: "both",
    icon: Icons.File,
    params: [
      { key: "title", type: "string", label: "Title", default: "" },
      { key: "artist", type: "string", label: "Artist", default: "" },
      { key: "language", type: "string", label: "Language", default: "eng", placeholder: "ISO 639-2 code" },
    ],
  },
  {
    id: "speed",
    name: "Speed",
    description: "Apply fast or slow motion with optional pitch preservation.",
    tier: 2, category: "audio", accepts: "both",
    icon: Icons.Bolt,
    params: [
      { key: "factor", type: "number", label: "Speed Factor", default: 1, min: 0.25, max: 4, step: 0.25, unit: "x" },
      { key: "keepPitch", type: "boolean", label: "Preserve audio pitch", default: true },
    ],
  },

  /* ─── Tier 3: Advanced Video ─────────────────────────────────────────── */
  {
    id: "denoise",
    name: "Denoise",
    description: "Reduce video noise while tier: 3, category: "video", accepts: "video",
    icon: Icons.Sparkle,
    params: [
      {
        key: "strength", type: "enum", label: "Strength", default: "medium",
        options: [
          { value: "light", label: "Light" },
          { value: "medium", label: "Medium" },
          { value: "strong", label: "Strong" },
        ],
      },
      {
        key: "algo", type: "enum", label: "Algorithm", default: "hqdn3d", advanced: true,
        options: [
          { value: "hqdn3d", label: "hqdn3d (fast)" },
          { value: "nlmeans", label: "nlmeans (quality)" },
          { value: "bm3d", label: "bm3d (best)" },
        ],
      },
    ],
  },
  {
    id: "sharpen",
    name: "Sharpen",
    description: "Enhance edge detail with the unsharp mask filter.",
    tier: 3, category: "video", accepts: "video",
    icon: Icons.Sparkle,
    params: [
      { key: "amount", type: "number", label: "Amount", default: 1, min: 0, max: 3, step: 0.1 },
      { key: "size", type: "integer", label: "Kernel Size", default: 5, min: 3, max: 23, step: 2 },
    ],
  },
  {
    id: "blur",
    name: "Blur",
    description: "Apply Gaussian, box, or edge-preserving blur.",
    tier: 3, category: "video", accepts: "video",
    icon: Icons.Sparkle,
    params: [
      { key: "radius", type: "integer", label: "Radius", default: 5, min: 1, max: 50, unit: "px" },
      {
        key: "type", type: "enum", label: "Blur Type", default: "gblur",
        options: [
          { value: "gblur", label: "Gaussian" },
          { value: "boxblur", label: "Box" },
          { value: "bilateral", label: "Bilateral (edge preserving)" },
        ],
      },
    ],
  },
  {
    id: "chromakey",
    name: "Chroma Key",
    description: "Remove green or blue screens with alpha keying.",
    tier: 3, category: "video", accepts: "video",
    icon: Icons.Sparkle,
    params: [
      { key: "color", type: "string", label: "Key Color", default: "#00FF00", placeholder: "#00FF00" },
      { key: "similarity", type: "number", label: "Similarity", default: 0.3, min: 0.01, max: 1, step: 0.01, helpText: "0.01 = exact match only" },
      { key: "blend", type: "number", label: "Edge Blend", default: 0.1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "overlay",
    name: "Image Overlay",
    description: "Composite a logo or watermark over the video.",
    tier: 3, category: "video", accepts: "video",
    icon: Icons.Image,
    params: [
      {
        key: "position", type: "enum", label: "Position", default: "br",
        options: [
          { value: "tl", label: "Top-left" },
          { value: "tr", label: "Top-right" },
          { value: "bl", label: "Bottom-left" },
          { value: "br", label: "Bottom-right" },
          { value: "center", label: "Center" },
        ],
      },
      { key: "margin", type: "integer", label: "Margin", default: 16, min: 0, max: 200, unit: "px" },
      { key: "opacity", type: "number", label: "Opacity", default: 1, min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: "hdr-to-sdr",
    name: "HDR to SDR",
    description: "Tone map HDR10 or HLG content down to SDR.",
    tier: 3, category: "video", accepts: "video",
    icon: Icons.Sparkle,
    params: [
      {
        key: "algo", type: "enum", label: "Tone Map", default: "hable",
        options: [
          { value: "clip", label: "Clip" },
          { value: "hable", label: "Hable (recommended)" },
          { value: "reinhard", label: "Reinhard" },
          { value: "mobius", label: "Mobius" },
        ],
      },
      { key: "peak", type: "integer", label: "Target Peak", default: 100, min: 80, max: 1000, unit: "nits" },
    ],
  },

  /* ─── Tier 4: Advanced Audio ─────────────────────────────────────────── */
  {
    id: "loudnorm",
    name: "Loudness Normalization",
    description: "Normalize to a target LUFS with true-peak limiting (EBU R128).",
    tier: 4, category: "audio", accepts: "both",
    icon: Icons.Music, favorite: true,
    params: [
      {
        key: "target", type: "enum", label: "Target", default: "-16",
        options: [
          { value: "-23", label: "-23 LUFS (broadcast)" },
          { value: "-16", label: "-16 LUFS (podcast)" },
          { value: "-14", label: "-14 LUFS (streaming)" },
        ],
      },
      { key: "truePeak", type: "number", label: "Max True Peak", default: -2, min: -9, max: 0, unit: "dBTP" },
      { key: "lra", type: "number", label: "Loudness Range", default: 7, min: 1, max: 50, unit: "LU" },
    ],
  },
  {
    id: "compressor",
    name: "Dynamic Compression",
    description: "Reduce dynamic range using acompressor.",
    tier: 4, category: "audio", accepts: "both",
    icon: Icons.Settings,
    params: [
      { key: "threshold", type: "number", label: "Threshold", default: -20, min: -60, max: 0, unit: "dB" },
      { key: "ratio", type: "number", label: "Ratio", default: 2, min: 1, max: 20, step: 0.5 },
      { key: "attack", type: "integer", label: "Attack", default: 20, min: 1, max: 2000, unit: "ms" },
      { key: "release", type: "integer", label: "Release", default: 250, min: 1, max: 9000, unit: "ms" },
    ],
  },
  {
    id: "eq",
    name: "Parametric EQ",
    description: "Apply a peaking equalizer band with adjustable Q.",
    tier: 4, category: "audio", accepts: "both",
    icon: Icons.Settings,
    params: [
      { key: "freq", type: "integer", label: "Frequency", default: 1000, min: 20, max: 20000, unit: "Hz" },
      { key: "gain", type: "number", label: "Gain", default: 0, min: -20, max: 20, step: 0.5, unit: "dB" },
      { key: "q", type: "number", label: "Q Factor", default: 1, min: 0.1, max: 10, step: 0.1 },
    ],
  },
  {
    id: "noise-reduce",
    name: "Noise Reduction",
    description: "Reduce broadband noise via spectral subtraction.",
    tier: 4, category: "audio", accepts: "both",
    icon: Icons.Sparkle,
    params: [
      { key: "reduction", type: "number", label: "Reduction", default: 12, min: 0.01, max: 97, unit: "dB" },
      { key: "floor", type: "number", label: "Noise Floor", default: -50, min: -80, max: -20, unit: "dB", advanced: true },
    ],
  },
  {
    id: "de-ess",
    name: "De-essing",
    description: "Reduce harsh sibilance from vocals.",
    tier: 4, category: "audio", accepts: "both",
    icon: Icons.Music,
    params: [
      { key: "intensity", type: "number", label: "Intensity", default: 0.5, min: 0, max: 1, step: 0.05 },
      { key: "amount", type: "number", label: "Ducking Amount", default: 0.5, min: 0, max: 1, step: 0.05 },
    ],
  },

  /* ─── Tier 5: Chained Presets ────────────────────────────────────────── */
  {
    id: "youtube-preset",
    name: "YouTube Upload",
    description: "Scale to 1080p, H.264 CRF 18, AAC 192k, faststart MP4.",
    tier: 5, category: "chain", accepts: "video",
    icon: Icons.Bolt, favorite: true,
    chainSteps: ["scale", "convert"],
    params: [
      {
        key: "resolution", type: "enum", label: "Resolution", default: "1080p",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
          { value: "1440p", label: "1440p" },
          { value: "4k", label: "4K" },
        ],
      },
      { key: "crf", type: "integer", label: "Quality (CRF)", default: 18, min: 0, max: 51, helpText: "Lower = better quality" },
      { key: "audioBitrate", type: "string", label: "Audio Bitrate", default: "192k" },
    ],
  },
  {
    id: "social-vertical",
    name: "Social Vertical",
    description: "Crop to 9:16, scale to 1080x1920, normalize loudness.",
    tier: 5, category: "chain", accepts: "video",
    icon: Icons.Crop,
    chainSteps: ["crop", "scale", "loudnorm"],
    params: [
      {
        key: "fit", type: "enum", label: "Fit Mode", default: "crop",
        options: [
          { value: "crop", label: "Crop center" },
          { value: "pad", label: "Pad with blur" },
        ],
      },
    ],
  },
  {
    id: "web-optimized",
    name: "Web Optimized",
    description: "720p H.264, AAC 128k, faststart MP4 for delivery.",
    tier: 5, category: "chain", accepts: "video",
    icon: Icons.Globe,
    chainSteps: ["scale", "convert"],
    params: [
      { key: "crf", type: "integer", label: "Quality (CRF)", default: 23, min: 0, max: 51 },
    ],
  },
  {
    id: "stabilize",
    name: "Video Stabilization",
    description: "Two-pass deshake using vidstabdetect and vidstabtransform.",
    tier: 5, category: "chain", accepts: "video",
    icon: Icons.Sparkle,
    chainSteps: ["vidstabdetect", "vidstabtransform"],
    params: [
      { key: "shakiness", type: "integer", label: "Shakiness", default: 5, min: 1, max: 10 },
      { key: "smoothing", type: "integer", label: "Smoothing Frames", default: 10, min: 0, max: 100 },
      { key: "zoom", type: "number", label: "Zoom", default: 0, min: -50, max: 100, unit: "%" },
    ],
  },

  /* ─── Tier 6: Expert ─────────────────────────────────────────────────── */
  {
    id: "subtitle-embed",
    name: "Embed Subtitles",
    description: "Mux a subtitle file into the video as a soft track.",
    tier: 6, category: "subtitle", accepts: "video",
    icon: Icons.Type,
    params: [],
  },
  {
    id: "hardsub",
    name: "Burn Subtitles",
    description: "Permanently render subtitles into the video frames.",
    tier: 6, category: "subtitle", accepts: "video",
    icon: Icons.Type, favorite: true,
    params: [
      { key: "fontSize", type: "integer", label: "Font Size", default: 24, min: 8, max: 120 },
      { key: "color", type: "string", label: "Font Color", default: "#FFFFFF" },
      { key: "outline", type: "integer", label: "Outline", default: 2, min: 0, max: 8 },
    ],
  },
  {
    id: "subtitle-extract",
    name: "Extract Subtitles",
    description: "Pull embedded subtitle streams out into separate files.",
    tier: 6, category: "subtitle", accepts: "both",
    icon: Icons.Type,
    params: [
      {
        key: "format", type: "enum", label: "Output Format", default: "srt",
        options: [
          { value: "srt", label: "SRT" },
          { value: "ass", label: "ASS" },
          { value: "vtt", label: "VTT" },
        ],
      },
    ],
  },
  {
    id: "bitstream-filter",
    name: "Bitstream Filter",
    description: "Apply a bitstream-level transform for container compatibility.",
    tier: 6, category: "container", accepts: "both",
    icon: Icons.Terminal,
    params: [
      {
        key: "filter", type: "enum", label: "Filter", default: "h264_mp4toannexb",
        options: [
          { value: "h264_mp4toannexb", label: "h264_mp4toannexb" },
          { value: "hevc_mp4toannexb", label: "hevc_mp4toannexb" },
          { value: "extract_extradata", label: "extract_extradata" },
        ],
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

function acceptsSource(op: Operation, kind: AssetKind): boolean {
  if (op.accepts === "both") return true;
  if (op.accepts === "audio") return kind === "audio";
  if (op.accepts === "video") return kind === "video" || kind === "image";
  return true;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return n.toFixed(1) + " " + units[i];
}

/* ══════════════════════════════════════════════════════════════════════════
   API CLIENT
   ══════════════════════════════════════════════════════════════════════════ */

const API = {
  async upload(
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<Asset> {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/ffmpeg/upload");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
            resolve(data.asset as Asset);
          } else {
            reject(new Error(data.error || "Upload failed"));
          }
        } catch {
          reject(new Error("Invalid response from server"));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(fd);
    });
  },

  async run(
    inputs: { id: string; role: string }[],
    operations: OperationPayload[]
  ): Promise<string> {
    const res = await fetch("/api/ffmpeg/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, operations }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to start job");
    return data.jobId as string;
  },

  async job(jobId: string): Promise<JobProgress> {
    const res = await fetch("/api/ffmpeg/job/" + jobId);
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
  title, badge, note, onClose, children,
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
  param, value, onChange,
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
  op, onOpen, disabled,
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="statValue">{value}</span>
      <span className="statLabel">{label}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════════════════ */

export default function FfmpegPage() {
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
  const { job, error: pollError } = useJobPoll(
    view === "run" || view === "result" ? jobId : null
  );

  const runJob = useAsync<string>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ── Derived ─────────────────────────────────────────────────────────── */
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

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const handleFile = useCallback(async (file: File) => {
    setUploadPercent(0);
    try {
      const uploaded = await API.upload(file, (p) => setUploadPercent(p));
      setAsset(uploaded);
      setUploadPercent(null);
    } catch (err) {
      setUploadPercent(null);
      alert(err instanceof Error ? err.message : "Upload failed");
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
    (e: DragEvent<HTMLDivElement>) => {
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
    setPipeline((p) => [
      ...p,
      { uid: crypto.randomUUID(), op: selectedOp, values },
    ]);
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
      const tmp = next[index];
      next[index] = next[t];
      next[t] = tmp;
      return next;
    });
  }

  async function handleRun() {
    if (!asset || pipeline.length === 0) return;
    const inputs = [{ id: asset.id, role: "main" }];
    const operations: OperationPayload[] = pipeline.map((step) => ({
      id: step.op.id,
      params: step.values,
    }));
    const result = await runJob.run(() => API.run(inputs, operations));
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

  /* ── Auto-advance on completion ──────────────────────────────────────── */
  useEffect(() => {
    if (view === "run" && job?.status === "completed") {
      const t = setTimeout(() => setView("result"), 500);
      return () => clearTimeout(t);
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
          <span className="titleSub">
            {headerSub(view, pipeline, asset, job)}
          </span>
        </div>
      </header>

      <main className="main">
        {view === "home" && (
          <HomeView
            asset={asset}
            uploadPercent={uploadPercent}
            onPickFile={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onRemoveAsset={() => setAsset(null)}
            onOpenOp={openConfigure}
            onBrowse={() => setView("catalog")}
            onOpenPipeline={() => setView("pipeline")}
            onOpenAsset={() => setSheet("asset")}
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
            asset={asset}
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
          <RunView asset={asset} pipeline={pipeline} job={job} error={pollError} />
        )}

        {view === "result" && (
          <ResultView
            asset={asset}
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
          onClose={() => { setSheet(null); setSelectedOp(null); }}
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

/* ══════════════════════════════════════════════════════════════════════════
   HEADER HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

function headerTitle(v: View): string {
  const map: Record<View, string> = {
    home: "Media Studio",
    catalog: "Operations",
    pipeline: "Pipeline",
    run: "Working",
    result: "Done",
  };
  return map[v];
}

function headerSub(
  v: View,
  pipeline: PipelineStep[],
  asset: Asset | null,
  job: JobProgress | null
): string {
  if (v === "home") return asset ? asset.name : "no source loaded";
  if (v === "catalog") return String(pipeline.length) + " in pipeline";
  if (v === "pipeline")
    return pipeline.length ? String(pipeline.length) + " steps" : "empty";
  if (v === "run")
    return job
      ? job.status + " · " + String(Math.round(job.percent)) + "%"
      : "starting...";
  return "output ready";
}

/* ══════════════════════════════════════════════════════════════════════════
   VIEWS
   ══════════════════════════════════════════════════════════════════════════ */

function HomeView({
  asset, uploadPercent, onPickFile, onDrop, onRemoveAsset,
  onOpenOp, onBrowse, onOpenPipeline, onOpenAsset, favorites,
}: {
  asset: Asset | null;
  uploadPercent: number | null;
  onPickFile: () => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onRemoveAsset: () => void;
  onOpenOp: (op: Operation) => void;
  onBrowse: () => void;
  onOpenPipeline: () => void;
  onOpenAsset: () => void;
  favorites: Operation[];
}) {
  const quickPicks: { id: string; label: string; icon: ComponentType<IconProps> }[] = [
    { id: "convert", label: "Convert", icon: Icons.Archive },
    { id: "trim", label: "Trim", icon: Icons.Scissors },
    { id: "scale", label: "Scale", icon: Icons.Settings },
    { id: "youtube-preset", label: "YouTube", icon: Icons.Bolt },
  ];

  const isUploading = uploadPercent !== null && uploadPercent < 100;

  return (
    <div className="pad">
      {!asset ? (
        <section
          className={"card dropCard " + (isUploading ? "dropCardBusy" : "")}
          onDragOver={(e) => e.preventDefault()}
          onDrop={isUploading ? undefined : onDrop}
          onClick={isUploading ? undefined : onPickFile}
        >
          {isUploading ? (
            <>
              <div className="dropIcon"><Icons.Upload /></div>
              <div className="dropTitle">Uploading...</div>
              <div className="dropProgress">
                <div
                  className="dropProgressBar"
                  style={{ width: String(uploadPercent) + "%" }}
                />
              </div>
              <span className="dropHint">{uploadPercent}%</span>
            </>
          ) : (
            <>
              <div className="dropIcon"><Icons.Upload /></div>
              <div className="dropTitle">Add a media file</div>
              <span className="dropHint">
                Drop a video, audio, or image here, or tap to browse.
              </span>
            </>
          )}
        </section>
      ) : (
        <section className="card assetCard" onClick={onOpenAsset}>
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
              {asset.duration ? " · " + asset.duration : ""}
              {" · "}
              {asset.kind}
            </span>
          </div>
          <div className="assetActions">
            <button
              className="miniBtn"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPickFile();
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
                onRemoveAsset();
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
                  className="quickCard"
                  onClick={() => onOpenOp(op)}
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
            <button className="rowAction" onClick={onBrowse}>
              See all
            </button>
          </div>
          <div className="favScroll">
            {favorites.map((op) => {
              const Icon = op.icon;
              return (
                <button
                  key={op.id}
                  className="favCard"
                  onClick={() => onOpenOp(op)}
                >
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
          <button className="rowAction" onClick={onOpenPipeline}>
            Open
          </button>
        </div>
        <button className="card pipelinePreview" onClick={onOpenPipeline}>
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
        <Empty
          title="No operations match"
          hint="Try a different filter or search term."
        />
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
  asset, pipeline, onAdd, onRemove, onMove, onRun, running, error, onEdit,
}: {
  asset: Asset | null;
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
          <div className="flowNodeIcon">
            {asset?.kind === "audio" ? (
              <Icons.Music />
            ) : asset?.kind === "image" ? (
              <Icons.Image />
            ) : (
              <Icons.File />
            )}
          </div>
          <div className="flowNodeBody">
            <span className="flowNodeLabel">Source</span>
            <span className="flowNodeValue">
              {asset?.name ?? "No file loaded"}
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
                    onClick={() => onMove(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                  >
                    <Icons.Up />
                  </button>
                  <button
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
                <div className="flowNodeBody" onClick={() => onEdit(step)}>
                  <span className="flowNodeLabel">Step {i + 1}</span>
                  <span className="flowNodeValue">{step.op.name}</span>
                </div>
                <button
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
          <button className="flowAdd" onClick={onAdd}>
            <Icons.Plus /> Add Operation
          </button>
        </div>
      </section>

      {pipeline.length > 0 && (
        <section className="card statsCard">
          <Stat label="Steps" value={String(pipeline.length)} />
          <Stat label="Source" value={asset?.kind ?? "-"} />
          <Stat
            label="Input"
            value={asset ? formatBytes(asset.sizeBytes) : "-"}
          />
        </section>
      )}

      {error && (
        <div className="errorBox">
          <Icons.Warn /> {error}
        </div>
      )}

      <button
        className="primaryBtn"
        onClick={onRun}
        disabled={!asset || !pipeline.length || running}
      >
        {running ? "Starting..." : "Start"}
      </button>
    </div>
  );
}

function RunView({
  asset, pipeline, job, error,
}: {
  asset: Asset | null;
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
          <span className="runSource">{asset?.name ?? "..."}</span>
          <span className="runStep">
            {job?.step
              ? job.step
              : "Step " + (activeIndex + 1) + " of " + pipeline.length}
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
        <pre className="logBody">{job?.log || "Waiting for output..."}</pre>
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

function ResultView({
  asset, job, onAgain, onHome,
}: {
  asset: Asset | null;
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
        <h2 className="resultTitle">
          {ok ? "Processing complete" : "Processing failed"}
        </h2>
        <p className="resultSub">{job?.error || asset?.name || ""}</p>
      </section>

      {primary && (
        <section className="card videoPreview">
          <div className="videoThumb">
            <Icons.Play size={28} />
          </div>
          <div className="videoMeta">
            <span className="videoName">{primary.name}</span>
            <span className="videoInfo">{formatBytes(primary.sizeBytes)}</span>
          </div>
        </section>
      )}

      {job?.outputs && job.outputs.length > 0 && (
        <section>
          <div className="rowHead">
            <h3 className="sectionTitle">All outputs</h3>
          </div>
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
        <button className="primaryBtn" onClick={onHome}>
          Back to Home
        </button>
        <button className="ghostBtnWide" onClick={onAgain}>
          Start Another
        </button>
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
      badge={"tier " + op.tier + " · " + op.category}
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

/* ══════════════════════════════════════════════════════════════════════════
   STYLES
   ══════════════════════════════════════════════════════════════════════════ */

const STYLES = `
:root{
  --bg:#f7f6f2;--surface:#fff;--surface-2:#fbfaf7;
  --border:#e7e5de;--border-strong:#d6d3c9;
  --ink:#14171a;--ink-soft:#5b6065;--ink-mute:#8a8f95;
  --accent:#4f46e5;--accent-soft:#eef2ff;
  --render:#2e9c7a;--render-soft:#e8f8f1;
  --warn:#d97706;--warn-soft:#fef4e6;
  --danger:#dc2626;--danger-soft:#fdeaea;
  --font-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --font-mono:"SF Mono",ui-monospace,Menlo,Consolas,monospace;
  --radius:14px;--radius-lg:20px;
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
.errorBox{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:10px;background:var(--danger-soft);color:var(--danger);font-size:12.5px;font-weight:500}

.dropCard{display:flex;flex-direction:column;align-items:center;gap:10px;padding:32px 20px;border:1.5px dashed var(--border-strong);background:var(--surface-2);cursor:pointer;text-align:center;transition:background .15s,border-color .15s}
.dropCard:hover{background:var(--accent-soft);border-color:var(--accent)}
.dropCardBusy{cursor:default}
.dropCardBusy:hover{background:var(--surface-2);border-color:var(--border-strong)}
.dropIcon{width:52px;height:52px;border-radius:14px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center}
.dropTitle{font-size:15px;font-weight:600}
.dropHint{font-size:12.5px;color:var(--ink-soft);line-height:1.5;max-width:280px}
.dropProgress{width:220px;height:6px;border-radius:3px;background:var(--border);overflow:hidden;margin-top:4px}
.dropProgressBar{height:100%;background:var(--accent);transition:width .15s ease}

.assetCard{display:flex;align-items:center;gap:12px;cursor:pointer}
.assetIcon{width:46px;height:46px;border-radius:12px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.assetMeta{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.assetLabel{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-weight:600}
.assetName{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.assetInfo{font-size:11.5px;color:var(--ink-soft);font-family:var(--font-mono)}
.assetActions{display:flex;gap:6px}

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
.miniBtn{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:999px;background:var(--bg);border:1px solid var(--border);font-size:11.5px;color:var(--ink-soft);cursor:pointer;font-family:var(--font-mono)}
.miniBtn:hover{background:var(--accent-soft);color:var(--accent);border-color:var(--accent)}
.miniBtnDanger:hover{background:var(--danger-soft);color:var(--danger);border-color:var(--danger)}

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

if (typeof document !== "undefined" && !document.getElementById("ffmpeg-page-styles")) {
  const el = document.createElement("style");
  el.id = "ffmpeg-page-styles";
  el.textContent = STYLES;
  document.head.appendChild(el);
}
