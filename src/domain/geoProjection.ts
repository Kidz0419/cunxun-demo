import type { Coordinates } from "../types.js";

export type MapPercentPosition = {
  x: number;
  y: number;
};

export const realVillageAnchors = {
  longtan: {
    name: "龙潭里村",
    coordinates: { lat: 26.7753552, lng: 119.0701678 }
  },
  siping: {
    name: "四坪村",
    coordinates: { lat: 26.7933125, lng: 119.0821818 }
  }
} as const;

export const realMapBounds = {
  north: 26.805,
  south: 26.76,
  west: 119.052,
  east: 119.101
} as const;

export const realMapCenter: Coordinates = {
  lat: (realMapBounds.north + realMapBounds.south) / 2,
  lng: (realMapBounds.west + realMapBounds.east) / 2
};

export const realMapTileZoom = 14;
const visitorVisibilityPadding = {
  lat: 0.006,
  lng: 0.006
} as const;

const clampPercent = (value: number) => Math.min(98, Math.max(2, Number(value.toFixed(2))));

export const projectCoordinatesToMapPercent = (coordinates: Coordinates): MapPercentPosition => ({
  x: clampPercent(
    ((coordinates.lng - realMapBounds.west) / (realMapBounds.east - realMapBounds.west)) * 100
  ),
  y: clampPercent(
    ((realMapBounds.north - coordinates.lat) / (realMapBounds.north - realMapBounds.south)) * 100
  )
});

export const projectMapPercentToCoordinates = (position: MapPercentPosition): Coordinates => ({
  lat: realMapBounds.north - (position.y / 100) * (realMapBounds.north - realMapBounds.south),
  lng: realMapBounds.west + (position.x / 100) * (realMapBounds.east - realMapBounds.west)
});

export const shouldShowVisitorPositionOnMap = (coordinates: Coordinates) =>
  coordinates.lat <= realMapBounds.north + visitorVisibilityPadding.lat &&
  coordinates.lat >= realMapBounds.south - visitorVisibilityPadding.lat &&
  coordinates.lng >= realMapBounds.west - visitorVisibilityPadding.lng &&
  coordinates.lng <= realMapBounds.east + visitorVisibilityPadding.lng;

const lngToTileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;

const latToTileY = (lat: number, zoom: number) => {
  const radians = (lat * Math.PI) / 180;

  return (
    ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
    2 ** zoom
  );
};

export const getOpenStreetMapTiles = (center: Coordinates = realMapCenter, zoom = realMapTileZoom) => {
  const centerX = lngToTileX(center.lng, zoom);
  const centerY = latToTileY(center.lat, zoom);
  const centerTileX = Math.floor(centerX);
  const centerTileY = Math.floor(centerY);
  const tiles = [];

  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const x = centerTileX + dx;
      const y = centerTileY + dy;

      tiles.push({
        id: `${zoom}-${x}-${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
        offsetX: Math.round((x - centerX) * 256),
        offsetY: Math.round((y - centerY) * 256)
      });
    }
  }

  return tiles;
};
