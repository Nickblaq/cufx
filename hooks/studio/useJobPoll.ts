"use client";

import { useEffect, useRef, useState } from "react";
import type { JobProgress } from "@/lib/studio/types";

export function useJobPoll(
  jobId: string | null,
  fetchJob: (id: string) => Promise<JobProgress>
): { job: JobProgress | null; error: string | null } {
  const [job, setJob] = useState<JobProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRef = useRef(fetchJob);
  fetchRef.current = fetchJob;

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setError(null);
      return;
    }
    let cancelled = false;

    const tick = async () => {
      try {
        const j = await fetchRef.current(jobId);
        if (cancelled) return;
        setJob(j);
        if (j.status === "completed" || j.status === "failed") return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(tick, 1000);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Polling failed");
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [jobId]);

  return { job, error };
}
