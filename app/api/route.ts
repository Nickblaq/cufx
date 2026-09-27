import { NextRequest, NextResponse } from "next/server";
import { extractInfo } from "@/lib/runExtract";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ type: "error", message: "Missing or invalid url" }, { status: 400 });
  }

  try {
    const data = await extractInfo(url.trim());
    return NextResponse.json(data);
  } catch (err) {
    // Only truly unexpected failures land here now — e.g. python3 itself
    // missing, or output that wasn't JSON at all. Normal yt-dlp failures
    // (bad link, region lock, etc.) come back as {"type":"error",...} above.
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { type: "error", message: `Unexpected server error: ${message}` },
      { status: 500 }
    );
  }
}
