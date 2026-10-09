# cufx — Operations Refactor & Media Preview · Handoff / Resume Plan

> Status: **COMPLETE** (2026-10-09). Steps 2–8 below are implemented and verified —
> see §6 for what was checked. This file is kept as the record of the work.
> Nothing has been committed or pushed; the Changes panel owns that.

## 0. Environment facts (verify, don't assume)

- Repo root: `/home/daytona/codebase` (Next.js 16 App Router, React 19, TypeScript 6).
- Package manager: npm. Typecheck: `npm run typecheck` (= `tsc --noEmit`).
- `ffmpeg` / `ffprobe` are **NOT installed** in this sandbox → ffmpeg execution cannot be
  exercised here. `python3` + `yt_dlp 2026.08.19` **are** installed → the URL *resolve*
  path is testable end to end (network permitting).
- Data root: `.cufx-data/` (SQLite catalog + blobs, per-job scratch). Media TTL 15 min.
- Last pushed commit: `8e3c448`. Only uncommitted change so far: `lib/catalog/operations.ts`.

## 1. The user's request (verbatim intent)

1. **Clicking a link gives no media preview.** After entering a URL, the app jumps straight
   into the operations list with *dummy pre-filled forms*. The user wants: a real preview of
   the media, its basic metadata, its available **formats**, and its **subtitles**.
2. **Forms must only use data that actually exists** for that media (no offering a
   resolution/caption the link doesn't have → no "inputting nonexistent data").
3. **yt-dlp operations: remove some, refactor the rest.**
4. **ffmpeg operations are "very poor".** Rewrite them to cover, realistically and
   kind-aware (image / video / audio):
   - **basic info**
   - **convert** — format conversion + quality settings
   - **edit** — cut & trim, merge & concat, compress
   - **filters and other useful stuff**

## 2. Architecture recap (already understood — trust this, re-read files to confirm)

```
lib/catalog/
  types.ts       MediaObject / MediaKind data model
  operations.ts  THE operation catalog  (params, accepts, produces, engine)   <- REWRITTEN
  engines.ts     pure builders: op + params + input -> ffmpeg passes / yt-dlp options
  jobs.ts        SQLite-backed runner; folds contiguous ytdlp steps into one download
  store.ts       content-addressed blob store (ingest, list, delete, ttl)
  db.ts          SQLite schema (objects, edges, jobs, runs, steps)
  blobs.ts       kind/ext/mime inference
app/api/
  catalog/       list|filter|get|ingest|stream(download=1)|delete
  jobs/          create|poll|retry
app/cufx/page.tsx   the studio UI (source -> catalog -> pipeline -> run -> result)
components/studio/  Field, Sheet, OperationCard, views/{Assets,Catalog,Pipeline,Run,Result}View
lib/studio/         api.ts (fetch client), store.ts (zustand + zundo), helpers.ts, types.ts, styles.ts
python/ytdlp.py     bridge: `resolve <url>` prints info JSON; `download ...` streams progress
```

Key flow today: `pick source → pipeline of {opId, params} → POST /api/jobs → runner threads
each step's output_object_id into the next → outputs are catalog objects`.

Multi-input is **not** supported yet: the runner stages exactly one input per ffmpeg step.

## 3. ALREADY DONE (step 1)

### `lib/catalog/operations.ts` — full rewrite (done, not yet consumed by engines/UI)

New tiers (also new `TIER_LABELS`, `TIER_FILTERS`, `TIER_RANGES`):

| tier | label               | filter id  |
|------|---------------------|------------|
| 1    | Download            | download   |
| 2    | Info & Convert      | convert    |
| 3    | Edit                | edit       |
| 4    | Video Filters       | video      |
| 5    | Audio & Subtitles   | audio      |
| 6    | Image               | image      |
| 7    | Advanced            | advanced   |

New/changed types:
- `ParamType` gained `"object"`.
- `Param` gained `dynamic?: "heights" | "audioFormats" | "subtitleLangs"` (options filled
  from the resolved URL profile; `options` stays as the offline fallback),
  `accepts?: MediaKind[]` + `required?: boolean` for object params.
- `CatalogOperation` gained `preservesKind?: boolean` (output kind == input kind).
- `OperationEngine` gained `"ffprobe"`.
- New helper `producedKind(op, inputKind)`.

Final operation ids (use these everywhere; old ids are GONE):

**Tier 1 Download (ytdlp, source url):**
`download-video` (dynamic `heights` quality, container, optional `clip`+`start`+`end`),
`download-audio` (format + quality), `download-subs` (dynamic `subtitleLangs` multiselect + embed).

**Tier 2 Info & Convert (ffmpeg except media-info):**
`media-info` (**engine `ffprobe`**, accepts any, produces `other`),
`convert-video` (container, codec, quality|crf, audio, audioBitrate),
`convert-audio` (format, bitrate, sampleRate, channels),
`convert-image` (format, quality).

**Tier 3 Edit:**
`cut` (start/end/mode, preservesKind), `compress` (mode quality|target, quality,
targetMB, maxWidth, preservesKind), `resize` (preservesKind, video+image),
`speed` (preservesKind), `concat` (object `with` required, normalize/w/h, audio keep|mute,
preservesKind), `replace-audio` (object `with`), `strip-audio`, `fps`.

**Tier 4 Video Filters:**
`crop`, `rotate`, `pad`, `color` (brightness/contrast/saturation/gamma),
`blur`, `sharpen`, `denoise`, `watermark` (object `image` required + position/width/opacity/margin),
`hdr-to-sdr`, `stabilize`.

**Tier 5 Audio & Subtitles:**
`extract-audio` (produces audio), `volume`, `loudnorm`, `compressor`, `eq`,
`noise-reduce`, `fade`, `extract-subtitles`, `mux-subtitles` (object `with`),
`burn-subtitles` (object `with`).

**Tier 6 Image:** `to-gif`, `extract-frame`, `compress-image`.

**Tier 7 Advanced:** `preset-web`, `preset-social`, `preset-archive`, `metadata`.

**Removed (do not resurrect):** `quick-best`, `audio-mp3`, `audio-m4a`, `video-mp4`,
`video-webm`, `custom-format`, `resolution-cap`, `section-download`, `subscribe-download`,
`cookies-browser`, `cookies-file`, `proxy-config`, `embed-thumbnail`, `embed-metadata`,
`sponsorblock-remove`, `rate-limit`, `download-archive`, `info-json`, `music-pipeline`,
`archive-pipeline`, `social-clip`, `youtube-preset`, `social-vertical`, `web-optimized`,
`chromakey`, `bitstream-filter`, `thumbnail` (renamed `extract-frame`), `trim` (renamed `cut`),
`scale` (renamed `resize`).

> Note: after this rewrite the app still **typechecks** (old `case` labels in
> `engines.ts` are just strings), but new ops silently fall through to the `default:`
> copy branch. Engines/UI work is required before this is functional.

## 4. REMAINING TODOS

### TODO 2 — Rewrite `lib/catalog/engines.ts`
Replace the switch with builders for every new op id. Required shape changes:

- `FfmpegStep` gains `outputKind: MediaKind` (derived from the output extension via a
  `kindForExt(ext)` helper) so the runner labels images as images, audio as audio.
- Input descriptor gains `durationSeconds?: number | null` (needed by `compress`
  target-size) and the builder gains `extras?: { path, kind, name }[]` for multi-input ops.
- New `FfprobeStep` = `{ engine: "ffprobe"; outputPath; outputName; ext: "json";
  outputKind: "other"; args: string[] }` for `media-info`
  (`-v error -print_format json -show_format -show_streams <path>`, summary vs full via params).
- `buildObjectStep` returns `FfmpegStep | FfprobeStep`.

Per-op notes:
- `convert-video`: codec auto→(mp4/mov:h264, webm:vp9, mkv:h264); quality high/balanced/small→
  CRF ~18/23/28; `-movflags +faststart` for mp4/mov; audio codec mapping; skip `-c:v` on copy.
- `convert-audio` / `extract-audio`: `AUDIO_CODEC` map (mp3→libmp3lame, m4a/aac→aac, wav→pcm_s16le,
  flac→flac, opus→libopus, ogg→libvorbis); `-ar`, `-ac`; `-vn` for pure extraction.
- `compress`: quality→CRF (light 30 / balanced 26 / strong 23 / maximum 18) + `-preset medium`;
  target mode → bitrate = targetMB·8·1024·1024/duration (reserve ~128k audio), apply
  `-b:v/-maxrate/-bufsize`; `maxWidth>0` → `scale='min(w,iw)':-2`.
- `concat`: `-i primary -i extra` + `filter_complex`
  (normalize=true) `[0:v]scale=W:H:force_original_aspect_ratio=decrease,pad=W:H:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];`
  `[1:v]…[v1];` then audio `keep` → `[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]` + `-map [v] -map [a]`
  else `[v0][v1]concat=n=2:v=1:a=0[v]` + `-map [v] -an`. (Document that `keep` requires both
  clips to have audio.)
- `replace-audio`: `-i primary -i extra -map 0:v:0 -map 1:a:0 -c:v copy -c:a <aac|libopus> -shortest`;
  audio codec libopus when the container is webm.
- `watermark`: `[1:v]` → optional `scale=W:-1` → optional `colorchannelmixer=aa=<opacity>`,
  then `overlay=` with position expressions (`W-w-m:H-h-m` etc. using `margin`).
- `burn-subtitles`: `-vf subtitles=<escaped path>` (escape `\`, `:`, `'`) + `force_style='FontSize=N'`.
- `mux-subtitles`: `-i primary -i sub -map 0 -map 1:0 -c copy` + `-c:s mov_text` for mp4/mov.
- `color` → `eq=brightness=..:contrast=..:saturation=..:gamma=..`.
- `fade` → `afade=t=in/out` (both = two chained fades, out starts at `duration-endsAt`, needs total
  duration from the input descriptor when available; fall back to a short out-fade).
- `strip-audio` → `-an`; `remove-audio` ext = input ext.
- Presets: `preset-web` (scale=-2:maxHeight, libx264, CRF, `+faststart`, aac),
  `preset-social` (crop=ih*9/16:ih, scale=1080:1920, loudnorm, libx264 CRF20, +faststart),
  `preset-archive` (libx264 CRF18 preset slow, +faststart).
- `metadata`: `-metadata title=/artist=/album=/comment=/language=`.
- `to-gif` / `extract-frame` / `compress-image`: carry over existing logic, add image quality
  (`-q:v` for jpg/webp/avif; png ignores).
- `buildYtdlpOptions`: keep only `download-video` (mode video, container, height from
  `quality` unless `"best"`, clip from start/end), `download-audio` (mode audio, audioFormat,
  audioQuality), `download-subs` (subsOn, subLangs from `langs[]`, embedSubs). Keep
  `formatSelector` support in the type but no op sets it.

### TODO 3 — Update `lib/catalog/jobs.ts` (runner)
- `stageInput(jobId, sourcePath, name, key?)` — add a unique prefix so a second input with the
  same basename can't collide.
- For every object step, scan `op.params` for `type: "object"`; read the value (a catalog id),
  stage it, and pass as `extras`. If a param has `required: true` and the id is missing/invalid,
  fail the step with a clear message like `"Concat needs a second clip"`.
- Pass `durationSeconds` from the stored object into `buildObjectStep`.
- Ingest outputs with `kind: spec.outputKind` (don't let the extension inference mislabel images).
- Handle `spec.engine === "ffprobe"`: run `ffprobe` via the existing spawn helper pattern,
  write stdout to `spec.outputPath`, then ingest as `other` with tool `"ffprobe"`.
- `getJob`/`stepToView` still use `getOperation(...).engine` — fine (`ffprobe` flows through).

### TODO 4 — URL resolve (`lib/catalog/resolve.ts` + `app/api/resolve/route.ts`)
- `resolveUrl(url): Promise<MediaProfile>` — spawn `python3 python/ytdlp.py resolve <url>`
  (cwd = project root, `PYTHONPATH=python-modules`, same as the download runner), parse stdout
  JSON, and **trim to a typed profile**:
  ```ts
  type MediaFormat = { formatId, ext, kind: MediaKind, height, width, fps, vcodec, acodec,
                       filesize, tbr, abr, note };
  type MediaProfile = { url, id, title, uploader, channel, durationSeconds, thumbnail,
                        extractor, webpageUrl, description, viewCount, uploadDate, live,
                        formats: MediaFormat[],
                        heights: number[],            // distinct video heights, desc
                        audioFormats: string[],       // distinct audio exts
                        subtitleLangs: { code, name, auto }[] };
  ```
- Route: `GET /api/resolve?url=…` → `{ ok, profile }` (400 on bad url, 502 on extractor failure
  with the python error message). `runtime = "nodejs"`, `dynamic = "force-dynamic"`.
- Reuse `MEDIA_TTL`/sweep conventions but no caching needed (or a tiny in-memory TTL cache —
  optional).

### TODO 5 — Wire the profile into the studio
- `lib/studio/types.ts`: re-export `MediaProfile`, `MediaFormat`, keep `Param`/`CatalogOperation`
  re-exports (they already come from the catalog).
- `lib/studio/api.ts`: add `resolve(url): Promise<MediaProfile>`.
- `lib/studio/store.ts`: add `profile: MediaProfile | null`, `setProfile`, and clear it in
  `clearSource`/`reset`.
- `app/cufx/page.tsx`:
  - `applyUrl()` → set source + `setView("catalog")`, then kick off `resolve()`; store the profile;
    surface a resolving/error state.
  - Source view: a **media card** (use existing `.mediaCard/.mediaThumb/.mediaMeta/.mediaStats`
    styles) showing thumbnail + title + duration + provider + format/height/subtitle counts;
    graceful fallback when the profile is missing.
  - Catalog view: show a compact profile strip so the user sees what they're operating on.
  - `ConfigureSheet`: resolve `dynamic` params from `profile` (`heights` → `best` + `${h}p`;
    `audioFormats`; `subtitleLangs` → code/name with an `auto` hint), falling back to the static
    `options`. For `object` params, fetch catalog objects (`studioApi.listObjects`), filter by
    `param.accepts`, and pass as options; show "no other media available" when empty.
  - Fix kind chaining: compute the effective kind by **walking the pipeline** with
    `producedKind(op, kind)` (from operations.ts) instead of only looking at the source/`produces`.
- `components/studio/Field.tsx`: add the `"object"` case (select bound to a new
  `objectOptions` prop threaded through ConfigureSheet).

### TODO 6 — Media preview for catalog objects
- New `components/studio/MediaDetail.tsx` (sheet) opened from `AssetsView` rows and
  `ResultView` outputs: inline player by kind — `<video controls>` (video), `<audio controls>`
  (audio), `<img>` (image), subtitle text preview for `subtitle` — plus an info list
  (kind, size, duration, dimensions, provider, url, hash, parents) and actions
  "Use as source" / "Save to device".
- Stream URL: `/api/catalog/<id>` (inline; `?download=1` forces attachment).
- Keep `onUse` (start pipeline) on an explicit button, not the whole row, so clicking a row
  previews instead of jumping into the operation list.

### TODO 7 — Styles (`lib/studio/styles.ts`)
`.mediaCard/.mediaThumb/.mediaMeta/.mediaStats/.infoList/.infoRow/.formatList/.formatRow`
already exist — reuse them. Add only what's missing (e.g. `.player` for the `<video>/<audio>`
element, `.subPreview`, `.profileStrip`, `.objectEmpty`).

### TODO 8 — Verify
1. `npm run typecheck` (must pass; fix real errors, never `@ts-ignore`).
2. Resolve smoke test without the UI:
   `python3 python/ytdlp.py resolve 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'`
   (network permitting) and then hit `GET /api/resolve?url=…` against the dev server.
3. Confirm the catalog UI offers the new tiers and that a URL source shows the preview card.
4. State clearly that ffmpeg execution could not be exercised (no ffmpeg/ffprobe in this sandbox).

## 5. Guardrails

- Follow the existing code style (heavy explanatory comments, no `any`, minimal deps).
- No new dependencies unless truly required.
- Don't weaken types, skip checks, or suppress errors to make the build pass.
- Only stage/commit files belonging to this request, and only when the user asks.

## 6. Completion record

Files changed/added by steps 2–8:

| file | change |
|------|--------|
| `lib/catalog/engines.ts` | rewritten: `outputKind` on ffmpeg steps, `FfprobeStep`, `extras` multi-input, builders for every new op |
| `lib/catalog/jobs.ts` | `stageInput(..., key)`, `collectExtras`, `runFfprobe`, ingest with `spec.outputKind` |
| `lib/catalog/types.ts` | added `MediaFormat`, `SubtitleTrack`, `MediaProfile` |
| `lib/catalog/resolve.ts` | **new** — trims the extractor dict to a profile |
| `app/api/resolve/route.ts` | **new** — `GET /api/resolve?url=` |
| `lib/studio/types.ts` | re-export the profile types |
| `lib/studio/helpers.ts` | `dynamicOptions`, `pipelineOutputKind`, `formatDate`, `formatCount` |
| `lib/studio/api.ts` | `resolve(url)`, `streamUrl(id)` |
| `lib/studio/store.ts` | `profile` state |
| `components/studio/Field.tsx` | `object` param type |
| `components/studio/MediaDetail.tsx` | **new** — preview sheet |
| `components/studio/views/AssetsView.tsx` | row click previews instead of starting a pipeline |
| `components/studio/views/ResultView.tsx` | preview action per output |
| `app/cufx/page.tsx` | link preview card, profile strip, dynamic params, detail sheet, kind-aware chaining |
| `lib/studio/styles.ts` | player / profile / detail styles |

Verified:

- `npm run typecheck` passes (exit 0, no diagnostics).
- `GET /api/resolve?url=…` returns 200 with a real profile for a YouTube URL:
  8 distinct heights (2160→144), audio formats `m4a`/`webm`, 160 caption
  languages, 42 downloadable (video/audio) formats, thumbnail + duration + views.
- Validation paths return 400 (`Missing url`, `Not a valid URL`).
- `/cufx` renders 200 and the refactored catalog (`download-video`, …) is present
  in the served client chunk.

Known limitations (environment, not code):

- `ffmpeg`/`ffprobe` are not installed in this sandbox, so no ffmpeg-based
  operation could be executed end to end here. The `media-info` op reports
  "ffprobe is not installed on the server" when it is missing, same as the
  pre-existing ffmpeg behaviour.
- The MediaDetail player was not exercised in a real browser here.
- `concat` with `audio: keep` requires both clips to have an audio track.
