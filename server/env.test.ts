import { describe, expect, it } from "vitest";
import { applyEnvDefaults } from "./env";

describe("server env loading", () => {
  it("applies env file values without overriding existing process values", () => {
    const target = {
      DEEPSEEK_API_KEY: "from-shell"
    } as NodeJS.ProcessEnv;

    applyEnvDefaults(
      {
        DEEPSEEK_API_KEY: "from-env-file",
        DEEPSEEK_MODEL: "deepseek-chat"
      },
      target
    );

    expect(target.DEEPSEEK_API_KEY).toBe("from-shell");
    expect(target.DEEPSEEK_MODEL).toBe("deepseek-chat");
  });
});
