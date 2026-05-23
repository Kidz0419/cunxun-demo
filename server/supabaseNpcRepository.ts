import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createNpcFromSubmission, type VillagerSubmission } from "../src/domain/npcSubmission.js";
import type { Npc } from "../src/types.js";
import {
  npcRepositorySchemaVersion,
  type CustomNpcReviewStatus,
  type CreateNpcSubmissionInput,
  type NpcRepository
} from "./npcRepository.js";

type NpcSubmissionRow = {
  id: string;
  schema_version: typeof npcRepositorySchemaVersion;
  review_status: CustomNpcReviewStatus;
  npc_payload: Npc;
  villager_submission: VillagerSubmission;
  created_at?: string;
  updated_at?: string;
  approved_at?: string | null;
};

type SupabaseRepositoryOptions = {
  url: string;
  serviceRoleKey: string;
};

const tableName = "npc_submissions";

const throwSupabaseError = (error: { message: string } | null) => {
  if (error) {
    throw new Error(error.message);
  }
};

const createServerClient = ({ url, serviceRoleKey }: SupabaseRepositoryOptions) =>
  createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

async function countRows(client: SupabaseClient): Promise<number> {
  const { count, error } = await client.from(tableName).select("id", { count: "exact", head: true });
  throwSupabaseError(error);
  return count ?? 0;
}

async function selectNpcById(client: SupabaseClient, npcId: string): Promise<NpcSubmissionRow | null> {
  const { data, error } = await client
    .from(tableName)
    .select("id, schema_version, review_status, npc_payload, villager_submission, approved_at")
    .eq("id", npcId)
    .maybeSingle();

  throwSupabaseError(error);
  return (data as NpcSubmissionRow | null) ?? null;
}

export function createSupabaseNpcRepository(options: SupabaseRepositoryOptions): NpcRepository {
  const client = createServerClient(options);

  return {
    kind: "supabase",
    async listApprovedCustomNpcs() {
      const { data, error } = await client
        .from(tableName)
        .select("npc_payload")
        .eq("review_status", "approved")
        .order("updated_at", { ascending: false });

      throwSupabaseError(error);
      return ((data ?? []) as Array<Pick<NpcSubmissionRow, "npc_payload">>).map((row) => row.npc_payload);
    },
    async listVillagerSubmissions() {
      const { data, error } = await client
        .from(tableName)
        .select("npc_payload")
        .order("updated_at", { ascending: false });

      throwSupabaseError(error);
      return ((data ?? []) as Array<Pick<NpcSubmissionRow, "npc_payload">>).map((row) => row.npc_payload);
    },
    async createVillagerSubmission(input: CreateNpcSubmissionInput) {
      const existingCount = await countRows(client);
      const npc: Npc = {
        ...createNpcFromSubmission(input.submission, existingCount),
        reviewStatus: input.reviewStatus
      };

      const row: NpcSubmissionRow = {
        id: npc.id,
        schema_version: npcRepositorySchemaVersion,
        review_status: input.reviewStatus,
        npc_payload: npc,
        villager_submission: input.submission,
        approved_at: input.reviewStatus === "approved" ? new Date().toISOString() : null
      };

      const { error } = await client.from(tableName).insert(row);
      throwSupabaseError(error);
      return npc;
    },
    async updateVillagerSubmissionStatus(npcId, reviewStatus) {
      const row = await selectNpcById(client, npcId);
      if (!row) return null;

      const nextNpc: Npc = {
        ...row.npc_payload,
        reviewStatus
      };
      const { data, error } = await client
        .from(tableName)
        .update({
          review_status: reviewStatus,
          npc_payload: nextNpc,
          approved_at: reviewStatus === "approved" ? new Date().toISOString() : null
        })
        .eq("id", npcId)
        .select("npc_payload")
        .single();

      throwSupabaseError(error);
      return ((data as Pick<NpcSubmissionRow, "npc_payload"> | null)?.npc_payload ?? nextNpc) as Npc;
    },
    async deleteVillagerSubmission(npcId) {
      const { error, count } = await client.from(tableName).delete({ count: "exact" }).eq("id", npcId);
      throwSupabaseError(error);
      return (count ?? 0) > 0;
    }
  };
}

export function createSupabaseNpcRepositoryFromEnv(env: NodeJS.ProcessEnv = process.env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createSupabaseNpcRepository({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
  });
}
