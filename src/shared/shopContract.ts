export const shopDirectorySchemaVersion = 1;

export type ShopVillageId = "siping" | "longtan" | "jixia" | "xiadi";
export type ShopCategory = "farm" | "stay" | "food" | "cafe" | "bar" | "books" | "craft";
export type ShopStatus = "open" | "resting" | "closed";
export type ShopZoom = "far" | "mid" | "near";

export type ShopProfile = {
  id: string;
  name: string;
  category: ShopCategory;
  village: ShopVillageId;
  mapPosition: {
    x: number;
    y: number;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  owner: {
    name: string;
    title: string;
  };
  status: ShopStatus;
  hours: string;
  feature: string;
  tier: 1 | 2 | 3;
  aiEnabled: boolean;
  distanceMeters: number;
};

export type ShopDirectoryQuery = {
  village?: ShopVillageId | "all";
  category?: ShopCategory | "all";
  zoom?: ShopZoom;
};

export type ShopCollectionResponse = {
  schemaVersion: typeof shopDirectorySchemaVersion;
  shops: ShopProfile[];
};

export type ShopItemResponse = {
  schemaVersion: typeof shopDirectorySchemaVersion;
  shop: ShopProfile;
};

export type ShopTwinChatMessage = {
  role: "visitor" | "twin";
  text: string;
};

export type ShopTwinChatRequest = {
  shopId: string;
  visitorMessage: string;
  history: ShopTwinChatMessage[];
};

export type ShopTwinChatResponse = {
  shopId: string;
  reply: string;
  provider: "deepseek" | "mock";
  offlineFallback: boolean;
};
