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
  /* ─── Tier 1: Basic ──────────────────────────────────────────────────── */
  {
    id: "convert",
    name: "Format Conversion",
    description: "Convert any media file between container and codec formats.",
    tier: 1,
    category: "container",
    accepts: "both",
    icon: Icons.Archive,
    favorite: true,
    params: [
      {
        key: "format",
        type: "enum",
        label: "Container",
        default: "mp4",
        options: [
          { value: "mp4", label: "MP4" },
          { value: "mkv", label: "Matroska (MKV)" },
          { value: "webm", label: "WebM" },
          { value: "mov", label: "QuickTime (MOV)" },
          { value: "avi", label: "AVI" },
        ],
      },
      {
        key: "videoCodec",
        type: "string",
        label: "Video Codec",
        group: "Codecs",
        default: "libx264",
        placeholder: "libx264 / libvpx-vp9 / copy",
      },
      {
        key: "audioCodec",
        type: "string",
        label: "Audio Codec",
        group: "Codecs",
        default: "aac",
        placeholder: "aac / libopus / copy",
      },
    ],
  },
  {
    id: "trim",
    name: "Precise Trim",
    description: "Cut a specific time range with frame accuracy.",
    tier: 1,
    category: "video",
    accepts: "both",
    icon: Icons.Scissors,
    favorite: true,
    params: [
      {
        key: "start",
        type: "string",
        label: "Start",
        group: "Range",
        default: "00:00:00",
        placeholder: "HH:MM:SS.ms",
        helpText: "Timecode or seconds.",
      },
      {
        key: "end",
        type: "string",
        label: "End",
        group: "Range",
        default: "",
        placeholder: "HH:MM:SS.ms",
      },
      {
        key: "mode",
        type: "enum",
        label: "Mode",
        group: "Options",
        default: "reencode",
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
    tier: 1,
    category: "audio",
    accepts: "both",
    icon: Icons.Music,
    params: [
      {
        key: "format",
        type: "enum",
        label: "Audio Format",
        default: "mp3",
        options: [
          { value: "mp3", label: "MP3" },
          { value: "aac", label: "AAC / M4A" },
          { value: "wav", label: "WAV" },
          { value: "flac", label: "FLAC" },
          { value: "opus", label: "Opus" },
        ],
      },
      {
        key: "bitrate",
        type: "string",
        label: "Bitrate",
        default: "192k",
        placeholder: "128k / 192k / 320k",
      },
    ],
  },
  {
    id: "video-only",
    name: "Video Only",
    description: "Strip all audio and keep only the video stream.",
    tier: 1,
    category: "video",
    accepts: "video",
    icon: Icons.Video,
    params: [],
  },
  {
    id: "to-gif",
    name: "Export as GIF",
    description: "Turn a segment into a looping animated GIF.",
    tier: 1,
    category: "video",
    accepts: "video",
    icon: Icons.Image,
    params: [
      { key: "start", type: "string", label: "Start", default: "00:00:00" },
      {
        key: "duration",
        type: "integer",
        label: "Duration",
        default: 3,
        min: 1,
        max: 60,
        unit: "s",
      },
      { key: "fps", type: "integer", label: "FPS", default: 12, min: 5, max: 30 },
      {
        key: "width",
        type: "integer",
        label: "Width",
        default: 480,
        min: 120,
        max: 1280,
        unit: "px",
      },
    ],
  },
  {
    id: "thumbnail",
    name: "Extract Thumbnail",
    description: "Grab a single frame as an image.",
    tier: 1,
    category: "video",
    accepts: "both",
    icon: Icons.Image,
    params: [
      {
        key: "at",
        type: "string",
        label: "At Time",
        default: "00:00:05",
        placeholder: "HH:MM:SS or seconds",
      },
      {
        key: "format",
        type: "enum",
        label: "Format",
        default: "jpg",
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
    tier: 1,
    category: "container",
    accepts: "both",
    icon: Icons.Flow,
    params: [
      {
        key: "mode",
        type: "enum",
        label: "Mode",
        default: "reencode",
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
    tier: 1,
    category: "analysis",
    accepts: "both",
    icon: Icons.Info,
    params: [],
  },

  /* ─── Tier 2: Intermediate ───────────────────────────────────────────── */
  {
    id: "scale",
    name: "Resize / Scale",
    description: "Change resolution with a quality scaler.",
    tier: 2,
    category: "video",
    accepts: "video",
    icon: Icons.Settings,
    favorite: true,
    params: [
      {
        key: "width",
        type: "integer",
        label: "Width",
        group: "Dimensions",
        default: 1280,
        min: 16,
        max: 7680,
        unit: "px",
      },
      {
        key: "height",
        type: "integer",
        label: "Height",
        group: "Dimensions",
        default: 720,
        min: 16,
        max: 4320,
        unit: "px",
      },
      {
        key: "preserveAspect",
        type: "boolean",
        label: "Preserve aspect ratio",
        group: "Dimensions",
        default: true,
      },
      {
        key: "scaler",
        type: "enum",
        label: "Scaler",
        group: "Quality",
        default: "lanczos",
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
    tier: 2,
    category: "video",
    accepts: "video",
    icon: Icons.Clock,
    params: [
      {
        key: "fps",
        type: "enum",
        label: "Frame Rate",
        default: "30",
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
    tier: 2,
    category: "video",
    accepts: "video",
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
    tier: 2,
    category: "video",
    accepts: "video",
    icon: Icons.Rotate,
    params: [
      {
        key: "dir",
        type: "enum",
        label: "Transform",
        default: "90cw",
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
    tier: 2,
    category: "video",
    accepts: "video",
    icon: Icons.Crop,
    params: [
      {
        key: "w",
        type: "integer",
        label: "Output Width",
        default: 1920,
        min: 16,
      },
      {
        key: "h",
        type: "integer",
        label: "Output Height",
        default: 1080,
        min: 16,
      },
      { key: "x", type: "integer", label: "X Offset", default: 0 },
      { key: "y", type: "integer", label: "Y Offset", default: 0 },
      {
        key: "color",
        type: "string",
        label: "Fill Color",
        default: "black",
        placeholder: "black / white / #RRGGBB",
      },
    ],
  },
  {
    id: "volume",
    name: "Volume",
    description: "Adjust audio gain by a fixed amount in dB.",
    tier: 2,
    category: "audio",
    accepts: "both",
    icon: Icons.Music,
    params: [
      {
        key: "gain",
        type: "number",
        label: "Gain",
        default: 0,
        min: -60,
        max: 60,
        step: 0.5,
        unit: "dB",
      },
    ],
  },
  {
    id: "metadata",
    name: "Metadata Tags",
    description: "Write title, artist, and language tags into the file.",
    tier: 2,
    category: "metadata",
    accepts: "both",
    icon: Icons.File,
    params: [
      { key: "title", type: "string", label: "Title", default: "" },
      { key: "artist", type: "string", label: "Artist", default: "" },
      {
        key: "language",
        type: "string",
        label: "Language",
        default: "eng",
        placeholder: "ISO 639-2 code",
      },
    ],
  },
  {
    id: "speed",
    name: "Speed",
    description: "Apply fast or slow motion with optional pitch preservation.",
    tier: 2,
    category: "audio",
    accepts: "both",
    icon: Icons.Bolt,
    params: [
      {
        key: "factor",
        type: "number",
        label: "Speed Factor",
        default: 1,
        min: 0.25,
        max: 4,
        step: 0.25,
        unit: "x",
      },
      {
        key: "keepPitch",
        type: "boolean",
        label: "Preserve audio pitch",
        default: true,
      },
    ],
  },

  /* ─── Tier 3: Advanced Video ─────────────────────────────────────────── */
  {
    id: "denoise",
    name: "Denoise",
    description: "Reduce video noise while preserving edge detail.",
    tier: 3,
    category: "video",
    accepts: "video",
    icon: Icons.Sparkle,
    params: [
      {
        key: "strength",
        type: "enum",
        label: "Strength",
        default: "medium",
        options: [
          { value: "light", label: "Light" },
          { value: "medium", label: "Medium" },
          { value: "strong", label: "Strong" },
        ],
      },
      {
        key: "algo",
        type: "enum",
        label: "Algorithm",
        default: "hqdn3d",
        advanced: true,
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
    tier: 3,
    category: "video",
    accepts: "video",
    icon: Icons.Sparkle,
    params: [
      {
        key: "amount",
        type: "number",
        label: "Amount",
        default: 1,
        min: 0,
        max: 3,
        step: 0.1,
      },
      {
        key: "size",
        type: "integer",
        label: "Kernel Size",
        default: 5,
        min: 3,
        max: 23,
        step: 2,
      },
    ],
  },
  {
    id: "blur",
    name: "Blur",
    description: "Apply Gaussian, box, or edge-preserving blur.",
    tier: 3,
    category: "video",
    accepts: "video",
    icon: Icons.Sparkle,
    params: [
      {
        key: "radius",
        type: "integer",
        label: "Radius",
        default: 5,
        min: 1,
        max: 50,
        unit: "px",
      },
      {
        key: "type",
        type: "enum",
        label: "Blur Type",
        default: "gblur",
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
    tier: 3,
    category: "video",
    accepts: "video",
    icon: Icons.Sparkle,
    params: [
      {
        key: "color",
        type: "string",
        label: "Key Color",
        default: "#00FF00",
        placeholder: "#00FF00",
      },
      {
        key: "similarity",
        type: "number",
        label: "Similarity",
        default: 0.3,
        min: 0.01,
        max: 1,
        step: 0.01,
        helpText: "0.01 = exact match only",
      },
      {
        key: "blend",
        type: "number",
        label: "Edge Blend",
        default: 0.1,
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    id: "overlay",
    name: "Image Overlay",
    description: "Composite a logo or watermark over the video.",
    tier: 3,
    category: "video",
    accepts: "video",
    icon: Icons.Image,
    params: [
      {
        key: "position",
        type: "enum",
        label: "Position",
        default: "br",
        options: [
          { value: "tl", label: "Top-left" },
          { value: "tr", label: "Top-right" },
          { value: "bl", label: "Bottom-left" },
          { value: "br", label: "Bottom-right" },
          { value: "center", label: "Center" },
        ],
      },
      {
        key: "margin",
        type: "integer",
        label: "Margin",
        default: 16,
        min: 0,
        max: 200,
        unit: "px",
      },
      {
        key: "opacity",
        type: "number",
        label: "Opacity",
        default: 1,
        min: 0,
        max: 1,
        step: 0.05,
      },
    ],
  },
  {
    id: "hdr-to-sdr",
    name: "HDR to SDR",
    description: "Tone map HDR10 or HLG content down to SDR.",
    tier: 3,
    category: "video",
    accepts: "video",
    icon: Icons.Sparkle,
    params: [
      {
        key: "algo",
        type: "enum",
        label: "Tone Map",
        default: "hable",
        options: [
          { value: "clip", label: "Clip" },
          { value: "hable", label: "Hable (recommended)" },
          { value: "reinhard", label: "Reinhard" },
          { value: "mobius", label: "Mobius" },
        ],
      },
      {
        key: "peak",
        type: "integer",
        label: "Target Peak",
        default: 100,
        min: 80,
        max: 1000,
        unit: "nits",
      },
    ],
  },

  /* ─── Tier 4: Advanced Audio ─────────────────────────────────────────── */
  {
    id: "loudnorm",
    name: "Loudness Normalization",
    description: "Normalize to a target LUFS with true-peak limiting (EBU R128).",
    tier: 4,
    category: "audio",
    accepts: "both",
    icon: Icons.Music,
    favorite: true,
    params: [
      {
        key: "target",
        type: "enum",
        label: "Target",
        default: "-16",
        options: [
          { value: "-23", label: "-23 LUFS (broadcast)" },
          { value: "-16", label: "-16 LUFS (podcast)" },
          { value: "-14", label: "-14 LUFS (streaming)" },
        ],
      },
      {
        key: "truePeak",
        type: "number",
        label: "Max True Peak",
        default: -2,
        min: -9,
        max: 0,
        unit: "dBTP",
      },
      {
        key: "lra",
        type: "number",
        label: "Loudness Range",
        default: 7,
        min: 1,
        max: 50,
        unit: "LU",
      },
    ],
  },
  {
    id: "compressor",
    name: "Dynamic Compression",
    description: "Reduce dynamic range using acompressor.",
    tier: 4,
    category: "audio",
    accepts: "both",
    icon: Icons.Settings,
    params: [
      {
        key: "threshold",
        type: "number",
        label: "Threshold",
        default: -20,
        min: -60,
        max: 0,
        unit: "dB",
      },
      {
        key: "ratio",
        type: "number",
        label: "Ratio",
        default: 2,
        min: 1,
        max: 20,
        step: 0.5,
      },
      {
        key: "attack",
        type: "integer",
        label: "Attack",
        default: 20,
        min: 1,
        max: 2000,
        unit: "ms",
      },
      {
        key: "release",
        type: "integer",
        label: "Release",
        default: 250,
        min: 1,
        max: 9000,
        unit: "ms",
      },
    ],
  },
  {
    id: "eq",
    name: "Parametric EQ",
    description: "Apply a peaking equalizer band with adjustable Q.",
    tier: 4,
    category: "audio",
    accepts: "both",
    icon: Icons.Settings,
    params: [
      {
        key: "freq",
        type: "integer",
        label: "Frequency",
        default: 1000,
        min: 20,
        max: 20000,
        unit: "Hz",
      },
      {
        key: "gain",
        type: "number",
        label: "Gain",
        default: 0,
        min: -20,
        max: 20,
        step: 0.5,
        unit: "dB",
      },
      {
        key: "q",
        type: "number",
        label: "Q Factor",
        default: 1,
        min: 0.1,
        max: 10,
        step: 0.1,
      },
    ],
  },
  {
    id: "noise-reduce",
    name: "Noise Reduction",
    description: "Reduce broadband noise via spectral subtraction.",
    tier: 4,
    category: "audio",
    accepts: "both",
    icon: Icons.Sparkle,
    params: [
      {
        key: "reduction",
        type: "number",
        label: "Reduction",
        default: 12,
        min: 0.01,
        max: 97,
        unit: "dB",
      },
      {
        key: "floor",
        type: "number",
        label: "Noise Floor",
        default: -50,
        min: -80,
        max: -20,
        unit: "dB",
        advanced: true,
      },
    ],
  },
  {
    id: "de-ess",
    name: "De-essing",
    description: "Reduce harsh sibilance from vocals.",
    tier: 4,
    category: "audio",
    accepts: "both",
    icon: Icons.Music,
    params: [
      {
        key: "intensity",
        type: "number",
        label: "Intensity",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        key: "amount",
        type: "number",
        label: "Ducking Amount",
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05,
      },
    ],
  },

  /* ─── Tier 5: Chained Presets ────────────────────────────────────────── */
  {
    id: "youtube-preset",
    name: "YouTube Upload",
    description: "Scale to 1080p, H.264 CRF 18, AAC 192k, faststart MP4.",
    tier: 5,
    category: "chain",
    accepts: "video",
    icon: Icons.Bolt,
    favorite: true,
    chainSteps: ["scale", "convert"],
    params: [
      {
        key: "resolution",
        type: "enum",
        label: "Resolution",
        default: "1080p",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
          { value: "1440p", label: "1440p" },
          { value: "4k", label: "4K" },
        ],
      },
      {
        key: "crf",
        type: "integer",
        label: "Quality (CRF)",
        default: 18,
        min: 0,
        max: 51,
        helpText: "Lower = better quality",
      },
      {
        key: "audioBitrate",
        type: "string",
        label: "Audio Bitrate",
        default: "192k",
      },
    ],
  },
  {
    id: "social-vertical",
    name: "Social Vertical",
    description: "Crop to 9:16, scale to 1080x1920, normalize loudness.",
    tier: 5,
    category: "chain",
    accepts: "video",
    icon: Icons.Crop,
    chainSteps: ["crop", "scale", "loudnorm"],
    params: [
      {
        key: "fit",
        type: "enum",
        label: "Fit Mode",
        default: "crop",
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
    tier: 5,
    category: "chain",
    accepts: "video",
    icon: Icons.Globe,
    chainSteps: ["scale", "convert"],
    params: [
      {
        key: "crf",
        type: "integer",
        label: "Quality (CRF)",
        default: 23,
        min: 0,
        max: 51,
      },
    ],
  },
  {
    id: "stabilize",
    name: "Video Stabilization",
    description: "Two-pass deshake using vidstab detect/transform.",
    tier: 5,
    category: "chain",
    accepts: "video",
    icon: Icons.Sparkle,
    chainSteps: ["vidstabdetect", "vidstabtransform"],
    params: [
      {
        key: "shakiness",
        type: "integer",
        label: "Shakiness",
        default: 5,
        min: 1,
        max: 10,
      },
      {
        key: "smoothing",
        type: "integer",
        label: "Smoothing Frames",
        default: 10,
        min: 0,
        max: 100,
      },
      {
        key: "zoom",
        type: "number",
        label: "Zoom",
        default: 0,
        min: -50,
        max: 100,
        unit: "%",
      },
    ],
  },

  /* ─── Tier 6: Expert ─────────────────────────────────────────────────── */
  {
    id: "subtitle-embed",
    name: "Embed Subtitles",
    description: "Mux a subtitle file into the video as a soft track.",
    tier: 6,
    category: "subtitle",
    accepts: "video",
    icon: Icons.Type,
    params: [],
  },
  {
    id: "hardsub",
    name: "Burn Subtitles",
    description: "Permanently render subtitles into the video frames.",
    tier: 6,
    category: "subtitle",
    accepts: "video",
    icon: Icons.Type,
    favorite: true,
    params: [
      {
        key: "fontSize",
        type: "integer",
        label: "Font Size",
        default: 24,
        min: 8,
        max: 120,
      },
      {
        key: "color",
        type: "string",
        label: "Font Color",
        default: "#FFFFFF",
      },
      {
        key: "outline",
        type: "integer",
        label: "Outline",
        default: 2,
        min: 0,
        max: 8,
      },
    ],
  },
  {
    id: "subtitle-extract",
    name: "Extract Subtitles",
    description: "Pull embedded subtitle streams out into separate files.",
    tier: 6,
    category: "subtitle",
    accepts: "both",
    icon: Icons.Type,
    params: [
      {
        key: "format",
        type: "enum",
        label: "Output Format",
        default: "srt",
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
    description:
      "Apply a bitstream-level transform for container compatibility.",
    tier: 6,
    category: "container",
    accepts: "both",
    icon: Icons.Terminal,
    params: [
      {
        key: "filter",
        type: "enum",
        label: "Filter",
        default: "h264_mp4toannexb",
        options: [
          { value: "h264_mp4toannexb", label: "h264_mp4toannexb" },
          { value: "hevc_mp4toannexb", label: "hevc_mp4toannexb" },
          { value: "extract_extradata", label: "extract_extradata" },
        ],
      },
    ],
  },
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
