import { describe, expect, it } from "vitest";
import { npcs } from "../../src/data/npcs";
import type { NpcChatRequest } from "../../src/shared/chatContract";
import { buildDeepSeekPayload } from "./deepseekProvider";

describe("buildDeepSeekPayload", () => {
  it("creates an OpenAI-compatible DeepSeek chat completion payload from the portable NPC contract", () => {
    const request: NpcChatRequest = {
      npcId: "qinghe",
      visitorMessage: "我只有一个下午，适合体验什么？",
      history: [
        { id: "hello", role: "npc", text: "你可以带着一种颜色来找我。" },
        { id: "visitor-1", role: "visitor", text: "你好" }
      ]
    };

    const payload = buildDeepSeekPayload(npcs[1], request, "deepseek-chat");

    expect(payload.model).toBe("deepseek-chat");
    expect(payload.messages[0]).toMatchObject({ role: "system" });
    expect(payload.messages[0].content).toContain("青禾");
    expect(payload.messages[0].content).toContain("不是真人本人");
    expect(payload.messages.at(-1)).toEqual({
      role: "user",
      content: "我只有一个下午，适合体验什么？"
    });
  });
});
