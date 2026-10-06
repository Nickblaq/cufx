// app/ffmpeg/page.tsx
"use client";

import { useMemo, useState } from "react";

/* ---------------------------------- icons --------------------------------- */
/* Same hand-drawn single-stroke style used by the editor. */

type IconProps = { size?: number };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconBack({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
function IconRun({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.3v13.4a1 1 0 0 0 1.53.85l10.7-6.7a1 1 0 0 0 0-1.7L9.53 4.45A1 1 0 0 0 8 5.3Z" />
    </svg>
  );
}
function IconChevronDown({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IconConvert({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </svg>
  );
}
function IconTrim({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M6 3v14a2 2 0 0 0 2 2h14" />
      <path d="M18 3v14a2 2 0 0 1-2 2H2" />
    </svg>
  );
}
function IconScale({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 4h7M4 4v7M20 20h-7M20 20v-7" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}
function IconVolume({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      <path d="M17 8a5 5 0 0 1 0 8" />
    </svg>
  );
}
function IconChroma({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3" />
    </svg>
  );
}
function IconPreset({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3l2.4 5.4 5.6.6-4.2 4 1.2 5.6L12 15.8 7 18.6l1.2-5.6-4.2-4 5.6-.6Z" />
    </svg>
  );
}
function IconPlus({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconCheck({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}
function IconBolt({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
    </svg>
  );
}

/* --------------------------------- types ---------------------------------- */

type ParamType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "enum"
  | "time"
  | "duration"
  | "color"
  | "size"
  | "bitrate"
  | "expression"
  | "codec";

type Option = { value: string; label: string };

type Condition =
  | { param: string; operator: "eq" | "neq" | "truthy" | "falsy" | "gt" | "lt"; value?: unknown };

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
};

type FormValues = Record<string, unknown>;

/* --------------------------------- data ----------------------------------- */

const TIER_LABELS: Record<number, string> = {
  1: "Basic Operations",
  2: "Intermediate Operations",
  3: "Advanced Video Operations",
  4: "Advanced Audio Operations",
  5: "Complex Chained Operations",
  6: "Specialized / Expert",
};

const TIER_GROUPS = [
  { id: "all", label: "All", range: [1, 6] },
  { id: "basic", label: "Basic", range: [1, 2] },
  { id: "advanced", label: "Advanced", range: [3, 4] },
  { id: "chains", label: "Chains", range: [5, 6] },
] as const;

const OPERATIONS: Operation[] = [
  {
    id: "convert",
    name: "Format Conversion",
    description: "Convert any media file from one container/codec format to another.",
    tier: 1,
    category: "container",
    icon: IconConvert,
    params: [
      {
        key: "format",
        type: "enum",
        label: "Container Format",
        group: "Container",
        default: "mp4",
        options: [
          { value: "mp4", label: "MP4" },
          { value: "mkv", label: "Matroska (MKV)" },
          { value: "webm", label: "WebM" },
          { value: "mov", label: "QuickTime (MOV)" },
          { value: "avi", label: "AVI" },
        ],
      },
      { key: "videoCodec", type: "codec", label: "Video Codec", group: "Video", default: "libx264" },
      { key: "audioCodec", type: "codec", label: "Audio Codec", group: "Audio", default: "aac" },
    ],
  },
  {
    id: "trim",
    name: "Precise Trimming",
    description: "Cut a specific time range from any media file with frame accuracy.",
    tier: 1,
    category: "video",
    icon: IconTrim,
    params: [
      { key: "start", type: "time", label: "Start Time", group: "Range", default: "00:00:00", helpText: "Timecode (HH:MM:SS.ms) or seconds." },
      { key: "end", type: "time", label: "End Time", group: "Range", default: "" },
      { key: "duration", type: "duration", label: "Duration", group: "Range", default: "", helpText: "Alternative to End Time.", showIf: { param: "end", operator: "falsy" } },
      {
        key: "mode",
        type: "enum",
        label: "Trim Mode",
        group: "Mode",
        default: "reencode",
        options: [
          { value: "reencode", label: "Re-encode (frame accurate)" },
          { value: "copy", label: "Stream copy (fast)" },
        ],
      },
    ],
  },
  {
    id: "scale",
    name: "Video Resize / Scale",
    description: "Change resolution using high-quality Lanczos, bicubic, or spline scalers.",
    tier: 2,
    category: "video",
    icon: IconScale,
    params: [
      { key: "size", type: "size", label: "Output Size", group: "Dimensions", default: "1280x720", presets: ["640x360", "1280x720", "1920x1080", "3840x2160"], helpText: "Use -1 for auto." },
      {
        key: "scaler",
        type: "enum",
        label: "Scaling Algorithm",
        group: "Quality",
        default: "lanczos",
        options: [
          { value: "fast_bilinear", label: "Fast Bilinear" },
          { value: "bilinear", label: "Bilinear" },
          { value: "bicubic", label: "Bicubic" },
          { value: "lanczos", label: "Lanczos" },
          { value: "spline", label: "Spline" },
        ],
      },
      { key: "forceAspect", type: "boolean", label: "Preserve Aspect Ratio", group: "Dimensions", default: true },
    ],
  },
  {
    id: "volume",
    name: "Volume Adjustment",
    description: "Apply gain in dB, linear multipliers, or dynamic expressions.",
    tier: 2,
    category: "audio",
    icon: IconVolume,
    params: [
      { key: "gain", type: "number", label: "Gain", default: 0, min: -60, max: 60, step: 0.5, unit: "dB" },
      {
        key: "precision",
        type: "enum",
        label: "Precision",
        default: "float",
        advanced: true,
        options: [
          { value: "fixed", label: "Fixed-point" },
          { value: "float", label: "Float (32-bit)" },
          { value: "double", label: "Double (64-bit)" },
        ],
      },
      { key: "useExpression", type: "boolean", label: "Use Dynamic Expression", default: false },
      {
        key: "expression",
        type: "expression",
        label: "Volume Expression",
        default: "1.0",
        showIf: { param: "useExpression", operator: "truthy" },
        helpText: "Variables: t (frame time), n (frame number).",
      },
    ],
  },
  {
    id: "chromakey",
    name: "Chroma Keying",
    description: "Remove green/blue screens using chromakey or colorkey filters.",
    tier: 3,
    category: "video",
    icon: IconChroma,
    params: [
      { key: "color", type: "color", label: "Key Color", default: "#00FF00" },
      { key: "similarity", type: "number", label: "Similarity", default: 0.3, min: 0.01, max: 1, step: 0.01, helpText: "0.01 = exact, 1.0 = everything." },
      { key: "blend", type: "number", label: "Edge Blend", default: 0.1, min: 0, max: 1, step: 0.01 },
      { key: "yuv", type: "boolean", label: "Input color is already YUV", default: false, advanced: true },
    ],
  },
  {
    id: "youtube-preset",
    name: "YouTube Upload Preset",
    description: "Scale to 1080p, H.264 CRF 18, AAC 192k, faststart MP4.",
    tier: 5,
    category: "chain",
    icon: IconPreset,
    chainSteps: ["scale", "convert"],
    params: [
      {
        key: "resolution",
        type: "enum",
        label: "Resolution",
        group: "Output",
        default: "1080p",
        options: [
          { value: "720p", label: "720p" },
          { value: "1080p", label: "1080p" },
          { value: "1440p", label: "1440p" },
          { value: "4k", label: "4K" },
        ],
      },
      { key: "crf", type: "integer", label: "Quality (CRF)", group: "Quality", default: 18, min: 0, max: 51, helpText: "Lower = better quality." },
      { key: "audioBitrate", type: "bitrate", label: "Audio Bitrate", group: "Quality", default: "192k" },
      { key: "faststart", type: "boolean", label: "Faststart (web optimized)", group: "Output", default: true },
    ],
  },
];

/* -------------------------------- helpers --------------------------------- */

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
    if (p.default !== undefined) {
      out[p.key] = p.default;
      continue;
    }
    switch (p.type) {
      case "number":
      case "integer":
        out[p.key] = p.min ?? 0;
        break;
      case "boolean":
        out[p.key] = false;
        break;
      case "enum":
        out[p.key] = p.options?.[0]?.value ?? "";
        break;
      case "color":
        out[p.key] = "#000000";
        break;
      default:
        out[p.key] = "";
        break;
    }
  }
  return out;
}

/* ---------------------------------- page ----------------------------------- */

export default function OperationStudio() {
  const [tierGroup, setTierGroup] = useState<(typeof TIER_GROUPS)[number]["id"]>("all");
  const [selected, setSelected] = useState<Operation | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [queue, setQueue] = useState<{ op: Operation; values: FormValues }[]>([]);
  const [running, setRunning] = useState(false);
  const [runDone, setRunDone] = useState(false);

  const activeGroup = TIER_GROUPS.find((g) => g.id === tierGroup)!;
  const visibleOps = useMemo(
    () => OPERATIONS.filter((op) => op.tier >= activeGroup.range[0] && op.tier <= activeGroup.range[1]),
    [activeGroup]
  );

  const groupedByTier = useMemo(() => {
    const map = new Map<number, Operation[]>();
    for (const op of visibleOps) {
      if (!map.has(op.tier)) map.set(op.tier, []);
      map.get(op.tier)!.push(op);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [visibleOps]);

  function openOperation(op: Operation) {
    setSelected(op);
    setValues(defaultValues(op));
    setRunDone(false);
  }

  function closeSheet() {
    setSelected(null);
    setValues({});
  }

  function setValue(key: string, v: unknown) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function addToQueue() {
    if (!selected) return;
    setQueue((prev) => [...prev, { op: selected, values }]);
    setRunDone(false);
    closeSheet();
  }

  function removeFromQueue(index: number) {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    setRunDone(false);
  }

  function runPipeline() {
    if (!queue.length || running) return;
    setRunning(true);
    setRunDone(false);
    setTimeout(() => {
      setRunning(false);
      setRunDone(true);
    }, 900);
  }

  const visibleParams = selected
    ? selected.params.filter((p) => evaluateCondition(p.showIf, values))
    : [];

  const paramGroups = useMemo(() => {
    const map = new Map<string, Param[]>();
    for (const p of visibleParams) {
      const g = p.group ?? "General";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }
    return [...map.entries()];
  }, [visibleParams]);

  return (
    <div className="root">
      {/* top bar */}
      <header className="topbar">
        <button className="iconbtn" aria-label="Back">
          <IconBack />
        </button>
        <div className="title">
          <span className="titleMain">Operation Studio</span>
          <span className="titleSub">
            {queue.length === 0
              ? "ffmpeg · pipeline empty"
              : `ffmpeg · ${queue.length} step${queue.length === 1 ? "" : "s"} queued`}
          </span>
        </div>
        <button
          className="exportbtn"
          onClick={runPipeline}
          disabled={!queue.length || running}
        >
          {running ? "Running…" : "Run"}
        </button>
      </header>

      <div className="metastrip">
        <span>
          {OPERATIONS.length} ops &nbsp;|&nbsp; {Object.keys(TIER_LABELS).length} tiers &nbsp;|&nbsp; v1.0.0
        </span>
      </div>

      {/* tier filter */}
      <div className="segwrap">
        <div className="segment" role="tablist" aria-label="Tier filter">
          {TIER_GROUPS.map((g) => (
            <button
              key={g.id}
              role="tab"
              aria-selected={tierGroup === g.id}
              className={`segbtn ${tierGroup === g.id ? "segActive" : ""}`}
              onClick={() => setTierGroup(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* pipeline overview card (mirrors the editor's preview block) */}
      <div className="previewWrap">
        <div className="pipelineCard">
          {queue.length === 0 ? (
            <>
              <div className="pipelineIcon">
                <IconBolt />
              </div>
              <div className="pipelineText">
                <span className="pipelineTitle">No operations queued</span>
                <span className="pipelineSub">
                  Tap an operation below to configure it, then add it to the pipeline.
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="pipelineIcon pipelineIconActive">
                <IconCheck />
              </div>
              <div className="pipelineText">
                <span className="pipelineTitle">
                  {runDone ? "Pipeline complete" : running ? "Executing…" : "Ready to run"}
                </span>
                <span className="pipelineSub">
                  {queue.map((q) => q.op.name).join(" → ")}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* pipeline chips */}
      <div className="pipeline">
        {queue.length === 0 ? (
          <span className="pipelineHint">Queue is empty — pick an operation to begin.</span>
        ) : (
          queue.map((q, i) => (
            <button
              key={i}
              className="chip chipBtn"
              onClick={() => removeFromQueue(i)}
              title="Remove from queue"
            >
              <span className="chipIndex">{i + 1}</span>
              {q.op.name}
            </button>
          ))
        )}
      </div>

      {/* operations list, grouped by tier */}
      <div className="catalog">
        {groupedByTier.map(([tier, ops]) => (
          <section key={tier} className="tierSection">
            <h3 className="tierHead">{TIER_LABELS[tier]}</h3>
            <ul className="opList">
              {ops.map((op) => {
                const Icon = op.icon;
                return (
                  <li key={op.id}>
                    <button className="opCard" onClick={() => openOperation(op)}>
                      <span className="opIcon">
                        <Icon />
                      </span>
                      <span className="opBody">
                        <span className="opName">{op.name}</span>
                        <span className="opDesc">{op.description}</span>
                        <span className="opMeta">
                          tier {op.tier} · {op.category}
                          {op.chainSteps ? ` · chain: ${op.chainSteps.join(" + ")}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* parameter sheet */}
      {selected && (
        <div className="sheetOverlay" onClick={closeSheet}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheetHandle" />
            <div className="sheetHead">
              <span>{selected.name}</span>
              <button className="closebtn" onClick={closeSheet} aria-label="Close">
                <IconChevronDown />
              </button>
            </div>

            <p className="sheetNote">{selected.description}</p>

            <div className="sheetBody">
              {paramGroups.map(([group, params]) => (
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
            </div>

            <button className="addBtn" onClick={addToQueue}>
              <IconPlus /> Add to pipeline
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 8px;
        }
        .iconbtn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink);
          flex-shrink: 0;
        }
        .title {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .titleMain {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.2;
        }
        .titleSub {
          font-size: 12px;
          color: var(--ink-soft);
          font-family: var(--font-mono), monospace;
        }
        .exportbtn {
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 9px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-sans), sans-serif;
          flex-shrink: 0;
        }
        .exportbtn:disabled {
          opacity: 0.4;
        }

        .metastrip {
          padding: 0 16px 12px;
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          color: var(--render);
        }

        .segwrap {
          padding: 0 16px 14px;
        }
        .segment {
          display: flex;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 3px;
        }
        .segbtn {
          flex: 1;
          border: none;
          background: transparent;
          padding: 8px 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--ink-soft);
          border-radius: 9px;
          font-family: var(--font-sans), sans-serif;
        }
        .segActive {
          background: var(--ink);
          color: #fff;
        }

        .previewWrap {
          padding: 0 16px;
        }
        .pipelineCard {
          display: flex;
          gap: 12px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 16px;
        }
        .pipelineIcon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: var(--bg);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ink-soft);
          flex-shrink: 0;
        }
        .pipelineIconActive {
          color: var(--render);
          border-color: #c7eedc;
          background: #e8f8f1;
        }
        .pipelineText {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .pipelineTitle {
          font-size: 14px;
          font-weight: 600;
        }
        .pipelineSub {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.4;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .pipeline {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 14px 16px;
        }
        .pipelineHint {
          font-size: 13px;
          color: var(--ink-soft);
          white-space: nowrap;
        }
        .chip {
          font-size: 12px;
          font-family: var(--font-mono), monospace;
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 6px 10px;
          border-radius: 999px;
          white-space: nowrap;
          color: var(--ink);
          flex-shrink: 0;
        }
        .chipBtn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .chipIndex {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--accent);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
        }

        
        .catalog {
          padding: 0 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .tierSection {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .tierHead {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-soft);
          font-weight: 600;
          margin: 0;
          padding-left: 2px;
        }
        .opList {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .opCard {
          width: 100%;
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          text-align: left;
          cursor: pointer;
        }
        .opCard:active {
          background: #f3f3ef;
        }
        .opIcon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #eef2ff;
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .opBody {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .opName {
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
        }
        .opDesc {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.4;
        }
        .opMeta {
          margin-top: 4px;
          font-size: 11px;
          font-family: var(--font-mono), monospace;
          color: var(--render);
        }

        .sheetOverlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 23, 26, 0.28);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          z-index: 20;
        }
        .sheet {
          width: 100%;
          max-width: 560px;
          max-height: 82vh;
          overflow-y: auto;
          background: var(--surface);
          border-radius: 20px 20px 0 0;
          padding: 10px 18px 26px;
          border: 1px solid var(--border);
          border-bottom: none;
        }
        .sheetHandle {
          width: 36px;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          margin: 4px auto 12px;
        }
        .sheetHead {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 15px;
          margin-bottom: 6px;
        }
        .closebtn {
          border: none;
          background: transparent;
          color: var(--ink-soft);
          padding: 4px;
        }
        .sheetNote {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.5;
          margin: 0 0 14px;
        }
        .sheetBody {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .fieldGroup {
          border: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .groupLabel {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--ink-soft);
          font-weight: 600;
          padding: 0 0 4px;
        }
        .addBtn {
          margin-top: 20px;
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--ink);
          color: #fff;
          border: none;
          padding: 12px 18px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          font-family: var(--font-sans), sans-serif;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fieldHead {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          font-size: 13px;
        }
        .fieldLabel {
          color: var(--ink-soft);
        }
        .fieldValue {
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          color: var(--ink);
        }
        .fieldHelp {
          font-size: 11.5px;
          color: var(--ink-soft);
          margin: 0;
          line-height: 1.4;
        }
        input[type="text"],
        input[type="number"],
        select,
        textarea {
          width: 100%;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 13.5px;
          font-family: var(--font-sans), sans-serif;
          color: var(--ink);
          -webkit-appearance: none;
          appearance: none;
        }
select {
  width: 100%;
  display: block;
  padding: 10px 34px 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background-color: var(--bg);
  color: var(--ink);
  font-size: 16px;              /* prevents iOS zoom-on-focus */
  font-family: var(--font-sans), sans-serif;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%235b6065' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          accent-color: var(--accent);
        }
        input[type="color"] {
          width: 100%;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--bg);
          padding: 2px;
        }
        .checkboxRow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          color: var(--ink);
        }
        .checkboxRow input {
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
        }
.chipRow {
  display: flex;
  gap: 8px;
  row-gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}
.preset {
  border: 1px solid var(--border);
  background: var(--bg);       /* was var(--surface) — contrasts against the white sheet */
  padding: 7px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-family: var(--font-mono), monospace;
  line-height: 1.2;
  color: var(--ink);
  white-space: nowrap;
  flex-shrink: 0;
}
.presetActive {
  background: var(--ink);
  color: #fff;
  border-color: var(--ink);
}

        @media (min-width: 640px) {
          .preview {
            border-radius: 22px;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------------------------- field ---------------------------------- */
/* Renders a single Param according to its declared type. */

function Field({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const common = "field";

  switch (param.type) {
    case "string":
      return (
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </div>
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
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
            <span className="fieldValue">
              {String(value ?? 0)}
              {param.unit ? ` ${param.unit}` : ""}
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
        <label className={`${common} checkboxRow`}>
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
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </div>
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {param.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      );

    case "time":
    case "duration":
      return (
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </div>
          <input
            type="text"
            placeholder={param.type === "time" ? "00:00:00.000" : "seconds"}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "color":
      return (
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
            <span className="fieldValue">{String(value ?? "#000000")}</span>
          </div>
          <input
            type="color"
            value={typeof value === "string" ? value.slice(0, 7) : "#000000"}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );

    case "size":
      return (
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </div>
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {param.presets && (
            <div className="chipRow">
              {param.presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`preset ${value === p ? "presetActive" : ""}`}
                  onClick={() => onChange(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "bitrate":
      return (
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </div>
          <input
            type="text"
            placeholder="192k"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );

    case "expression":
      return (
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </div>
          <textarea
            rows={3}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "codec":
      return (
        <label className={common}>
          <div className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </div>
          <input
            type="text"
            placeholder="libx264"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      );

    default:
      return null;
  }
}
