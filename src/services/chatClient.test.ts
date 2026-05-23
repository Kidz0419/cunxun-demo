import { describe, expect, it, vi } from "vitest";
import { createNpcFromSubmission } from "../domain/npcSubmission";
import { sendNpcChat } from "./chatClient";

describe("sendNpcChat", () => {
  it("uses the API response when /api/chat succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        npcId: "qinghe",
        reply: "沿溪流来找我。",
        provider: "deepseek",
        offlineFallback: false,
        actions: []
      })
    });

    const response = await sendNpcChat(
      {
        npcId: "qinghe",
        visitorMessage: "怎么过去？",
        history: []
      },
      fetchMock
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" })
    );
    expect(response.provider).toBe("deepseek");
    expect(response.reply).toBe("沿溪流来找我。");
  });

  it("falls back to local mock when /api/chat is unavailable", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));

    const response = await sendNpcChat(
      {
        npcId: "qinghe",
        visitorMessage: "我只有一个下午，适合体验什么？",
        history: []
      },
      fetchMock
    );

    expect(response.provider).toBe("mock");
    expect(response.offlineFallback).toBe(true);
    expect(response.reply).toContain("村庄颜色采样");
  });

  it("uses a submitted NPC profile for local fallback conversations", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    const submittedNpc = createNpcFromSubmission(
      {
        name: "阿南",
        village: "四坪村",
        role: "农园共学伙伴",
        spaceName: "小毛驴四坪农园",
        spaceType: "农园 / 研学 / 土地观察",
        story: "我在小毛驴四坪农园整理菜畦和共学活动。",
        welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
        experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
        tone: "温和、朴素、手艺人气质",
        boundaries: "农具使用和田地进入需要真人确认。"
      },
      0,
      () => "fixed"
    );

    const response = await sendNpcChat(
      {
        npcId: submittedNpc.id,
        npcProfile: submittedNpc,
        visitorMessage: "给我一个任务",
        history: []
      },
      fetchMock
    );

    expect(response.npcId).toBe("custom-fixed");
    expect(response.provider).toBe("mock");
    expect(response.reply).toContain("小毛驴四坪农园体验任务");
  });
});
