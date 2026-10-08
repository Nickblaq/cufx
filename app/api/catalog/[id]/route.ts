// app/api/catalog/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { Readable } from "node:stream";
import { getObject, objectFilePath, deleteObject } from "@/lib/catalog/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const object = getObject(id);
  if (!object) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const filePath = objectFilePath(id);
  if (!filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ ok: false, error: "Blob missing" }, { status: 410 });
  }

  const download = req.nextUrl.searchParams.get("download") === "1";
  const stat = fs.statSync(filePath);
  const stream = Readable.toWeb(fs.createReadStream(filePath)) as unknown as ReadableStream;

  return new NextResponse(stream, {
    headers: {
      "Content-Type": object.mime ?? "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": download
        ? `attachment; filename="${object.name.replace(/["\\\r\n]/g, "_")}"`
        : "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const removed = deleteObject(id);
  return removed
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
}
