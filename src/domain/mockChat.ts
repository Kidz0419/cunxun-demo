import type { ChatAction, Npc, NpcReply } from "../types.js";

const bookingKeywords = ["预约", "多少钱", "价格", "营业", "开放", "房源", "电话", "联系"];
const taskKeywords = ["做什么", "任务", "体验", "下午", "怎么玩", "开始", "路线"];

const hasAnyKeyword = (text: string, keywords: string[]) =>
  keywords.some((keyword) => text.includes(keyword));

export function createMockNpcReply(npc: Npc, message: string): NpcReply {
  const task = npc.tasks[0];

  if (hasAnyKeyword(message, bookingKeywords)) {
    const actions: ChatAction[] = npc.humanHandoff.enabled
      ? [{ type: "human_handoff", label: "联系真人确认", npcId: npc.id }]
      : [];

    return {
      text: `${npc.humanHandoff.handoffText} 我可以先帮你了解${npc.spaceName}的气质和适合你的到访方式，但价格、预约和真实开放状态都需要真人确认。`,
      actions
    };
  }

  if (hasAnyKeyword(message, taskKeywords)) {
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
