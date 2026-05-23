import type { Npc } from "../types";
import { createGeneratedPlaceholderVisualAsset } from "../data/visualAssets";

export const customNpcStorageKey = "cunxun.customNpcs";
export const customNpcStorageSchemaVersion = 1;

type StoredCustomNpcCollection = {
  schemaVersion: typeof customNpcStorageSchemaVersion;
  npcs: Npc[];
};

const getBrowserStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

const isStoredCustomNpcCollection = (value: unknown): value is StoredCustomNpcCollection =>
  typeof value === "object" &&
  value !== null &&
  "schemaVersion" in value &&
  "npcs" in value &&
  (value as StoredCustomNpcCollection).schemaVersion === customNpcStorageSchemaVersion &&
  Array.isArray((value as StoredCustomNpcCollection).npcs);

const legacyTextReplacements = [
  ["山边木作间", "小毛驴四坪农园"],
  ["木作工作室主理人", "农园共学伙伴"],
  ["木作 / 旧物修复", "农园 / 研学 / 土地观察"],
  ["旧门板和废木料", "菜畦和共学活动"],
  ["旧物", "土地"],
  ["木头", "土地细节"],
  ["旧凳", "田埂"],
  ["工具使用", "农具使用"]
] as const;

const replaceLegacyText = (value: string) =>
  legacyTextReplacements.reduce(
    (current, [from, to]) => current.split(from).join(to),
    value
  );

const normalizeLegacyCustomNpc = (npc: Npc): Npc => {
  if (npc.spaceName !== "山边木作间") return npc;

  const nextSpaceName = "小毛驴四坪农园";
  const nextSpaceType = "农园 / 研学 / 土地观察";

  return {
    ...npc,
    role: replaceLegacyText(npc.role),
    spaceName: nextSpaceName,
    spaceType: nextSpaceType,
    visualAsset: createGeneratedPlaceholderVisualAsset({
      spaceName: nextSpaceName,
      spaceType: nextSpaceType,
      village: npc.village
    }),
    terrainNote: replaceLegacyText(npc.terrainNote),
    routeSteps: npc.routeSteps.map(replaceLegacyText),
    shortIntro: replaceLegacyText(npc.shortIntro),
    story: replaceLegacyText(npc.story),
    welcomeMessage: replaceLegacyText(npc.welcomeMessage),
    suggestedQuestions: npc.suggestedQuestions.map(replaceLegacyText),
    tasks: npc.tasks.map((task) => ({
      ...task,
      title: replaceLegacyText(task.title),
      description: replaceLegacyText(task.description),
      checkinPrompt: replaceLegacyText(task.checkinPrompt),
      rewardText: replaceLegacyText(task.rewardText)
    })),
    boundaries: npc.boundaries.map(replaceLegacyText),
    humanHandoff: {
      ...npc.humanHandoff,
      handoffText: replaceLegacyText(npc.humanHandoff.handoffText)
    }
  };
};

const normalizeLoadedCustomNpcs = (npcs: Npc[], storage: Storage) => {
  const normalizedNpcs = npcs.map(normalizeLegacyCustomNpc);
  const shouldPersist = normalizedNpcs.some((npc, index) => npc !== npcs[index]);

  if (shouldPersist) {
    saveCustomNpcs(normalizedNpcs, storage);
  }

  return normalizedNpcs;
};

export function loadCustomNpcs(storage: Storage | null = getBrowserStorage()): Npc[] {
  if (!storage) return [];

  try {
    const value = storage.getItem(customNpcStorageKey);
    if (!value) return [];

    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return normalizeLoadedCustomNpcs(parsed as Npc[], storage);
    }

    return isStoredCustomNpcCollection(parsed)
      ? normalizeLoadedCustomNpcs(parsed.npcs, storage)
      : [];
  } catch {
    return [];
  }
}

export function saveCustomNpcs(npcs: Npc[], storage: Storage | null = getBrowserStorage()) {
  const payload: StoredCustomNpcCollection = {
    schemaVersion: customNpcStorageSchemaVersion,
    npcs
  };

  storage?.setItem(customNpcStorageKey, JSON.stringify(payload));
}
