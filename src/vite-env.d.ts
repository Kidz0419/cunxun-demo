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
    plugin?: (plugins: string[], callback: () => void) => void;
    PlaceSearch?: new (options: {
      city: string;
      citylimit: boolean;
      extensions: string;
      pageIndex: number;
      pageSize: number;
      type: string;
    }) => {
      searchNearBy: (
        keyword: string,
        center: [number, number],
        radius: number,
        callback: (status: string, result: unknown) => void
      ) => void;
    };
  };
  _AMapSecurityConfig?: {
    securityJsCode?: string;
    serviceHost?: string;
  };
}
