import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

type CropFrac = { x: number; y: number; width: number; height: number };
type TextOverlay = {
  content: string;
  size: number;
  align: "left" | "center" | "right";
  color: string;
};
type PhotoOps = {
  crop: CropFrac | null;
  brightnessPct: number; // 100 = neutral, matches the live-preview CSS filter's percent scale
  contrastPct: number;
  saturationPct: number;
  hueDeg: number;
  sharpness: number; // 0-100
  format: "webp" | "avif" | "jpeg" | "png";
  quality: number; // 10-100
  text: TextOverlay | null;
};

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTextSvg(width: number, height: number, text: TextOverlay) {
  const anchor = text.align === "left" ? "start" : text.align === "right" ? "end" : "middle";
  const x = text.align === "left" ? width * 0.08 : text.align === "right" ? width * 0.92 : width / 2;
  const y = height * 0.86;
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="black" flood-opacity="0.45" />
        </filter>
      </defs>
      <text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${text.size}"
            font-family="Space Grotesk, sans-serif" font-weight="600"
            fill="${escapeXml(text.color || "#ffffff")}" filter="url(#shadow)">
        ${escapeXml(text.content).slice(0, 200)}
      </text>
    </svg>
  `);
}

export async function POST(req: NextRequest) {
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

    const ops = JSON.parse(opsRaw) as PhotoOps;
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    // Bake in EXIF auto-rotation first and re-read as a plain buffer, so all
    // crop math below operates on the same pixel orientation the browser
    // preview showed the user — sharp's extract() otherwise operates in the
    // *pre-rotation* coordinate space, which silently produces wrong crops
    // on photos with EXIF orientation tags (most phone photos).
    const oriented = await sharp(inputBuffer).rotate().toBuffer();

    let pipeline = sharp(oriented);
    const meta = await pipeline.metadata();
    const fullWidth = meta.width ?? 0;
    const fullHeight = meta.height ?? 0;
    if (!fullWidth || !fullHeight) {
      return NextResponse.json({ error: "Could not read image dimensions" }, { status: 422 });
    }

    let outWidth = fullWidth;
    let outHeight = fullHeight;

    if (ops.crop) {
      const left = Math.max(0, Math.round(ops.crop.x * fullWidth));
      const top = Math.max(0, Math.round(ops.crop.y * fullHeight));
      const width = Math.min(fullWidth - left, Math.round(ops.crop.width * fullWidth));
      const height = Math.min(fullHeight - top, Math.round(ops.crop.height * fullHeight));
      if (width > 0 && height > 0) {
        pipeline = pipeline.extract({ left, top, width, height });
        outWidth = width;
        outHeight = height;
      }
    }

    // modulate() multipliers: 1.0 = unchanged. Our percents follow the same
    // "100 = neutral" convention as the client's CSS filter() preview, so
    // converting is just dividing by 100.
    pipeline = pipeline.modulate({
      brightness: Math.max(0.1, ops.brightnessPct / 100),
      saturation: Math.max(0, ops.saturationPct / 100),
      hue: Math.round(ops.hueDeg),
    });

    // Approximate CSS-style contrast with a linear transform pivoted on
    // mid-gray (128): slope = contrast%, intercept keeps 128 fixed.
    const slope = Math.max(0.1, ops.contrastPct / 100);
    pipeline = pipeline.linear(slope, 128 * (1 - slope));

    if (ops.sharpness > 0) {
      const sigma = 0.5 + (ops.sharpness / 100) * 2.5;
      pipeline = pipeline.sharpen({ sigma });
    }

    if (ops.text && ops.text.content.trim()) {
      const svg = buildTextSvg(outWidth, outHeight, ops.text);
      pipeline = pipeline.composite([{ input: svg, top: 0, left: 0 }]);
    }

    const quality = Math.min(100, Math.max(1, Math.round(ops.quality)));
    if (ops.format === "png") {
      pipeline = pipeline.png({ compressionLevel: Math.round(9 - (quality / 100) * 9) });
    } else if (ops.format === "avif") {
      pipeline = pipeline.avif({ quality });
    } else if (ops.format === "jpeg") {
      pipeline = pipeline.jpeg({ quality });
    } else {
      pipeline = pipeline.webp({ quality });
    }

    const outBuffer = await pipeline.toBuffer();
    const mime =
      ops.format === "png" ? "image/png" :
      ops.format === "avif" ? "image/avif" :
      ops.format === "jpeg" ? "image/jpeg" : "image/webp";

    return new NextResponse(new Uint8Array(outBuffer), {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(outBuffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Photo processing failed: ${message}` }, { status: 500 });
  }
}
