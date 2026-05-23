import { describe, expect, it } from "vitest";
import { demoNpcClusters, demoNpcPoints } from "../data/demoNpcDensity";
import {
  discoveryFilters,
  filterDemoNpcPoints,
  summarizeClustersForFilter
} from "./discoveryFilters";

describe("discovery filters", () => {
  it("filters the 100 NPC preview by village and theme", () => {
    expect(filterDemoNpcPoints(demoNpcPoints, "all")).toHaveLength(100);
    expect(filterDemoNpcPoints(demoNpcPoints, "longtan")).toHaveLength(51);
    expect(filterDemoNpcPoints(demoNpcPoints, "siping")).toHaveLength(49);
    expect(filterDemoNpcPoints(demoNpcPoints, "craft")).toHaveLength(33);
  });

  it("keeps cluster counts in sync with filtered people", () => {
    const sipingClusters = summarizeClustersForFilter(demoNpcClusters, demoNpcPoints, "siping");

    expect(sipingClusters).toHaveLength(3);
    expect(sipingClusters.reduce((total, cluster) => total + cluster.count, 0)).toBe(49);
    expect(sipingClusters.map((cluster) => cluster.label)).toEqual([
      "松韩屋民宿片区",
      "小毛驴四坪农园",
      "星空营地与柿树坡"
    ]);
  });

  it("exposes concise labels for the filter bar", () => {
    expect(discoveryFilters.map((filter) => filter.label)).toEqual([
      "本村全部",
      "溪岸/农园",
      "食宿",
      "书与采风"
    ]);
  });
});
