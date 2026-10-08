import type { Condition, FormValues, Operation } from "./types";

export function evalCondition(
  cond: Condition | undefined,
  values: FormValues
): boolean {
  if (!cond) return true;
  const v = values[cond.param];
  switch (cond.operator) {
    case "eq": return v === cond.value;
    case "neq": return v !== cond.value;
    case "truthy": return Boolean(v);
    case "falsy": return !v;
    default: return true;
  }
}

export function defaultValues(op: Operation): FormValues {
  const out: FormValues = {};
  for (const p of op.params) {
    if (p.default !== undefined) {
      out[p.key] = p.default;
      continue;
    }
    switch (p.type) {
      case "number":
      case "integer":
        out[p.key] = p.min ?? 0;
        break;
      case "boolean":
        out[p.key] = false;
        break;
      case "enum":
        out[p.key] = p.options?.[0]?.value ?? "";
        break;
      case "multiselect":
        out[p.key] = [];
        break;
      default:
        out[p.key] = "";
        break;
    }
  }
  return out;
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "–";
  if (bytes < 0) return "–";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(1)} ${units[i]}`;
}

export function makeUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through */
    }
  }
  return `step_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
