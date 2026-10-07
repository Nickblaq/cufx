"use client";

import { useEffect, useRef, useState } from "react";
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

function IconLink({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M10 14a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66L11.5 6.7" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 0 0 5.66 5.66l1.17-1.17" />
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
function IconDownload({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

/* --------------------------------- helpers -------------------------------- */

function fmtTime(sec: number) {
  if (!Number.isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function fmtBytes(bytes: number | null | undefined) {
  if (!bytes) return "~";
  const mb = bytes / 1024 / 1024;
  return mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}
function fmtSpeed(bytesPerSec: number | null | undefined) {
  if (!bytesPerSec) return "";
  return `${(bytesPerSec / 1024 / 1024).toFixed(1)} MB/s`;
}

/* --------------------------------- types ---------------------------------- */

type VideoFormat = {
  formatId: string;
  height: number;
  ext: string;
  vcodec: string;
  hasAudio: boolean;
  filesizeBytes: number | null;
  fps: number | null;
};
type SubtitleTrack = { code: string; auto: boolean; label: string };
type PlaylistEntry = { id: string; url: string; title: string; duration: number | null };

type ResolvedVideo = {
  type: "video";
  title: string;
  uploader: string;
  duration: number;
  thumbnail: string | null;
  videoFormats: VideoFormat[];
  hasAudio: boolean;
  subtitles: SubtitleTrack[];
};
type ResolvedPlaylist = {
  type: "playlist";
  title: string;
  uploader: string;
  entries: PlaylistEntry[];
};
type ResolvedError = { type: "error"; message: string };
type Resolved = ResolvedVideo | ResolvedPlaylist | ResolvedError;

const AUDIO_CHOICES = [
  { id: "best", label: "Best audio", ext: "M4A/original" },
  { id: "mp3", label: "MP3", ext: "MP3 · converted" },
  { id: "opus", label: "Opus", ext: "OPUS" },
  { id: "flac", label: "FLAC", ext: "FLAC · lossless" },
] as const;

type Job = {
  id: string; // real jobId from the server
  title: string;
  status: string;
  progress: number;
  downloadedBytes: number;
  totalBytes: number | null;
  speed: number | null;
  error: string | null;
  filename: string | null;
};

/* ---------------------------------- page ----------------------------------- */

export default function ExtractPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Resolved | null>(null);

  const [mode, setMode] = useState<"video" | "audio">("video");
  const [videoHeight, setVideoHeight] = useState<number | null>(null);
  const [audioChoice, setAudioChoice] = useState<(typeof AUDIO_CHOICES)[number]["id"]>("best");

  const [subsOn, setSubsOn] = useState(false);
  const [subLangs, setSubLangs] = useState<string[]>([]);
  const [embedSubs, setEmbedSubs] = useState(true);

  const [clipOn, setClipOn] = useState(false);
  const [clip, setClip] = useState<[number, number]>([0, 0]);

  const [embedThumb, setEmbedThumb] = useState(true);
  const [embedMeta, setEmbedMeta] = useState(true);
  const [sponsorBlock, setSponsorBlock] = useState(false);
  const [saveChapters, setSaveChapters] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const [queue, setQueue] = useState<Job[]>([]);
  const pollersRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  async function resolveUrl() {
    if (!url.trim()) return;
    setLoading(true);
    setResolveError(null);
    setResolved(null);
    try {
      const res = await fetch("/api/extract/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: Resolved = await res.json();
      if (!res.ok || data.type === "error") {
        setResolveError("message" in data ? data.message : "Could not resolve this link" );
        setResolved(null);
      } else {
        setResolved(data);
        if (data.type === "video") {
          setVideoHeight(data.videoFormats[0]?.height ?? null);
          setClip([0, data.duration]);
          setSubLangs(data.subtitles[0] ? [data.subtitles[0].code + (data.subtitles[0].auto ? "-auto" : "")] : []);
        } else {
          setSelected(new Set(data.entries.map((e) => e.id)));
        }
        setMode("video");
      }
    } catch {
      setResolveError("Network error — could not reach the server");
    } finally {
      setLoading(false);
    }
  }

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
    if (resolved?.type !== "playlist") return;
    setSelected((prev) => (prev.size === resolved.entries.length ? new Set() : new Set(resolved.entries.map((e) => e.id))));
  }

  function pollJob(jobId: string) {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/extract/status?jobId=${jobId}`);
        const s = await res.json();
        setQueue((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: s.status,
                  progress: s.progress ?? j.progress,
                  downloadedBytes: s.downloadedBytes ?? j.downloadedBytes,
                  totalBytes: s.totalBytes ?? j.totalBytes,
                  speed: s.speed ?? null,
                  error: s.error ?? null,
                  filename: s.filename ?? j.filename,
                }
              : j
          )
        );
        if (s.status === "done" || s.status === "error") {
          clearInterval(id);
          pollersRef.current.delete(jobId);
        }
      } catch {
        // transient fetch failure — keep polling, next tick may succeed
      }
    }, 1000);
    pollersRef.current.set(jobId, id);
  }

  useEffect(() => {
    return () => {
      pollersRef.current.forEach((id) => clearInterval(id));
    };
  }, []);

  async function extract() {
    if (!resolved) return;

    const common = {
      mode,
      height: mode === "video" ? videoHeight ?? undefined : undefined,
      audioFormat: mode === "audio" ? audioChoice : undefined,
      subsOn,
      subLangs,
      embedSubs,
      embedThumb,
      embedMeta,
      sponsorBlock,
      saveChapters,
    };

    let items: Array<Record<string, unknown>> = [];
    let titles: string[] = [];

    if (resolved.type === "video") {
      items = [{
        ...common,
        url,
        clipOn,
        clipStart: clipOn ? clip[0] : undefined,
        clipEnd: clipOn ? clip[1] : undefined,
      }];
      titles = [resolved.title];
    } else if (resolved.type === "playlist") {
      const chosen = resolved.entries.filter((e) => selected.has(e.id));
      items = chosen.map((e) => ({ ...common, url: e.url }));
      titles = chosen.map((e) => e.title);
    } else {
      return; // resolved.type === "error" — extract() shouldn't be reachable here
    }

    const res = await fetch("/api/extract/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (!res.ok || !data.jobIds) return;

    const newJobs: Job[] = data.jobIds.map((jobId: string, i: number) => ({
      id: jobId,
      title: titles[i] ?? "Untitled",
      status: "starting",
      progress: 0,
      downloadedBytes: 0,
      totalBytes: null,
      speed: null,
      error: null,
      filename: null,
    }));
    setQueue((prev) => [...newJobs, ...prev]);
    newJobs.forEach((j) => pollJob(j.id));
  }

  function cancelJob(id: string) {
    const poller = pollersRef.current.get(id);
    if (poller) clearInterval(poller);
    pollersRef.current.delete(id);
    setQueue((prev) => prev.filter((j) => j.id !== id));
  }

  const isPlaylist = resolved?.type === "playlist";
  const isVideo = resolved?.type === "video";
  const activeVideoFormat = isVideo ? resolved.videoFormats.find((f) => f.height === videoHeight) : undefined;
  const selectedCount = isPlaylist ? selected.size : 1;

  return (
    <div className={`${grotesk.variable} ${plexMono.variable} `}>
      <header className="topbar">
        <a className="iconbtn" href="/" aria-label="Back">
          <svg width={20} height={20} viewBox="0 0 24 24" {...stroke}><path d="M15 5 8 12l7 7" /></svg>
        </a>
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
            onKeyDown={(e) => e.key === "Enter" && resolveUrl()}
            placeholder="Paste a YouTube, Vimeo, or SoundCloud link"
          />
          <button className="pastebtn" onClick={resolveUrl} aria-label="Resolve">
            Go
          </button>
        </div>
        {resolveError && <div className="errorBox">{resolveError}</div>}
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

      {!loading && resolved && resolved.type !== "error" && (
        <>
          {isVideo && (
            <div className="card meta">
              {resolved.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="thumb" src={resolved.thumbnail} alt="" />
              ) : (
                <div className="thumb" />
              )}
              <div className="metaBody">
                <span className="metaTitle">{resolved.title}</span>
                <span className="metaSub">
                  <span className="avatar">{resolved.uploader[0]?.toUpperCase()}</span>
                  {resolved.uploader}
                </span>
                <span className="metaLine">{fmtTime(resolved.duration)}</span>
              </div>
            </div>
          )}

          {isPlaylist && (
            <div className="card meta">
              <div className="thumb thumbStack" />
              <div className="metaBody">
                <span className="metaTitle">{resolved.title}</span>
                <span className="metaSub">
                  <span className="avatar">{resolved.uploader[0]?.toUpperCase()}</span>
                  {resolved.uploader}
                </span>
                <span className="metaLine">{resolved.entries.length} videos</span>
              </div>
            </div>
          )}

          {isPlaylist && (
            <div className="playlistBox">
              <button className="playlistHead" onClick={() => setPlaylistOpen((o) => !o)}>
                <span>
                  {selected.size} of {resolved.entries.length} selected
                </span>
                <span className={`chev ${playlistOpen ? "chevOpen" : ""}`}>
                  <IconChevronDown />
                </span>
              </button>
              {playlistOpen && (
                <div className="playlistList">
                  <label className="plRow plAll">
                    <input type="checkbox" checked={selected.size === resolved.entries.length} onChange={toggleAll} />
                    <span>Select all</span>
                  </label>
                  {resolved.entries.map((item) => (
                    <label key={item.id} className="plRow">
                      <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleItem(item.id)} />
                      <span className="plTitle">{item.title}</span>
                      <span className="plDur">{item.duration ? fmtTime(item.duration) : ""}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {isVideo && (
            <>
              <Section title="Extract as">
                <div className="segment">
                  {(["video", "audio"] as const).map((m) => (
                    <button key={m} className={`segbtn ${mode === m ? "segActive" : ""}`} onClick={() => setMode(m)}>
                      {m === "video" ? "Video" : "Audio only"}
                    </button>
                  ))}
                </div>
              </Section>

              {mode === "video" && (
                <Section title="Quality">
                  <div className="formatList">
                    {resolved.videoFormats.length === 0 && (
                      <div className="emptyNote">No downloadable video formats were reported for this link.</div>
                    )}
                    {resolved.videoFormats.map((f) => (
                      <button
                        key={f.height}
                        className={`formatRow ${videoHeight === f.height ? "formatActive" : ""}`}
                        onClick={() => setVideoHeight(f.height)}
                      >
                        <span className="formatRadio" />
                        <span className="formatMain">
                          <span className="formatLabel">{f.height}p{f.fps && f.fps > 30 ? Math.round(f.fps) : ""}</span>
                          <span className="formatDetail">
                            {f.ext.toUpperCase()} &nbsp;·&nbsp; {f.vcodec}
                            {!f.hasAudio && " · video only"}
                          </span>
                        </span>
                        <span className="formatSize">{fmtBytes(f.filesizeBytes)}</span>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {mode === "audio" && (
                <Section title="Format">
                  <div className="formatList">
                    {AUDIO_CHOICES.map((a) => (
                      <button
                        key={a.id}
                        className={`formatRow ${audioChoice === a.id ? "formatActive" : ""}`}
                        onClick={() => setAudioChoice(a.id)}
                      >
                        <span className="formatRadio" />
                        <span className="formatMain">
                          <span className="formatLabel">{a.label}</span>
                          <span className="formatDetail">{a.ext}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {resolved.subtitles.length > 0 && (
                <Section title="Subtitles">
                  <ToggleRow label="Include subtitles" checked={subsOn} onChange={setSubsOn} />
                  {subsOn && (
                    <>
                      <div className="chipRow">
                        {resolved.subtitles.map((s) => {
                          const code = s.code + (s.auto ? "-auto" : "");
                          return (
                            <button
                              key={code}
                              className={`preset ${subLangs.includes(code) ? "presetActive" : ""}`}
                              onClick={() => toggleSub(code)}
                            >
                              {s.label}
                              {s.auto ? " (auto)" : ""}
                            </button>
                          );
                        })}
                      </div>
                      <ToggleRow label="Embed in file" description="Off saves a separate .srt" checked={embedSubs} onChange={setEmbedSubs} />
                    </>
                  )}
                </Section>
              )}

              <Section title="Range">
                <ToggleRow label="Extract a clip" description="Off downloads the full length" checked={clipOn} onChange={setClipOn} />
                {clipOn && (
                  <>
                    <Row label="In" value={fmtTime(clip[0])}>
                      <input
                        type="range"
                        min={0}
                        max={Math.max(resolved.duration - 1, 0)}
                        value={clip[0]}
                        onChange={(e) => setClip([Math.min(+e.target.value, clip[1] - 1), clip[1]])}
                      />
                    </Row>
                    <Row label="Out" value={fmtTime(clip[1])}>
                      <input
                        type="range"
                        min={1}
                        max={resolved.duration}
                        value={clip[1]}
                        onChange={(e) => setClip([clip[0], Math.max(+e.target.value, clip[0] + 1)])}
                      />
                    </Row>
                  </>
                )}
              </Section>

              <Section title="Extras">
                <ToggleRow label="Embed thumbnail" checked={embedThumb} onChange={setEmbedThumb} />
                <ToggleRow label="Embed metadata" description="Tags, uploader info" checked={embedMeta} onChange={setEmbedMeta} />
                <ToggleRow label="Skip sponsor segments" description="via SponsorBlock" checked={sponsorBlock} onChange={setSponsorBlock} />
                <ToggleRow label="Embed chapters" checked={saveChapters} onChange={setSaveChapters} />
              </Section>
            </>
          )}

          {isPlaylist && (
            <Section title="Format">
              <div className="segment">
                {(["video", "audio"] as const).map((m) => (
                  <button key={m} className={`segbtn ${mode === m ? "segActive" : ""}`} onClick={() => setMode(m)}>
                    {m === "video" ? "Video (best)" : "Audio only"}
                  </button>
                ))}
              </div>
              {mode === "audio" && (
                <div className="formatList">
                  {AUDIO_CHOICES.map((a) => (
                    <button
                      key={a.id}
                      className={`formatRow ${audioChoice === a.id ? "formatActive" : ""}`}
                      onClick={() => setAudioChoice(a.id)}
                    >
                      <span className="formatRadio" />
                      <span className="formatMain">
                        <span className="formatLabel">{a.label}</span>
                        <span className="formatDetail">{a.ext}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Section>
          )}

          <div className="extractBarSpacer" />
          <div className="extractBar">
            <button className="extractbtn" onClick={extract} disabled={isPlaylist && selectedCount === 0}>
              {isPlaylist ? `Extract ${selectedCount} item${selectedCount === 1 ? "" : "s"}` : "Extract"}
            </button>
          </div>
        </>
      )}

      {queue.length > 0 && (
        <div className="queueSection">
          <span className="queueTitle">Queue · {queue.length}</span>
          <div className="queueList">
            {queue.map((j) => (
              <div key={j.id} className="queueRow">
                <div className="queueTop">
                  <span className="queueName">{j.title}</span>
                  {j.status === "done" ? (
                    <a className="doneIcon" href={`/api/extract/file?jobId=${j.id}`} aria-label="Download">
                      <IconDownload />
                    </a>
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
                  <span>
                    {j.status === "error" ? <span className="errText">{j.error ?? "Failed"}</span> : j.status}
                  </span>
                  <span>
                    {j.status === "done"
                      ? fmtBytes(j.totalBytes)
                      : j.status === "downloading"
                      ? `${fmtSpeed(j.speed)} · ${fmtBytes(j.downloadedBytes)} / ${fmtBytes(j.totalBytes)}`
                      : ""}
                  </span>
                </div>
              </div>
            ))}
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
          color: var(--ink);
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
          background: var(--ink);
          color: #fff;
          flex-shrink: 0;
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 9px;
        }
        .errorBox {
          font-size: 12.5px;
          color: #b3261e;
          background: #fdecea;
          border: 1px solid #f6c6c1;
          border-radius: 10px;
          padding: 8px 12px;
        }
        .emptyNote {
          font-size: 13px;
          color: var(--ink-soft);
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

        .meta {
          display: flex;
          gap: 12px;
        }
        .thumb {
          width: 88px;
          height: 64px;
          border-radius: 10px;
          flex-shrink: 0;
          object-fit: cover;
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
        .extractbtn:disabled {
          opacity: 0.5;
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
          width: 22px;
          height: 22px;
          align-items: center;
          justify-content: center;
        }
        .errText {
          color: #b3261e;
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
