import {
  realMapBounds,
  realVillageAnchors
} from "../src/domain/geoProjection.js";
import {
  type AmapPoi,
  type AmapPoiCategory,
  type AmapPoiVillageId
} from "../src/shared/amapPoiContract.js";

type FetchLike = typeof fetch;

type FetchAmapVillagePoisInput = {
  villageId: AmapPoiVillageId;
  key?: string;
  securityJsCode?: string;
  fetchImpl?: FetchLike;
};

type AmapPoiQuery = {
  category: AmapPoiCategory;
  types: string;
};

const amapAroundSearchUrl = "https://restapi.amap.com/v3/place/around";
const amapPoiRadiusMeters = 2600;
const amapPoiPageSize = 10;
const amapPoiQueries: AmapPoiQuery[] = [
  { category: "stay", types: "100000" },
  { category: "food", types: "050000" }
];

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const readOptionalString = (value: unknown) => {
  const text = readString(value);
  return text.length > 0 ? text : undefined;
};

const parseDistance = (value: unknown) => {
  const distance = Number(value);
  return Number.isFinite(distance) ? distance : undefined;
};

const parseCoordinates = (location: unknown) => {
  const text = readString(location);
  const [lngText, latText] = text.split(",");
  const lng = Number(lngText);
  const lat = Number(latText);

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return { lat, lng };
};

const isInsideVisibleMap = (coordinates: { lat: number; lng: number }) =>
  coordinates.lat <= realMapBounds.north &&
  coordinates.lat >= realMapBounds.south &&
  coordinates.lng >= realMapBounds.west &&
  coordinates.lng <= realMapBounds.east;

const createAmapAroundSearchUrl = ({
  key,
  securityJsCode,
  villageId,
  query
}: {
  key: string;
  securityJsCode?: string;
  villageId: AmapPoiVillageId;
  query: AmapPoiQuery;
}) => {
  const center = realVillageAnchors[villageId].coordinates;
  const url = new URL(amapAroundSearchUrl);

  url.searchParams.set("key", key);
  url.searchParams.set("location", `${center.lng},${center.lat}`);
  url.searchParams.set("radius", String(amapPoiRadiusMeters));
  url.searchParams.set("types", query.types);
  url.searchParams.set("offset", String(amapPoiPageSize));
  url.searchParams.set("page", "1");
  url.searchParams.set("extensions", "base");
  url.searchParams.set("output", "json");
  url.searchParams.set("city", "宁德");
  url.searchParams.set("citylimit", "true");
  url.searchParams.set("sortrule", "distance");

  if (securityJsCode) {
    url.searchParams.set("jscode", securityJsCode);
  }

  return url.toString();
};

const normalizeAmapPois = (
  rawPois: unknown,
  villageId: AmapPoiVillageId,
  category: AmapPoiCategory
): AmapPoi[] => {
  if (!Array.isArray(rawPois)) return [];

  return rawPois.flatMap((rawPoi) => {
    if (typeof rawPoi !== "object" || rawPoi === null) return [];

    const candidate = rawPoi as Record<string, unknown>;
    const name = readString(candidate.name);
    const coordinates = parseCoordinates(candidate.location);

    if (!name || !coordinates || !isInsideVisibleMap(coordinates)) {
      return [];
    }

    return [
      {
        id: readOptionalString(candidate.id) ?? `amap-${category}-${name}-${candidate.location}`,
        source: "amap",
        villageId,
        category,
        name,
        ...(readOptionalString(candidate.address) ? { address: readOptionalString(candidate.address) } : {}),
        ...(readOptionalString(candidate.type) ? { type: readOptionalString(candidate.type) } : {}),
        ...(parseDistance(candidate.distance) !== undefined
          ? { distanceMeters: parseDistance(candidate.distance) }
          : {}),
        coordinates
      }
    ];
  });
};

export const isAmapPoiVillageId = (value: unknown): value is AmapPoiVillageId =>
  value === "siping" || value === "longtan";

export async function fetchAmapVillagePois({
  villageId,
  key,
  securityJsCode,
  fetchImpl = fetch
}: FetchAmapVillagePoisInput): Promise<AmapPoi[]> {
  if (!key) return [];

  const results = await Promise.allSettled(
    amapPoiQueries.map(async (query) => {
      const response = await fetchImpl(
        createAmapAroundSearchUrl({
          key,
          securityJsCode,
          villageId,
          query
        })
      );

      if (!response.ok) {
        return [];
      }

      const payload = (await response.json()) as { status?: string; pois?: unknown };
      if (payload.status !== "1") {
        return [];
      }

      return normalizeAmapPois(payload.pois, villageId, query.category);
    })
  );

  const uniquePois = new Map<string, AmapPoi>();
  results.forEach((result) => {
    if (result.status !== "fulfilled") return;

    result.value.forEach((poi) => {
      if (!uniquePois.has(poi.id)) {
        uniquePois.set(poi.id, poi);
      }
    });
  });

  return Array.from(uniquePois.values());
}
