import { describe, expect, it } from "vitest";
import { createNpcFromSubmission } from "./npcSubmission";
import {
  customNpcStorageKey,
  customNpcStorageSchemaVersion,
  loadCustomNpcs,
  saveCustomNpcs
} from "./customNpcStorage";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const createStorageNpc = () =>
  createNpcFromSubmission(
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
    () => "storage"
  );

describe("custom NPC storage", () => {
  it("stores generated NPCs with a schema version for future migration", () => {
    const storage = new MemoryStorage();
    const npc = createStorageNpc();

    saveCustomNpcs([npc], storage);

    expect(JSON.parse(storage.getItem(customNpcStorageKey) ?? "")).toMatchObject({
      schemaVersion: customNpcStorageSchemaVersion,
      npcs: [{ id: "custom-storage", reviewStatus: "draft" }]
    });
    expect(loadCustomNpcs(storage)).toEqual([npc]);
  });

  it("can still read the old array-only demo storage format", () => {
    const storage = new MemoryStorage();
    const npc = createStorageNpc();

    storage.setItem(customNpcStorageKey, JSON.stringify([npc]));

    expect(loadCustomNpcs(storage)).toEqual([npc]);
  });

  it("migrates legacy mock place names to real village locations", () => {
    const storage = new MemoryStorage();
    const legacyNpc = createNpcFromSubmission(
      {
        name: "阿南",
        village: "四坪村",
        role: "木作工作室主理人",
        spaceName: "山边木作间",
        spaceType: "木作 / 旧物修复",
        story: "我把旧门板和废木料重新做成日常器物。",
        welcomeMessage: "带一块你觉得有故事的木头来找我。",
        experience: "一起修一只旧凳，记录它原来的使用痕迹。",
        tone: "温和、朴素、手艺人气质",
        boundaries: "工具使用需要真人确认。"
      },
      0,
      () => "legacy"
    );

    saveCustomNpcs([legacyNpc], storage);

    const [migratedNpc] = loadCustomNpcs(storage);

    expect(migratedNpc.spaceName).toBe("小毛驴四坪农园");
    expect(migratedNpc.role).toBe("农园共学伙伴");
    expect(migratedNpc.spaceType).toBe("农园 / 研学 / 土地观察");
    expect(migratedNpc.visualAsset?.alt).toContain("小毛驴四坪农园");
    expect(storage.getItem(customNpcStorageKey)).toContain("小毛驴四坪农园");
    expect(storage.getItem(customNpcStorageKey)).not.toContain("山边木作间");
  });
});
