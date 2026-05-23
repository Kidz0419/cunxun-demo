import { describe, expect, it } from "vitest";
import { npcs } from "./npcs";

describe("demo NPC seed data", () => {
  it("models a fuller cold-start roster across Longtan and Siping", () => {
    expect(npcs).toHaveLength(6);
    expect(npcs.filter((npc) => npc.village === "龙潭村")).toHaveLength(3);
    expect(npcs.filter((npc) => npc.village === "四坪村")).toHaveLength(3);
    expect(new Set(npcs.map((npc) => npc.id))).toHaveProperty("size", npcs.length);
  });

  it("gives every seed NPC enough material for map, chat, and tasks", () => {
    npcs.forEach((npc) => {
      expect(npc.visualAsset?.caption).toBe("AI 生成示意图，非真实照片");
      expect(npc.todayStatus.detail.length).toBeGreaterThan(12);
      expect(npc.suggestedQuestions).toHaveLength(4);
      expect(npc.tasks).toHaveLength(1);
      expect(npc.tasks[0].description.length).toBeGreaterThan(24);
      expect(npc.boundaries.length).toBeGreaterThanOrEqual(3);
      expect(npc.humanHandoff.handoffText).toContain("真人");
      expect(["open_now", "later_today", "closed_today"]).toContain(
        npc.todayStatus.availability
      );
    });
  });

  it("spreads the seed roster across all three today-status availability buckets", () => {
    const byAvailability = npcs.reduce<Record<string, number>>((map, npc) => {
      const key = npc.todayStatus.availability;
      map[key] = (map[key] ?? 0) + 1;
      return map;
    }, {});

    expect(byAvailability.open_now).toBeGreaterThan(0);
    expect(byAvailability.later_today).toBeGreaterThan(0);
    expect(byAvailability.closed_today).toBeGreaterThan(0);
  });

  it("uses a distinct visual preset for every seed NPC space", () => {
    const presetSources = npcs.map((npc) => npc.visualAsset?.src ?? "");
    expect(new Set(presetSources).size).toBe(npcs.length);
  });

  it("covers the main demo visit intents instead of repeating one type of space", () => {
    const spaceTypes = npcs.map((npc) => npc.spaceType).join(" / ");

    expect(spaceTypes).toContain("阅读");
    expect(spaceTypes).toContain("手作");
    expect(spaceTypes).toContain("民宿");
    expect(spaceTypes).toContain("农园");
    expect(spaceTypes).toContain("驿站");
    expect(spaceTypes).toContain("采风");
  });
});
