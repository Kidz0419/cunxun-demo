import { buildNpcPrompt } from "../../src/domain/npcPrompt.js";
import type { NpcChatRequest, NpcChatResponse } from "../../src/shared/chatContract.js";
import type { Npc } from "../../src/types.js";

type DeepSeekMessage = {
  role: "system" | "assistant" | "user";
  content: string;
};

export type DeepSeekPayload = {
  model: string;
  messages: DeepSeekMessage[];
  temperature: number;
  stream: false;
};

type DeepSeekApiResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export function buildDeepSeekPayload(
  npc: Npc,
  request: NpcChatRequest,
  model: string
): DeepSeekPayload {
  const historyMessages: DeepSeekMessage[] = request.history.slice(-8).map((message) => ({
    role: message.role === "npc" ? "assistant" : "user",
    content: message.text
  }));

  return {
    model,
    temperature: 0.7,
    stream: false,
    messages: [
      { role: "system", content: buildNpcPrompt(npc) },
      ...historyMessages,
      { role: "user", content: request.visitorMessage }
    ]
  };
}

export async function callDeepSeek(
  npc: Npc,
  request: NpcChatRequest,
  options: {
    apiKey: string;
    model: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
  }
): Promise<NpcChatResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${options.baseUrl ?? "https://api.deepseek.com"}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildDeepSeekPayload(npc, request, options.model))
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
    npcId: npc.id,
    reply,
    provider: "deepseek",
    offlineFallback: false,
    actions: []
  };
}
