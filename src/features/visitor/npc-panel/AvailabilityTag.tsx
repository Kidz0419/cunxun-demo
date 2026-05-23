import type { CSSProperties } from "react";
import type { NpcAvailability } from "../../../types";

const availabilityTagMeta: Record<NpcAvailability, { label: string; color: string }> = {
  open_now: { label: "现在可聊", color: "var(--moss)" },
  later_today: { label: "傍晚再来", color: "var(--water)" },
  closed_today: { label: "今天不在", color: "var(--clay)" }
};

type AvailabilityTagProps = {
  availability: NpcAvailability;
  npcName: string;
};

export function AvailabilityTag({ availability, npcName }: AvailabilityTagProps) {
  const meta = availabilityTagMeta[availability];

  return (
    <span
      className="availability-tag-v2"
      aria-label={`${npcName}的接待状态`}
      style={{ "--availability-color": meta.color } as CSSProperties}
    >
      <i className="availability-dot" />
      {meta.label}
    </span>
  );
}
