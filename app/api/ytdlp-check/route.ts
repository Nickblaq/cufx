import { NextResponse } from "next/server";
import { callPython } from "@/lib/callPython";

export async function GET() {
  try {
    const data = await callPython("ytdlp_check.py");
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
