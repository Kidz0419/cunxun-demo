import { describe, expect, it } from "vitest";
import { getDistanceMeters, isWithinRadius } from "./location";

describe("location utilities", () => {
  it("calculates short walking distances in meters", () => {
    const qingheWorkshop = { lat: 26.91344, lng: 119.02934 };
    const nearbyLane = { lat: 26.91364, lng: 119.02948 };

    expect(getDistanceMeters(qingheWorkshop, nearbyLane)).toBeLessThan(30);
  });

  it("marks a visitor as arrived only inside the task radius", () => {
    const taskPoint = { lat: 26.91344, lng: 119.02934 };
    const visitor = { lat: 26.91376, lng: 119.02968 };

    expect(isWithinRadius(visitor, taskPoint, 60)).toBe(true);
    expect(isWithinRadius(visitor, taskPoint, 20)).toBe(false);
  });
});
