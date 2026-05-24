import { describe, expect, it } from "vitest";
import { npcs } from "../data/npcs";
import { createMockNpcReply } from "./mockChat";

describe("createMockNpcReply", () => {
  it("recommends the NPC task when the visitor asks what to do", () => {
    const reply = createMockNpcReply(npcs[1], "我只有一个下午，适合体验什么？");

    expect(reply.text).toContain("村庄颜色采样");
    expect(reply.recommendedTask?.id).toBe("color-sampling");
    expect(reply.actions.map((action) => action.type)).toContain("start_task");
  });

  it("routes booking questions to human handoff", () => {
    const reply = createMockNpcReply(npcs[2], "今晚民宿多少钱，可以预约吗？");

    expect(reply.text).toContain("真人确认");
    expect(reply.actions.map((action) => action.type)).toContain("human_handoff");
  });

  it("uses the boundary Skill for safety questions too", () => {
    const reply = createMockNpcReply(npcs[0], "今晚去会不会有安全问题？");

    expect(reply.text).toContain("真人确认");
    expect(reply.text).toContain("安全");
    expect(reply.actions.map((action) => action.type)).toContain("human_handoff");
  });
});
