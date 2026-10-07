// lib/op/types.ts
export type MediaFormat = {
  id: string;
  label: string;
  ext: string;
  size: string;
  note: string;
};

export type Subtitle = {
  lang: string;
  label: string;
  auto: boolean;
};

export type MediaInfo = {
  url: string;
  kind: "audio" | "video";
  id: string;
  title: string;
  uploader: string;
  duration: string;
  views: string;
  uploadedAt: string;
  thumbnail: string;
  formats: MediaFormat[];
  subtitles: Subtitle[];
};

export type JobStatus = "queued" | "running" | "completed" | "failed";

export type JobProgress = {
  jobId: string;
  status: JobStatus;
  percent: number;
  step?: string;
  stepIndex?: number;
  totalSteps?: number;
  log?: string;
  error?: string;
  outputs?: { name: string; url: string; sizeBytes?: number }[];
};
