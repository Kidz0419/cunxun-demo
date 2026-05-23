// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evaluateLaunchReadiness } from "./launchReadiness";

describe("launch readiness", () => {
  it("marks external services as action required when keys are missing", () => {
    const report = evaluateLaunchReadiness({});

    expect(report.overallStatus).toBe("action_required");
    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "supabase",
          status: "action_required",
          requiredFromUser: true
        }),
        expect.objectContaining({
          id: "amap",
          status: "action_required",
          requiredFromUser: true
        }),
        expect.objectContaining({
          id: "deepseek",
          status: "action_required",
          requiredFromUser: true
        })
      ])
    );
  });

  it("reports ready once Supabase, AMap, and DeepSeek env values exist", () => {
    const report = evaluateLaunchReadiness({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      VITE_AMAP_KEY: "amap-key",
      AMAP_SECURITY_JS_CODE: "amap-security",
      DEEPSEEK_API_KEY: "deepseek-key"
    });

    expect(report.overallStatus).toBe("ready");
    expect(report.items.every((item) => item.status === "ready")).toBe(true);
  });

  it("warns when DeepSeek is still configured with a deprecated chat alias", () => {
    const report = evaluateLaunchReadiness({
      DEEPSEEK_API_KEY: "deepseek-key",
      DEEPSEEK_MODEL: "deepseek-chat"
    });

    expect(report.items).toContainEqual(
      expect.objectContaining({
        id: "deepseek",
        status: "ready",
        message: expect.stringContaining("2026-07-24")
      })
    );
  });

  it("keeps local plaintext 高德 security code compatible but calls out proxy mode", () => {
    const report = evaluateLaunchReadiness({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      VITE_AMAP_KEY: "amap-key",
      VITE_AMAP_SECURITY_JS_CODE: "local-only-security",
      DEEPSEEK_API_KEY: "deepseek-key"
    });

    expect(report.items).toContainEqual(
      expect.objectContaining({
        id: "amap",
        status: "ready",
        message: expect.stringContaining("明文")
      })
    );
  });

  it("treats partially configured service pairs as blocked", () => {
    const report = evaluateLaunchReadiness({
      SUPABASE_URL: "https://example.supabase.co",
      VITE_AMAP_KEY: "amap-key",
      DEEPSEEK_API_KEY: "deepseek-key"
    });

    expect(report.overallStatus).toBe("action_required");
    expect(report.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "supabase",
          status: "action_required",
          message: expect.stringContaining("SUPABASE_SERVICE_ROLE_KEY")
        }),
        expect.objectContaining({
          id: "amap",
          status: "action_required",
          message: expect.stringContaining("AMAP_SECURITY_JS_CODE")
        })
      ])
    );
  });
});
