import { describe, expect, it } from "vitest";
import { createAmapNavigationUrl } from "./amapNavigation";

describe("createAmapNavigationUrl", () => {
  it("creates a walk navigation link that can hand off to 高德地图", () => {
    const url = createAmapNavigationUrl({
      from: { lat: 26.77592, lng: 119.07148 },
      to: { lat: 26.77613, lng: 119.07041 },
      toName: "溪头厝与西溪河岸"
    });

    expect(url).toBe(
      "https://uri.amap.com/navigation?to=119.070410%2C26.776130%2C%E6%BA%AA%E5%A4%B4%E5%8E%9D%E4%B8%8E%E8%A5%BF%E6%BA%AA%E6%B2%B3%E5%B2%B8&mode=walk&src=cunxun&callnative=1&from=119.071480%2C26.775920%2C%E6%88%91%E7%9A%84%E4%BD%8D%E7%BD%AE"
    );
  });
});
