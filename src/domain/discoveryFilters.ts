import type { DemoNpcCluster, DemoNpcPoint } from "../data/demoNpcDensity";

export type DiscoveryFilterId = "all" | "longtan" | "siping" | "craft" | "stay" | "story";

type DiscoveryFilter = {
  id: DiscoveryFilterId;
  label: string;
};

export const discoveryFilters: DiscoveryFilter[] = [
  { id: "all", label: "本村全部" },
  { id: "craft", label: "溪岸/农园" },
  { id: "stay", label: "食宿" },
  { id: "story", label: "书与采风" }
];

const filterClusterIds: Record<Exclude<DiscoveryFilterId, "all" | "longtan" | "siping">, string[]> = {
  craft: ["longtan-craft", "siping-wood"],
  stay: ["siping-homestay"],
  story: ["longtan-old-street", "longtan-bridge", "siping-trail"]
};

export const getDiscoveryFilterLabel = (filterId: DiscoveryFilterId) =>
  discoveryFilters.find((filter) => filter.id === filterId)?.label ?? "本村全部";

export const matchesDiscoveryFilter = (point: DemoNpcPoint, filterId: DiscoveryFilterId) => {
  if (filterId === "all") return true;
  if (filterId === "longtan") return point.village === "龙潭村";
  if (filterId === "siping") return point.village === "四坪村";

  return filterClusterIds[filterId].includes(point.clusterId);
};

export const filterDemoNpcPoints = (points: DemoNpcPoint[], filterId: DiscoveryFilterId) =>
  points.filter((point) => matchesDiscoveryFilter(point, filterId));

export const summarizeClustersForFilter = (
  clusters: DemoNpcCluster[],
  points: DemoNpcPoint[],
  filterId: DiscoveryFilterId
) => {
  const filteredPoints = filterDemoNpcPoints(points, filterId);

  return clusters
    .map((cluster) => ({
      ...cluster,
      count: filteredPoints.filter((point) => point.clusterId === cluster.id).length
    }))
    .filter((cluster) => cluster.count > 0);
};
