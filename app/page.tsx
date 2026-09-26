"use client";

import { useEffect, useMemo, useState } from "react";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

/* ---------------------------------- icons --------------------------------- */
/* Hand-drawn, single stroke weight, no icon library dependency. */

type IconProps = { size?: number };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function IconBack({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}
function IconScissors({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <circle cx="6.5" cy="6.5" r="2.3" />
      <circle cx="6.5" cy="17.5" r="2.3" />
      <path d="M8.3 8 20 19M20 5 8.3 16" />
    </svg>
  );
}
function IconGauge({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15l4-5" />
      <path d="M12 15h.01" />
    </svg>
  );
}
function IconSparkSliders({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M4 6h9M17 6h3M4 18h3M11 18h9" />
      <circle cx="14.5" cy="6" r="2" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  );
}
function IconWave({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M3 12h2l2-6 3 12 3-9 2 6 3-3h3" />
    </svg>
  );
}
function IconLayers({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 13.5 12 18l9-4.5" />
    </svg>
  );
}
function IconShrink({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M9 4v4H5M15 4v4h4M9 20v-4H5M15 20v-4h4" />
    </svg>
  );
}
function IconCrop({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  );
}
function IconSun({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 3v2.2M12 18.8V21M4.2 12H2M22 12h-2.2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" />
    </svg>
  );
}
function IconType({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M5 6h14M12 6v13" />
    </svg>
  );
}
function IconPlay({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.3v13.4a1 1 0 0 0 1.53.85l10.7-6.7a1 1 0 0 0 0-1.7L9.53 4.45A1 1 0 0 0 8 5.3Z" />
    </svg>
  );
}
function IconPause({ size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6.5" y="5" width="4" height="14" rx="1" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" />
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

/* --------------------------------- helpers -------------------------------- */

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const LUTS = [
  { id: "none", label: "None", hue: 0, sat: 100, con: 100 },
  { id: "kodak", label: "Kodak 2383", hue: 8, sat: 112, con: 108 },
  { id: "noir", label: "Noir", hue: 0, sat: 12, con: 128 },
  { id: "teal", label: "Teal & Amber", hue: -18, sat: 118, con: 112 },
  { id: "faded", label: "Faded", hue: 4, sat: 78, con: 92 },
  { id: "cyan", label: "Cyberpunk", hue: 165, sat: 140, con: 118 },
] as const;

const VIDEO_TOOLS = [
  { id: "trim", label: "Trim", icon: IconScissors },
  { id: "speed", label: "Speed", icon: IconGauge },
  { id: "filters", label: "Filters", icon: IconSparkSliders },
  { id: "audio", label: "Audio", icon: IconWave },
  { id: "format", label: "Format", icon: IconLayers },
  { id: "compress", label: "Compress", icon: IconShrink },
] as const;

const PHOTO_TOOLS = [
  { id: "crop", label: "Crop", icon: IconCrop },
  { id: "adjust", label: "Adjust", icon: IconSun },
  { id: "filters", label: "Filters", icon: IconSparkSliders },
  { id: "text", label: "Text", icon: IconType },
  { id: "format", label: "Format", icon: IconLayers },
  { id: "compress", label: "Compress", icon: IconShrink },
] as const;

const ASPECTS = [
  { id: "free", label: "Free", ratio: "4 / 5" },
  { id: "1:1", label: "1:1", ratio: "1 / 1" },
  { id: "4:5", label: "4:5", ratio: "4 / 5" },
  { id: "16:9", label: "16:9", ratio: "16 / 9" },
  { id: "9:16", label: "9:16", ratio: "9 / 16" },
] as const;

const VIDEO_FORMATS = [
  { id: "mp4", label: "MP4", codec: "H.264" },
  { id: "mov", label: "MOV", codec: "ProRes" },
  { id: "webm", label: "WebM", codec: "VP9" },
  { id: "gif", label: "GIF", codec: "—" },
] as const;

const PHOTO_FORMATS = [
  { id: "webp", label: "WebP", base: 600 },
  { id: "avif", label: "AVIF", base: 420 },
  { id: "jpeg", label: "JPEG", base: 900 },
  { id: "png", label: "PNG", base: 2400 },
] as const;

const DURATION = 24.6;

/* ---------------------------------- page ----------------------------------- */

export default function EditorPage() {
  const [mode, setMode] = useState<"video" | "photo">("video");
  const [tool, setTool] = useState<string | null>(null);

  // video state
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [trim, setTrim] = useState<[number, number]>([6.5, 22.1]);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(80);
  const [bitrate, setBitrate] = useState(3000); // kbps
  const [vFormat, setVFormat] = useState<(typeof VIDEO_FORMATS)[number]["id"]>("mp4");

  // photo state
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]["id"]>("4:5");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [quality, setQuality] = useState(80);
  const [pFormat, setPFormat] = useState<(typeof PHOTO_FORMATS)[number]["id"]>("webp");
  const [textSize, setTextSize] = useState(32);
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("center");

  // shared
  const [lut, setLut] = useState<(typeof LUTS)[number]["id"]>("none");
  const [lutIntensity, setLutIntensity] = useState(70);

  const tools = mode === "video" ? VIDEO_TOOLS : PHOTO_TOOLS;

  useEffect(() => {
    setTool(null);
  }, [mode]);

  // fake playback loop, clamped to trim range
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setPlayhead((p) => {
        const next = p + 0.2 * speed;
        return next >= trim[1] ? trim[0] : next;
      });
    }, 200);
    return () => clearInterval(id);
  }, [playing, speed, trim]);

  useEffect(() => {
    setPlayhead((p) => Math.min(Math.max(p, trim[0]), trim[1]));
  }, [trim]);

  const activeLut = LUTS.find((l) => l.id === lut)!;
  const lutMix = lutIntensity / 100;

  const previewFilter = useMemo(() => {
    if (mode === "photo") {
      const b = 100 + brightness + (activeLut.hue !== 0 ? 0 : 0);
      const c = 100 + contrast * (0.6 + lutMix * 0.4) + (activeLut.con - 100) * lutMix;
      const s = 100 + saturation + (activeLut.sat - 100) * lutMix;
      const h = activeLut.hue * lutMix;
      return `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg)`;
    }
    const c = 100 + (activeLut.con - 100) * lutMix;
    const s = 100 + (activeLut.sat - 100) * lutMix;
    const h = activeLut.hue * lutMix;
    return `contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg)`;
  }, [mode, brightness, contrast, saturation, activeLut, lutMix]);

  const clipDuration = trim[1] - trim[0];
  const estVideoMB = (bitrate * clipDuration) / 8 / 1000;
  const codec = VIDEO_FORMATS.find((f) => f.id === vFormat)!.codec;

  const photoBase = PHOTO_FORMATS.find((f) => f.id === pFormat)!.base;
  const estPhotoKB = Math.round((quality / 100) * photoBase);

  // derived, read-only "edit pipeline" chips
  const pipeline: string[] = [];
  if (mode === "video") {
    if (trim[0] > 0.2 || trim[1] < DURATION - 0.2) pipeline.push(`Trim ${fmtTime(trim[0])}–${fmtTime(trim[1])}`);
    if (speed !== 1) pipeline.push(`Speed ${speed}×`);
    if (volume !== 100) pipeline.push(`Volume ${volume}%`);
  } else {
    if (aspect !== "free") pipeline.push(`Crop ${aspect}`);
    if (brightness !== 0) pipeline.push(`Brightness ${brightness > 0 ? "+" : ""}${brightness}`);
    if (contrast !== 0) pipeline.push(`Contrast ${contrast > 0 ? "+" : ""}${contrast}`);
    if (saturation !== 0) pipeline.push(`Saturation ${saturation > 0 ? "+" : ""}${saturation}`);
  }
  if (lut !== "none") pipeline.push(`Filter · ${activeLut.label}`);

  return (
    <div className={`${grotesk.variable} ${plexMono.variable} root`}>
      {/* top bar */}
      <header className="topbar">
        <button className="iconbtn" aria-label="Back">
          <IconBack />
        </button>
        <div className="title">
          <span className="titleMain">Untitled edit</span>
          <span className="titleSub">{mode === "video" ? "video · 1080×1350" : "photo · 2400×3000"}</span>
        </div>
        <button className="exportbtn">Export</button>
      </header>

      <div className="metastrip">
        {mode === "video" ? (
          <span>≈ {estVideoMB.toFixed(1)} MB &nbsp;|&nbsp; {codec} &nbsp;|&nbsp; {fmtTime(clipDuration)}</span>
        ) : (
          <span>≈ {estPhotoKB} KB &nbsp;|&nbsp; {pFormat.toUpperCase()} &nbsp;|&nbsp; q{quality}</span>
        )}
      </div>

      {/* mode switch */}
      <div className="segwrap">
        <div className="segment" role="tablist" aria-label="Media type">
          {(["video", "photo"] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className={`segbtn ${mode === m ? "segActive" : ""}`}
              onClick={() => setMode(m)}
            >
              {m === "video" ? "Video" : "Photo"}
            </button>
          ))}
        </div>
      </div>

      {/* preview */}
      <div className="previewWrap">
        <div
          className="preview"
          style={{
            aspectRatio: mode === "photo" ? ASPECTS.find((a) => a.id === aspect)!.ratio : "9 / 16",
            filter: previewFilter,
          }}
        >
          <div className="previewArt" />
          {mode === "photo" && tool === "crop" && (
            <div className="cropGuides" aria-hidden>
              <span className="corner tl" />
              <span className="corner tr" />
              <span className="corner bl" />
              <span className="corner br" />
              <span className="gridline gl1" />
              <span className="gridline gl2" />
              <span className="gridline gh1" />
              <span className="gridline gh2" />
            </div>
          )}
          {mode === "photo" && tool === "text" && (
            <div
              className="previewText"
              style={{ fontSize: textSize, textAlign }}
            >
              Your caption
            </div>
          )}
        </div>

        {mode === "video" && (
          <div className="playbar">
            <button className="playbtn" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>
            <span className="timecode">{fmtTime(playhead)}</span>
            <div className="scrubTrack">
              <div
                className="scrubFill"
                style={{ width: `${((playhead - trim[0]) / (trim[1] - trim[0])) * 100}%` }}
              />
              <div
                className="scrubHead"
                style={{ left: `${((playhead - trim[0]) / (trim[1] - trim[0])) * 100}%` }}
              />
            </div>
            <span className="timecode timecodeMuted">{fmtTime(trim[1])}</span>
          </div>
        )}
      </div>

      {/* filmstrip + waveform, video only */}
      {mode === "video" && (
        <div className="filmstrip">
          <div className="frames">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="frame"
                style={{ background: `hsl(${(i * 27) % 360} 55% 88%)` }}
              />
            ))}
          </div>
          <div className="waveform">
            {Array.from({ length: 56 }).map((_, i) => {
              const h = 6 + Math.abs(Math.sin(i * 0.7) * 18) + Math.abs(Math.cos(i * 0.31) * 8);
              return <span key={i} style={{ height: `${h}px` }} />;
            })}
          </div>
        </div>
      )}

      {/* pipeline chips */}
      <div className="pipeline">
        {pipeline.length === 0 ? (
          <span className="pipelineHint">No edits applied yet — choose a tool below to begin.</span>
        ) : (
          pipeline.map((p, i) => (
            <span key={i} className="chip">
              {p}
            </span>
          ))
        )}
      </div>

      {/* tool rail */}
      <nav className="rail" aria-label="Tools">
        {tools.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              className={`railbtn ${active ? "railActive" : ""}`}
              onClick={() => setTool(active ? null : t.id)}
            >
              <Icon />
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* contextual bottom sheet */}
      {tool && (
        <div className="sheetOverlay" onClick={() => setTool(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheetHandle" />
            <div className="sheetHead">
              <span>{tools.find((t) => t.id === tool)?.label}</span>
              <button className="closebtn" onClick={() => setTool(null)} aria-label="Close">
                <IconChevronDown />
              </button>
            </div>

            <div className="sheetBody">
              {tool === "trim" && (
                <>
                  <Row label="In" value={fmtTime(trim[0])}>
                    <input
                      type="range"
                      min={0}
                      max={DURATION - 1}
                      step={0.1}
                      value={trim[0]}
                      onChange={(e) => setTrim([Math.min(+e.target.value, trim[1] - 1), trim[1]])}
                    />
                  </Row>
                  <Row label="Out" value={fmtTime(trim[1])}>
                    <input
                      type="range"
                      min={1}
                      max={DURATION}
                      step={0.1}
                      value={trim[1]}
                      onChange={(e) => setTrim([trim[0], Math.max(+e.target.value, trim[0] + 1)])}
                    />
                  </Row>
                  <p className="sheetNote">Duration {fmtTime(clipDuration)} of {fmtTime(DURATION)}</p>
                </>
              )}

              {tool === "speed" && (
                <>
                  <Row label="Speed" value={`${speed}×`}>
                    <input type="range" min={0.25} max={4} step={0.05} value={speed} onChange={(e) => setSpeed(+e.target.value)} />
                  </Row>
                  <div className="chipRow">
                    {[0.5, 1, 1.5, 2, 4].map((v) => (
                      <button key={v} className={`preset ${speed === v ? "presetActive" : ""}`} onClick={() => setSpeed(v)}>
                        {v}×
                      </button>
                    ))}
                  </div>
                </>
              )}

              {tool === "audio" && (
                <>
                  <Row label="Volume" value={`${volume}%`}>
                    <input type="range" min={0} max={150} value={volume} onChange={(e) => setVolume(+e.target.value)} />
                  </Row>
                  <p className="sheetNote">Waveform above reflects the current mix. Extraction and noise reduction run through ffmpeg's audio filters.</p>
                </>
              )}

              {tool === "format" && mode === "video" && (
                <>
                  <div className="chipRow">
                    {VIDEO_FORMATS.map((f) => (
                      <button key={f.id} className={`preset ${vFormat === f.id ? "presetActive" : ""}`} onClick={() => setVFormat(f.id)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="sheetNote">Codec: {codec}</p>
                </>
              )}

              {tool === "format" && mode === "photo" && (
                <>
                  <div className="chipRow">
                    {PHOTO_FORMATS.map((f) => (
                      <button key={f.id} className={`preset ${pFormat === f.id ? "presetActive" : ""}`} onClick={() => setPFormat(f.id)}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {tool === "compress" && mode === "video" && (
                <Row label="Bitrate" value={`${bitrate} kbps`}>
                  <input type="range" min={500} max={8000} step={100} value={bitrate} onChange={(e) => setBitrate(+e.target.value)} />
                </Row>
              )}

              {tool === "compress" && mode === "photo" && (
                <Row label="Quality" value={`${quality}`}>
                  <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(+e.target.value)} />
                </Row>
              )}

              {tool === "crop" && (
                <div className="chipRow">
                  {ASPECTS.map((a) => (
                    <button key={a.id} className={`preset ${aspect === a.id ? "presetActive" : ""}`} onClick={() => setAspect(a.id)}>
                      {a.label}
                    </button>
                  ))}
                </div>
              )}

              {tool === "adjust" && (
                <>
                  <Row label="Brightness" value={`${brightness}`}>
                    <input type="range" min={-50} max={50} value={brightness} onChange={(e) => setBrightness(+e.target.value)} />
                  </Row>
                  <Row label="Contrast" value={`${contrast}`}>
                    <input type="range" min={-50} max={50} value={contrast} onChange={(e) => setContrast(+e.target.value)} />
                  </Row>
                  <Row label="Saturation" value={`${saturation}`}>
                    <input type="range" min={-50} max={50} value={saturation} onChange={(e) => setSaturation(+e.target.value)} />
                  </Row>
                  <Row label="Sharpness" value={`${sharpness}`}>
                    <input type="range" min={0} max={100} value={sharpness} onChange={(e) => setSharpness(+e.target.value)} />
                  </Row>
                </>
              )}

              {tool === "text" && (
                <>
                  <Row label="Size" value={`${textSize}px`}>
                    <input type="range" min={16} max={72} value={textSize} onChange={(e) => setTextSize(+e.target.value)} />
                  </Row>
                  <div className="chipRow">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button key={a} className={`preset ${textAlign === a ? "presetActive" : ""}`} onClick={() => setTextAlign(a)}>
                        {a}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {tool === "filters" && (
                <>
                  <div className="lutRow">
                    {LUTS.map((l) => (
                      <button key={l.id} className={`lutSwatch ${lut === l.id ? "lutActive" : ""}`} onClick={() => setLut(l.id)}>
                        <span
                          className="lutPreview"
                          style={{ filter: `saturate(${l.sat}%) contrast(${l.con}%) hue-rotate(${l.hue}deg)` }}
                        />
                        <span className="lutLabel">{l.label}</span>
                      </button>
                    ))}
                  </div>
                  <Row label="Intensity" value={`${lutIntensity}%`}>
                    <input type="range" min={0} max={100} value={lutIntensity} onChange={(e) => setLutIntensity(+e.target.value)} />
                  </Row>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(html, body) {
          background: #f6f6f3;
        }
        .root {
          --bg: #f6f6f3;
          --surface: #ffffff;
          --border: #e3e3df;
          --ink: #14171a;
          --ink-soft: #5b6065;
          --accent: #2f5fed;
          --render: #17a673;
          font-family: var(--font-sans), system-ui, sans-serif;
          color: var(--ink);
          background: var(--bg);
          max-width: 560px;
          margin: 0 auto;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding-bottom: 12px;
        }

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
          font-size: 14px;
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
        .preview {
          position: relative;
          width: 100%;
          border-radius: 18px;
          overflow: hidden;
          background: #111;
          transition: filter 120ms ease, aspect-ratio 200ms ease;
        }
        .previewArt {
          position: absolute;
          inset: 0;
          background: linear-gradient(155deg, #3a4a7a 0%, #b8618f 42%, #f2a34f 78%, #ffd98e 100%);
        }
        .previewArt::after {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.25), transparent 55%),
            radial-gradient(circle at 75% 85%, rgba(0, 0, 0, 0.35), transparent 60%);
        }
        .cropGuides {
          position: absolute;
          inset: 8%;
          pointer-events: none;
        }
        .corner {
          position: absolute;
          width: 18px;
          height: 18px;
          border: 2px solid #fff;
        }
        .tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
        .tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
        .bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
        .br { bottom: -2px; right: -2px; border-left: none; border-top: none; }
        .gridline {
          position: absolute;
          background: rgba(255, 255, 255, 0.4);
        }
        .gl1 { left: 33.3%; top: 0; bottom: 0; width: 1px; }
        .gl2 { left: 66.6%; top: 0; bottom: 0; width: 1px; }
        .gh1 { top: 33.3%; left: 0; right: 0; height: 1px; }
        .gh2 { top: 66.6%; left: 0; right: 0; height: 1px; }
        .previewText {
          position: absolute;
          left: 8%;
          right: 8%;
          bottom: 14%;
          color: #fff;
          font-weight: 600;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
        }

        .playbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 4px 4px;
        }
        .playbtn {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--ink);
          color: #fff;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .timecode {
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          width: 34px;
        }
        .timecodeMuted {
          color: var(--ink-soft);
          text-align: right;
        }
        .scrubTrack {
          position: relative;
          flex: 1;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
        }
        .scrubFill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: var(--accent);
          border-radius: 2px;
        }
        .scrubHead {
          position: absolute;
          top: 50%;
          width: 12px;
          height: 12px;
          background: var(--accent);
          border: 2px solid #fff;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 0 1px var(--border);
        }

        .filmstrip {
          padding: 14px 16px 0;
        }
        .frames {
          display: flex;
          gap: 3px;
          overflow-x: auto;
          border-radius: 8px;
        }
        .frame {
          width: 34px;
          height: 44px;
          flex-shrink: 0;
          border-radius: 3px;
        }
        .waveform {
          display: flex;
          align-items: flex-end;
          gap: 2px;
          height: 26px;
          margin-top: 6px;
        }
        .waveform span {
          flex: 1;
          background: var(--accent);
          opacity: 0.55;
          border-radius: 1px;
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

        .rail {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding: 4px 16px 18px;
        }
        .railbtn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          min-width: 64px;
          padding: 10px 6px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--ink-soft);
          flex-shrink: 0;
        }
        .railbtn span {
          font-size: 11px;
          font-weight: 500;
        }
        .railActive {
          border-color: var(--accent);
          color: var(--accent);
          background: #eef2ff;
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
          margin-bottom: 14px;
        }
        .closebtn {
          border: none;
          background: transparent;
          color: var(--ink-soft);
          padding: 4px;
        }
        .sheetBody {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .sheetNote {
          font-size: 12.5px;
          color: var(--ink-soft);
          line-height: 1.5;
          margin: 0;
        }

        .row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rowHead {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .rowHead span:first-child {
          color: var(--ink-soft);
        }
        .rowHead span:last-child {
          font-family: var(--font-mono), monospace;
        }

        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          accent-color: var(--accent);
        }

        .chipRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .preset {
          border: 1px solid var(--border);
          background: var(--surface);
          padding: 7px 14px;
          border-radius: 999px;
          font-size: 13px;
          color: var(--ink);
          text-transform: capitalize;
        }
        .presetActive {
          background: var(--ink);
          color: #fff;
          border-color: var(--ink);
        }

        .lutRow {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .lutSwatch {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          border: none;
          background: transparent;
          flex-shrink: 0;
        }
        .lutPreview {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          background: linear-gradient(155deg, #3a4a7a 0%, #b8618f 42%, #f2a34f 78%, #ffd98e 100%);
          border: 2px solid transparent;
          display: block;
        }
        .lutActive .lutPreview {
          border-color: var(--accent);
        }
        .lutLabel {
          font-size: 10.5px;
          color: var(--ink-soft);
          max-width: 60px;
          text-align: center;
          line-height: 1.2;
        }

        @media (min-width: 640px) {
          .root {
            padding-top: 8px;
          }
          .preview {
            border-radius: 22px;
          }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <div className="rowHead">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      {children}
      <style jsx>{`
        .row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rowHead {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .rowHead span:first-child {
          color: #5b6065;
        }
        .rowHead span:last-child {
          font-family: var(--font-mono), monospace;
        }
      `}</style>
    </div>
  );
}
