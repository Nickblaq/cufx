import type { JobProgress, OperationPayload } from "./types";

export type StudioClient = {
  run: (
    inputs: { id: string; role: string }[],
    operations: OperationPayload[]
  ) => Promise<string>;
  job: (jobId: string) => Promise<JobProgress>;
  upload: (
    file: File,
    onProgress?: (p: number) => void
  ) => Promise<{ id: string; name: string; kind: "video" | "audio" | "image"; sizeBytes: number; duration?: string; meta?: string }>;
  downloadUrl: (jobId: string) => string;
};

export function createStudioClient(config: {
  runUrl: string;
  jobUrl: (id: string) => string;
  downloadUrl: (id: string) => string;
  uploadUrl?: string;
}): StudioClient {
  return {
    async run(inputs, operations) {
      const res = await fetch(config.runUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, operations }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to start job");
      return data.jobId as string;
    },

    async job(jobId) {
      const res = await fetch(config.jobUrl(jobId));
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to fetch job");
      return data.job as JobProgress;
    },

    upload(file, onProgress) {
      if (!config.uploadUrl) {
        return Promise.reject(new Error("Upload not configured for this client"));
      }
      return new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append("file", file);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", config.uploadUrl!);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
              resolve(data.asset);
            } else {
              reject(new Error(data.error || "Upload failed"));
            }
          } catch {
            reject(new Error("Invalid response from server"));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(fd);
      });
    },

    downloadUrl: config.downloadUrl,
  };
}
