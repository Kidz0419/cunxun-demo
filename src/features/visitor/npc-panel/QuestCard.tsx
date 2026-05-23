import type { ReactNode } from "react";
import type { NpcTask } from "../../../types";

const completionLabel: Record<NpcTask["completionType"], string> = {
  gps_plus_photo: "GPS · 拍照",
  gps_only: "仅 GPS",
  photo_note: "拍照 · 文字"
};

type QuestCardProps = {
  task: NpcTask;
  isDone: boolean;
  children: ReactNode;
};

export function QuestCard({ task, isDone, children }: QuestCardProps) {
  return (
    <section className={`task-block quest-card-v2 ${isDone ? "is-done" : ""}`} aria-label="线下任务">
      <div className="quest-card-head">
        <span className="eyebrow">{isDone ? "已打卡 · DONE" : "任务 · QUEST"}</span>
        <small>
          ±{task.radiusMeters}m · {completionLabel[task.completionType]}
        </small>
      </div>
      <h3 className="title">{task.title}</h3>
      <p className="meta">
        <span className="meta-label">打卡 </span>
        {task.checkinPrompt}
      </p>
      <p className="reward">· {task.rewardText}</p>
      {children}
    </section>
  );
}
