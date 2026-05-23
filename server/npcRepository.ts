import { createNpcFromSubmission, type VillagerSubmission } from "../src/domain/npcSubmission.js";
import type { Npc, NpcReviewStatus } from "../src/types.js";

export const npcRepositorySchemaVersion = 1;

export type CustomNpcReviewStatus = Extract<NpcReviewStatus, "draft" | "pending" | "approved">;

export type CreateNpcSubmissionInput = {
  submission: VillagerSubmission;
  reviewStatus: CustomNpcReviewStatus;
};

export type NpcRepository = {
  kind: "memory" | "supabase";
  listApprovedCustomNpcs: () => Promise<Npc[]>;
  listVillagerSubmissions: () => Promise<Npc[]>;
  createVillagerSubmission: (input: CreateNpcSubmissionInput) => Promise<Npc>;
  updateVillagerSubmissionStatus: (
    npcId: string,
    reviewStatus: CustomNpcReviewStatus
  ) => Promise<Npc | null>;
  deleteVillagerSubmission: (npcId: string) => Promise<boolean>;
};

const withReviewStatus = (npc: Npc, reviewStatus: CustomNpcReviewStatus): Npc => ({
  ...npc,
  reviewStatus
});

export function createMemoryNpcRepository(initialCustomNpcs: Npc[] = []): NpcRepository {
  let customNpcs = [...initialCustomNpcs];

  return {
    kind: "memory",
    async listApprovedCustomNpcs() {
      return customNpcs.filter((npc) => npc.reviewStatus === "approved");
    },
    async listVillagerSubmissions() {
      return customNpcs;
    },
    async createVillagerSubmission({ submission, reviewStatus }) {
      const npc = withReviewStatus(createNpcFromSubmission(submission, customNpcs.length), reviewStatus);
      customNpcs = [npc, ...customNpcs];
      return npc;
    },
    async updateVillagerSubmissionStatus(npcId, reviewStatus) {
      const target = customNpcs.find((npc) => npc.id === npcId);
      if (!target) return null;

      const nextNpc = withReviewStatus(target, reviewStatus);
      customNpcs = customNpcs.map((npc) => (npc.id === npcId ? nextNpc : npc));
      return nextNpc;
    },
    async deleteVillagerSubmission(npcId) {
      const beforeCount = customNpcs.length;
      customNpcs = customNpcs.filter((npc) => npc.id !== npcId);
      return customNpcs.length !== beforeCount;
    }
  };
}
