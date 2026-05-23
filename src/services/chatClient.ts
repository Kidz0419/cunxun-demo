import { npcs } from "../data/npcs";
import { createMockNpcReply } from "../domain/mockChat";
import type { NpcChatRequest, NpcChatResponse } from "../shared/chatContract";

type FetchLike = typeof fetch;

const createLocalFallback = (request: NpcChatRequest): NpcChatResponse => {
  const npc = npcs.find((item) => item.id === request.npcId) ?? request.npcProfile ?? npcs[0];
  const reply = createMockNpcReply(npc, request.visitorMessage);

  return {
    npcId: npc.id,
    reply: reply.text,
    provider: "mock",
    offlineFallback: true,
    recommendedTask: reply.recommendedTask,
    actions: reply.actions
  };
};

export async function sendNpcChat(
  request: NpcChatRequest,
  fetchImpl: FetchLike = fetch
): Promise<NpcChatResponse> {
  try {
    const response = await fetchImpl("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Chat API failed with ${response.status}`);
    }

    return (await response.json()) as NpcChatResponse;
  } catch {
    return createLocalFallback(request);
  }
}
