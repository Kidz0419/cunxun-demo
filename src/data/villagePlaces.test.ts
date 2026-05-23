import { describe, expect, it } from "vitest";
import { projectCoordinatesToMapPercent } from "../domain/geoProjection";
import { villagePlaces } from "./villagePlaces";

describe("village place reference layer", () => {
  it("adds non-NPC reference places across Longtan and Siping", () => {
    expect(villagePlaces.length).toBeGreaterThanOrEqual(12);
    expect(villagePlaces.some((place) => place.name === "龙潭小学")).toBe(true);
    expect(villagePlaces.some((place) => place.name === "随喜书屋")).toBe(true);
    expect(villagePlaces.some((place) => place.name === "柿树坡")).toBe(true);
    expect(villagePlaces.filter((place) => place.village === "龙潭村").length).toBeGreaterThan(6);
    expect(villagePlaces.filter((place) => place.village === "四坪村").length).toBeGreaterThan(3);
  });

  it("keeps every reference place projectable inside the demo map bounds", () => {
    villagePlaces.forEach((place) => {
      const projected = projectCoordinatesToMapPercent(place.coordinates);

      expect(projected.x).toBeGreaterThanOrEqual(2);
      expect(projected.x).toBeLessThanOrEqual(98);
      expect(projected.y).toBeGreaterThanOrEqual(2);
      expect(projected.y).toBeLessThanOrEqual(98);
      expect(place.sourceNote).toContain("现场 GPS 校准");
    });
  });
});
