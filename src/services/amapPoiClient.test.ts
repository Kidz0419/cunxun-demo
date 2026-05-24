import { describe, expect, it, vi } from "vitest";
import { fetchAmapVillagePois } from "./amapPoiClient";

describe("AMap POI client", () => {
  it("loads village POIs from the backend AMap endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        source: "amap",
        villageId: "siping",
        pois: [
          {
            id: "B0STAY",
            source: "amap",
            villageId: "siping",
            category: "stay",
            name: "屏南小福地民宿",
            coordinates: { lat: 26.793512, lng: 119.082481 }
          }
        ]
      })
    });

    await expect(fetchAmapVillagePois("siping", fetchMock)).resolves.toEqual([
      {
        id: "B0STAY",
        source: "amap",
        villageId: "siping",
        category: "stay",
        name: "屏南小福地民宿",
        coordinates: { lat: 26.793512, lng: 119.082481 }
      }
    ]);
    expect(fetchMock).toHaveBeenCalledWith("/api/amap-pois?village=siping");
  });

  it("falls back to an empty layer instead of inventing POIs", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(fetchAmapVillagePois("longtan", fetchMock)).resolves.toEqual([]);
  });
});
