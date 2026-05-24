import type {
  AmapPoi,
  AmapPoiCategory,
  AmapPoiCollectionResponse,
  AmapPoiVillageId
} from "../shared/amapPoiContract";
import {
  realMapBounds,
  realVillageAnchors
} from "../domain/geoProjection";

type FetchLike = typeof fetch;

type BrowserAmapPoiQuery = {
  category: AmapPoiCategory;
  keyword: string;
  type: string;
};

type BrowserAmapPoiResult = {
  poiList?: {
    pois?: unknown[];
  };
};

const amapPoiRadiusMeters = 2600;
const amapBrowserQueries: BrowserAmapPoiQuery[] = [
  { category: "stay", keyword: "民宿", type: "100000" },
  { category: "food", keyword: "餐厅", type: "050000" }
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

const parseBrowserLocation = (location: unknown) => {
  if (typeof location === "string") {
    const [lngText, latText] = location.split(",");
    const lng = Number(lngText);
    const lat = Number(latText);

    return Number.isFinite(lng) && Number.isFinite(lat) ? { lat, lng } : null;
  }

  if (typeof location !== "object" || location === null) return null;

  const point = location as Record<string, unknown>;
  const rawLng = typeof point.getLng === "function" ? point.getLng() : point.lng;
  const rawLat = typeof point.getLat === "function" ? point.getLat() : point.lat;
  const lng = Number(rawLng);
  const lat = Number(rawLat);

  return Number.isFinite(lng) && Number.isFinite(lat) ? { lat, lng } : null;
};

const isInsideVisibleMap = (coordinates: { lat: number; lng: number }) =>
  coordinates.lat <= realMapBounds.north &&
  coordinates.lat >= realMapBounds.south &&
  coordinates.lng >= realMapBounds.west &&
  coordinates.lng <= realMapBounds.east;

const isAmapPoiCollectionResponse = (value: unknown): value is AmapPoiCollectionResponse => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<AmapPoiCollectionResponse>;
  return (
    candidate.schemaVersion === 1 &&
    candidate.source === "amap" &&
    (candidate.villageId === "siping" || candidate.villageId === "longtan") &&
    Array.isArray(candidate.pois)
  );
};

const normalizeBrowserPois = (
  rawPois: unknown,
  villageId: AmapPoiVillageId,
  category: AmapPoiCategory
): AmapPoi[] => {
  if (!Array.isArray(rawPois)) return [];

  return rawPois.flatMap((rawPoi) => {
    if (typeof rawPoi !== "object" || rawPoi === null) return [];

    const candidate = rawPoi as Record<string, unknown>;
    const name = readString(candidate.name);
    const coordinates = parseBrowserLocation(candidate.location);

    if (!name || !coordinates || !isInsideVisibleMap(coordinates)) {
      return [];
    }

    const address = readOptionalString(candidate.address);
    const type = readOptionalString(candidate.type);
    const distanceMeters = parseDistance(candidate.distance);

    return [
      {
        id: readOptionalString(candidate.id) ?? `amap-browser-${category}-${name}-${coordinates.lng},${coordinates.lat}`,
        source: "amap",
        villageId,
        category,
        name,
        ...(address ? { address } : {}),
        ...(type ? { type } : {}),
        ...(distanceMeters !== undefined ? { distanceMeters } : {}),
        coordinates
      }
    ];
  });
};

const fetchBackendAmapVillagePois = async (
  villageId: AmapPoiVillageId,
  fetchImpl: FetchLike = fetch
): Promise<AmapPoi[]> => {
  try {
    const response = await fetchImpl(`/api/amap-pois?village=${villageId}`);
    if (!response.ok) return [];

    const payload = await response.json();
    return isAmapPoiCollectionResponse(payload) ? payload.pois : [];
  } catch {
    return [];
  }
};

const fetchBrowserAmapPoisForQuery = (
  villageId: AmapPoiVillageId,
  query: BrowserAmapPoiQuery
): Promise<AmapPoi[]> =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || !window.AMap?.plugin) {
      resolve([]);
      return;
    }

    window.AMap.plugin(["AMap.PlaceSearch"], () => {
      if (!window.AMap?.PlaceSearch) {
        resolve([]);
        return;
      }

      const center = realVillageAnchors[villageId].coordinates;
      const placeSearch = new window.AMap.PlaceSearch({
        city: "宁德",
        citylimit: true,
        extensions: "base",
        pageIndex: 1,
        pageSize: 10,
        type: query.type
      });

      placeSearch.searchNearBy(
        query.keyword,
        [center.lng, center.lat],
        amapPoiRadiusMeters,
        (status, result) => {
          if (status !== "complete") {
            resolve([]);
            return;
          }

          resolve(normalizeBrowserPois((result as BrowserAmapPoiResult).poiList?.pois, villageId, query.category));
        }
      );
    });
  });

const fetchBrowserAmapVillagePois = async (villageId: AmapPoiVillageId): Promise<AmapPoi[]> => {
  const results = await Promise.allSettled(
    amapBrowserQueries.map((query) => fetchBrowserAmapPoisForQuery(villageId, query))
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
};

export async function fetchAmapVillagePois(
  villageId: AmapPoiVillageId,
  fetchImpl: FetchLike = fetch
): Promise<AmapPoi[]> {
  const backendPois = await fetchBackendAmapVillagePois(villageId, fetchImpl);
  if (backendPois.length > 0) return backendPois;

  return fetchBrowserAmapVillagePois(villageId);
}
