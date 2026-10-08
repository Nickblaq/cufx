"use client";

import type { Param } from "@/lib/studio/types";

export function Field({
  param,
  value,
  onChange,
}: {
  param: Param;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (param.type) {
    case "string":
      return (
        <label className="field">
          <span className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </span>
          <input
            type="text"
            placeholder={param.placeholder}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "number":
    case "integer":
      return (
        <label className="field">
          <span className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
            <span className="fieldValue">
              {String(value ?? 0)}
              {param.unit ? ` ${param.unit}` : ""}
            </span>
          </span>
          <input
            type="number"
            min={param.min}
            max={param.max}
            step={param.type === "integer" ? 1 : param.step ?? "any"}
            value={(value as number) ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
          />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "boolean":
      return (
        <label className="checkboxRow">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{param.label}</span>
        </label>
      );

    case "enum":
      return (
        <label className="field">
          <span className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </span>
          <select
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          >
            {param.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    case "multiselect": {
      const arr = (value as string[]) ?? [];
      return (
        <div className="field">
          <span className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </span>
          <div className="multiGrid">
            {param.options?.map((o) => {
              const on = arr.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={"multiChip" + (on ? " multiOn" : "")}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...arr, o.value]
                        : arr.filter((x) => x !== o.value);
                      onChange(next);
                    }}
                  />
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    case "textarea":
      return (
        <label className="field">
          <span className="fieldHead">
            <span className="fieldLabel">{param.label}</span>
          </span>
          <textarea
            rows={3}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {param.helpText && <p className="fieldHelp">{param.helpText}</p>}
        </label>
      );

    default:
      return null;
  }
}
