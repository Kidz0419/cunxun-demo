# 村寻落地冷启动清单

## 三个端口

- 游客端：`/`
  - 浏览龙潭村 / 四坪村地图
  - 选择 NPC，先聊一句，再进入线下任务或路线模式
  - 已审核的新村民资料会出现在地图上
- 新村民端：`/villager`
  - 三步录入“我和空间 / 欢迎游客 / 真人确认边界”
  - 提交后进入 `pending`
  - 本地演示和 Supabase 后端都可用
- 运营审核端：`/studio`
  - 查看新村民提交队列
  - 审核通过后状态变成 `approved`
  - 游客端只读取 `approved`

## 环境变量

本地 `.env.local` 已经准备好，至少按需填写：

```env
VITE_AMAP_KEY=
AMAP_SECURITY_JS_CODE=
# VITE_AMAP_SECURITY_JS_CODE= 仅本地明文开发兜底，不建议生产使用

DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

注意：`SUPABASE_SERVICE_ROLE_KEY` 和 `AMAP_SECURITY_JS_CODE` 只允许在 Node 后端使用，不能放进任何 `VITE_` 变量。

每次填写后运行：

```bash
npm run check:ready
```

看到 `村寻上线体检：OK` 后，再重启本地服务。

## Supabase 初始化

1. 在 Supabase 新建项目。
2. 打开 SQL Editor。
3. 执行 `docs/supabase-npc-submissions.sql`。
4. 把 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 写入 `.env.local`。
5. 重启本地服务。
6. 打开 `/api/health`，确认：

```json
{
  "npcStore": "supabase",
  "services": {
    "npcDirectory": {
      "label": "Supabase 已连接"
    }
  }
}
```

## 冷启动演示流程

1. 打开 `/villager`，录入 1 位半真实新村民。
2. 打开 `/studio`，点击“审核通过”。
3. 回到 `/`，地图上应出现该新村民。
4. 点开地图人物卡，先聊一句。
5. 点击“出发导航”，再点击“打开高德地图导航”交给高德。

## 部署建议

最少配置的平台选择：Render / Railway / 任意支持 Node 22 的容器平台。

构建命令：

```bash
npm ci && npm run build
```

启动命令：

```bash
npm start
```

容器部署可直接使用项目根目录的 `Dockerfile`。

服务端口读取 `PORT`，默认是 `8787`。

## 当前边界

- 图片仍使用 AI 生成示意图，不冒充真实照片。
- 未接 Supabase Storage，真实照片上传是下一阶段。
- 未接 Supabase Auth，审核台仍是 demo 入口；上线前要加登录和权限。
- 高德 JSAPI key 未填写时，底图自动回退到 OpenStreetMap。
- 高德安全密钥已支持后端代理模式：前端通过 `/api/amap-config` 获取 `serviceHost`，后端通过 `/_AMapService` 追加 `jscode` 转发。

## 仍需要人工完成

- Supabase：创建项目、执行 SQL、复制 URL 和 `service_role` key。
- 高德：创建 Web端 JS API Key、安全密钥，并设置本地与正式域名白名单；Key 填 `VITE_AMAP_KEY`，安全密钥填 `AMAP_SECURITY_JS_CODE`。
- DeepSeek：创建 API Key。
- 上线托管：选择一个 Node 服务托管平台，配置上述环境变量。
