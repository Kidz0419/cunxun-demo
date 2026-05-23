import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { filterShopProfiles, isShopProfile } from "../src/domain/shopDirectory.js";
import type { ShopDirectoryQuery, ShopProfile } from "../src/shared/shopContract.js";
import {
  defaultShopProfiles,
  shopDirectorySchemaVersion,
  type ShopProfilePatch,
  type ShopRepository,
  type ShopStoreStatus
} from "./shopRepository.js";

type ShopProfileRow = {
  id: string;
  schema_version: typeof shopDirectorySchemaVersion;
  shop_payload: ShopProfile;
  created_at?: string;
  updated_at?: string;
};

type SupabaseShopRepositoryOptions = {
  url: string;
  serviceRoleKey: string;
};

const tableName = "shop_profiles";

const throwSupabaseError = (error: { message: string } | null) => {
  if (error) {
    throw new Error(error.message);
  }
};

const isMissingShopTableError = (error: { message: string; code?: string } | null) =>
  Boolean(
    error &&
      (error.code === "42P01" ||
        error.code === "PGRST205" ||
        /shop_profiles|schema cache|relation .* does not exist|could not find the table/iu.test(
          error.message
        ))
  );

const createServerClient = ({ url, serviceRoleKey }: SupabaseShopRepositoryOptions) =>
  createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

async function selectAllShopProfiles(client: SupabaseClient): Promise<ShopProfile[]> {
  const { data, error } = await client
    .from(tableName)
    .select("shop_payload")
    .order("updated_at", { ascending: false });

  if (isMissingShopTableError(error)) {
    return defaultShopProfiles;
  }

  throwSupabaseError(error);
  const remoteShops = ((data ?? []) as Array<Pick<ShopProfileRow, "shop_payload">>)
    .map((row) => row.shop_payload)
    .filter(isShopProfile);

  return remoteShops.length > 0 ? remoteShops : defaultShopProfiles;
}

async function selectShopById(client: SupabaseClient, shopId: string): Promise<ShopProfile | null> {
  const { data, error } = await client
    .from(tableName)
    .select("shop_payload")
    .eq("id", shopId)
    .maybeSingle();

  if (isMissingShopTableError(error)) {
    return defaultShopProfiles.find((shop) => shop.id === shopId) ?? null;
  }

  throwSupabaseError(error);
  const remoteShop = (data as Pick<ShopProfileRow, "shop_payload"> | null)?.shop_payload ?? null;
  return isShopProfile(remoteShop)
    ? remoteShop
    : defaultShopProfiles.find((shop) => shop.id === shopId) ?? null;
}

async function probeShopStoreStatus(client: SupabaseClient): Promise<ShopStoreStatus> {
  const { error } = await client.from(tableName).select("id").limit(1);

  if (isMissingShopTableError(error)) {
    return "missing_table";
  }

  return error ? "unavailable" : "ready";
}

export function createSupabaseShopRepository(options: SupabaseShopRepositoryOptions): ShopRepository {
  const client = createServerClient(options);

  return {
    kind: "supabase",
    async getStoreStatus() {
      return probeShopStoreStatus(client);
    },
    async listShopProfiles(query: ShopDirectoryQuery = {}) {
      return filterShopProfiles(await selectAllShopProfiles(client), query);
    },
    async getShopProfile(shopId) {
      return selectShopById(client, shopId);
    },
    async upsertShopProfile(shop) {
      const row: ShopProfileRow = {
        id: shop.id,
        schema_version: shopDirectorySchemaVersion,
        shop_payload: shop
      };
      const { error } = await client.from(tableName).upsert(row, { onConflict: "id" });
      throwSupabaseError(error);
      return shop;
    },
    async updateShopProfile(shopId, patch: ShopProfilePatch) {
      const current = await selectShopById(client, shopId);
      if (!current) return null;

      const nextShop: ShopProfile = {
        ...current,
        ...patch,
        id: shopId,
        owner: patch.owner ? { ...current.owner, ...patch.owner } : current.owner,
        mapPosition: patch.mapPosition
          ? { ...current.mapPosition, ...patch.mapPosition }
          : current.mapPosition,
        coordinates: patch.coordinates
          ? { ...current.coordinates, ...patch.coordinates }
          : current.coordinates
      };

      const { data, error } = await client
        .from(tableName)
        .upsert(
          {
            id: shopId,
            schema_version: shopDirectorySchemaVersion,
            shop_payload: nextShop
          },
          { onConflict: "id" }
        )
        .select("shop_payload")
        .single();

      throwSupabaseError(error);
      return ((data as Pick<ShopProfileRow, "shop_payload"> | null)?.shop_payload ?? nextShop) as ShopProfile;
    },
    async deleteShopProfile(shopId) {
      const { error, count } = await client.from(tableName).delete({ count: "exact" }).eq("id", shopId);
      throwSupabaseError(error);
      return (count ?? 0) > 0;
    }
  };
}

export function createSupabaseShopRepositoryFromEnv(env: NodeJS.ProcessEnv = process.env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  return createSupabaseShopRepository({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
  });
}
