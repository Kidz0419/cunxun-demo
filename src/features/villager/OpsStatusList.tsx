import type { SystemStatusResponse } from "../../shared/systemStatus";
import { getReadinessClassName } from "./villagerHelpers";

type OpsStatusListProps = {
  systemStatus: SystemStatusResponse;
};

export function OpsStatusList({ systemStatus }: OpsStatusListProps) {
  const services = [
    ...(systemStatus.services.npcDirectory.status === "local_demo"
      ? [systemStatus.services.npcDirectory]
      : []),
    systemStatus.services.shopDirectory,
    systemStatus.services.ai,
    systemStatus.services.map
  ];

  return (
    <div className="ops-status-list" aria-label="服务连接状态">
      {services.map((service) => (
        <div className={getReadinessClassName(service.status)} key={`${service.status}-${service.label}`}>
          <strong>{service.label}</strong>
          <small>{service.detail}</small>
        </div>
      ))}
    </div>
  );
}
