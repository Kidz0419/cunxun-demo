import { describe, expect, it, vi } from "vitest";
import {
  deleteVillagerSubmission,
  fetchApprovedCustomNpcs,
  fetchVillagerSubmissions,
  submitVillagerSubmission,
  updateVillagerSubmissionStatus
} from "./npcDirectoryClient";

const submission = {
  name: "阿南",
  village: "四坪村" as const,
  role: "农园共学伙伴",
  spaceName: "小毛驴四坪农园",
  spaceType: "农园 / 研学 / 土地观察",
  story: "我在小毛驴四坪农园整理菜畦和共学活动。",
  welcomeMessage: "带一个你在四坪看到的土地细节来找我。",
  experience: "一起修一只旧木凳。",
  tone: "温和、朴素、手艺人气质",
  boundaries: "农具使用和田地进入需要真人确认。"
};

const npcPayload = {
  id: "custom-anan",
  name: "阿南",
  reviewStatus: "pending"
};

describe("npcDirectoryClient", () => {
  it("reads approved NPCs from the public API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        npcs: [npcPayload]
      })
    });

    const npcs = await fetchApprovedCustomNpcs(fetchMock);

    expect(fetchMock).toHaveBeenCalledWith("/api/npcs?status=approved");
    expect(npcs).toEqual([npcPayload]);
  });

  it("submits villager profiles to the backend with the requested review status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schemaVersion: 1,
        npc: npcPayload
      })
    });

    const npc = await submitVillagerSubmission(
      {
        submission,
        reviewStatus: "pending"
      },
      fetchMock
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/villager-submissions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          submission,
          reviewStatus: "pending"
        })
      })
    );
    expect(npc).toEqual(npcPayload);
  });

  it("updates and deletes villager submissions through the backend", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          npcs: [npcPayload]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schemaVersion: 1,
          npc: {
            ...npcPayload,
            reviewStatus: "approved"
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true
      });

    await expect(fetchVillagerSubmissions(fetchMock)).resolves.toEqual([npcPayload]);
    await expect(updateVillagerSubmissionStatus("custom-anan", "approved", fetchMock)).resolves.toMatchObject({
      reviewStatus: "approved"
    });
    await expect(deleteVillagerSubmission("custom-anan", fetchMock)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/villager-submissions");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/villager-submissions/custom-anan/review-status",
      expect.objectContaining({ method: "PATCH" })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/villager-submissions/custom-anan",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
