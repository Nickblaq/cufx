"use client";

import { useEffect, useState } from "react";
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

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
type IconProps = { size?: number };

function IconBack({ size = 20 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M15 5 8 12l7 7" /></svg>;
}
function IconLink({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M10 14a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66L11.5 6.7" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 0 0 5.66 5.66l1.17-1.17" />
    </svg>
  );
}
function IconPaste({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <rect x="7" y="4" width="10" height="4" rx="1" />
      <path d="M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2" />
    </svg>
  );
}
function IconChevronDown({ size = 16 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="m6 9 6 6 6-6" /></svg>;
}
function IconCheck({ size = 14 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M4 12.5 9 18 20 6" /></svg>;
}
function IconX({ size = 14 }: IconProps) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}><path d="M6 6l12 12M18 6 6 18" /></svg>;
}

/* --------------------------------- helpers -------------------------------- */

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function fmtSize(mb: number) {
  return mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

const VIDEO_FORMATS = [
  { id: "2160p60", label: "2160p60", ext: "MP4", detail: "AV1", mb: 1100, badge: "Best" },
  { id: "1080p60", label: "1080p60", ext: "MP4", detail: "H.264", mb: 412 },
  { id: "1080p", label: "1080p", ext: "WebM", detail: "VP9", mb: 298 },
  { id: "720p", label: "720p", ext: "MP4", detail: "H.264", mb: 164 },
  { id: "480p", label: "480p", ext: "MP4", detail: "H.264", mb: 88 },
] as const;

const AUDIO_FORMATS = [
  { id: "best-m4a", label: "Best audio", ext: "M4A", detail: "128 kbps", mb: 11.2, badge: "Best" },
  { id: "mp3-320", label: "MP3 320", ext: "MP3", detail: "converted", mb: 28 },
  { id: "opus-160", label: "Opus", ext: "OPUS", detail: "160 kbps", mb: 14 },
  { id: "flac", label: "FLAC", ext: "FLAC", detail: "lossless", mb: 64 },
] as const;

const SUBS = [
  { code: "en", label: "English", auto: false },
  { code: "en-auto", label: "English", auto: true },
  { code: "pt", label: "Portuguese", auto: false },
  { code: "ja", label: "Japanese", auto: true },
] as const;

const TOPICS = [
  "Setting up the environment", "Tensors from scratch", "Autograd internals",
  "Building a linear layer", "Loss functions explained", "Backpropagation by hand",
  "Optimizers: SGD to Adam", "Convolutions visually", "Recurrent networks",
  "Attention mechanism", "Building a transformer block", "Tokenization strategies",
  "Training loop from scratch", "Regularization techniques", "Batch normalization",
  "Learning rate schedules", "Evaluating models", "Shipping to production",
];

const PLAYLIST_ITEMS = TOPICS.map((t, i) => ({
  id: `pl-${i}`,
  title: `Lesson ${i + 1}: ${t}`,
  duration: 300 + ((i * 37) % 600),
}));

const SINGLE_VIDEO = {
  title: "How Attention Actually Works — Building It From Scratch",
  uploader: "Tunde Codes",
  duration: 743,
  views: "842K views",
  uploaded: "2 weeks ago",
};

const PLAYLIST = {
  title: "Deep Learning From Scratch — Full Course",
  uploader: "Tunde Codes",
  count: PLAYLIST_ITEMS.length,
  totalDuration: PLAYLIST_ITEMS.reduce((a, b) => a + b.duration, 0),
};

type Job = {
  id: number;
  title: string;
  ext: string;
  size: number; // MB, frozen at creation
  speed: number; // MB/s, frozen at creation
  progress: number;
};

let jobSeq = 1;

/* ---------------------------------- page ----------------------------------- */

export default function ExtractPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState<"none" | "video" | "playlist">("none");

  const [mode, setMode] = useState<"video" | "audio">("video");
  const [format, setFormat] = useState<string>(VIDEO_FORMATS[1].id);

  const [subsOn, setSubsOn] = useState(false);
  const [subLangs, setSubLangs] = useState<string[]>(["en"]);
  const [embedSubs, setEmbedSubs] = useState(true);

  const [clipOn, setClipOn] = useState(false);
  const [clip, setClip] = useState<[number, number]>([0, SINGLE_VIDEO.duration]);

  const [embedThumb, setEmbedThumb] = useState(true);
  const [embedMeta, setEmbedMeta] = useState(true);
  const [sponsorBlock, setSponsorBlock] = useState(false);
  const [saveChapters, setSaveChapters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set(PLAYLIST_ITEMS.map((i) => i.id)));
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const [queue, setQueue] = useState<Job[]>([]);

  function loadExample(kind: "video" | "playlist") {
    setLoading(true);
    setUrl(kind === "video" ? "https://youtube.com/watch?v=9fN2vX3ab" : "https://youtube.com/playlist?list=PLdl9k2exampl");
    setTimeout(() => {
      setLoading(false);
      setResolved(kind);
      setMode("video");
      setFormat(VIDEO_FORMATS[1].id);
      setClip([0, kind === "video" ? SINGLE_VIDEO.duration : PLAYLIST_ITEMS[0].duration]);
    }, 750);
  }

  useEffect(() => {
    setFormat(mode === "video" ? VIDEO_FORMATS[1].id : AUDIO_FORMATS[0].id);
  }, [mode]);

  const formats = mode === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;
  const activeFormat = formats.find((f) => f.id === format) ?? formats[0];
  const selectedCount = resolved === "playlist" ? selected.size : 1;
  const estimateMB = activeFormat.mb * (resolved === "playlist" ? Math.max(selectedCount, 1) : 1);

  function toggleSub(code: string) {
    setSubLangs((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }
  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === PLAYLIST_ITEMS.length ? new Set() : new Set(PLAYLIST_ITEMS.map((i) => i.id))));
  }

  function extract() {
    const ext = activeFormat.ext;
    const jobs: Job[] =
      resolved === "playlist"
        ? PLAYLIST_ITEMS.filter((i) => selected.has(i.id)).map((i) => ({
            id: jobSeq++,
            title: i.title,
            ext,
            size: activeFormat.mb,
            speed: 2.5 + Math.random() * 4,
            progress: 0,
          }))
        : [
            {
              id: jobSeq++,
              title: SINGLE_VIDEO.title,
              ext,
              size: estimateMB,
              speed: 2.5 + Math.random() * 4,
              progress: 0,
            },
          ];
    setQueue((prev) => [...jobs, ...prev]);
  }

  // progress ticker
  useEffect(() => {
    if (queue.length === 0 || queue.every((j) => j.progress >= 100)) return;
    const id = setInterval(() => {
      setQueue((prev) =>
        prev.map((j) => {
          if (j.progress >= 100) return j;
          const totalTimeSec = j.size / j.speed;
          const delta = (0.5 / totalTimeSec) * 100;
          return { ...j, progress: Math.min(100, j.progress + delta) };
        })
      );
    }, 500);
    return () => clearInterval(id);
  }, [queue]);

  function statusFor(p: number) {
    if (p >= 100) return "Done";
    if (p < 6) return "Fetching";
    if (p < 94) return "Downloading";
    return "Merging";
  }
  function cancelJob(id: number) {
    setQueue((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <div className={`${grotesk.variable} ${plexMono.variable} root`}>
      <header className="topbar">
        <button className="iconbtn" aria-label="Back">
          <IconBack />
        </button>
        <div className="title">
          <span className="titleMain">Extract</span>
          <span className="titleSub">video &amp; audio, from any link</span>
        </div>
      </header>

      <div className="urlRow">
        <div className="urlField">
          <IconLink />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a YouTube, Vimeo, or SoundCloud link"
          />
          <button className="pastebtn" aria-label="Paste">
            <IconPaste />
          </button>
        </div>
        {resolved === "none" && (
          <div className="chipRow">
            <button className="preset" onClick={() => loadExample("video")}>
              Try a video
            </button>
            <button className="preset" onClick={() => loadExample("playlist")}>
              Try a playlist
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="card shimmer">
          <div className="shimmerThumb" />
          <div className="shimmerLines">
            <span />
            <span style={{ width: "60%" }} />
            <span style={{ width: "40%" }} />
          </div>
        </div>
      )}

      {!loading && resolved !== "none" && (
        <>
          <div className="metastrip">
            ≈ {fmtSize(estimateMB)} &nbsp;|&nbsp; {activeFormat.ext} &nbsp;|&nbsp; {activeFormat.detail}
            {resolved === "playlist" && (
              <>
                {" "}
                &nbsp;|&nbsp; {selectedCount} item{selectedCount === 1 ? "" : "s"}
              </>
            )}
          </div>

          {resolved === "video" && (
            <div className="card meta">
              <div className="thumb" />
              <div className="metaBody">
                <span className="metaTitle">{SINGLE_VIDEO.title}</span>
                <span className="metaSub">
                  <span className="avatar">{SINGLE_VIDEO.uploader[0]}</span>
                  {SINGLE_VIDEO.uploader}
                </span>
                <span className="metaLine">
                  {fmtTime(SINGLE_VIDEO.duration)} &nbsp;·&nbsp; {SINGLE_VIDEO.views} &nbsp;·&nbsp; {SINGLE_VIDEO.uploaded}
                </span>
              </div>
            </div>
          )}

          {resolved === "playlist" && (
            <div className="card meta">
              <div className="thumb thumbStack" />
              <div className="metaBody">
                <span className="metaTitle">{PLAYLIST.title}</span>
                <span className="metaSub">
                  <span className="avatar">{PLAYLIST.uploader[0]}</span>
                  {PLAYLIST.uploader}
                </span>
                <span className="metaLine">
                  {PLAYLIST.count} videos &nbsp;·&nbsp; {fmtTime(PLAYLIST.totalDuration)} total
                </span>
              </div>
            </div>
          )}

          {resolved === "playlist" && (
            <div className="playlistBox">
              <button className="playlistHead" onClick={() => setPlaylistOpen((o) => !o)}>
                <span>
                  {selected.size} of {PLAYLIST.count} selected
                </span>
                <span className={`chev ${playlistOpen ? "chevOpen" : ""}`}>
                  <IconChevronDown />
                </span>
              </button>
              {playlistOpen && (
                <div className="playlistList">
                  <label className="plRow plAll">
                    <input type="checkbox" checked={selected.size === PLAYLIST.count} onChange={toggleAll} />
                    <span>Select all</span>
                  </label>
                  {PLAYLIST_ITEMS.map((item) => (
                    <label key={item.id} className="plRow">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleItem(item.id)} />
                      <span className="plTitle">{item.title}</span>
                      <span className="plDur">{fmtTime(item.duration)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <Section title="Extract as">
            <div className="segment">
              {(["video", "audio"] as const).map((m) => (
                <button key={m} className={`segbtn ${mode === m ? "segActive" : ""}`} onClick={() => setMode(m)}>
                  {m === "video" ? "Video" : "Audio only"}
                </button>
              ))}
            </div>
          </Section>

          <Section title="Quality">
            <div className="formatList">
              {formats.map((f) => (
                <button key={f.id} className={`formatRow ${format === f.id ? "formatActive" : ""}`} onClick={() => setFormat(f.id)}>
                  <span className="formatRadio" />
                  <span className="formatMain">
                    <span className="formatLabel">
                      {f.label}
                      {"badge" in f && f.badge && <span className="badge">{f.badge}</span>}
                    </span>
                    <span className="formatDetail">
                      {f.ext} &nbsp;·&nbsp; {f.detail}
                    </span>
                  </span>
                  <span className="formatSize">{fmtSize(f.mb)}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Subtitles">
            <ToggleRow label="Include subtitles" checked={subsOn} onChange={setSubsOn} />
            {subsOn && (
              <>
                <div className="chipRow">
                  {SUBS.map((s) => (
                    <button
                      key={s.code}
                      className={`preset ${subLangs.includes(s.code) ? "presetActive" : ""}`}
                      onClick={() => toggleSub(s.code)}
                    >
                      {s.label}
                      {s.auto ? " (auto)" : ""}
                    </button>
                  ))}
                </div>
                <ToggleRow label="Embed in file" description="Off saves a separate .srt" checked={embedSubs} onChange={setEmbedSubs} />
              </>
            )}
          </Section>

          {resolved === "video" && (
            <Section title="Range">
              <ToggleRow label="Extract a clip" description="Off downloads the full length" checked={clipOn} onChange={setClipOn} />
              {clipOn && (
                <>
                  <Row label="In" value={fmtTime(clip[0])}>
                    <input
                      type="range"
                      min={0}
                      max={SINGLE_VIDEO.duration - 1}
                      value={clip[0]}
                      onChange={(e) => setClip([Math.min(+e.target.value, clip[1] - 1), clip[1]])}
                    />
                  </Row>
                  <Row label="Out" value={fmtTime(clip[1])}>
                    <input
                      type="range"
                      min={1}
                      max={SINGLE_VIDEO.duration}
                      value={clip[1]}
                      onChange={(e) => setClip([clip[0], Math.max(+e.target.value, clip[0] + 1)])}
                    />
                  </Row>
                </>
              )}
            </Section>
          )}

          <Section title="Extras">
            <ToggleRow label="Embed thumbnail" checked={embedThumb} onChange={setEmbedThumb} />
            <ToggleRow label="Embed metadata" description="Chapters, tags, uploader info" checked={embedMeta} onChange={setEmbedMeta} />
            <ToggleRow label="Skip sponsor segments" description="via SponsorBlock" checked={sponsorBlock} onChange={setSponsorBlock} />
            <ToggleRow label="Save chapters as .txt" checked={saveChapters} onChange={setSaveChapters} />
          </Section>

          <div className="extractBarSpacer" />
          <div className="extractBar">
            <button className="extractbtn" onClick={extract}>
              {resolved === "playlist" ? `Extract ${selectedCount} item${selectedCount === 1 ? "" : "s"}` : "Extract"}
            </button>
          </div>
        </>
      )}

      {queue.length > 0 && (
        <div className="queueSection">
          <span className="queueTitle">Queue · {queue.length}</span>
          <div className="queueList">
            {queue.map((j) => {
              const status = statusFor(j.progress);
              const remainingSec = Math.max(0, ((100 - j.progress) / 100) * (j.size / j.speed));
              return (
                <div key={j.id} className="queueRow">
                  <div className="queueTop">
                    <span className="queueName">{j.title}</span>
                    {status === "Done" ? (
                      <span className="doneIcon">
                        <IconCheck />
                      </span>
                    ) : (
                      <button className="cancelbtn" onClick={() => cancelJob(j.id)} aria-label="Cancel">
                        <IconX />
                      </button>
                    )}
                  </div>
                  <div className="queueBar">
                    <div className="queueFill" style={{ width: `${j.progress}%` }} />
                  </div>
                  <div className="queueMeta">
                    <span>{status}</span>
                    <span>{status === "Done" ? fmtSize(j.size) : `${j.speed.toFixed(1)} MB/s · ${fmtTime(remainingSec)} left`}</span>
                  </div>
                </div>
              );
            })}
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
          padding-bottom: 32px;
        }

        .topbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 10px;
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
          flex-shrink: 0;
        }
        .title {
          display: flex;
          flex-direction: column;
        }
        .titleMain {
          font-size: 17px;
          font-weight: 600;
          line-height: 1.2;
        }
        .titleSub {
          font-size: 12px;
          color: var(--ink-soft);
        }

        .urlRow {
          padding: 0 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .urlField {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 11px 12px;
          color: var(--ink-soft);
        }
        .urlField input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 14px;
          font-family: var(--font-sans), sans-serif;
          color: var(--ink);
          background: transparent;
          min-width: 0;
        }
        .pastebtn {
          border: none;
          background: transparent;
          color: var(--ink-soft);
          flex-shrink: 0;
        }

        .card {
          margin: 0 16px 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px;
        }
        .shimmer {
          display: flex;
          gap: 12px;
        }
        .shimmerThumb {
          width: 88px;
          height: 64px;
          border-radius: 10px;
          background: linear-gradient(90deg, #ececea 25%, #f5f5f3 37%, #ececea 63%);
          background-size: 400% 100%;
          animation: shimmer 1.4s ease infinite;
          flex-shrink: 0;
        }
        .shimmerLines {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          justify-content: center;
        }
        .shimmerLines span {
          height: 10px;
          border-radius: 5px;
          background: linear-gradient(90deg, #ececea 25%, #f5f5f3 37%, #ececea 63%);
          background-size: 400% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }

        .metastrip {
          padding: 0 16px 12px;
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          color: var(--render);
        }

        .meta {
          display: flex;
          gap: 12px;
        }
        .thumb {
          width: 88px;
          height: 64px;
          border-radius: 10px;
          flex-shrink: 0;
          background: linear-gradient(155deg, #3a4a7a 0%, #b8618f 42%, #f2a34f 78%, #ffd98e 100%);
        }
        .thumbStack {
          box-shadow: 4px 4px 0 -2px var(--surface), 4px 4px 0 0 var(--border), 8px 8px 0 -2px var(--surface),
            8px 8px 0 0 var(--border);
        }
        .metaBody {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .metaTitle {
          font-size: 14px;
          font-weight: 600;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .metaSub {
          font-size: 12.5px;
          color: var(--ink-soft);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .avatar {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--ink);
          color: #fff;
          font-size: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .metaLine {
          font-size: 12px;
          color: var(--ink-soft);
          font-family: var(--font-mono), monospace;
        }

        .playlistBox {
          margin: 0 16px 14px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
          overflow: hidden;
        }
        .playlistHead {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 14px;
          border: none;
          background: transparent;
          font-size: 13.5px;
          font-weight: 500;
        }
        .chev {
          color: var(--ink-soft);
          display: flex;
          transition: transform 150ms ease;
        }
        .chevOpen {
          transform: rotate(180deg);
        }
        .playlistList {
          border-top: 1px solid var(--border);
          max-height: 260px;
          overflow-y: auto;
        }
        .plRow {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px;
          font-size: 13px;
          border-bottom: 1px solid var(--border);
        }
        .plAll {
          font-weight: 600;
          background: var(--bg);
        }
        .plTitle {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .plDur {
          font-family: var(--font-mono), monospace;
          color: var(--ink-soft);
          font-size: 11.5px;
        }

        .segment {
          display: flex;
          background: var(--bg);
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

        .formatList {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .formatRow {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 12px;
          padding: 10px 12px;
          text-align: left;
        }
        .formatActive {
          border-color: var(--accent);
          background: #eef2ff;
        }
        .formatRadio {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1.6px solid var(--border);
          flex-shrink: 0;
          position: relative;
        }
        .formatActive .formatRadio {
          border-color: var(--accent);
        }
        .formatActive .formatRadio::after {
          content: "";
          position: absolute;
          inset: 3px;
          border-radius: 50%;
          background: var(--accent);
        }
        .formatMain {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .formatLabel {
          font-size: 13.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .badge {
          font-size: 10px;
          font-weight: 600;
          color: var(--render);
          background: #e6f7f1;
          padding: 1px 6px;
          border-radius: 999px;
        }
        .formatDetail {
          font-size: 12px;
          color: var(--ink-soft);
        }
        .formatSize {
          font-family: var(--font-mono), monospace;
          font-size: 12px;
          color: var(--ink-soft);
          flex-shrink: 0;
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
        }
        .presetActive {
          background: var(--ink);
          color: #fff;
          border-color: var(--ink);
        }

        .extractBarSpacer {
          height: 8px;
        }
        .extractBar {
          padding: 10px 16px 4px;
        }
        .extractbtn {
          width: 100%;
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 14px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          font-family: var(--font-sans), sans-serif;
        }

        .queueSection {
          padding: 18px 16px 0;
        }
        .queueTitle {
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-soft);
        }
        .queueList {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }
        .queueRow {
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 14px;
          padding: 12px;
        }
        .queueTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .queueName {
          font-size: 13px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cancelbtn {
          border: none;
          background: var(--bg);
          color: var(--ink-soft);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .doneIcon {
          color: var(--render);
          display: flex;
          flex-shrink: 0;
        }
        .queueBar {
          height: 5px;
          border-radius: 3px;
          background: var(--bg);
          overflow: hidden;
        }
        .queueFill {
          height: 100%;
          background: var(--accent);
          border-radius: 3px;
          transition: width 480ms linear;
        }
        .queueMeta {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 11px;
          font-family: var(--font-mono), monospace;
          color: var(--ink-soft);
        }

        input[type="range"] {
          -webkit-appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: var(--border);
          accent-color: var(--accent);
        }
      `}</style>
    </div>
  );
}

/* -------------------------------- fragments -------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="section">
      <span className="sectionTitle">{title}</span>
      <div className="sectionBody">{children}</div>
      <style jsx>{`
        .section {
          padding: 0 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sectionTitle {
          font-size: 13px;
          font-weight: 600;
          color: #5b6065;
        }
        .sectionBody {
          display: flex;
          flex-direction: column;
          gap: 12px;
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

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button className="toggleRow" onClick={() => onChange(!checked)}>
      <span className="toggleText">
        <span className="toggleLabel">{label}</span>
        {description && <span className="toggleDesc">{description}</span>}
      </span>
      <span className={`switch ${checked ? "switchOn" : ""}`}>
        <span className="switchKnob" />
      </span>
      <style jsx>{`
        .toggleRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: none;
          background: transparent;
          padding: 0;
          text-align: left;
          width: 100%;
        }
        .toggleText {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .toggleLabel {
          font-size: 13.5px;
          font-weight: 500;
        }
        .toggleDesc {
          font-size: 11.5px;
          color: #5b6065;
        }
        .switch {
          width: 40px;
          height: 24px;
          border-radius: 12px;
          background: #e3e3df;
          flex-shrink: 0;
          position: relative;
          transition: background 150ms ease;
        }
        .switchOn {
          background: #2f5fed;
        }
        .switchKnob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          transition: transform 150ms ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        .switchOn .switchKnob {
          transform: translateX(16px);
        }
      `}</style>
    </button>
  );
}
