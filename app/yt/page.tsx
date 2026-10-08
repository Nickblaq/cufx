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
