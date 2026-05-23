import type { Coordinates } from "../types";

type AmapNavigationInput = {
  from?: Coordinates;
  to: Coordinates;
  toName: string;
};

const formatCoordinateParam = (coordinates: Coordinates, name: string) =>
  `${coordinates.lng.toFixed(6)},${coordinates.lat.toFixed(6)},${name}`;

export function createAmapNavigationUrl({ from, to, toName }: AmapNavigationInput) {
  const params = new URLSearchParams();

  params.set("to", formatCoordinateParam(to, toName));
  params.set("mode", "walk");
  params.set("src", "cunxun");
  params.set("callnative", "1");

  if (from) {
    params.set("from", formatCoordinateParam(from, "我的位置"));
  }

  return `https://uri.amap.com/navigation?${params.toString()}`;
}
