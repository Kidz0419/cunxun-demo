import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./app/App";
import { customNpcStorageKey } from "./domain/customNpcStorage";
import { createNpcFromSubmission } from "./domain/npcSubmission";

afterEach(() => {
  window.history.pushState({}, "", "/");
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Cunxun demo app", () => {
  it("starts the visitor map in the Siping village overview", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "村寻" })).toBeInTheDocument();
    expect(screen.getByText("屏南 · 四坪村")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^阿岚，/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^青禾，/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^若谷，/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^小满，/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^阿楷，/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^南枝，/ })).toBeInTheDocument();
    expect(screen.getByText(/AI 分身 Demo · 种子 3/)).toBeInTheDocument();
    expect(screen.getByText("溪流穿村")).toBeInTheDocument();
    expect(screen.getByText("九峰山下")).toBeInTheDocument();
    expect(screen.getByText("青石巷")).toBeInTheDocument();
    expect(screen.getByText("回村桥")).toBeInTheDocument();
    expect(screen.getByText("古厝组团")).toBeInTheDocument();
    expect(screen.getByText("溪头厝")).toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
    expect(screen.getByText("原型角色用于演示，真实上线需本人授权与运营审核。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "小满的地图信息" })).toHaveTextContent(/米|公里/);
    expect(screen.getByRole("button", { name: "小满的地图信息" })).toHaveTextContent("民宿");
    expect(screen.getByText("点头像，在下方台本里选择聊或导航")).toBeInTheDocument();
    expect(screen.getAllByText("AI 生成示意图，非真实照片").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("运行状态")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "在地图上介绍我" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "审核台" })).not.toBeInTheDocument();
    expect(screen.queryByText("先与数字分身破冰，再走向真实的人和空间。")).not.toBeInTheDocument();
  });

  it("shows a real map data backdrop before the village story layer", () => {
    render(<App />);

    expect(screen.getByLabelText("真实地图底图")).toBeInTheDocument();
    expect(screen.getByText("真实底图")).toBeInTheDocument();
    expect(screen.getByText(/OpenStreetMap|高德地图加载中|高德地图/)).toBeInTheDocument();
    expect(screen.getAllByAltText("真实地图瓦片").length).toBeGreaterThan(8);
  });

  it("opens a village route navigation surface for the selected NPC", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "出发导航" }));

    expect(screen.getByRole("region", { name: "村路导航" })).toBeInTheDocument();
    expect(screen.getByText("抵达九峰山下的四坪入口")).toBeInTheDocument();
    expect(screen.getByText("到松韩屋民宿前先确认今日接待状态")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "打开高德地图导航" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://uri.amap.com/navigation")
    );
  });

  it("gives visitors a clear first action and current NPC availability", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "看看附近的新村民" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始一条村庄奇遇" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "留个话给他" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "导航去找小满" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://uri.amap.com/navigation")
    );
    expect(screen.getByRole("region", { name: "今日状态" })).toBeInTheDocument();
    expect(screen.getAllByText("今日不接待").length).toBeGreaterThan(0);
    expect(screen.getAllByText("今晚松韩屋的饭桌已经满了，可以先线上聊一下明天或下周的安排").length).toBeGreaterThan(0);
  });

  it("keeps connected backend details out of the visitor home while surfacing DeepSeek in chat", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);

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
              ai: {
                status: "deepseek_connected",
                label: "DeepSeek 在线",
                detail: "数字分身回复由 DeepSeek 生成"
              },
              map: {
                status: "amap_ready",
                label: "高德地图已配置",
                detail: "真实底图可加载高德 JSAPI"
              }
            }
          })
        };
      }

      if (requestUrl.includes("/api/chat")) {
        return {
          ok: true,
          json: async () => ({
            npcId: "xiaoman",
            reply: "DeepSeek 已经接上，我会先给你一条轻路线。",
            provider: "deepseek",
            offlineFallback: false,
            actions: []
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          npcs: []
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(screen.queryByText("Supabase 已连接")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("给数字分身发送消息"), {
      target: { value: "今天怎么靠近？" }
    });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    await waitFor(() => {
      expect(screen.getByText("DeepSeek 在线")).toBeInTheDocument();
    });

    expect(screen.queryByText("Supabase 已连接")).not.toBeInTheDocument();
  });

  it("surfaces a featured strip with the three soonest-available NPCs and a prototype watermark", () => {
    render(<App />);

    const strip = screen.getByRole("region", { name: "今日可聊的新村民" });
    expect(strip).toBeInTheDocument();
    expect(screen.getByText(/AI 分身 Demo · 种子 3/)).toBeInTheDocument();
    expect(screen.queryByTestId("density-watermark")).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: /选择 南枝，今天稍晚/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /选择 小满，今日不接待/ })).toBeInTheDocument();
  });

  it("keeps map NPC info compact and moves leave-message actions into the panel", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^小满，/ }));

    const talkingCard = screen.getByLabelText("小满的地图信息");
    expect(talkingCard).toHaveTextContent(/米|公里/);
    expect(talkingCard).toHaveTextContent("民宿");
    expect(talkingCard).not.toHaveTextContent("今日不接待");
    expect(screen.getByRole("button", { name: "留个话给他" })).toBeInTheDocument();
  });

  it("renders the illustrated v2 NPC panel sections from the selected NPC profile", () => {
    render(<App />);

    expect(screen.getByLabelText("小满的接待状态")).toHaveClass("availability-tag-v2");
    expect(screen.getByLabelText("小满的接待状态")).toHaveTextContent("今天不在");
    expect(screen.getByText("SUGGESTED · 推荐问题")).toBeInTheDocument();
    expect(screen.getByText("边界 / 我不答的 (3)")).toBeInTheDocument();
    expect(screen.getByText("住宿、餐食和预约都需要以真人确认或现场信息为准。")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "线下任务" })).toHaveClass("quest-card-v2");
    expect(screen.getByText("任务 · QUEST")).toBeInTheDocument();
  });

  it("uses the illustrated v2 discovery filter chips inside the current village", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "本村全部" })).toHaveClass("discovery-chip");
    expect(screen.getByRole("button", { name: "本村全部" })).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: "溪岸/农园" })).toHaveClass("discovery-chip");
  });

  it("swaps the compact map info button when visitors select another NPC", () => {
    render(<App />);

    expect(screen.getByLabelText("小满的地图信息")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "关闭地图人物卡" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "导航去找" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^南枝，/ }));

    expect(screen.getByLabelText("南枝的地图信息")).toBeInTheDocument();
  });

  it("offers a clear return-to-map button after the villager sheet is expanded", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "展开村民列表" }));

    const returnButton = screen.getByRole("button", { name: "返回地图" });
    expect(returnButton).toHaveTextContent("返回地图");

    fireEvent.click(returnButton);

    expect(screen.getByRole("button", { name: "展开村民列表" })).toBeInTheDocument();
  });

  it("lets visitors focus chat from the lower script panel without sending a message", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "留个话给他" }));

    expect(screen.getByLabelText("给数字分身发送消息")).toHaveFocus();
    expect(screen.getByLabelText("给数字分身发送消息")).toHaveValue("四坪村适合怎么慢慢逛？");
    expect(screen.queryByText("分身正在回应")).not.toBeInTheDocument();
    expect(screen.getByLabelText("数字分身对话")).toHaveClass("is-chat-focused");
    expect(screen.queryByText("点头像，在下方台本里选择聊或导航")).not.toBeInTheDocument();
  });

  it("bridges today's status into a chat question without hiding the handoff boundary", () => {
    render(<App />);

    expect(screen.getByText("今日公告 · 出发前仍向真人确认")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "问今天怎么靠近" }));

    expect(screen.getAllByText("今天适合去松韩屋民宿吗？").length).toBeGreaterThan(0);
    expect(screen.getAllByText("分身正在回应").length).toBeGreaterThan(0);
  });

  it("turns avatar chat into guided intent starters with reply actions", async () => {
    render(<App />);

    expect(screen.getByRole("region", { name: "破冰问题" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "四坪村适合怎么慢慢逛？" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "给我一个适合今天的轻量任务。" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "给我一个适合今天的轻量任务。" }));

    expect(screen.getAllByText("分身正在回应").length).toBeGreaterThan(0);
    expect(await screen.findByRole("region", { name: "回复后的下一步" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "领取任务：今天的村庄菜单" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "去找小满" }));

    expect(screen.getByRole("region", { name: "路线模式地图" })).toBeInTheDocument();
  });

  it("keeps handoff boundaries inside the chat flow for booking-like questions", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("给数字分身发送消息"), {
      target: { value: "价格和预约方式是什么？" }
    });
    fireEvent.click(screen.getByRole("button", { name: "发送" }));

    expect(await screen.findByRole("button", { name: "联系真人确认" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "联系真人确认" }));

    expect(screen.getByText(/Demo 阶段不展示私人联系方式/)).toBeInTheDocument();
  });

  it("switches into a focused route mode with walking time and an exit", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("link", { name: "出发导航" }));

    expect(screen.getByRole("region", { name: "路线模式地图" })).toBeInTheDocument();
    expect(screen.getByText("路线模式")).toBeInTheDocument();
    expect(screen.getByText("步行约 2 分钟")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "退出路线" })).toBeInTheDocument();
    expect(screen.queryByText("100 人规模预览")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "退出路线" }));

    expect(screen.queryByRole("region", { name: "路线模式地图" })).not.toBeInTheDocument();
    expect(screen.queryByText("100 人规模预览")).not.toBeInTheDocument();
  });

  it("lets visitors zoom and reset the village map", () => {
    render(<App />);

    const mapCanvas = screen.getByTestId("village-map-canvas");

    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));

    expect(mapCanvas).toHaveStyle({ transform: "translate(0px, 0px) scale(1.15)" });
    expect(screen.getByText("115%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重置地图视图" }));

    expect(mapCanvas).toHaveStyle({ transform: "translate(0px, 0px) scale(1)" });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("starts in a clear overview state and locates visitors from the lower-right map control", () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 18,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 26.79331,
          longitude: 119.08218,
          speed: null,
          toJSON: () => ({})
        },
        timestamp: Date.now(),
        toJSON: () => ({})
      });
    });

    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition }
    });

    render(<App />);

    const mapStatus = screen.getByRole("status", { name: "地图浏览状态" });

    expect(mapStatus).toHaveTextContent("四坪村主览");
    expect(mapStatus).toHaveTextContent("初始浏览");
    expect(screen.getByRole("group", { name: "地图定位控制" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "定位我的位置" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "回到本村主览" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "定位我的位置" }));

    expect(getCurrentPosition).toHaveBeenCalled();
    expect(screen.getByText("160%")).toBeInTheDocument();
    expect(mapStatus).toHaveTextContent("附近探索");
    expect(mapStatus).toHaveTextContent("地图显示四坪村空间分身与高德食宿点");
    expect(screen.getByRole("button", { name: "回到本村主览" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "回到本村主览" }));

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(mapStatus).toHaveTextContent("四坪村主览");
    expect(screen.queryByRole("button", { name: "回到本村主览" })).not.toBeInTheDocument();
  });


  it("keeps the map focused on resident spaces instead of reference place layers", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /^小满，松韩屋民宿/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^阿楷，小毛驴四坪农园/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^南枝，星空营地与柿树坡/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("村庄地点")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("village-place-marker")).toHaveLength(0);
    expect(screen.queryByText("地点层 · 待现场校准")).not.toBeInTheDocument();
    expect(screen.queryByText("100 人规模预览")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("100人规模预览状态")).not.toBeInTheDocument();
  });

  it("renders real AMap stay and food POIs as map points only", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);

      if (requestUrl.includes("/api/amap-pois")) {
        return {
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
                address: "四坪村内",
                coordinates: { lat: 26.793512, lng: 119.082481 }
              },
              {
                id: "B0FOOD",
                source: "amap",
                villageId: "siping",
                category: "food",
                name: "村口饭店",
                address: "四坪村口",
                coordinates: { lat: 26.793112, lng: 119.081981 }
              }
            ]
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
                detail: "小店资料会写入 Supabase"
              },
              ai: {
                status: "deepseek_connected",
                label: "DeepSeek 在线",
                detail: "数字分身回复由 DeepSeek 生成"
              },
              map: {
                status: "amap_ready",
                label: "高德地图已配置",
                detail: "真实底图可加载高德 JSAPI"
              }
            }
          })
        };
      }

      if (requestUrl.includes("/api/amap-config")) {
        return {
          ok: true,
          json: async () => ({ enabled: false })
        };
      }

      return {
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          npcs: []
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByRole("img", { name: "高德民宿：屏南小福地民宿" })).toHaveClass(
      "amap-poi-marker"
    );
    expect(screen.getByRole("img", { name: "高德餐厅：村口饭店" })).toHaveClass("amap-poi-marker");
    expect(screen.queryByRole("button", { name: /屏南小福地民宿/ })).not.toBeInTheDocument();
    expect(screen.queryByText("屏南小福地民宿的数字分身")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/amap-pois?village=siping");
  });

  it("keeps all current-village spaces visible while zooming the map", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));
    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));
    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));
    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));

    expect(screen.getByText("160%")).toBeInTheDocument();
    expect(screen.queryByText("附近 NPC")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("100人规模预览状态")).not.toBeInTheDocument();
    expect(screen.queryByTestId("density-preview-note")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("density-person-dot")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /^小满，/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^阿楷，/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^南枝，/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^阿岚，/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "回到本村主览" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "回到本村主览" }));

    expect(screen.getByRole("button", { name: /^小满，/ })).toBeInTheDocument();
  });

  it("switches to Longtan resident spaces and keeps mock avatars chat-ready", async () => {
    const fetchMock = vi.fn(async (url: RequestInfo | URL) => {
      const requestUrl = String(url);

      if (requestUrl.includes("/api/chat")) {
        throw new Error("force local mock reply");
      }

      if (requestUrl.includes("/api/health")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            provider: "mock",
            npcStore: "memory",
            services: {
              npcDirectory: {
                status: "local_demo",
                label: "本地演示数据",
                detail: "未配置 Supabase"
              },
              ai: {
                status: "mock",
                label: "本地兜底分身",
                detail: "演示时可直接对话"
              },
              map: {
                status: "amap_ready",
                label: "高德地图已配置",
                detail: "真实底图可加载高德 JSAPI"
              }
            }
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          npcs: []
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "龙潭村" }));

    expect(screen.getByRole("button", { name: /^阿岚，随喜书屋/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^青禾，溪头厝与西溪河岸/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^若谷，龙潭驿与回村桥/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^小满，松韩屋民宿/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^青禾，溪头厝与西溪河岸/ }));
    fireEvent.click(screen.getByRole("button", { name: "我只有一个下午，适合体验什么？" }));

    expect(await screen.findByText(/如果你愿意，我想把「村庄颜色采样」交给你/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "领取任务：村庄颜色采样" })).toBeInTheDocument();
  });


  it("shows my position near the villages and hides it when browser location is far away", () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          accuracy: 20,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          latitude: 31.2304,
          longitude: 121.4737,
          speed: null,
          toJSON: () => ({})
        },
        timestamp: Date.now(),
        toJSON: () => ({})
      });
    });

    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition }
    });

    render(<App />);

    expect(screen.getByLabelText("我的当前位置")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "定位我的位置" }));

    expect(screen.queryByLabelText("我的当前位置")).not.toBeInTheDocument();
    expect(screen.getByText("当前位置离四坪村较远")).toBeInTheDocument();
  });

  it("opens the featured NPC avatars gradually while zooming", () => {
    render(<App />);

    const xiaomanMarker = screen.getByRole("button", { name: /^小满，/ });
    expect(xiaomanMarker).toHaveAttribute("data-marker-mode", "compact");

    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));

    expect(xiaomanMarker).toHaveAttribute("data-marker-mode", "compact");

    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));

    expect(xiaomanMarker).toHaveAttribute("data-marker-mode", "avatar");

    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));
    fireEvent.click(screen.getByRole("button", { name: "放大地图" }));

    expect(xiaomanMarker).toHaveAttribute("data-marker-mode", "open");
    expect(xiaomanMarker).toHaveStyle({ "--marker-scale": "0.63" });
  });

  it("lets a visitor talk to an NPC, start a task, and complete a demo check-in", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^小满，/ }));
    fireEvent.click(screen.getByRole("button", { name: "四坪村适合怎么慢慢逛？" }));
    fireEvent.click(screen.getByRole("button", { name: "领取任务" }));
    fireEvent.click(screen.getByRole("button", { name: "模拟靠近" }));
    fireEvent.click(screen.getByRole("button", { name: "我到了" }));

    const note = screen.getByLabelText("打卡记录");
    fireEvent.change(note, { target: { value: "我在四坪记录了一味今天的山菜。" } });
    fireEvent.click(screen.getByRole("button", { name: "完成打卡" }));

    expect(screen.getByText("你记录下了四坪今天的一味。")).toBeInTheDocument();
    expect(screen.getByText("我在四坪记录了一味今天的山菜。")).toBeInTheDocument();
  });

  it("lets a new villager submit a digital avatar for review", async () => {
    window.history.pushState({}, "", "/villager");
    render(<App />);

    expect(screen.getByRole("heading", { name: "在地图上介绍我" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "游客端地图" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("form", { name: "新村民资料录入" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "分身预览与审核状态" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("大家怎么称呼你？"), { target: { value: "阿南" } });
    fireEvent.change(screen.getByLabelText("你在哪个村？"), { target: { value: "四坪村" } });
    fireEvent.change(screen.getByLabelText("你在这里做什么？"), { target: { value: "农园共学伙伴" } });
    fireEvent.change(screen.getByLabelText("你的空间叫什么？"), { target: { value: "小毛驴四坪农园" } });
    fireEvent.change(screen.getByLabelText("这个空间适合被怎样理解？"), { target: { value: "农园 / 研学 / 土地观察" } });
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    fireEvent.change(screen.getByLabelText("你为什么来到这里，或者为什么留下来？"), {
      target: { value: "我在小毛驴四坪农园整理菜畦和共学活动。" }
    });
    fireEvent.change(screen.getByLabelText("游客第一次来，怎么和你打招呼？"), {
      target: { value: "带一个你在四坪看到的土地细节来找我。" }
    });
    fireEvent.change(screen.getByLabelText("游客可以参与一个什么小体验？"), {
      target: { value: "一起记录一块菜畦、田埂或老柿树的使用痕迹。" }
    });
    fireEvent.change(screen.getByLabelText("你希望分身说话像什么样？"), {
      target: { value: "温和、朴素、手艺人气质" }
    });
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(screen.getByText("我本人来回答")).toBeInTheDocument();
    expect(screen.getByText("勾选后，AI 分身会请游客等你本人确认，不会替你承诺。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "工具使用" }));

    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));

    expect(await screen.findByText(/已提交 阿南 的资料/)).toBeInTheDocument();
    expect(screen.getByText("待审核")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "演示审核通过" })).toBeInTheDocument();
    expect(screen.getByText("阿南 · 小毛驴四坪农园")).toBeInTheDocument();
    expect(screen.getAllByText("AI 生成示意图，非真实照片").length).toBeGreaterThan(0);
    expect(window.localStorage.getItem("cunxun.customNpcs")).toContain("阿南");
    expect(JSON.parse(window.localStorage.getItem("cunxun.customNpcs") ?? "")).toMatchObject({
      schemaVersion: 1,
      npcs: [{ name: "阿南", reviewStatus: "pending" }]
    });
  });

  it("warns villagers to clarify human boundaries when welcome copy mentions booking", () => {
    window.history.pushState({}, "", "/villager");
    render(<App />);

    fireEvent.change(screen.getByLabelText("大家怎么称呼你？"), { target: { value: "阿南" } });
    fireEvent.change(screen.getByLabelText("你在这里做什么？"), { target: { value: "农园共学伙伴" } });
    fireEvent.change(screen.getByLabelText("你的空间叫什么？"), { target: { value: "小毛驴四坪农园" } });
    fireEvent.change(screen.getByLabelText("这个空间适合被怎样理解？"), { target: { value: "农园 / 研学 / 土地观察" } });
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));

    fireEvent.change(screen.getByLabelText("游客第一次来，怎么和你打招呼？"), {
      target: { value: "可以先问我预约和价格。" }
    });

    expect(screen.getByText(/建议在下一步的“我本人来回答”里说明/)).toBeInTheDocument();
  });

  it("sends new villager submissions to the backend before using local fallback", async () => {
    const createdNpc = {
      ...createNpcFromSubmission(
        {
          name: "阿南",
          village: "四坪村",
          role: "农园共学伙伴",
          spaceName: "小毛驴四坪农园",
          spaceType: "农园 / 研学 / 土地观察",
          story: "我在小毛驴四坪农园整理菜畦和共学活动。",
          welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
          experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
          tone: "温和、朴素、手艺人气质",
          boundaries: "农具使用和田地进入需要真人确认。"
        },
        0,
        () => "backend"
      ),
      reviewStatus: "pending" as const
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ok: true,
          provider: "mock",
          npcStore: "memory",
          services: {
            npcDirectory: {
              status: "local_demo",
              label: "本地演示数据",
              detail: "未配置 Supabase"
            },
            ai: {
              status: "mock",
              label: "本地兜底分身",
              detail: "未配置 DeepSeek"
            },
            map: {
              status: "osm_fallback",
              label: "OpenStreetMap 底图",
              detail: "未配置高德 key"
            }
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          npcs: []
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          npc: createdNpc
        })
      });
    vi.stubGlobal("fetch", fetchMock);
    window.history.pushState({}, "", "/villager");
    render(<App />);

    fireEvent.change(screen.getByLabelText("大家怎么称呼你？"), { target: { value: "阿南" } });
    fireEvent.change(screen.getByLabelText("你在哪个村？"), { target: { value: "四坪村" } });
    fireEvent.change(screen.getByLabelText("你在这里做什么？"), { target: { value: "农园共学伙伴" } });
    fireEvent.change(screen.getByLabelText("你的空间叫什么？"), { target: { value: "小毛驴四坪农园" } });
    fireEvent.change(screen.getByLabelText("这个空间适合被怎样理解？"), { target: { value: "农园 / 研学 / 土地观察" } });
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    fireEvent.change(screen.getByLabelText("你为什么来到这里，或者为什么留下来？"), {
      target: { value: "我在小毛驴四坪农园整理菜畦和共学活动。" }
    });
    fireEvent.change(screen.getByLabelText("游客第一次来，怎么和你打招呼？"), {
      target: { value: "带一个你在四坪看到的土地细节来找我。" }
    });
    fireEvent.change(screen.getByLabelText("游客可以参与一个什么小体验？"), {
      target: { value: "一起记录一块菜畦、田埂或老柿树的使用痕迹。" }
    });
    fireEvent.change(screen.getByLabelText("你希望分身说话像什么样？"), {
      target: { value: "温和、朴素、手艺人气质" }
    });
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    fireEvent.click(screen.getByRole("button", { name: "工具使用" }));
    fireEvent.click(screen.getByRole("button", { name: "提交审核" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/villager-submissions",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"reviewStatus\":\"pending\"")
        })
      );
    });
    expect(screen.getByText(/已提交 阿南 的资料/)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(customNpcStorageKey) ?? "")).toMatchObject({
      schemaVersion: 1,
      npcs: [{ id: "custom-backend", reviewStatus: "pending" }]
    });
  });

  it("keeps pending villager submissions hidden from the visitor map", () => {
    const pendingNpc = {
      ...createNpcFromSubmission(
        {
          name: "阿南",
          village: "四坪村",
          role: "农园共学伙伴",
          spaceName: "小毛驴四坪农园",
          spaceType: "农园 / 研学 / 土地观察",
          story: "我在小毛驴四坪农园整理菜畦和共学活动。",
          welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
          experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
          tone: "温和、朴素、手艺人气质",
          boundaries: "农具使用和田地进入需要真人确认。"
        },
        0,
        () => "fixed"
      ),
      reviewStatus: "pending" as const
    };
    window.localStorage.setItem(
      customNpcStorageKey,
      JSON.stringify({ schemaVersion: 1, npcs: [pendingNpc] })
    );

    render(<App />);

    expect(screen.queryByRole("button", { name: /阿南，小毛驴四坪农园/ })).not.toBeInTheDocument();
    expect(screen.queryByText("已上线分身")).not.toBeInTheDocument();
  });

  it("shows approved villager submissions on the visitor map", () => {
    const approvedNpc = {
      ...createNpcFromSubmission(
        {
          name: "阿南",
          village: "四坪村",
          role: "农园共学伙伴",
          spaceName: "小毛驴四坪农园",
          spaceType: "农园 / 研学 / 土地观察",
          story: "我在小毛驴四坪农园整理菜畦和共学活动。",
          welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
          experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
          tone: "温和、朴素、手艺人气质",
          boundaries: "农具使用和田地进入需要真人确认。"
        },
        0,
        () => "fixed"
      ),
      reviewStatus: "approved" as const
    };
    window.localStorage.setItem(
      customNpcStorageKey,
      JSON.stringify({ schemaVersion: 1, npcs: [approvedNpc] })
    );

    render(<App />);

    expect(screen.getByRole("button", { name: /阿南，小毛驴四坪农园/ })).toBeInTheDocument();
    expect(screen.queryByText("已上线分身")).not.toBeInTheDocument();
    expect(screen.queryByText("1 个自建分身已通过 demo 审核")).not.toBeInTheDocument();
  });

  it("drops top-edge NPC info chips downward so they stay visible", () => {
    const approvedNpc = {
      ...createNpcFromSubmission(
        {
          name: "阿南",
          village: "四坪村",
          role: "农园共学伙伴",
          spaceName: "小毛驴四坪农园",
          spaceType: "农园 / 研学 / 土地观察",
          story: "我在小毛驴四坪农园整理菜畦和共学活动。",
          welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
          experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
          tone: "温和、朴素、手艺人气质",
          boundaries: "农具使用和田地进入需要真人确认。"
        },
        0,
        () => "fixed"
      ),
      reviewStatus: "approved" as const
    };
    window.localStorage.setItem(
      customNpcStorageKey,
      JSON.stringify({ schemaVersion: 1, npcs: [approvedNpc] })
    );

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /阿南，小毛驴四坪农园/ }));

    const talkingCard = screen.getByLabelText("阿南的地图信息");
    expect(talkingCard).toHaveClass("is-below-marker");
    expect(talkingCard).toHaveStyle({ "--card-shift-y": "18px" });
  });

  it("keeps the compact map info independent of legacy custom NPC visual assets", () => {
    const approvedNpc = {
      ...createNpcFromSubmission(
        {
          name: "阿南",
          village: "四坪村",
          role: "农园共学伙伴",
          spaceName: "小毛驴四坪农园",
          spaceType: "农园 / 研学 / 土地观察",
          story: "我在小毛驴四坪农园整理菜畦和共学活动。",
          welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
          experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
          tone: "温和、朴素、手艺人气质",
          boundaries: "农具使用和田地进入需要真人确认。"
        },
        0,
        () => "fixed"
      ),
      reviewStatus: "approved" as const,
      visualAsset: undefined
    };
    window.localStorage.setItem(
      customNpcStorageKey,
      JSON.stringify({ schemaVersion: 1, npcs: [approvedNpc] })
    );

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /阿南，小毛驴四坪农园/ }));

    expect(screen.getByLabelText("阿南的地图信息")).toHaveTextContent("农园 / 研学");
    expect(screen.getByLabelText("阿南的地图信息")).not.toHaveClass("is-text-only");
  });

  it("lets demo operators approve and remove villager submissions", async () => {
    const customNpc = {
      ...createNpcFromSubmission(
      {
        name: "阿南",
        village: "四坪村",
        role: "农园共学伙伴",
        spaceName: "小毛驴四坪农园",
        spaceType: "农园 / 研学 / 土地观察",
        story: "我在小毛驴四坪农园整理菜畦和共学活动。",
        welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
        experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
        tone: "温和、朴素、手艺人气质",
        boundaries: "农具使用和田地进入需要真人确认。"
      },
      0,
      () => "fixed"
      ),
      reviewStatus: "pending" as const
    };
    window.localStorage.setItem(
      customNpcStorageKey,
      JSON.stringify({ schemaVersion: 1, npcs: [customNpc] })
    );
    window.history.pushState({}, "", "/villager");

    render(<App />);

    expect(screen.getByRole("region", { name: "我的提交" })).toBeInTheDocument();
    expect(screen.getByText("待审核")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "演示审核通过" }));

    expect(await screen.findByText(/阿南 已通过 demo 审核/)).toBeInTheDocument();
    expect(screen.getByText("已上线")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去游客端查看" })).toHaveAttribute("href", "/");
    expect(JSON.parse(window.localStorage.getItem(customNpcStorageKey) ?? "")).toMatchObject({
      schemaVersion: 1,
      npcs: [{ name: "阿南", reviewStatus: "approved" }]
    });

    fireEvent.click(screen.getByRole("button", { name: "删除阿南" }));

    await waitFor(() => {
      expect(screen.queryByText("阿南 · 小毛驴四坪农园")).not.toBeInTheDocument();
    });
    expect(screen.getByText("还没有提交资料。填完左侧三步后，这里会出现审核状态。")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(customNpcStorageKey) ?? "")).toMatchObject({
      schemaVersion: 1,
      npcs: []
    });
  });

  it("provides a separate studio route for reviewing villager submissions", async () => {
    const customNpc = {
      ...createNpcFromSubmission(
        {
          name: "阿南",
          village: "四坪村",
          role: "农园共学伙伴",
          spaceName: "小毛驴四坪农园",
          spaceType: "农园 / 研学 / 土地观察",
          story: "我在小毛驴四坪农园整理菜畦和共学活动。",
          welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
          experience: "一起记录一块菜畦、田埂或老柿树的使用痕迹。",
          tone: "温和、朴素、手艺人气质",
          boundaries: "农具使用和田地进入需要真人确认。"
        },
        0,
        () => "studio"
      ),
      reviewStatus: "pending" as const
    };
    window.localStorage.setItem(
      customNpcStorageKey,
      JSON.stringify({ schemaVersion: 1, npcs: [customNpc] })
    );
    window.history.pushState({}, "", "/studio");

    render(<App />);

    expect(screen.getByRole("heading", { name: "审核新村民上线" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "新村民录入" })).toHaveAttribute("href", "/villager");
    expect(screen.getByRole("region", { name: "待审核新村民" })).toBeInTheDocument();
    expect(screen.getByText("待审核")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "审核通过" }));

    expect(await screen.findByText(/阿南 已通过 demo 审核/)).toBeInTheDocument();
    expect(screen.getByText("已上线")).toBeInTheDocument();
  });
});
