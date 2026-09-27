import { NextRequest, NextResponse } from "next/server";
import { runPythonJSON } from "@/lib/jobs";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const data = await runPythonJSON("ytdlp_resolve.py", [url]);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
