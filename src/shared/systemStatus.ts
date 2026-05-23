export type ServiceStatus =
  | "local_demo"
  | "supabase_connected"
  | "mock"
  | "deepseek_connected"
  | "osm_fallback"
  | "amap_ready";

export type SystemServiceReadiness = {
  status: ServiceStatus;
  label: string;
  detail: string;
};

export type SystemStatusResponse = {
  ok: boolean;
  provider: "deepseek" | "mock";
  npcStore: "memory" | "supabase";
  services: {
    npcDirectory: SystemServiceReadiness;
    shopDirectory: SystemServiceReadiness;
    ai: SystemServiceReadiness;
    map: SystemServiceReadiness;
  };
};
