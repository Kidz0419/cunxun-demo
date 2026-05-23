# 村寻第一阶段落地与第二阶段迁移说明

## 第一阶段形态

第一阶段采用 H5 网页版，目标是扫码即用、轻量上线、方便在龙潭村和四坪村做试点。

- 游客端：React H5
- 地图层：自定义半写实地貌图层，后续可叠加地图 SDK
- AI 接口：统一调用 `/api/chat`
- AI Provider：后端接 DeepSeek，未配置或调用失败时回退到本地 mock
- 打卡：第一阶段采用 GPS / 模拟到达，线下落地建议增加二维码确认

## 可移植协议

游客端不直接调用 DeepSeek。所有端只调用同一个 HTTP 协议：

```text
POST /api/chat
```

请求结构位于 `src/shared/chatContract.ts`：

```ts
type NpcChatRequest = {
  npcId: string;
  visitorMessage: string;
  history: ChatMessage[];
  visitorContext?: {
    selectedTaskId?: string | null;
    timeAvailable?: string;
    interests?: string[];
    location?: { lat: number; lng: number };
  };
};
```

响应结构：

```ts
type NpcChatResponse = {
  npcId: string;
  reply: string;
  provider: "deepseek" | "mock";
  offlineFallback: boolean;
  recommendedTask?: NpcTask;
  actions: ChatAction[];
};
```

## 第二阶段迁移方式

第二阶段如果做微信小程序，小程序只需要复用 `/api/chat` 协议：

- 小程序负责地图、定位、扫码、页面交互
- 后端继续负责 NPC 数据、边界控制、DeepSeek 调用和审核逻辑
- AI Key 仍然只放后端，不进入小程序或 H5 前端

这样迁移时不需要重写 AI 逻辑，只需要重做端侧 UI。

## DeepSeek 配置

开发或部署环境设置：

```bash
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
```

未设置 `DEEPSEEK_API_KEY` 时，系统会自动走 mock 回复，方便演示和离线开发。

## 内容安全边界

AI 分身始终通过 NPC prompt 约束：

- 不假装是真人本人
- 不承诺营业状态、价格、预约
- 不暴露私人地址或联系方式
- 真实接待和商业确认必须进入真人确认或现场确认
