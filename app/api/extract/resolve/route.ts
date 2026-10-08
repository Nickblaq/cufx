import { NextRequest, NextResponse } from "next/server";
import { callPythonJSON } from "@/lib/callPythonJSON";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ type: "error", message: "Missing or invalid url" }, { status: 400 });
  }

  try {
    const data = await callPythonJSON("ytdlp_resolve.py", [url]);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { type: "error", message: `Unexpected server error: ${message}` },
      { status: 500 }
    );
  }
}
