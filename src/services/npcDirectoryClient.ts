import type { VillagerSubmission } from "../domain/npcSubmission";
import type { Npc, NpcReviewStatus } from "../types";

type FetchLike = typeof fetch;
type CustomNpcReviewStatus = Extract<NpcReviewStatus, "draft" | "pending" | "approved">;

export type SubmitVillagerSubmissionRequest = {
  submission: VillagerSubmission;
  reviewStatus: CustomNpcReviewStatus;
};

type NpcCollectionResponse = {
  schemaVersion: 1;
  npcs: Npc[];
};

type NpcItemResponse = {
  schemaVersion: 1;
  npc: Npc;
};

const jsonHeaders = {
  "Content-Type": "application/json"
};

const ensureOk = async (response: Response, action: string) => {
  if (!response.ok) {
    throw new Error(`${action} failed with ${response.status}`);
  }
};

export async function fetchApprovedCustomNpcs(fetchImpl: FetchLike = fetch): Promise<Npc[]> {
  const response = await fetchImpl("/api/npcs?status=approved");
  await ensureOk(response, "Fetch approved NPCs");
  const payload = (await response.json()) as NpcCollectionResponse;
  return payload.npcs;
}

export async function fetchVillagerSubmissions(fetchImpl: FetchLike = fetch): Promise<Npc[]> {
  const response = await fetchImpl("/api/villager-submissions");
  await ensureOk(response, "Fetch villager submissions");
  const payload = (await response.json()) as NpcCollectionResponse;
  return payload.npcs;
}

export async function submitVillagerSubmission(
  request: SubmitVillagerSubmissionRequest,
  fetchImpl: FetchLike = fetch
): Promise<Npc> {
  const response = await fetchImpl("/api/villager-submissions", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(request)
  });
  await ensureOk(response, "Submit villager profile");
  const payload = (await response.json()) as NpcItemResponse;
  return payload.npc;
}

export async function updateVillagerSubmissionStatus(
  npcId: string,
  reviewStatus: CustomNpcReviewStatus,
  fetchImpl: FetchLike = fetch
): Promise<Npc> {
  const response = await fetchImpl(`/api/villager-submissions/${npcId}/review-status`, {
    method: "PATCH",
    headers: jsonHeaders,
    body: JSON.stringify({ reviewStatus })
  });
  await ensureOk(response, "Update villager submission");
  const payload = (await response.json()) as NpcItemResponse;
  return payload.npc;
}

export async function deleteVillagerSubmission(
  npcId: string,
  fetchImpl: FetchLike = fetch
): Promise<void> {
  const response = await fetchImpl(`/api/villager-submissions/${npcId}`, {
    method: "DELETE"
  });
  await ensureOk(response, "Delete villager submission");
}
