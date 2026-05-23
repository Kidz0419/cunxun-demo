import type {
  ShopProfile,
  ShopTwinChatRequest,
  ShopTwinChatResponse
} from "../src/shared/shopContract.js";
import type { ShopRepository } from "./shopRepository.js";

type DeepSeekMessage = {
  role: "system" | "assistant" | "user";
  content: string;
};

type DeepSeekApiResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ShopTwinServiceOptions = {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
};

const statusLabel: Record<ShopProfile["status"], string> = {
  open: "营业中",
  resting: "休息中",
  closed: "已打烊"
};

function buildShopTwinPrompt(shop: ShopProfile): string {
  return [
    "你是《村寻》里主理人小店的数字分身，不是真人本人。",
    "你的任务是帮游客了解小店、主理人、可体验内容和到访边界，适合线下见面前破冰。",
    "必须保持数字分身身份，不能代替真人做经营、价格、预约、安全或营业承诺。",
    "",
    `小店：${shop.name}`,
    `村庄：${shop.village}`,
    `分类：${shop.category}`,
    `主理人：${shop.owner.name}`,
    `主理人头衔：${shop.owner.title}`,
    `当前展示状态：${statusLabel[shop.status]}`,
    `展示营业时间：${shop.hours}`,
    `特色：${shop.feature}`,
    "",
    "边界：",
    "- 涉及价格、预约、库存、是否本人在场、工具安全、儿童参与、真实营业状态时，必须提示以真人确认或现场信息为准。",
    "- 不暴露私人联系方式、住址或未公开信息。",
    "- 不承诺游客一定能参加体验。",
    "",
    "回答要求：先简短回答游客问题，再自然给出一个可执行的到访建议；语气像主理人的分身，亲切具体，不营销夸张。"
  ].join("\n");
}

function buildDeepSeekPayload(shop: ShopProfile, request: ShopTwinChatRequest, model: string) {
  const historyMessages: DeepSeekMessage[] = request.history.slice(-8).map((message) => ({
    role: message.role === "twin" ? "assistant" : "user",
    content: message.text
  }));

  return {
    model,
    temperature: 0.7,
    stream: false,
    messages: [
      { role: "system", content: buildShopTwinPrompt(shop) },
      ...historyMessages,
      { role: "user", content: request.visitorMessage }
    ]
  };
}

function createLocalFallback(shop: ShopProfile, visitorMessage: string): ShopTwinChatResponse {
  const statusText = statusLabel[shop.status];
  const needsHandoff = /现在|今天|预约|价格|多少钱|能不能|可以|营业|开门/u.test(visitorMessage);

  return {
    shopId: shop.id,
    provider: "mock",
    offlineFallback: true,
    reply: [
      `我是${shop.owner.name}的数字分身，先替你讲个大概：${shop.name}现在展示为「${statusText}」，特色是${shop.feature}。`,
      needsHandoff
        ? `你问的这件事最好到现场或让真人再确认一次，分身不替${shop.owner.name}做真实接待承诺。`
        : "如果你到附近，可以先看看门口的公开提示，再决定要不要进去坐一会儿。"
    ].join("")
  };
}

async function callDeepSeekForShopTwin(
  shop: ShopProfile,
  request: ShopTwinChatRequest,
  options: Required<Pick<ShopTwinServiceOptions, "env" | "fetchImpl">>
): Promise<ShopTwinChatResponse> {
  const apiKey = options.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  const model = options.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";
  const baseUrl = options.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const response = await options.fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildDeepSeekPayload(shop, request, model))
  });

  if (!response.ok) {
    throw new Error(`DeepSeek request failed with ${response.status}`);
  }

  const body = (await response.json()) as DeepSeekApiResponse;
  const reply = body.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("DeepSeek response did not include a reply");
  }

  return {
    shopId: shop.id,
    reply,
    provider: "deepseek",
    offlineFallback: false
  };
}

export async function createShopTwinChatResponse(
  request: ShopTwinChatRequest,
  shopRepository: ShopRepository,
  options: ShopTwinServiceOptions = {}
): Promise<ShopTwinChatResponse> {
  const shop = await shopRepository.getShopProfile(request.shopId);
  if (!shop) {
    return {
      shopId: request.shopId,
      reply: "我还没有在村寻小店目录里找到这位主理人的分身。",
      provider: "mock",
      offlineFallback: true
    };
  }

  if (shop.aiEnabled && options.env?.DEEPSEEK_API_KEY) {
    try {
      return await callDeepSeekForShopTwin(shop, request, {
        env: options.env,
        fetchImpl: options.fetchImpl ?? fetch
      });
    } catch (error) {
      console.warn("[cunxun] Shop twin DeepSeek failed, falling back to mock:", error);
    }
  }

  return createLocalFallback(shop, request.visitorMessage);
}
