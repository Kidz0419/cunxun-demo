import type { Npc, NpcReviewStatus } from "../../types";

export const getReviewStatusLabel = (status: NpcReviewStatus | undefined) => {
  if (status === "approved" || status === "demo") return "已上线";
  if (status === "pending") return "待审核";
  return "草稿";
};

export const getReadinessClassName = (status: string) =>
  status.includes("connected") || status.includes("ready") ? "is-live" : "is-fallback";

export const mergeCustomNpcCollections = (incoming: Npc[], current: Npc[]) => {
  const merged = new Map(current.map((npc) => [npc.id, npc]));
  incoming.forEach((npc) => merged.set(npc.id, npc));
  return Array.from(merged.values());
};

export const upsertCustomNpc = (npcs: Npc[], nextNpc: Npc) => {
  const hasExisting = npcs.some((npc) => npc.id === nextNpc.id);
  return hasExisting
    ? npcs.map((npc) => (npc.id === nextNpc.id ? nextNpc : npc))
    : [nextNpc, ...npcs];
};
