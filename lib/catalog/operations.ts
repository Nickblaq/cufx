// lib/catalog/operations.ts
//
// The one operation catalog. Every tool in cufx — the ffmpeg pipeline that used
// to live under /op and the yt-dlp downloader that used to live under /yt — now
// draws from this single list. Instead of two copies of OPERATIONS and two
// translate modules, each operation declares:
//
//   • what it takes in   (`accepts`, `source`)
//   • what it produces   (`produces`)
//   • how to turn media  (`buildJob`, below)
//
// Nothing here imports `server-only` or Node builtins, so the same definition
// drives the client UI (names, params, icons) and the server runner (job
// construction). Engine-specific argument building lives in `./engines/*`.

import type { MediaKind } from "./types";

export type ParamType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "enum"
  | "multiselect"
  | "textarea";

export type Option = { value: string; label: string };

export type Condition = {
  param: string;
  operator: "eq" | "neq" | "truthy" | "falsy";
  value?: unknown;
};

export type Param = {
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

export type FormValues = Record<string, unknown>;

/** Which engine executes an operation. */
export type OperationEngine = "ffmpeg" | "ytdlp";

/** Where an operation gets its input: a catalog object, or the job's URL. */
export type OperationSource = "object" | "url";

export type CatalogOperation = {
  id: string;
  name: string;
  description: string;
  tier: number;
  category: string;
  engine: OperationEngine;
  source: OperationSource;
  /** Catalog object kinds this operation can consume from the previous step. */
  accepts: MediaKind[];
  /** Primary kind of object this operation creates. */
  produces: MediaKind;
  /** Icon key resolved against components/studio/Icons. */
  icon: string;
  favorite?: boolean;
  chainSteps?: string[];
  params: Param[];
};

/* ------------------------------- tier labels ------------------------------ */

export const TIER_LABELS: Record<number, string> = {
  1: "Ingest & Convert",
  2: "Resize & Shape",
  3: "Video Effects",
  4: "Audio & Subs",
  5: "Presets & Chains",
  6: "Expert",
};

export const TIER_FILTERS = [
  { id: "all", label: "All" },
  { id: "ingest", label: "Ingest" },
  { id: "shape", label: "Shape" },
  { id: "effects", label: "Effects" },
  { id: "audio", label: "Audio" },
  { id: "presets", label: "Presets" },
  { id: "expert", label: "Expert" },
] as const;

export type TierFilter = (typeof TIER_FILTERS)[number]["id"];

export const TIER_RANGES: Record<TierFilter, [number, number]> = {
  all: [1, 6],
  ingest: [1, 1],
  shape: [2, 2],
  effects: [3, 3],
  audio: [4, 4],
  presets: [5, 5],
  expert: [6, 6],
};

/* --------------------------------- catalog -------------------------------- */

export const OPERATIONS: CatalogOperation[] = [
  /* ── Tier 1 — Ingest & Convert ──────────────────────────────────────── */

  {
    id: "quick-best",
    name: "Download · Best",
    description: "Pull best video + best audio from a URL and merge them.",
    tier: 1,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Bolt",
    favorite: true,
    params: [],
  },
  {
    id: "audio-mp3",
    name: "Download · MP3",
    description: "Extract audio from a URL as MP3.",
    tier: 1,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "audio",
    icon: "Music",
    favorite: true,
    params: [
      {
        key: "quality",
        type: "enum",
        label: "Quality",
        default: "0",
        options: [
          { value: "0", label: "Best (V0)" },
          { value: "2", label: "High (V2)" },
          { value: "5", label: "Medium (V5)" },
          { value: "320K", label: "CBR 320k" },
          { value: "192K", label: "CBR 192k" },
        ],
      },
    ],
  },
  {
    id: "audio-m4a",
    name: "Download · M4A",
    description: "Extract audio from a URL as M4A.",
    tier: 1,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "audio",
    icon: "Music",
    params: [],
  },
  {
    id: "video-mp4",
    name: "Download · MP4",
    description: "Best MP4 available from a URL.",
    tier: 1,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Video",
    params: [],
  },
  {
    id: "video-webm",
    name: "Download · WebM",
    description: "Best WebM available from a URL.",
    tier: 1,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Video",
    params: [],
  },
  {
    id: "custom-format",
    name: "Download · Custom Format",
    description: "Raw yt-dlp -f format selector.",
    tier: 1,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Terminal",
    params: [
      {
        key: "format",
        type: "string",
        label: "Format",
        placeholder: "bv*[height<=1080]+ba/b",
        helpText: "Passed straight to yt-dlp -f.",
      },
    ],
  },
  {
    id: "convert",
    name: "Format Conversion",
    description: "Convert media between container and codec formats.",
    tier: 1,
    category: "container",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio", "image"],
    produces: "video",
    icon: "Archive",
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
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "video",
    icon: "Scissors",
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
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "audio",
    icon: "Music",
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
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Video",
    params: [],
  },
  {
    id: "to-gif",
    name: "Export as GIF",
    description: "Turn a segment into a looping animated GIF.",
    tier: 1,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "image",
    icon: "Image",
    params: [
      { key: "start", type: "string", label: "Start", default: "0" },
      { key: "duration", type: "integer", label: "Duration", default: 3, min: 1, max: 60, unit: "s" },
      { key: "fps", type: "integer", label: "FPS", default: 12, min: 5, max: 30 },
      { key: "width", type: "integer", label: "Width", default: 480, min: 120, max: 1280, unit: "px" },
    ],
  },
  {
    id: "thumbnail",
    name: "Extract Frame",
    description: "Grab a single frame from a video as an image.",
    tier: 1,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "image",
    icon: "Image",
    params: [
      { key: "at", type: "string", label: "At Time", default: "5", placeholder: "HH:MM:SS or seconds" },
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

  /* ── Tier 2 — Resize & Shape ─────────────────────────────────────────── */

  {
    id: "scale",
    name: "Resize / Scale",
    description: "Change resolution with a quality scaler.",
    tier: 2,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "image"],
    produces: "video",
    icon: "Settings",
    favorite: true,
    params: [
      { key: "width", type: "integer", label: "Width", group: "Dimensions", default: 1280, min: 16, max: 7680, unit: "px" },
      { key: "height", type: "integer", label: "Height", group: "Dimensions", default: 720, min: 16, max: 4320, unit: "px" },
      { key: "preserveAspect", type: "boolean", label: "Preserve aspect ratio", group: "Dimensions", default: true },
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
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Clock",
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
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "image"],
    produces: "video",
    icon: "Crop",
    favorite: true,
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
    description: "Rotate by 90/180 or flip horizontally and vertically.",
    tier: 2,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "image"],
    produces: "video",
    icon: "Rotate",
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
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "image"],
    produces: "video",
    icon: "Crop",
    params: [
      { key: "w", type: "integer", label: "Output Width", default: 1920, min: 16 },
      { key: "h", type: "integer", label: "Output Height", default: 1080, min: 16 },
      { key: "x", type: "integer", label: "X Offset", default: 0 },
      { key: "y", type: "integer", label: "Y Offset", default: 0 },
      { key: "color", type: "string", label: "Fill Color", default: "black" },
    ],
  },
  {
    id: "speed",
    name: "Speed",
    description: "Fast or slow motion with optional pitch preservation.",
    tier: 2,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "video",
    icon: "Bolt",
    params: [
      { key: "factor", type: "number", label: "Speed Factor", default: 1, min: 0.25, max: 4, step: 0.25, unit: "x" },
      { key: "keepPitch", type: "boolean", label: "Preserve audio pitch", default: true },
    ],
  },
  {
    id: "resolution-cap",
    name: "Download · Resolution Cap",
    description: "Download under a maximum height.",
    tier: 2,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Video",
    favorite: true,
    params: [
      {
        key: "maxHeight",
        type: "enum",
        label: "Max Height",
        default: "1080",
        options: [
          { value: "360", label: "360p" },
          { value: "480", label: "480p" },
          { value: "720", label: "720p" },
          { value: "1080", label: "1080p" },
          { value: "1440", label: "1440p" },
          { value: "2160", label: "4K" },
        ],
      },
    ],
  },
  {
    id: "section-download",
    name: "Download · Section",
    description: "Download only a time range.",
    tier: 2,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Scissors",
    params: [
      { key: "section", type: "string", label: "Section", placeholder: "*05:00-25:00", helpText: "Time range with * prefix." },
    ],
  },

  /* ── Tier 3 — Video Effects ──────────────────────────────────────────── */

  {
    id: "denoise",
    name: "Denoise",
    description: "Reduce video noise while preserving edge detail.",
    tier: 3,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Sparkle",
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
    ],
  },
  {
    id: "sharpen",
    name: "Sharpen",
    description: "Enhance edge detail with the unsharp mask filter.",
    tier: 3,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "image"],
    produces: "video",
    icon: "Sparkle",
    params: [
      { key: "amount", type: "number", label: "Amount", default: 1, min: 0, max: 3, step: 0.1 },
      { key: "size", type: "integer", label: "Kernel Size", default: 5, min: 3, max: 23, step: 2 },
    ],
  },
  {
    id: "blur",
    name: "Blur",
    description: "Apply Gaussian, box, or edge-preserving blur.",
    tier: 3,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "image"],
    produces: "video",
    icon: "Sparkle",
    params: [
      { key: "radius", type: "integer", label: "Radius", default: 5, min: 1, max: 50, unit: "px" },
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
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Sparkle",
    params: [
      { key: "color", type: "string", label: "Key Color", default: "#00FF00" },
      { key: "similarity", type: "number", label: "Similarity", default: 0.3, min: 0.01, max: 1, step: 0.01 },
      { key: "blend", type: "number", label: "Edge Blend", default: 0.1, min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    id: "hdr-to-sdr",
    name: "HDR to SDR",
    description: "Tone map HDR10 or HLG content down to SDR.",
    tier: 3,
    category: "video",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Sparkle",
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
    ],
  },

  /* ── Tier 4 — Audio & Subs ───────────────────────────────────────────── */

  {
    id: "volume",
    name: "Volume",
    description: "Adjust audio gain by a fixed amount in dB.",
    tier: 4,
    category: "audio",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "audio",
    icon: "Music",
    params: [
      { key: "gain", type: "number", label: "Gain", default: 0, min: -60, max: 60, step: 0.5, unit: "dB" },
    ],
  },
  {
    id: "loudnorm",
    name: "Loudness Normalization",
    description: "Normalize to a target LUFS (EBU R128).",
    tier: 4,
    category: "audio",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "audio",
    icon: "Music",
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
      { key: "truePeak", type: "number", label: "Max True Peak", default: -2, min: -9, max: 0, unit: "dBTP" },
      { key: "lra", type: "number", label: "Loudness Range", default: 7, min: 1, max: 50, unit: "LU" },
    ],
  },
  {
    id: "compressor",
    name: "Dynamic Compression",
    description: "Reduce dynamic range using acompressor.",
    tier: 4,
    category: "audio",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "audio",
    icon: "Settings",
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
    tier: 4,
    category: "audio",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "audio",
    icon: "Settings",
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
    tier: 4,
    category: "audio",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "audio",
    icon: "Sparkle",
    params: [
      { key: "reduction", type: "number", label: "Reduction", default: 12, min: 0.01, max: 97, unit: "dB" },
    ],
  },
  {
    id: "subscribe-download",
    name: "Download · Subtitles",
    description: "Download subtitles alongside the media.",
    tier: 4,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "subtitle",
    icon: "Subtitle",
    favorite: true,
    params: [
      { key: "langs", type: "string", label: "Languages", default: "en", placeholder: "en,ja or all" },
    ],
  },
  {
    id: "subtitle-extract",
    name: "Extract Subtitles",
    description: "Pull embedded subtitle streams out into separate files.",
    tier: 4,
    category: "subtitle",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "subtitle",
    icon: "Subtitle",
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

  /* ── Tier 5 — Presets & Chains ───────────────────────────────────────── */

  {
    id: "youtube-preset",
    name: "YouTube Upload",
    description: "1080p, H.264 CRF 18, AAC 192k, faststart MP4.",
    tier: 5,
    category: "chain",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Bolt",
    favorite: true,
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
      { key: "crf", type: "integer", label: "Quality (CRF)", default: 18, min: 0, max: 51 },
      { key: "audioBitrate", type: "string", label: "Audio Bitrate", default: "192k" },
    ],
  },
  {
    id: "social-vertical",
    name: "Social Vertical",
    description: "Crop to 9:16, scale to 1080x1920, normalize loudness.",
    tier: 5,
    category: "chain",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Crop",
    params: [],
  },
  {
    id: "web-optimized",
    name: "Web Optimized",
    description: "720p H.264, faststart MP4 for delivery.",
    tier: 5,
    category: "chain",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Globe",
    params: [
      { key: "crf", type: "integer", label: "Quality (CRF)", default: 23, min: 0, max: 51 },
    ],
  },
  {
    id: "stabilize",
    name: "Video Stabilization",
    description: "Two-pass deshake using vidstab detect/transform.",
    tier: 5,
    category: "chain",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Sparkle",
    params: [
      { key: "shakiness", type: "integer", label: "Shakiness", default: 5, min: 1, max: 10 },
      { key: "smoothing", type: "integer", label: "Smoothing Frames", default: 10, min: 0, max: 100 },
    ],
  },
  {
    id: "music-pipeline",
    name: "Music Pipeline",
    description: "MP3 + embedded thumbnail + metadata + chapters.",
    tier: 5,
    category: "chain",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "audio",
    icon: "Music",
    favorite: true,
    params: [
      {
        key: "quality",
        type: "enum",
        label: "Quality",
        default: "320K",
        options: [
          { value: "320K", label: "CBR 320k" },
          { value: "0", label: "Best (V0)" },
          { value: "2", label: "High (V2)" },
        ],
      },
    ],
  },
  {
    id: "archive-pipeline",
    name: "Archive Pipeline",
    description: "Video + subtitles + thumbnail + info.json.",
    tier: 5,
    category: "chain",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Archive",
    params: [
      { key: "subLangs", type: "string", label: "Subtitle Languages", default: "en" },
    ],
  },
  {
    id: "social-clip",
    name: "Social Clip",
    description: "1080p with burned-in subtitles for social.",
    tier: 5,
    category: "chain",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Video",
    params: [
      { key: "subLangs", type: "string", label: "Subtitle Languages", default: "en" },
    ],
  },

  /* ── Tier 6 — Expert ─────────────────────────────────────────────────── */

  {
    id: "metadata",
    name: "Metadata Tags",
    description: "Write title, artist, and language tags into the file.",
    tier: 6,
    category: "metadata",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video", "audio"],
    produces: "video",
    icon: "File",
    params: [
      { key: "title", type: "string", label: "Title", default: "" },
      { key: "artist", type: "string", label: "Artist", default: "" },
      { key: "language", type: "string", label: "Language", default: "eng" },
    ],
  },
  {
    id: "bitstream-filter",
    name: "Bitstream Filter",
    description: "Apply a bitstream-level transform for compatibility.",
    tier: 6,
    category: "container",
    engine: "ffmpeg",
    source: "object",
    accepts: ["video"],
    produces: "video",
    icon: "Terminal",
    params: [
      {
        key: "filter",
        type: "enum",
        label: "Filter",
        default: "h264_mp4toannexb",
        options: [
          { value: "h264_mp4toannexb", label: "h264_mp4toannexb" },
          { value: "hevc_mp4toannexb", label: "hevc_mp4toannexb" },
        ],
      },
    ],
  },
  {
    id: "cookies-browser",
    name: "Download · Cookies (Browser)",
    description: "Load auth cookies from an installed browser.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Lock",
    params: [
      {
        key: "browser",
        type: "enum",
        label: "Browser",
        default: "chrome",
        options: [
          { value: "chrome", label: "Chrome" },
          { value: "firefox", label: "Firefox" },
          { value: "edge", label: "Edge" },
          { value: "brave", label: "Brave" },
        ],
      },
    ],
  },
  {
    id: "cookies-file",
    name: "Download · Cookies (File)",
    description: "Use a Netscape cookies.txt file.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Lock",
    params: [
      { key: "cookieFile", type: "string", label: "Path", placeholder: "/path/cookies.txt" },
    ],
  },
  {
    id: "proxy-config",
    name: "Download · Proxy",
    description: "Route download traffic through a proxy.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Globe",
    params: [
      { key: "proxy", type: "string", label: "Proxy URL", placeholder: "socks5://127.0.0.1:1080" },
    ],
  },
  {
    id: "embed-thumbnail",
    name: "Download · Embed Thumbnail",
    description: "Embed the cover art into the downloaded file.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Image",
    params: [],
  },
  {
    id: "embed-metadata",
    name: "Download · Embed Metadata",
    description: "Embed metadata and chapters into the download.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "File",
    params: [
      { key: "chapters", type: "boolean", label: "Include chapters", default: true },
    ],
  },
  {
    id: "sponsorblock-remove",
    name: "Download · SponsorBlock",
    description: "Remove sponsor segments during download.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Scissors",
    params: [
      {
        key: "categories",
        type: "multiselect",
        label: "Categories",
        default: ["sponsor"],
        options: [
          { value: "sponsor", label: "Sponsor" },
          { value: "intro", label: "Intro" },
          { value: "outro", label: "Outro" },
          { value: "selfpromo", label: "Self promo" },
        ],
      },
    ],
  },
  {
    id: "rate-limit",
    name: "Download · Rate Limit",
    description: "Cap download speed and concurrency.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Globe",
    params: [
      { key: "rate", type: "string", label: "Max Rate", default: "1M" },
      { key: "concurrent", type: "integer", label: "Concurrent Fragments", default: 4, min: 1, max: 32 },
    ],
  },
  {
    id: "download-archive",
    name: "Download · Archive",
    description: "Skip items already recorded in an archive file.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "video",
    icon: "Archive",
    params: [
      { key: "archiveFile", type: "string", label: "Archive File", default: "archive.txt" },
    ],
  },
  {
    id: "info-json",
    name: "Download · Info JSON",
    description: "Write a metadata sidecar next to the download.",
    tier: 6,
    category: "download",
    engine: "ytdlp",
    source: "url",
    accepts: [],
    produces: "other",
    icon: "Info",
    params: [
      { key: "comments", type: "boolean", label: "Include comments", default: false },
    ],
  },
];

/* -------------------------------- lookups --------------------------------- */

const BY_ID = new Map(OPERATIONS.map((op) => [op.id, op]));

export function getOperation(id: string): CatalogOperation | undefined {
  return BY_ID.get(id);
}

export function acceptsKind(op: CatalogOperation, kind: MediaKind): boolean {
  return op.accepts.length === 0 || op.accepts.includes(kind);
}

export function groupByTier(ops: CatalogOperation[]): [number, CatalogOperation[]][] {
  const map = new Map<number, CatalogOperation[]>();
  for (const op of ops) {
    const list = map.get(op.tier);
    if (list) list.push(op);
    else map.set(op.tier, [op]);
  }
  return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
}
