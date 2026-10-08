"use client";

import type { Operation } from "@/lib/studio/types";
import { Icons } from "./Icons";

export function OperationCard({
  op,
  onOpen,
  disabled,
}: {
  op: Operation;
  onOpen: () => void;
  disabled?: boolean;
}) {
  const Icon = op.icon;
  return (
    <button
      type="button"
      className="opCard"
      onClick={onOpen}
      disabled={disabled}
    >
      <span className="opIcon">
        <Icon />
      </span>
      <span className="opBody">
        <span className="opName">
          {op.name}
          {op.chainSteps && <span className="chainBadge">chain</span>}
        </span>
        <span className="opDesc">{op.description}</span>
        <span className="opMeta">
          tier {op.tier} · {op.category} · {op.accepts}
        </span>
      </span>
      <Icons.Chevron />
    </button>
  );
}
