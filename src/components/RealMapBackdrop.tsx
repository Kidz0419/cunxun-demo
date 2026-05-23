import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { getOpenStreetMapTiles, realMapCenter, realMapTileZoom } from "../domain/geoProjection";

type MapSource = "高德地图" | "高德地图加载中" | "OpenStreetMap";

type AmapBrowserConfig = {
  enabled: boolean;
  key?: string;
  securityJsCode?: string;
  serviceHost?: string;
};

const amapKey = import.meta.env.VITE_AMAP_KEY;
const amapSecurityCode = import.meta.env.VITE_AMAP_SECURITY_JS_CODE;
const amapScriptId = "cunxun-amap-jsapi";

const initialAmapConfig: AmapBrowserConfig = amapKey
  ? {
      enabled: true,
      key: amapKey,
      securityJsCode: amapSecurityCode
    }
  : { enabled: false };

export function RealMapBackdrop() {
  const amapContainerRef = useRef<HTMLDivElement | null>(null);
  const amapInstanceRef = useRef<{ destroy: () => void } | null>(null);
  const [amapConfig, setAmapConfig] = useState<AmapBrowserConfig>(initialAmapConfig);
  const [mapSource, setMapSource] = useState<MapSource>(
    initialAmapConfig.enabled ? "高德地图加载中" : "OpenStreetMap"
  );
  const tiles = useMemo(() => getOpenStreetMapTiles(), []);

  useEffect(() => {
    if (initialAmapConfig.enabled || typeof fetch !== "function") {
      return undefined;
    }

    let isCancelled = false;

    fetch("/api/amap-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config: AmapBrowserConfig | null) => {
        if (isCancelled || !config?.enabled || !config.key) return;
        setAmapConfig(config);
        setMapSource("高德地图加载中");
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!amapConfig.enabled || !amapConfig.key || !amapContainerRef.current || typeof window === "undefined") {
      return undefined;
    }

    if (amapConfig.serviceHost) {
      window._AMapSecurityConfig = { serviceHost: amapConfig.serviceHost };
    } else if (amapConfig.securityJsCode) {
      window._AMapSecurityConfig = { securityJsCode: amapConfig.securityJsCode };
    }

    let isCancelled = false;

    const mountAmap = () => {
      if (isCancelled || !window.AMap || !amapContainerRef.current || amapInstanceRef.current) return;

      amapInstanceRef.current = new window.AMap.Map(amapContainerRef.current, {
        center: [realMapCenter.lng, realMapCenter.lat],
        features: ["bg", "road", "building", "point"],
        mapStyle: "amap://styles/normal",
        resizeEnable: true,
        viewMode: "2D",
        zoom: realMapTileZoom
      });
      setMapSource("高德地图");
    };
    const fallbackToOsm = () => {
      if (!isCancelled) {
        setMapSource("OpenStreetMap");
      }
    };

    if (window.AMap) {
      mountAmap();
      return () => {
        isCancelled = true;
        amapInstanceRef.current?.destroy();
        amapInstanceRef.current = null;
      };
    }

    let script = document.getElementById(amapScriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = amapScriptId;
      script.dataset.cunxunAmapLoader = "true";
      script.async = true;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amapConfig.key)}`;
      document.head.appendChild(script);
    }

    script.addEventListener("load", mountAmap);
    script.addEventListener("error", fallbackToOsm);

    return () => {
      isCancelled = true;
      amapInstanceRef.current?.destroy();
      amapInstanceRef.current = null;
      script?.removeEventListener("load", mountAmap);
      script?.removeEventListener("error", fallbackToOsm);
    };
  }, [amapConfig.enabled, amapConfig.key, amapConfig.securityJsCode, amapConfig.serviceHost]);

  return (
    <div className="real-map-backdrop" aria-label="真实地图底图">
      <div className="osm-tile-grid" aria-hidden={mapSource === "高德地图"}>
        {tiles.map((tile) => (
          <img
            alt="真实地图瓦片"
            key={tile.id}
            src={tile.url}
            style={
              {
                "--tile-left": `calc(50% + ${tile.offsetX}px)`,
                "--tile-top": `calc(50% + ${tile.offsetY}px)`
              } as CSSProperties
            }
          />
        ))}
      </div>
      {amapConfig.enabled && <div className="amap-canvas" ref={amapContainerRef} aria-hidden="true" />}
      <span className="real-map-source">
        真实底图 <strong>{mapSource}</strong>
      </span>
    </div>
  );
}
