import type { SystemStatusResponse } from "../shared/systemStatus";

type FetchLike = typeof fetch;

export const fallbackSystemStatus: SystemStatusResponse = {
  ok: false,
  provider: "mock",
  npcStore: "memory",
  services: {
    npcDirectory: {
      status: "local_demo",
      label: "本地演示数据",
      detail: "未连接 Supabase 时，录入资料会保存在当前浏览器和内存后端"
    },
    shopDirectory: {
      status: "local_demo",
      label: "本地小店目录",
      detail: "未连接 Supabase 小店表时，使用 v2 原型种子数据"
    },
    ai: {
      status: "mock",
      label: "本地兜底分身",
      detail: "未配置 DeepSeek 时，分身使用本地规则回复"
    },
    map: {
      status: "osm_fallback",
      label: "OpenStreetMap 底图",
      detail: "未配置高德 key 时，真实底图使用 OpenStreetMap 兜底"
    }
  }
};

const isSystemStatusResponse = (value: unknown): value is SystemStatusResponse => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<SystemStatusResponse>;
  return (
    typeof candidate.ok === "boolean" &&
    (candidate.provider === "deepseek" || candidate.provider === "mock") &&
    (candidate.npcStore === "memory" || candidate.npcStore === "supabase") &&
    typeof candidate.services === "object" &&
    candidate.services !== null &&
    typeof candidate.services.npcDirectory?.label === "string" &&
    typeof candidate.services.shopDirectory?.label === "string" &&
    typeof candidate.services.ai?.label === "string" &&
    typeof candidate.services.map?.label === "string"
  );
};

export async function fetchSystemStatus(fetchImpl: FetchLike = fetch): Promise<SystemStatusResponse> {
  try {
    const response = await fetchImpl("/api/health");
    if (!response.ok) {
      return fallbackSystemStatus;
    }

    const payload = await response.json();
    return isSystemStatusResponse(payload) ? payload : fallbackSystemStatus;
  } catch {
    return fallbackSystemStatus;
  }
}
