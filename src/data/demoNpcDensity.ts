import type { Village } from "../types";
import type { Coordinates } from "../types";
import { projectMapPercentToCoordinates } from "../domain/geoProjection";

export type DensityViewMode = "villages" | "clusters" | "people" | "expanded";
export type FeaturedMarkerMode = "compact" | "avatar" | "open";

export type DemoNpcCluster = {
  id: string;
  label: string;
  village: Village;
  theme: string;
  count: number;
  accent: string;
  center: {
    x: number;
    y: number;
  };
  coordinates: Coordinates;
  spread: {
    x: number;
    y: number;
  };
};

export type DemoNpcPoint = {
  id: string;
  name: string;
  village: Village;
  clusterId: string;
  theme: string;
  accent: string;
  coordinates: Coordinates;
  mapPosition: {
    x: number;
    y: number;
  };
};

export const demoNpcClusters: DemoNpcCluster[] = [
  {
    id: "longtan-old-street",
    label: "随喜书屋周边",
    village: "龙潭村",
    theme: "阅读 / 公共书屋",
    count: 23,
    accent: "#776245",
    center: { x: 34, y: 65 },
    coordinates: projectMapPercentToCoordinates({ x: 34, y: 65 }),
    spread: { x: 10, y: 8 }
  },
  {
    id: "longtan-craft",
    label: "溪头厝与西溪",
    village: "龙潭村",
    theme: "溪岸 / 手作",
    count: 17,
    accent: "#315b4a",
    center: { x: 45, y: 69 },
    coordinates: projectMapPercentToCoordinates({ x: 45, y: 69 }),
    spread: { x: 9, y: 7 }
  },
  {
    id: "longtan-bridge",
    label: "回村桥与龙潭驿",
    village: "龙潭村",
    theme: "桥头 / 驿站",
    count: 11,
    accent: "#527282",
    center: { x: 27, y: 62 },
    coordinates: projectMapPercentToCoordinates({ x: 27, y: 62 }),
    spread: { x: 7, y: 8 }
  },
  {
    id: "siping-homestay",
    label: "松韩屋民宿片区",
    village: "四坪村",
    theme: "民宿 / 饭桌",
    count: 18,
    accent: "#8c5f3d",
    center: { x: 62, y: 27 },
    coordinates: projectMapPercentToCoordinates({ x: 62, y: 27 }),
    spread: { x: 9, y: 9 }
  },
  {
    id: "siping-wood",
    label: "小毛驴四坪农园",
    village: "四坪村",
    theme: "农园 / 研学",
    count: 16,
    accent: "#6a5642",
    center: { x: 70, y: 38 },
    coordinates: projectMapPercentToCoordinates({ x: 70, y: 38 }),
    spread: { x: 10, y: 8 }
  },
  {
    id: "siping-trail",
    label: "星空营地与柿树坡",
    village: "四坪村",
    theme: "星空 / 采风",
    count: 15,
    accent: "#6f6b78",
    center: { x: 57, y: 42 },
    coordinates: projectMapPercentToCoordinates({ x: 57, y: 42 }),
    spread: { x: 10, y: 10 }
  }
];

const sampleNames = [
  "阿松",
  "南枝",
  "若谷",
  "小溪",
  "晏灯",
  "石青",
  "知秋",
  "云白",
  "微澜",
  "山止"
];

const clampMapPosition = (value: number) => Math.min(92, Math.max(8, Number(value.toFixed(2))));

const createClusterPoints = (cluster: DemoNpcCluster): DemoNpcPoint[] =>
  Array.from({ length: cluster.count }, (_, index) => {
    const angle = index * 2.399963 + cluster.center.x * 0.03;
    const ring = 0.26 + ((index % 9) / 9) * 0.78;
    const nudgeX = ((index % 5) - 2) * 0.42;
    const nudgeY = ((index % 7) - 3) * 0.36;

    const mapPosition = {
      x: clampMapPosition(cluster.center.x + Math.cos(angle) * cluster.spread.x * ring + nudgeX),
      y: clampMapPosition(cluster.center.y + Math.sin(angle) * cluster.spread.y * ring + nudgeY)
    };

    return {
      id: `${cluster.id}-${index + 1}`,
      name: `${sampleNames[index % sampleNames.length]} ${index + 1}`,
      village: cluster.village,
      clusterId: cluster.id,
      theme: cluster.theme,
      accent: cluster.accent,
      coordinates: projectMapPercentToCoordinates(mapPosition),
      mapPosition
    };
  });

export const demoNpcPoints: DemoNpcPoint[] = demoNpcClusters.flatMap(createClusterPoints);

export const getDensityPreviewPoints = (points: DemoNpcPoint[], limit = 12) => {
  if (points.length <= limit) return points;

  const step = points.length / limit;

  return Array.from({ length: limit }, (_, index) => points[Math.floor(index * step)]);
};

export const getDensityViewMode = (zoom: number): DensityViewMode => {
  if (zoom >= 1.7) return "expanded";
  if (zoom >= 1.4) return "people";
  if (zoom >= 1.1) return "clusters";
  return "villages";
};

export const getFeaturedMarkerMode = (zoom: number): FeaturedMarkerMode => {
  if (zoom >= 1.6) return "open";
  if (zoom >= 1.25) return "avatar";
  return "compact";
};
