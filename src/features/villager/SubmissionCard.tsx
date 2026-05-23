import type { Npc } from "../../types";
import { getReviewStatusLabel } from "./villagerHelpers";

type SubmissionCardProps = {
  npc: Npc;
  approveLabel?: string;
  onApprove: (npcId: string) => void;
  onDelete: (npcId: string) => void;
};

export function SubmissionCard({
  npc,
  approveLabel = "演示审核通过",
  onApprove,
  onDelete
}: SubmissionCardProps) {
  return (
    <article className={`submission-card is-${npc.reviewStatus ?? "draft"}`} key={npc.id}>
      <div>
        <span>{getReviewStatusLabel(npc.reviewStatus)}</span>
        <strong>
          {npc.name} · {npc.spaceName}
        </strong>
        <small>
          {npc.village} / {npc.spaceType}
        </small>
      </div>
      <div className="submission-actions">
        {npc.reviewStatus !== "approved" && (
          <button type="button" onClick={() => onApprove(npc.id)}>
            {approveLabel}
          </button>
        )}
        {npc.reviewStatus === "approved" && <a href="/">去游客端查看</a>}
        <button
          type="button"
          onClick={() => onDelete(npc.id)}
          aria-label={`删除${npc.name}`}
        >
          删除
        </button>
      </div>
    </article>
  );
}
