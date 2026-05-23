import type {
  ShopCategory,
  ShopDirectoryQuery,
  ShopProfile,
  ShopStatus,
  ShopVillageId,
  ShopZoom
} from "../shared/shopContract";

const villages: ShopVillageId[] = ["siping", "longtan", "jixia", "xiadi"];
const categories: ShopCategory[] = ["farm", "stay", "food", "cafe", "bar", "books", "craft"];
const statuses: ShopStatus[] = ["open", "resting", "closed"];
const zooms: ShopZoom[] = ["far", "mid", "near"];

const zoomTierMax: Record<ShopZoom, number> = {
  far: 1,
  mid: 2,
  near: 3
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);

const isVillage = (value: unknown): value is ShopVillageId =>
  villages.includes(value as ShopVillageId);

const isCategory = (value: unknown): value is ShopCategory =>
  categories.includes(value as ShopCategory);

const isStatus = (value: unknown): value is ShopStatus => statuses.includes(value as ShopStatus);

export const isShopZoom = (value: unknown): value is ShopZoom =>
  zooms.includes(value as ShopZoom);

export const isShopVillageQuery = (value: unknown): value is ShopVillageId | "all" =>
  value === "all" || isVillage(value);

export const isShopCategoryQuery = (value: unknown): value is ShopCategory | "all" =>
  value === "all" || isCategory(value);

export function isShopProfile(value: unknown): value is ShopProfile {
  if (!isRecord(value)) return false;
  const mapPosition = value.mapPosition;
  const coordinates = value.coordinates;
  const owner = value.owner;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isCategory(value.category) &&
    isVillage(value.village) &&
    isRecord(mapPosition) &&
    isNumber(mapPosition.x) &&
    isNumber(mapPosition.y) &&
    isRecord(coordinates) &&
    isNumber(coordinates.lat) &&
    isNumber(coordinates.lng) &&
    isRecord(owner) &&
    typeof owner.name === "string" &&
    typeof owner.title === "string" &&
    isStatus(value.status) &&
    typeof value.hours === "string" &&
    typeof value.feature === "string" &&
    (value.tier === 1 || value.tier === 2 || value.tier === 3) &&
    typeof value.aiEnabled === "boolean" &&
    isNumber(value.distanceMeters)
  );
}

export function filterShopProfiles(
  shops: ShopProfile[],
  query: ShopDirectoryQuery = {}
): ShopProfile[] {
  const village = query.village ?? "all";
  const category = query.category ?? "all";
  const tierMax = zoomTierMax[query.zoom ?? "near"];

  return shops
    .filter(
      (shop) =>
        (village === "all" || shop.village === village) &&
        (category === "all" || shop.category === category) &&
        shop.tier <= tierMax
    )
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}
