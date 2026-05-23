import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { realMapCenter, realMapTileZoom } from "../domain/geoProjection";

const importBackdrop = async () => {
  vi.resetModules();
  return import("./RealMapBackdrop");
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  document.head.querySelectorAll("script[data-cunxun-amap-loader]").forEach((script) => {
    script.remove();
  });
  window._AMapSecurityConfig = undefined;
  window.AMap = undefined;
});

describe("RealMapBackdrop", () => {
  it("uses OpenStreetMap fallback when no 高德 key is configured", async () => {
    vi.stubEnv("VITE_AMAP_KEY", "");
    const { RealMapBackdrop } = await importBackdrop();

    render(<RealMapBackdrop />);

    expect(screen.getByText("OpenStreetMap")).toBeInTheDocument();
    expect(document.querySelector(".amap-canvas")).not.toBeInTheDocument();
    expect(screen.getAllByAltText("真实地图瓦片").length).toBeGreaterThan(8);
  });

  it("loads 高德 JSAPI v2 with key and security code before marking the map ready", async () => {
    vi.stubEnv("VITE_AMAP_KEY", "demo key");
    vi.stubEnv("VITE_AMAP_SECURITY_JS_CODE", "demo-security");
    const { RealMapBackdrop } = await importBackdrop();

    render(<RealMapBackdrop />);

    expect(screen.getByText("高德地图加载中")).toBeInTheDocument();

    await waitFor(() => {
      const script = document.head.querySelector<HTMLScriptElement>(
        "script[data-cunxun-amap-loader]"
      );
      expect(script).toBeInTheDocument();
      expect(script?.src).toContain("https://webapi.amap.com/maps?v=2.0");
      expect(script?.src).toContain("key=demo%20key");
    });
    expect(window._AMapSecurityConfig).toEqual({ securityJsCode: "demo-security" });
  });

  it("can load 高德 config from the backend proxy without exposing the security code", async () => {
    vi.stubEnv("VITE_AMAP_KEY", "");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        enabled: true,
        key: "server-key",
        serviceHost: "/_AMapService"
      })
    });
    vi.stubGlobal("fetch", fetchMock);
    const { RealMapBackdrop } = await importBackdrop();

    render(<RealMapBackdrop />);

    expect(await screen.findByText("高德地图加载中")).toBeInTheDocument();
    await waitFor(() => {
      const script = document.head.querySelector<HTMLScriptElement>(
        "script[data-cunxun-amap-loader]"
      );
      expect(script?.src).toContain("key=server-key");
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/amap-config");
    expect(window._AMapSecurityConfig).toEqual({ serviceHost: "/_AMapService" });
  });

  it("creates a 高德 map when AMap is already available", async () => {
    vi.stubEnv("VITE_AMAP_KEY", "demo-key");
    const destroy = vi.fn();
    const mapConstructor = vi.fn(function AMapConstructor() {
      return { destroy };
    });
    vi.stubGlobal("AMap", { Map: mapConstructor });
    const { RealMapBackdrop } = await importBackdrop();

    render(<RealMapBackdrop />);

    await waitFor(() => {
      expect(mapConstructor).toHaveBeenCalledWith(
        expect.any(HTMLDivElement),
        expect.objectContaining({
          center: [realMapCenter.lng, realMapCenter.lat],
          features: ["bg", "road", "building", "point"],
          mapStyle: "amap://styles/normal",
          resizeEnable: true,
          viewMode: "2D",
          zoom: realMapTileZoom
        })
      );
    });
    expect(screen.getByText("高德地图")).toBeInTheDocument();
  });
});
