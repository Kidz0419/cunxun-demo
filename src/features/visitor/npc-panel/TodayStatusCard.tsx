import type { Npc } from "../../../types";

type TodayStatusCardProps = {
  status: Npc["todayStatus"];
};

export function TodayStatusCard({ status }: TodayStatusCardProps) {
  return (
    <section className="today-status-card" aria-label="今日状态">
      <strong className="state">{status.state}</strong>
      <p className="detail">{status.detail}</p>
      <small className="best-for">· {status.bestFor}</small>
    </section>
  );
}
