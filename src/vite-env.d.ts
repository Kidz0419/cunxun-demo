/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMAP_KEY?: string;
  readonly VITE_AMAP_SECURITY_JS_CODE?: string;
}

interface Window {
  AMap?: {
    Map: new (
      container: HTMLElement,
      options: {
        center: [number, number];
        features: string[];
        mapStyle: string;
        resizeEnable: boolean;
        viewMode: "2D";
        zoom: number;
      }
    ) => { destroy: () => void };
  };
  _AMapSecurityConfig?: {
    securityJsCode?: string;
    serviceHost?: string;
  };
}
