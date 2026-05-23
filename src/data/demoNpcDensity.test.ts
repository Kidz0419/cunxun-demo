import { describe, expect, it } from "vitest";
import {
  demoNpcClusters,
  demoNpcPoints,
  getDensityViewMode,
  getFeaturedMarkerMode
} from "./demoNpcDensity";

describe("demo NPC density data", () => {
  it("models a 100 NPC preview across Longtan and Siping", () => {
    expect(demoNpcPoints).toHaveLength(100);
    expect(demoNpcClusters.reduce((total, cluster) => total + cluster.count, 0)).toBe(100);
    expect(demoNpcClusters.some((cluster) => cluster.village === "龙潭村")).toBe(true);
    expect(demoNpcClusters.some((cluster) => cluster.village === "四坪村")).toBe(true);
  });

  it("switches map density by zoom level", () => {
    expect(getDensityViewMode(1)).toBe("villages");
    expect(getDensityViewMode(1.15)).toBe("clusters");
    expect(getDensityViewMode(1.45)).toBe("people");
    expect(getDensityViewMode(1.75)).toBe("expanded");
  });

  it("opens featured NPC markers progressively as visitors zoom in", () => {
    expect(getFeaturedMarkerMode(1)).toBe("compact");
    expect(getFeaturedMarkerMode(1.15)).toBe("compact");
    expect(getFeaturedMarkerMode(1.3)).toBe("avatar");
    expect(getFeaturedMarkerMode(1.6)).toBe("open");
  });
});
