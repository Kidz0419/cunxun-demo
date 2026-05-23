import { describe, expect, it, vi } from "vitest";
import { fallbackSystemStatus, fetchSystemStatus } from "./systemStatusClient";

describe("systemStatusClient", () => {
  it("reads backend service readiness from the health endpoint", async () => {
    const payload = {
      ok: true,
      provider: "deepseek",
      npcStore: "supabase",
      services: {
        npcDirectory: {
          status: "supabase_connected",
          label: "Supabase 已连接",
          detail: "新村民资料会写入 Supabase"
        },
        shopDirectory: {
          status: "supabase_connected",
          label: "Supabase 小店目录",
          detail: "v2 主理人小店资料会写入 Supabase"
        },
        ai: {
          status: "deepseek_connected",
          label: "DeepSeek 在线",
          detail: "数字分身由 DeepSeek 生成回复"
        },
        map: {
          status: "amap_ready",
          label: "高德地图已配置",
          detail: "真实底图可加载高德 JSAPI"
        }
      }
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload
    });

    await expect(fetchSystemStatus(fetchMock)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/health");
  });

  it("falls back to local demo status when the backend is unavailable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));

    await expect(fetchSystemStatus(fetchMock)).resolves.toEqual(fallbackSystemStatus);
  });
});
