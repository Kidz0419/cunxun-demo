import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./app/App";
import { shopProfiles } from "./data/shopProfiles";

const mockFetch = (reply = "沿着主路到陶坊门口，先看今日营业牌。") => {
  const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
    const requestUrl = String(url);

    if (requestUrl.includes("/api/shop-twin-chat")) {
      return {
        ok: true,
        json: async () => ({ reply })
      };
    }

    if (requestUrl.includes("/api/amap-config")) {
      return {
        ok: true,
        json: async () => ({
          enabled: true,
          key: "test-amap-key",
          serviceHost: "/_AMapService"
        })
      };
    }

    if (requestUrl.includes("/api/health")) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          provider: "deepseek",
          npcStore: "supabase",
          services: {
            npcDirectory: {
              status: "supabase_connected",
              label: "Supabase 已连接",
              detail: "新村民资料会写入 Supabase"
            },
            shopDirectory: {
              status: "supabase_connected",
              label: "Supabase 小店目录",
              detail: "小店资料由 Supabase 提供"
            },
            ai: {
              status: "deepseek_connected",
              label: "DeepSeek 在线",
              detail: "数字分身回复由 DeepSeek 生成"
            },
            map: {
              status: "amap_ready",
              label: "高德地图已配置",
              detail: "真实底图可加载高德 JSAPI，安全密钥由后端代理转发"
            }
          }
        })
      };
    }

    return {
      ok: true,
      json: async () => ({ shops: shopProfiles })
    };
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

afterEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.head.querySelectorAll("script[data-cunxun-amap-loader]").forEach((script) => {
    script.remove();
  });
  window._AMapSecurityConfig = undefined;
  window.AMap = undefined;
});

describe("Cunxun iPhone web demo", () => {
  it("uses the iPhone visitor shell as the localhost home page", async () => {
    mockFetch();

    render(<App />);

    expect(screen.getByLabelText("村寻 iPhone 版")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "村寻" })).toBeInTheDocument();
    expect(screen.getByText("屏南 · 四坪村")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "今日店铺" })).toBeInTheDocument();
    expect(screen.getByLabelText("村寻真实地图")).toBeInTheDocument();
    expect(screen.getByLabelText("真实地图底图")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "游客" })).toHaveClass("is-active");

    await waitFor(() => {
      expect(screen.getByLabelText("老周陶坊推荐卡")).toBeInTheDocument();
    });
    expect(await screen.findByText("高德底图")).toBeInTheDocument();
    expect(screen.getByText("Supabase 小店")).toBeInTheDocument();
  });

  it("filters the phone map to shop categories without the old visitor map UI", async () => {
    const fetchMock = mockFetch();

    render(<App />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(screen.getByText("真实底图")).toBeInTheDocument();
    expect(screen.getAllByText("老周陶坊").length).toBeGreaterThan(0);
    expect(screen.getByText("小溪茶舍")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "手作" }));

    expect(screen.getAllByText("老周陶坊").length).toBeGreaterThan(0);
    expect(screen.getByText("林伯榫卯工坊")).toBeInTheDocument();
    expect(screen.queryByText("小溪茶舍")).not.toBeInTheDocument();
  });

  it("opens shop detail and AI chat in phone-style bottom sheets", async () => {
    mockFetch("今天 9 点到 17 点都可以来，拉胚体验建议留 40 分钟。");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "详情" }));

    expect(screen.getByLabelText("老周陶坊详情")).toBeInTheDocument();
    expect(screen.getByText("村落")).toBeInTheDocument();
    expect(screen.getAllByText("四坪村").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(screen.getByRole("button", { name: "AI 聊" }));

    expect(screen.getByLabelText("老周陶坊AI 对话")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("问问这家店"), { target: { value: "现在能去吗？" } });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByText("今天 9 点到 17 点都可以来，拉胚体验建议留 40 分钟。")).toBeInTheDocument();
  });

  it("keeps villager and studio routes available behind their explicit paths", () => {
    mockFetch();

    window.history.pushState({}, "", "/villager");
    render(<App />);

    expect(screen.getByRole("heading", { name: "在地图上介绍我" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "游客端地图" })).toHaveAttribute("href", "/");
  });
});
