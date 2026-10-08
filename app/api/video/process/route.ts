import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { JOBS_DIR } from "@/lib/tmp";

export const runtime = "nodejs";

type VideoOps = {
  trimStart: number; // seconds
  trimEnd: number; // seconds
  speed: number; // 0.25–4, 1 = neutral
  volume: number; // 0–150, 100 = neutral
  // Same 100/0-neutral convention as the photo route's PhotoOps, and the
  // same numbers the editor's live CSS preview already computes from the
  // selected LUT + intensity — the client sends the resolved values, the
  // API stays LUT-agnostic, same split of responsibility as photo/process.
  contrastPct: number; // 100 = neutral
  saturationPct: number; // 100 = neutral
  hueDeg: number; // 0 = neutral
  format: "mp4" | "webm" | "mov" | "gif";
  bitrateKbps: number; // ignored for gif
};

function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", ...args]);
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 6000) stderr = stderr.slice(-6000);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}:\n${stderr}`));
    });
  });
}

/** atempo only accepts 0.5–2.0 per instance; chain it for speeds outside that. */
function atempoChain(speed: number): string[] {
  if (speed === 1) return [];
  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2) {
    filters.push("atempo=2.0");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters;
}

function buildVideoFilters(ops: VideoOps): string[] {
  const filters: string[] = [];
  if (ops.speed !== 1) filters.push(`setpts=PTS/${ops.speed}`);

  const eqParts: string[] = [];
  if (ops.contrastPct !== 100) eqParts.push(`contrast=${(ops.contrastPct / 100).toFixed(3)}`);
  if (ops.saturationPct !== 100) eqParts.push(`saturation=${(ops.saturationPct / 100).toFixed(3)}`);
  if (eqParts.length) filters.push(`eq=${eqParts.join(":")}`);

  if (ops.hueDeg !== 0) filters.push(`hue=h=${ops.hueDeg.toFixed(2)}`);
  return filters;
}

function buildAudioFilters(ops: VideoOps): string[] {
  const filters = atempoChain(ops.speed);
  if (ops.volume !== 100) filters.push(`volume=${(ops.volume / 100).toFixed(3)}`);
  return filters;
}

export async function POST(req: NextRequest) {
  const jobId = randomUUID();
  // Deleted at the end of the request; living under the shared job root means
  // a process that dies mid-encode still gets its leftovers swept away.
  const jobDir = path.join(JOBS_DIR, jobId);

  try {
    const form = await req.formData();
    const file = form.get("file");
    const opsRaw = form.get("ops");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (typeof opsRaw !== "string") {
      return NextResponse.json({ error: "Missing ops" }, { status: 400 });
    }
    const ops = JSON.parse(opsRaw) as VideoOps;

    await fs.mkdir(jobDir, { recursive: true });
    const inExt = path.extname(file.name) || ".mp4";
    const inputPath = path.join(jobDir, `input${inExt}`);
    await fs.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    const duration = Math.max(0.1, ops.trimEnd - ops.trimStart);
    const videoFilters = buildVideoFilters(ops);
    const audioFilters = buildAudioFilters(ops);

    if (ops.format === "gif") {
      // Two-pass palette generation — plain fps+scale GIFs band and dither
      // badly; a generated palette gets noticeably closer to the source.
      const paletteFilters = [...videoFilters, "fps=12", "scale=480:-1:flags=lanczos"];
      const palettePath = path.join(jobDir, "palette.png");
      const outputPath = path.join(jobDir, "output.gif");

      await runFFmpeg([
        "-ss", String(ops.trimStart),
        "-i", inputPath,
        "-t", String(duration),
        "-vf", `${paletteFilters.join(",")},palettegen`,
        palettePath,
      ]);

      await runFFmpeg([
        "-ss", String(ops.trimStart),
        "-i", inputPath,
        "-t", String(duration),
        "-i", palettePath,
        "-lavfi", `${paletteFilters.join(",")}[x];[x][1:v]paletteuse`,
        outputPath,
      ]);

      const outBuffer = await fs.readFile(outputPath);
      return new NextResponse(new Uint8Array(outBuffer), {
        headers: {
          "Content-Type": "image/gif",
          "Content-Length": String(outBuffer.length),
        },
      });
    }

    const containerArgs: Record<Exclude<VideoOps["format"], "gif">, string[]> = {
      mp4: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart"],
      mov: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart"],
      webm: ["-c:v", "libvpx-vp9", "-c:a", "libopus"],
    };
    const ext: Record<Exclude<VideoOps["format"], "gif">, string> = {
      mp4: ".mp4",
      mov: ".mov",
      webm: ".webm",
    };
    const mime: Record<Exclude<VideoOps["format"], "gif">, string> = {
      mp4: "video/mp4",
      mov: "video/quicktime",
      webm: "video/webm",
    };

    const outputPath = path.join(jobDir, `output${ext[ops.format]}`);
    const args: string[] = ["-ss", String(ops.trimStart), "-i", inputPath, "-t", String(duration)];

    if (videoFilters.length) args.push("-vf", videoFilters.join(","));
    if (audioFilters.length) args.push("-af", audioFilters.join(","));

    args.push(
      ...containerArgs[ops.format],
      "-b:v", `${ops.bitrateKbps}k`,
      "-maxrate", `${Math.round(ops.bitrateKbps * 1.5)}k`,
      "-bufsize", `${ops.bitrateKbps * 2}k`,
      outputPath
    );

    await runFFmpeg(args);

    const outBuffer = await fs.readFile(outputPath);
    return new NextResponse(new Uint8Array(outBuffer), {
      headers: {
        "Content-Type": mime[ops.format],
        "Content-Length": String(outBuffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Video processing failed: ${message}` }, { status: 500 });
  } finally {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
  }
}
