import type { ChatAction, Npc, NpcReply } from "../types.js";
import { createNpcSkillProfile } from "./npcSkillProfile.js";

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

export function createMockNpcReply(npc: Npc, message: string): NpcReply {
  const skillProfile = createNpcSkillProfile(npc);
  const task = npc.tasks[0];

  if (hasAnyKeyword(message, skillProfile.skills.boundary.handoffKeywords)) {
    const matchedKeyword = skillProfile.skills.boundary.handoffKeywords.find((keyword) =>
      message.includes(keyword)
    );
    const actions: ChatAction[] = npc.humanHandoff.enabled
      ? [{ type: "human_handoff", label: "联系真人确认", npcId: npc.id }]
      : [];

    return {
      text: `${skillProfile.skills.boundary.handoffText} 关于${matchedKeyword ?? "现场状态"}的问题需要真人确认。我可以先帮你了解${npc.spaceName}的气质和适合你的到访方式，但价格、预约、开放、安全、工具和食宿都不能由数字分身直接承诺。`,
      actions
    };
  }

  if (hasAnyKeyword(message, skillProfile.skills.task.intentKeywords)) {
    return {
      text: `${npc.welcomeMessage} 如果你愿意，我想把「${task.title}」交给你：${task.description}`,
      recommendedTask: task,
      actions: [
        { type: "start_task", label: "领取任务", taskId: task.id },
        { type: "navigate", label: `去找${npc.name}`, npcId: npc.id }
      ]
    };
  }

  return {
    text: `我是${npc.name}的数字分身，会先陪你认识${npc.spaceName}。${npc.shortIntro} 你可以问我为什么来到这里，也可以让我给你一个轻量任务。`,
    recommendedTask: task,
    actions: [{ type: "start_task", label: "领取任务", taskId: task.id }]
  };
}
