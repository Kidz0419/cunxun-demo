import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OpsStatusList } from "./OpsStatusList";
import type { SystemStatusResponse } from "../../shared/systemStatus";

const localStatus: SystemStatusResponse = {
  ok: true,
  provider: "mock",
  npcStore: "memory",
  services: {
    npcDirectory: {
      status: "local_demo",
      label: "本地演示数据",
      detail: "新村民资料使用本地兜底"
    },
    shopDirectory: {
      status: "local_demo",
      label: "本地小店目录",
      detail: "主理人小店使用原型种子数据"
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
};

describe("OpsStatusList", () => {
  it("renders multiple local demo services without duplicate-key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<OpsStatusList systemStatus={localStatus} />);

    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("Encountered two children with the same key"),
      expect.anything()
    );
    consoleError.mockRestore();
  });
});
