// app/api/ff/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { saveAsset } from "@/lib/ff/assets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    // 500 MB safety cap — tune per your Railway plan.
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 500 MB)" },
        { status: 413 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const asset = await saveAsset(buf, file.name || "upload", file.type || "");

    return NextResponse.json({
      ok: true,
      asset: {
        id: asset.id,
        name: asset.name,
        kind: asset.kind,
        sizeBytes: asset.sizeBytes,
        duration: asset.duration,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("[ff/upload]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
