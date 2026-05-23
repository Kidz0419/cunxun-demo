import { npcs } from "../src/data/npcs.js";
import { createMockNpcReply } from "../src/domain/mockChat.js";
import type { NpcChatRequest, NpcChatResponse } from "../src/shared/chatContract.js";
import { callDeepSeek } from "./ai/deepseekProvider.js";

export async function createNpcChatResponse(request: NpcChatRequest): Promise<NpcChatResponse> {
  const npc = npcs.find((item) => item.id === request.npcId) ?? request.npcProfile;

  if (!npc) {
    return {
      npcId: request.npcId,
      reply: "我还没有在村寻地图里找到这位新村民。",
      provider: "mock",
      offlineFallback: true,
      actions: []
    };
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

  if (apiKey) {
    try {
      return await callDeepSeek(npc, request, {
        apiKey,
        model,
        baseUrl: process.env.DEEPSEEK_BASE_URL
      });
    } catch (error) {
      console.warn("[cunxun] DeepSeek failed, falling back to mock:", error);
    }
  }

  const reply = createMockNpcReply(npc, request.visitorMessage);

  return {
    npcId: npc.id,
    reply: reply.text,
    provider: "mock",
    offlineFallback: true,
    recommendedTask: reply.recommendedTask,
    actions: reply.actions
  };
}
