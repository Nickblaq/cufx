
// app/api/op/inspect/route.ts
import { NextRequest, NextResponse } from "next/server";
import { inspectUrl } from "@/lib/op/inspect";
import { ZodError, z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  url: z.string().url(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "A valid URL is required" },
      { status: 400 }
    );
  }

  try {
    const info = await inspectUrl(parsed.data.url);
    return NextResponse.json({ ok: true, info });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inspection failed";
    console.error("[op/inspect]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
