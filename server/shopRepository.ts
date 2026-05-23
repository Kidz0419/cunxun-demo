import { shopProfiles as seedShopProfiles } from "../src/data/shopProfiles.js";
import {
  filterShopProfiles,
  isShopCategoryQuery,
  isShopProfile,
  isShopVillageQuery,
  isShopZoom
} from "../src/domain/shopDirectory.js";
import {
  shopDirectorySchemaVersion,
  type ShopDirectoryQuery,
  type ShopProfile
} from "../src/shared/shopContract.js";

export { shopDirectorySchemaVersion };

export type ShopProfilePatch = Partial<Omit<ShopProfile, "id">>;
export type ShopStoreStatus = "ready" | "missing_table" | "unavailable";

export type ShopRepository = {
  kind: "memory" | "supabase";
  getStoreStatus?: () => Promise<ShopStoreStatus>;
  listShopProfiles: (query?: ShopDirectoryQuery) => Promise<ShopProfile[]>;
  getShopProfile: (shopId: string) => Promise<ShopProfile | null>;
  upsertShopProfile: (shop: ShopProfile) => Promise<ShopProfile>;
  updateShopProfile: (shopId: string, patch: ShopProfilePatch) => Promise<ShopProfile | null>;
  deleteShopProfile: (shopId: string) => Promise<boolean>;
};

export const defaultShopProfiles = seedShopProfiles;

export function parseShopDirectoryQuery(query: Record<string, unknown>): ShopDirectoryQuery | null {
  const village = query.village ?? "all";
  const category = query.category ?? "all";
  const zoom = query.zoom ?? "near";

  if (!isShopVillageQuery(village) || !isShopCategoryQuery(category) || !isShopZoom(zoom)) {
    return null;
  }

  return { village, category, zoom };
}

function assertShopProfile(shop: unknown): asserts shop is ShopProfile {
  if (!isShopProfile(shop)) {
    throw new Error("Invalid shop profile");
  }
}

export function createMemoryShopRepository(
  initialShopProfiles: ShopProfile[] = defaultShopProfiles
): ShopRepository {
  let shops = [...initialShopProfiles];

  return {
    kind: "memory",
    async getStoreStatus() {
      return "ready";
    },
    async listShopProfiles(query = {}) {
      return filterShopProfiles(shops, query);
    },
    async getShopProfile(shopId) {
      return shops.find((shop) => shop.id === shopId) ?? null;
    },
    async upsertShopProfile(shop) {
      assertShopProfile(shop);
      shops = [shop, ...shops.filter((item) => item.id !== shop.id)];
      return shop;
    },
    async updateShopProfile(shopId, patch) {
      const current = shops.find((shop) => shop.id === shopId);
      if (!current) return null;

      const nextShop = {
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
      assertShopProfile(nextShop);
      shops = shops.map((shop) => (shop.id === shopId ? nextShop : shop));
      return nextShop;
    },
    async deleteShopProfile(shopId) {
      const beforeCount = shops.length;
      shops = shops.filter((shop) => shop.id !== shopId);
      return shops.length !== beforeCount;
    }
  };
}
