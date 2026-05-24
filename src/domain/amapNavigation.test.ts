import { describe, expect, it } from "vitest";
import { createAmapNavigationUrl } from "./amapNavigation";

describe("createAmapNavigationUrl", () => {
  it("creates a walk navigation link that can hand off to 高德地图", () => {
    const url = createAmapNavigationUrl({
      from: { lat: 26.77592, lng: 119.07148 },
      to: { lat: 26.77613, lng: 119.07041 },
      toName: "溪头厝与西溪河岸"
    });

    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://uri.amap.com/navigation");
    expect(parsed.searchParams.get("from")).toBe("119.071480,26.775920,我的位置");
    expect(parsed.searchParams.get("to")).toBe("119.070410,26.776130,溪头厝与西溪河岸");
    expect(parsed.searchParams.get("mode")).toBe("walk");
    expect(parsed.searchParams.get("src")).toBe("cunxun");
    expect(parsed.searchParams.get("callnative")).toBe("1");
  });

  it("keeps an empty from parameter so mobile 高德 can use current location", () => {
    const url = createAmapNavigationUrl({
      to: { lat: 26.77613, lng: 119.07041 },
      toName: "溪头厝与西溪河岸"
    });

    const parsed = new URL(url);

    expect(parsed.searchParams.get("from")).toBe("");
    expect(parsed.searchParams.get("to")).toBe("119.070410,26.776130,溪头厝与西溪河岸");
    expect(parsed.searchParams.get("callnative")).toBe("1");
  });
});
