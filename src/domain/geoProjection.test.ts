import { describe, expect, it } from "vitest";
import {
  projectCoordinatesToMapPercent,
  projectMapPercentToCoordinates,
  realMapCenter,
  realVillageAnchors,
  shouldShowVisitorPositionOnMap
} from "./geoProjection";

describe("real map projection", () => {
  it("uses real village anchor coordinates for Longtan and Siping", () => {
    expect(realVillageAnchors.longtan.coordinates).toEqual({
      lat: 26.7753552,
      lng: 119.0701678
    });
    expect(realVillageAnchors.siping.coordinates).toEqual({
      lat: 26.7933125,
      lng: 119.0821818
    });
    expect(realMapCenter.lat).toBeGreaterThan(26.78);
    expect(realMapCenter.lng).toBeGreaterThan(119.07);
  });

  it("projects coordinates into the map viewport", () => {
    const longtan = projectCoordinatesToMapPercent(realVillageAnchors.longtan.coordinates);
    const siping = projectCoordinatesToMapPercent(realVillageAnchors.siping.coordinates);

    expect(longtan.x).toBeGreaterThan(25);
    expect(longtan.x).toBeLessThan(55);
    expect(longtan.y).toBeGreaterThan(45);
    expect(longtan.y).toBeLessThan(75);
    expect(siping.x).toBeGreaterThan(longtan.x);
    expect(siping.y).toBeLessThan(longtan.y);
  });

  it("can round-trip between map percent and coordinates", () => {
    const coordinates = projectMapPercentToCoordinates({ x: 50, y: 50 });
    const projected = projectCoordinatesToMapPercent(coordinates);

    expect(projected.x).toBeCloseTo(50, 1);
    expect(projected.y).toBeCloseTo(50, 1);
  });

  it("only shows the visitor position when they are near the village map", () => {
    expect(shouldShowVisitorPositionOnMap(realVillageAnchors.longtan.coordinates)).toBe(true);
    expect(shouldShowVisitorPositionOnMap({ lat: 26.742, lng: 119.031 })).toBe(false);
    expect(shouldShowVisitorPositionOnMap({ lat: 31.2304, lng: 121.4737 })).toBe(false);
  });
});
