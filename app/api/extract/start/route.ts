import { NextRequest, NextResponse } from "next/server";
import { callCreateJob, callStartDownload } from "@/lib/callPythonJSON";

export type StartExtractOptions = {
  url: string;
  mode: "video" | "audio";
  height?: number; // for mode: "video" — max target height (1080, 720, ...)
  audioFormat?: "best" | "mp3" | "opus" | "flac" | "m4a"; // for mode: "audio"
  subsOn?: boolean;
  subLangs?: string[]; // e.g. ["en", "ja-auto"]
  embedSubs?: boolean;
  embedThumb?: boolean;
  embedMeta?: boolean;
  sponsorBlock?: boolean;
  saveChapters?: boolean;
  clipOn?: boolean;
  clipStart?: number;
  clipEnd?: number;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as StartExtractOptions | { items: StartExtractOptions[] };

  const items = "items" in body ? body.items : [body];
  if (!items.length) {
    return NextResponse.json({ error: "No items to extract" }, { status: 400 });
  }

  const jobIds: string[] = [];
  for (const item of items) {
    if (!item.url) {
      return NextResponse.json({ error: "Missing url on item" }, { status: 400 });
    }
    const jobId = await callCreateJob();
    callStartDownload(jobId, JSON.stringify(item));
    jobIds.push(jobId);
  }

  return NextResponse.json({ jobIds });
}
