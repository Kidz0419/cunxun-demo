# 村寻 Cunxun

村寻是一个面向屏南乡村小店、手艺人和游客的探索应用。当前仓库包含 Remix/Vite 风格的 Web 原型、Express 后端接口，以及 `ios/` 下的 SwiftUI iPhone 原生版本。

## 本地运行 Web 与后端

```bash
npm install
cp .env.example .env.local
npm run dev
```

开发服务默认跑在 `http://localhost:5173`。后端接口和前端同源，包括：

- `GET /api/shops`
- `GET /api/shops/:shopId`
- `POST /api/shop-twin-chat`
- `GET /api/health`
- `GET /api/amap-config`

## 环境变量

在 `.env.local` 里配置真实密钥，本仓库只提交 `.env.example`：

```bash
AMAP_KEY=
AMAP_SECURITY_JS_CODE=
VITE_AMAP_KEY=
VITE_AMAP_SECURITY_JS_CODE=
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPERATOR_API_TOKEN=
```

不要提交 `.env.local`、DeepSeek key、Supabase service-role key、高德密钥或任何生产 token。

## 真实高德地图与 Supabase

`http://localhost:5173` 的 iPhone Web 版会请求 `/api/amap-config` 加载高德 JSAPI。推荐配置：

```bash
VITE_AMAP_KEY=你的高德 Web端 JS API Key
AMAP_SECURITY_JS_CODE=你的高德安全密钥
```

`AMAP_SECURITY_JS_CODE` 只在 Node 后端使用，前端会拿到 `serviceHost: "/_AMapService"`，由后端代理追加安全密钥。

Supabase 初始化：

```bash
# 在 Supabase SQL Editor 里执行
docs/supabase-npc-submissions.sql
docs/supabase-shop-profiles.sql

# 写入 v2 小店种子
npm run seed:shops
```

完成后重启 `npm run dev`，打开 `/api/health` 应看到 `Supabase 小店目录` 和 `高德地图已配置`。

## iPhone 原生版本

SwiftUI 工程位于：

```bash
open ios/CunxunNative/CunxunNative.xcodeproj
```

也可以用命令行构建：

```bash
xcodebuild -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5' build
```

iOS 模拟器默认请求 `http://127.0.0.1:5173`。如果后端没启动，游客首页会自动回落到本地种子店铺。

真机调试时，需要把 API base URL 改成 Mac 的局域网 IP，例如 `http://192.168.1.23:5173`，并确保 iPhone 和 Mac 在同一个 Wi-Fi 下。

## 测试

```bash
npm test -- server/shopDirectory.test.ts src/features/villager/OpsStatusList.test.tsx
xcodebuild test -project ios/CunxunNative/CunxunNative.xcodeproj -scheme CunxunNative -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5'
```

## GitHub 提交前检查

- 确认 `.env.local` 和所有真实密钥没有进入 git。
- 确认 iOS 工程可用 Xcode 打开并构建。
- 确认 README 中的运行步骤与当前分支一致。
- 提交前运行 Web 测试和 iOS 测试。
