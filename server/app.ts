import express from "express";
import type { VillagerSubmission } from "../src/domain/npcSubmission.js";
import type { NpcChatRequest } from "../src/shared/chatContract.js";
import type { SystemStatusResponse } from "../src/shared/systemStatus.js";
import { createNpcChatResponse } from "./chatService.js";
import {
  npcRepositorySchemaVersion,
  type CustomNpcReviewStatus,
  type NpcRepository
} from "./npcRepository.js";
import { createMemoryNpcRepository } from "./npcRepository.js";
import { createSupabaseNpcRepositoryFromEnv } from "./supabaseNpcRepository.js";
import { isShopProfile } from "../src/domain/shopDirectory.js";
import type { ShopTwinChatRequest } from "../src/shared/shopContract.js";
import { createShopTwinChatResponse } from "./shopTwinService.js";
import {
  createMemoryShopRepository,
  parseShopDirectoryQuery,
  shopDirectorySchemaVersion,
  type ShopProfilePatch,
  type ShopRepository
} from "./shopRepository.js";
import { createSupabaseShopRepositoryFromEnv } from "./supabaseShopRepository.js";

type CreateAppOptions = {
  amapFetch?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  npcRepository?: NpcRepository;
  shopRepository?: ShopRepository;
  shopTwinFetch?: typeof fetch;
};

const villagerSubmissionFields: Array<keyof VillagerSubmission> = [
  "name",
  "village",
  "role",
  "spaceName",
  "spaceType",
  "story",
  "welcomeMessage",
  "experience",
  "tone",
  "boundaries"
];

const customReviewStatuses: CustomNpcReviewStatus[] = ["draft", "pending", "approved"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isVillagerSubmission = (value: unknown): value is VillagerSubmission =>
  isRecord(value) &&
  villagerSubmissionFields.every((field) => typeof value[field] === "string") &&
  (value.village === "龙潭村" || value.village === "四坪村");

const isCustomReviewStatus = (value: unknown): value is CustomNpcReviewStatus =>
  customReviewStatuses.includes(value as CustomNpcReviewStatus);

const createDefaultNpcRepository = () =>
  createSupabaseNpcRepositoryFromEnv() ?? createMemoryNpcRepository();

const createDefaultShopRepository = () =>
  createSupabaseShopRepositoryFromEnv() ?? createMemoryShopRepository();

const getAmapKey = (env: NodeJS.ProcessEnv) => env.VITE_AMAP_KEY ?? env.AMAP_KEY;
const getAmapSecurityCode = (env: NodeJS.ProcessEnv) =>
  env.AMAP_SECURITY_JS_CODE ?? env.VITE_AMAP_SECURITY_JS_CODE;

const createAmapProxyUrl = (originalUrl: string, securityJsCode: string) => {
  const incomingUrl = new URL(originalUrl, "http://localhost");
  const amapPath = incomingUrl.pathname.replace(/^\/_AMapService/u, "");

  incomingUrl.searchParams.set("jscode", securityJsCode);

  const serviceBaseUrl = amapPath.startsWith("/v4/map/styles")
    ? "https://webapi.amap.com"
    : "https://restapi.amap.com";

  return `${serviceBaseUrl}${amapPath}${incomingUrl.search}`;
};

const createSystemStatus = (
  npcRepository: NpcRepository,
  shopRepository: ShopRepository,
  env: NodeJS.ProcessEnv
): SystemStatusResponse => {
  const hasDeepSeek = Boolean(env.DEEPSEEK_API_KEY);
  const hasAmap = Boolean(getAmapKey(env));
  const hasAmapProxy = Boolean(getAmapSecurityCode(env));
  const hasSupabase = npcRepository.kind === "supabase";
  const hasSupabaseShopDirectory = shopRepository.kind === "supabase";

  return {
    ok: true,
    provider: hasDeepSeek ? "deepseek" : "mock",
    npcStore: npcRepository.kind,
    services: {
      npcDirectory: hasSupabase
        ? {
            status: "supabase_connected",
            label: "Supabase 已连接",
            detail: "新村民资料会写入 Supabase，并按审核状态给游客端读取"
          }
        : {
            status: "local_demo",
          label: "本地演示数据",
          detail: "未配置 Supabase，资料会保存在内存后端和当前浏览器"
          },
      shopDirectory: hasSupabaseShopDirectory
        ? {
            status: "supabase_connected",
            label: "Supabase 小店目录",
            detail: "v2 主理人小店资料会写入 Supabase，游客端按筛选读取"
          }
        : {
            status: "local_demo",
            label: "本地小店目录",
            detail: "未配置 Supabase 小店表时，使用 v2 原型种子数据"
          },
      ai: hasDeepSeek
        ? {
            status: "deepseek_connected",
            label: "DeepSeek 在线",
            detail: "数字分身回复由 DeepSeek 生成"
          }
        : {
            status: "mock",
            label: "本地兜底分身",
            detail: "未配置 DeepSeek，分身使用本地规则回复"
          },
      map: hasAmap
        ? {
            status: "amap_ready",
            label: "高德地图已配置",
            detail: hasAmapProxy
              ? "真实底图可加载高德 JSAPI，安全密钥由后端代理转发"
              : "真实底图可加载高德 JSAPI，路线可交给高德地图打开"
          }
        : {
            status: "osm_fallback",
            label: "OpenStreetMap 底图",
            detail: "未配置高德 key，真实底图使用 OpenStreetMap 兜底"
          }
    }
  };
};

const handleRouteError = (response: express.Response, error: unknown) => {
  console.warn("[cunxun] NPC repository route failed:", error);
  response.status(500).json({ error: "NPC repository unavailable" });
};

const handleShopRouteError = (response: express.Response, error: unknown) => {
  console.warn("[cunxun] Shop repository route failed:", error);
  response.status(500).json({ error: "Shop repository unavailable" });
};

const getBearerToken = (request: express.Request) => {
  const header = request.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/iu.exec(header);
  return match?.[1] ?? null;
};

const requireOperatorToken = (
  request: express.Request,
  response: express.Response,
  env: NodeJS.ProcessEnv
) => {
  const expectedToken = env.OPERATOR_API_TOKEN?.trim();
  if (!expectedToken) {
    response.status(503).json({ error: "OPERATOR_API_TOKEN is not configured" });
    return false;
  }

  const token = getBearerToken(request) ?? request.get("x-cunxun-operator-token");
  if (token !== expectedToken) {
    response.status(401).json({ error: "Operator token is required" });
    return false;
  }

  return true;
};

const isShopPatch = (value: unknown): value is ShopProfilePatch =>
  isRecord(value) &&
  Object.keys(value).every((key) =>
    [
      "name",
      "category",
      "village",
      "mapPosition",
      "coordinates",
      "owner",
      "status",
      "hours",
      "feature",
      "tier",
      "aiEnabled",
      "distanceMeters"
    ].includes(key)
  );

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const env = options.env ?? process.env;
  const amapFetch = options.amapFetch ?? fetch;
  const npcRepository = options.npcRepository ?? createDefaultNpcRepository();
  const shopRepository = options.shopRepository ?? createDefaultShopRepository();
  const shopTwinFetch = options.shopTwinFetch ?? fetch;

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    response.json(createSystemStatus(npcRepository, shopRepository, env));
  });

  app.get("/api/amap-config", (_request, response) => {
    const key = getAmapKey(env);
    const securityJsCode = getAmapSecurityCode(env);

    if (!key) {
      response.json({ enabled: false });
      return;
    }

    response.json({
      enabled: true,
      key,
      ...(securityJsCode ? { serviceHost: "/_AMapService" } : {})
    });
  });

  app.use("/_AMapService", async (request, response) => {
    const securityJsCode = getAmapSecurityCode(env);

    if (!securityJsCode) {
      response.status(503).json({ error: "AMap security proxy is not configured" });
      return;
    }

    try {
      const proxyResponse = await amapFetch(createAmapProxyUrl(request.originalUrl, securityJsCode));
      const contentType = proxyResponse.headers.get("content-type");
      if (contentType) {
        response.setHeader("content-type", contentType);
      }

      response.status(proxyResponse.status).send(Buffer.from(await proxyResponse.arrayBuffer()));
    } catch (error) {
      console.warn("[cunxun] AMap proxy failed:", error);
      response.status(502).json({ error: "AMap proxy unavailable" });
    }
  });

  app.get("/api/npcs", async (request, response) => {
    const status = request.query.status ?? "approved";

    if (status !== "approved") {
      response.status(400).json({ error: "Only status=approved is supported for public NPC reads" });
      return;
    }

    try {
      response.json({
        schemaVersion: npcRepositorySchemaVersion,
        npcs: await npcRepository.listApprovedCustomNpcs()
      });
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  app.get("/api/villager-submissions", async (_request, response) => {
    try {
      response.json({
        schemaVersion: npcRepositorySchemaVersion,
        npcs: await npcRepository.listVillagerSubmissions()
      });
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  app.post("/api/villager-submissions", async (request, response) => {
    const body = request.body as Partial<{
      submission: VillagerSubmission;
      reviewStatus: CustomNpcReviewStatus;
    }>;

    if (!isVillagerSubmission(body.submission)) {
      response.status(400).json({ error: "submission is required" });
      return;
    }

    const reviewStatus = isCustomReviewStatus(body.reviewStatus) ? body.reviewStatus : "pending";

    try {
      response.status(201).json({
        schemaVersion: npcRepositorySchemaVersion,
        npc: await npcRepository.createVillagerSubmission({
          submission: body.submission,
          reviewStatus
        })
      });
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  app.patch("/api/villager-submissions/:npcId/review-status", async (request, response) => {
    const body = request.body as Partial<{ reviewStatus: CustomNpcReviewStatus }>;

    if (!isCustomReviewStatus(body.reviewStatus)) {
      response.status(400).json({ error: "reviewStatus is required" });
      return;
    }

    try {
      const npc = await npcRepository.updateVillagerSubmissionStatus(request.params.npcId, body.reviewStatus);
      if (!npc) {
        response.status(404).json({ error: "NPC submission not found" });
        return;
      }

      response.json({
        schemaVersion: npcRepositorySchemaVersion,
        npc
      });
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  app.delete("/api/villager-submissions/:npcId", async (request, response) => {
    try {
      const deleted = await npcRepository.deleteVillagerSubmission(request.params.npcId);
      if (!deleted) {
        response.status(404).json({ error: "NPC submission not found" });
        return;
      }

      response.status(204).send();
    } catch (error) {
      handleRouteError(response, error);
    }
  });

  app.get("/api/shops", async (request, response) => {
    const query = parseShopDirectoryQuery(request.query);

    if (!query) {
      response.status(400).json({ error: "Invalid shop directory filters" });
      return;
    }

    try {
      response.json({
        schemaVersion: shopDirectorySchemaVersion,
        shops: await shopRepository.listShopProfiles(query)
      });
    } catch (error) {
      handleShopRouteError(response, error);
    }
  });

  app.get("/api/shops/:shopId", async (request, response) => {
    try {
      const shop = await shopRepository.getShopProfile(request.params.shopId);
      if (!shop) {
        response.status(404).json({ error: "Shop profile not found" });
        return;
      }

      response.json({
        schemaVersion: shopDirectorySchemaVersion,
        shop
      });
    } catch (error) {
      handleShopRouteError(response, error);
    }
  });

  app.post("/api/shops", async (request, response) => {
    if (!requireOperatorToken(request, response, env)) return;

    const body = request.body as Partial<{ shop: unknown }>;
    if (!isShopProfile(body.shop)) {
      response.status(400).json({ error: "shop is required" });
      return;
    }

    try {
      response.status(201).json({
        schemaVersion: shopDirectorySchemaVersion,
        shop: await shopRepository.upsertShopProfile(body.shop)
      });
    } catch (error) {
      handleShopRouteError(response, error);
    }
  });

  app.patch("/api/shops/:shopId", async (request, response) => {
    if (!requireOperatorToken(request, response, env)) return;

    const body = request.body as Partial<{ patch: unknown }>;
    if (!isShopPatch(body.patch)) {
      response.status(400).json({ error: "patch is required" });
      return;
    }

    try {
      const shop = await shopRepository.updateShopProfile(request.params.shopId, body.patch);
      if (!shop) {
        response.status(404).json({ error: "Shop profile not found" });
        return;
      }

      response.json({
        schemaVersion: shopDirectorySchemaVersion,
        shop
      });
    } catch (error) {
      handleShopRouteError(response, error);
    }
  });

  app.delete("/api/shops/:shopId", async (request, response) => {
    if (!requireOperatorToken(request, response, env)) return;

    try {
      const deleted = await shopRepository.deleteShopProfile(request.params.shopId);
      if (!deleted) {
        response.status(404).json({ error: "Shop profile not found" });
        return;
      }

      response.status(204).send();
    } catch (error) {
      handleShopRouteError(response, error);
    }
  });

  app.post("/api/shop-twin-chat", async (request, response) => {
    const body = request.body as Partial<ShopTwinChatRequest>;

    if (!body.shopId || !body.visitorMessage || !Array.isArray(body.history)) {
      response.status(400).json({
        error: "shopId, visitorMessage, and history are required"
      });
      return;
    }

    const result = await createShopTwinChatResponse(
      {
        shopId: body.shopId,
        visitorMessage: body.visitorMessage,
        history: body.history
      },
      shopRepository,
      { env, fetchImpl: shopTwinFetch }
    );

    response.json(result);
  });

  app.post("/api/chat", async (request, response) => {
    const body = request.body as Partial<NpcChatRequest>;

    if (!body.npcId || !body.visitorMessage || !Array.isArray(body.history)) {
      response.status(400).json({
        error: "npcId, visitorMessage, and history are required"
      });
      return;
    }

    const result = await createNpcChatResponse({
      npcId: body.npcId,
      npcProfile: body.npcProfile,
      visitorMessage: body.visitorMessage,
      history: body.history,
      visitorContext: body.visitorContext
    });

    response.json(result);
  });

  return app;
}
