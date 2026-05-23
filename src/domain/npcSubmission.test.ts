import { describe, expect, it } from "vitest";
import { createNpcFromSubmission } from "./npcSubmission";

describe("createNpcFromSubmission", () => {
  it("turns a new villager submission into a portable NPC profile", () => {
    const npc = createNpcFromSubmission(
      {
        name: "阿南",
        village: "四坪村",
        role: "农园共学伙伴",
        spaceName: "小毛驴四坪农园",
        spaceType: "农园 / 研学 / 土地观察",
        story: "我在小毛驴四坪农园整理菜畦和共学活动，也想让游客理解一块土地的来处。",
        welcomeMessage: "如果你路过四坪，可以带一个你在四坪看到的土地细节来找我。",
        experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
        tone: "温和、朴素、手艺人气质",
        boundaries: "不承诺现场一定能开课；农具使用和田地进入需要真人确认。"
      },
      0,
      () => "fixed"
    );

    expect(npc.id).toBe("custom-fixed");
    expect(npc.name).toBe("阿南");
    expect(npc.village).toBe("四坪村");
    expect(npc.spaceName).toBe("小毛驴四坪农园");
    expect(npc.personality.tone).toBe("温和、朴素、手艺人气质");
    expect(npc.suggestedQuestions).toContain("我可以在小毛驴四坪农园做什么？");
    expect(npc.visualAsset).toMatchObject({
      kind: "generated_placeholder",
      caption: "AI 生成示意图，非真实照片"
    });
    expect(npc.tasks[0].title).toBe("小毛驴四坪农园体验任务");
    expect(npc.tasks[0].description).toContain("一起记录一块菜畦");
    expect(npc.boundaries).toContain("不承诺现场一定能开课");
    expect(npc.boundaries).toContain("不替真人确认价格、排期、预约或真实接待状态。");
  });
});
