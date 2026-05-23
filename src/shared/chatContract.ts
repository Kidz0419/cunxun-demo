import type { ChatAction, ChatMessage, Npc, NpcTask } from "../types.js";

export type NpcChatRequest = {
  npcId: string;
  npcProfile?: Npc;
  visitorMessage: string;
  history: ChatMessage[];
  visitorContext?: {
    selectedTaskId?: string | null;
    timeAvailable?: string;
    interests?: string[];
    location?: {
      lat: number;
      lng: number;
    };
  };
};

export type NpcChatResponse = {
  npcId: string;
  reply: string;
  provider: "deepseek" | "mock";
  offlineFallback: boolean;
  recommendedTask?: NpcTask;
  actions: ChatAction[];
};
