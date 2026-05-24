// @vitest-environment node
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app";
import { createMemoryNpcRepository } from "./npcRepository";

const villagerSubmission = {
  name: "阿南",
  village: "四坪村",
  role: "农园共学伙伴",
  spaceName: "小毛驴四坪农园",
  spaceType: "农园 / 研学 / 土地观察",
  story: "我在小毛驴四坪农园整理菜畦和共学活动，也想让游客理解一块土地的来处。",
  welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
  experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
  tone: "温和、朴素、手艺人气质",
  boundaries: "农具使用和田地进入需要真人确认。"
};

const servers: Array<{ close: (callback?: (error?: Error) => void) => void }> = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
});

async function createTestClient(options: Parameters<typeof createApp>[0] = {}) {
  const app = createApp({
    env: {} as NodeJS.ProcessEnv,
    npcRepository: createMemoryNpcRepository(),
    ...options
  });
  const server = app.listen(0);
  servers.push(server);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    get: (path: string) => fetch(`${baseUrl}${path}`),
    post: (path: string, body: unknown) =>
      fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }),
    patch: (path: string, body: unknown) =>
      fetch(`${baseUrl}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }),
    delete: (path: string) => fetch(`${baseUrl}${path}`, { method: "DELETE" })
  };
}

describe("NPC repository API", () => {
  it("reports whether the demo is using local fallbacks or production services", async () => {
    const client = await createTestClient();

    const healthResponse = await client.get("/api/health");

    expect(await healthResponse.json()).toMatchObject({
      ok: true,
      provider: "mock",
      npcStore: "memory",
      services: {
        npcDirectory: {
          status: "local_demo",
          label: "本地演示数据"
        },
        ai: {
          status: "mock",
          label: "本地兜底分身"
        },
        map: {
          status: "osm_fallback",
          label: "OpenStreetMap 底图"
        }
      }
    });
  });

  it("returns 高德 browser config without exposing the server security code", async () => {
    const client = await createTestClient({
      env: {
        VITE_AMAP_KEY: "amap-public-key",
        AMAP_SECURITY_JS_CODE: "server-secret"
      } as NodeJS.ProcessEnv
    });

    const response = await client.get("/api/amap-config");

    expect(await response.json()).toEqual({
      enabled: true,
      key: "amap-public-key",
      serviceHost: "/_AMapService"
    });
  });

  it("proxies 高德 service requests with the server security code", async () => {
    const amapFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "1" }), {
        headers: { "content-type": "application/json" },
        status: 200
      })
    );
    const client = await createTestClient({
      amapFetch,
      env: {
        AMAP_WEB_SERVICE_KEY: "amap-public-key",
        AMAP_SECURITY_JS_CODE: "server-secret"
      } as NodeJS.ProcessEnv
    });

    const response = await client.get("/_AMapService/v3/place/text?keywords=%E6%9D%91%E5%AF%BB");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "1" });
    expect(amapFetch).toHaveBeenCalledWith(
      "https://restapi.amap.com/v3/place/text?keywords=%E6%9D%91%E5%AF%BB&jscode=server-secret"
    );
  });

  it("returns 高德民宿和餐厅 POI without creating profile mock data", async () => {
    const amapFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "1",
            pois: [
              {
                id: "B0STAY",
                name: "屏南小福地民宿",
                type: "住宿服务;住宿服务相关",
                address: "四坪村内",
                location: "119.082481,26.793512"
              }
            ]
          }),
          { headers: { "content-type": "application/json" }, status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "1",
            pois: [
              {
                id: "B0FOOD",
                name: "村口饭店",
                type: "餐饮服务;中餐厅",
                address: "四坪村口",
                location: "119.081981,26.793112"
              }
            ]
          }),
          { headers: { "content-type": "application/json" }, status: 200 }
        )
      );
    const client = await createTestClient({
      amapFetch,
      env: {
        AMAP_WEB_SERVICE_KEY: "amap-public-key",
        AMAP_SECURITY_JS_CODE: "server-secret"
      } as NodeJS.ProcessEnv
    });

    const response = await client.get("/api/amap-pois?village=siping");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      schemaVersion: 1,
      source: "amap",
      villageId: "siping",
      pois: [
        {
          id: "B0STAY",
          source: "amap",
          category: "stay",
          name: "屏南小福地民宿"
        },
        {
          id: "B0FOOD",
          source: "amap",
          category: "food",
          name: "村口饭店"
        }
      ]
    });
    expect(payload.pois[0]).not.toHaveProperty("story");
    expect(payload.pois[0]).not.toHaveProperty("tasks");
    expect(payload.pois[0]).not.toHaveProperty("welcomeMessage");
  });

  it("returns an empty 高德 POI layer when no AMap key is configured", async () => {
    const amapFetch = vi.fn();
    const client = await createTestClient({ amapFetch });

    const response = await client.get("/api/amap-pois?village=siping");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      schemaVersion: 1,
      source: "amap",
      villageId: "siping",
      pois: []
    });
    expect(amapFetch).not.toHaveBeenCalled();
  });

  it("exposes the backend Skill profile used to configure a digital avatar", async () => {
    const client = await createTestClient();

    const response = await client.get("/api/npcs/qinghe/skills");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      schemaVersion: 1,
      npcId: "qinghe",
      npcName: "青禾",
      skills: {
        persona: { label: "人设 Skill" },
        scene: { label: "场景 Skill" },
        task: { label: "任务 Skill" },
        boundary: { label: "边界 Skill" },
        ops: { label: "运营 Skill", reviewStatus: "demo" }
      }
    });
  });

  it("keeps new villager submissions pending until approved for the visitor map", async () => {
    const client = await createTestClient();

    const emptyApprovedResponse = await client.get("/api/npcs?status=approved");
    expect(await emptyApprovedResponse.json()).toMatchObject({
      schemaVersion: 1,
      npcs: []
    });

    const createResponse = await client.post("/api/villager-submissions", {
      submission: villagerSubmission,
      reviewStatus: "pending"
    });
    expect(createResponse.status).toBe(201);

    const createdPayload = await createResponse.json();
    expect(createdPayload).toMatchObject({
      schemaVersion: 1,
      npc: {
        name: "阿南",
        village: "四坪村",
        spaceName: "小毛驴四坪农园",
        reviewStatus: "pending",
        visualAsset: {
          kind: "generated_placeholder",
          caption: "AI 生成示意图，非真实照片"
        }
      }
    });

    const pendingListResponse = await client.get("/api/villager-submissions");
    const pendingPayload = await pendingListResponse.json();
    expect(pendingPayload.npcs).toHaveLength(1);
    expect(pendingPayload.npcs[0].reviewStatus).toBe("pending");

    const stillHiddenResponse = await client.get("/api/npcs?status=approved");
    expect((await stillHiddenResponse.json()).npcs).toHaveLength(0);

    const approveResponse = await client.patch(
      `/api/villager-submissions/${createdPayload.npc.id}/review-status`,
      { reviewStatus: "approved" }
    );
    expect(approveResponse.status).toBe(200);
    expect((await approveResponse.json()).npc.reviewStatus).toBe("approved");

    const approvedResponse = await client.get("/api/npcs?status=approved");
    const approvedPayload = await approvedResponse.json();
    expect(approvedPayload.npcs).toHaveLength(1);
    expect(approvedPayload.npcs[0].name).toBe("阿南");

    const deleteResponse = await client.delete(`/api/villager-submissions/${createdPayload.npc.id}`);
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await client.get("/api/villager-submissions");
    expect((await afterDeleteResponse.json()).npcs).toHaveLength(0);
  });
});
