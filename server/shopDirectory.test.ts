// @vitest-environment node
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

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
    ...options
  });
  const server = app.listen(0);
  servers.push(server);
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    get: (path: string) => fetch(`${baseUrl}${path}`),
    post: (path: string, body: unknown, token?: string) =>
      fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      }),
    patch: (path: string, body: unknown, token?: string) =>
      fetch(`${baseUrl}${path}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body)
      }),
    delete: (path: string, token?: string) =>
      fetch(`${baseUrl}${path}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      })
  };
}

describe("v2 shop directory API", () => {
  it("reports the shop directory as part of system health", async () => {
    const client = await createTestClient();

    const response = await client.get("/api/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      services: {
        shopDirectory: {
          status: "local_demo",
          label: "本地小店目录"
        }
      }
    });
  });

  it("serves the v2 prototype shop directory with village, category, and zoom filters", async () => {
    const client = await createTestClient();

    const response = await client.get("/api/shops?village=siping&category=craft&zoom=near");

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({
      schemaVersion: 1
    });
    expect(payload.shops.map((shop: { name: string }) => shop.name)).toEqual([
      "老周陶坊",
      "林伯榫卯工坊"
    ]);
    expect(
      payload.shops.every(
        (shop: { village: string; category: string }) =>
          shop.village === "siping" && shop.category === "craft"
      )
    ).toBe(true);
  });

  it("returns a single shop profile for the detail page", async () => {
    const client = await createTestClient();

    const response = await client.get("/api/shops/s01");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      schemaVersion: 1,
      shop: {
        id: "s01",
        name: "老周陶坊",
        owner: {
          name: "老周",
          title: "六十年揉土"
        },
        aiEnabled: true
      }
    });
  });

  it("requires an operator token for shop mutations and persists accepted changes", async () => {
    const client = await createTestClient({
      env: {
        OPERATOR_API_TOKEN: "operator-secret"
      } as NodeJS.ProcessEnv
    });
    const shop = {
      id: "test-tea-house",
      name: "南山茶寮",
      category: "cafe",
      village: "siping",
      mapPosition: { x: 0.52, y: 0.49 },
      coordinates: { lat: 26.793, lng: 119.081 },
      owner: { name: "阿南", title: "茶事主理人" },
      status: "open",
      hours: "10:00-18:00",
      feature: "小院里喝一盏高山茶",
      tier: 2,
      aiEnabled: true,
      distanceMeters: 210
    };

    const unauthorizedResponse = await client.post("/api/shops", { shop });
    expect(unauthorizedResponse.status).toBe(401);

    const createResponse = await client.post("/api/shops", { shop }, "operator-secret");
    expect(createResponse.status).toBe(201);
    expect(await createResponse.json()).toMatchObject({
      schemaVersion: 1,
      shop: {
        id: "test-tea-house",
        name: "南山茶寮"
      }
    });

    const patchResponse = await client.patch(
      "/api/shops/test-tea-house",
      { patch: { status: "closed", hours: "明日 10:00 开" } },
      "operator-secret"
    );
    expect(patchResponse.status).toBe(200);
    expect(await patchResponse.json()).toMatchObject({
      shop: {
        id: "test-tea-house",
        status: "closed",
        hours: "明日 10:00 开"
      }
    });

    const detailResponse = await client.get("/api/shops/test-tea-house");
    expect(await detailResponse.json()).toMatchObject({
      shop: {
        status: "closed"
      }
    });

    const deleteResponse = await client.delete("/api/shops/test-tea-house", "operator-secret");
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await client.get("/api/shops/test-tea-house");
    expect(afterDeleteResponse.status).toBe(404);
  });

  it("lets a visitor chat with a shop owner twin and falls back locally without DeepSeek", async () => {
    const client = await createTestClient();

    const response = await client.post("/api/shop-twin-chat", {
      shopId: "s01",
      visitorMessage: "现在还能来拉胚吗？",
      history: []
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      shopId: "s01",
      provider: "mock",
      offlineFallback: true,
      reply: expect.stringContaining("老周")
    });
  });
});
