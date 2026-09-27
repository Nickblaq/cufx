// Thin wrapper kept for backwards compatibility with the pre-existing
// hello-py / ytdlp-check demo routes. The real implementation now lives in
// lib/jobs.ts's runPythonJSON, so both the extract feature and these legacy
// routes share one Node<->Python bridge instead of two copies that can
// silently drift apart (see: subtitle "label" field regression).
import { runPythonJSON } from "@/lib/jobs";

export function callPython<T = unknown>(scriptName: string, args: string[] = []): Promise<T> {
  return runPythonJSON<T>(scriptName, args);
}
