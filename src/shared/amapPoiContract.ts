import type { Coordinates } from "../types.js";

export const amapPoiSchemaVersion = 1;

export type AmapPoiVillageId = "siping" | "longtan";
export type AmapPoiCategory = "stay" | "food";

export type AmapPoi = {
  id: string;
  source: "amap";
  villageId: AmapPoiVillageId;
  category: AmapPoiCategory;
  name: string;
  address?: string;
  type?: string;
  distanceMeters?: number;
  coordinates: Coordinates;
};

export type AmapPoiCollectionResponse = {
  schemaVersion: typeof amapPoiSchemaVersion;
  source: "amap";
  villageId: AmapPoiVillageId;
  pois: AmapPoi[];
};
