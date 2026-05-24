import { describe, expect, it } from "vitest";
import { npcs } from "../data/npcs";
import { createNpcSkillProfile, renderNpcSkillPrompt } from "./npcSkillProfile";

describe("NpcSkillProfile", () => {
  it("structures a new villager avatar into persona, scene, task, boundary, and ops Skills", () => {
    const profile = createNpcSkillProfile(npcs[1]);

    expect(profile).toMatchObject({
      schemaVersion: 1,
      npcId: "qinghe",
      npcName: "青禾",
      skills: {
        persona: {
          label: "人设 Skill",
          tone: "温柔、细致、自然观察感强"
        },
        scene: {
          label: "场景 Skill",
          todayState: "现在可聊"
        },
        task: {
          label: "任务 Skill"
        },
        boundary: {
          label: "边界 Skill"
        },
        ops: {
          label: "运营 Skill",
          reviewStatus: "demo"
        }
      }
    });
    expect(profile.skills.persona.knowledge).toContain("溪头厝与西溪河岸");
    expect(profile.skills.scene.intentKeywords).toEqual(
      expect.arrayContaining(["今天能去吗", "怎么靠近", "适合做什么"])
    );
    expect(profile.skills.task.tasks[0]).toMatchObject({
      id: "color-sampling",
      title: "村庄颜色采样"
    });
    expect(profile.skills.boundary.handoffKeywords).toEqual(
      expect.arrayContaining(["价格", "预约", "开放时间", "安全"])
    );
    expect(profile.skills.ops.auditChecklist.join(" ")).toContain("审核");
  });

  it("renders the Skill profile as a controllable system prompt contract", () => {
    const prompt = renderNpcSkillPrompt(createNpcSkillProfile(npcs[0]));

    expect(prompt).toContain("【人设 Skill】");
    expect(prompt).toContain("【场景 Skill】");
    expect(prompt).toContain("【任务 Skill】");
    expect(prompt).toContain("【边界 Skill】");
    expect(prompt).toContain("【运营 Skill】");
    expect(prompt).toContain("价格、预约、开放时间、安全、工具、食宿、私人联系方式");
    expect(prompt).not.toContain("模型蒸馏");
  });
});
