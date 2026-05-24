// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { fetchAmapVillagePois, isAmapPoiVillageId } from "./amapPoiService";

const createAmapResponse = (pois: unknown[]) =>
  new Response(
    JSON.stringify({
      status: "1",
      info: "OK",
      pois
    }),
    {
      headers: { "content-type": "application/json" },
      status: 200
    }
  );

describe("AMap POI service", () => {
  it("queries real AMap stay and food POIs around the selected village", async () => {
    const amapFetch = vi
      .fn()
      .mockResolvedValueOnce(
        createAmapResponse([
          {
            id: "B0STAY",
            name: "屏南小福地民宿",
            type: "住宿服务;住宿服务相关",
            address: "四坪村内",
            location: "119.082481,26.793512",
            distance: "82"
          }
        ])
      )
      .mockResolvedValueOnce(
        createAmapResponse([
          {
            id: "B0FOOD",
            name: "村口饭店",
            type: "餐饮服务;中餐厅",
            address: "四坪村口",
            location: "119.081981,26.793112",
            distance: "118"
          }
        ])
      );

    const pois = await fetchAmapVillagePois({
      villageId: "siping",
      key: "amap-key",
      securityJsCode: "server-secret",
      fetchImpl: amapFetch
    });

    expect(amapFetch).toHaveBeenCalledTimes(2);
    const requestedUrls = amapFetch.mock.calls.map(([url]) => String(url));
    expect(requestedUrls.some((url) => url.includes("types=100000"))).toBe(true);
    expect(requestedUrls.some((url) => url.includes("types=050000"))).toBe(true);
    expect(requestedUrls.every((url) => url.includes("key=amap-key"))).toBe(true);
    expect(requestedUrls.every((url) => url.includes("jscode=server-secret"))).toBe(true);
    expect(requestedUrls.every((url) => url.includes("location=119.0821818%2C26.7933125"))).toBe(true);

    expect(pois).toEqual([
      {
        id: "B0STAY",
        source: "amap",
        villageId: "siping",
        category: "stay",
        name: "屏南小福地民宿",
        address: "四坪村内",
        type: "住宿服务;住宿服务相关",
        distanceMeters: 82,
        coordinates: {
          lat: 26.793512,
          lng: 119.082481
        }
      },
      {
        id: "B0FOOD",
        source: "amap",
        villageId: "siping",
        category: "food",
        name: "村口饭店",
        address: "四坪村口",
        type: "餐饮服务;中餐厅",
        distanceMeters: 118,
        coordinates: {
          lat: 26.793112,
          lng: 119.081981
        }
      }
    ]);
  });

  it("drops malformed or off-map AMap records instead of creating mock points", async () => {
    const amapFetch = vi
      .fn()
      .mockResolvedValueOnce(
        createAmapResponse([
          {
            id: "BAD_LOCATION",
            name: "缺坐标民宿",
            location: []
          },
          {
            id: "OUTSIDE",
            name: "很远的酒店",
            location: "120.000000,30.000000"
          }
        ])
      )
      .mockResolvedValueOnce(createAmapResponse([]));

    await expect(
      fetchAmapVillagePois({
        villageId: "siping",
        key: "amap-key",
        fetchImpl: amapFetch
      })
    ).resolves.toEqual([]);
  });

  it("accepts only known demo villages", () => {
    expect(isAmapPoiVillageId("siping")).toBe(true);
    expect(isAmapPoiVillageId("longtan")).toBe(true);
    expect(isAmapPoiVillageId("四坪村")).toBe(false);
  });
});
