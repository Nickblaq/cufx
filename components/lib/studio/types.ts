export type IconProps = { size?: number };

export type ParamType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "enum"
  | "multiselect"
  | "textarea";

export type Option = { value: string; label: string };

export type Condition = {
  param: string;
  operator: "eq" | "neq" | "truthy" | "falsy";
  value?: unknown;
};

export type MediaKind = "audio" | "video" | "both";

export type Param = {
  key: string;
  type: ParamType;
  label: string;
  group?: string;
  default?: unknown;
  options?: Option[];
  placeholder?: string;
  helpText?: string;
  advanced?: boolean;
  showIf?: Condition;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type Operation = {
  id: string;
  name: string;
  description: string;
  tier: number;
  category: string;
  accepts: MediaKind;
  icon: React.ComponentType<IconProps>;
  chainSteps?: string[];
  favorite?: boolean;
  params: Param[];
};

export type FormValues = Record<string, unknown>;
export type OperationPayload = { id: string; params: FormValues };

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

export type View = "home" | "catalog" | "pipeline" | "run" | "result";
export type PipelineStep = { uid: string; op: Operation; values: FormValues };

/** Minimal source shape both MediaInfo and Asset satisfy. */
export type SourceRef = { name?: string; title?: string } | null;
