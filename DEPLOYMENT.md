# PhotoAtelier V2 部署指南

## 架构

```text
Cloudflare Pages (dist-v2)
        ↓ HTTPS
Cloudflare Worker (worker/)
   ├─ 飞书八表同步
   ├─ Agent Endpoint / 本地规则降级
   ├─ Pexels 搜索
   └─ 私有 Obsidian Bridge
```

旧 Supabase/JWT Worker 位于 `legacy/cloud-api/`，不属于正式部署。

## 本地质量门禁

```bash
npm ci
npm test
npm run build:v2
npm run test:e2e
```

## Worker 配置

复制并填写非敏感配置：

```bash
cp worker/wrangler.toml.example worker/wrangler.toml
```

必须使用 Secret：

```bash
wrangler secret put APP_SYNC_TOKEN --config worker/wrangler.toml
wrangler secret put FEISHU_APP_SECRET --config worker/wrangler.toml
wrangler secret put PEXELS_API_KEY --config worker/wrangler.toml
wrangler secret put AGENT_API_KEY --config worker/wrangler.toml
wrangler secret put OBSIDIAN_BRIDGE_TOKEN --config worker/wrangler.toml
```

非敏感变量包括飞书 App ID、Base Token、八张表 ID、允许的前端 Origin、可选 Agent/Bridge URL。

## 部署

```bash
npm run deploy:worker
npm run deploy:pages
```

## 前端设置

在 V2 设置中填写：

- Worker URL
- 与 `APP_SYNC_TOKEN` 相同的同步 Token
- 开启远端模式

这些值保存在当前浏览器，不写入构建产物。

## 验收

1. `GET /api/health` 返回 `ok: true`。
2. 创建测试项目，同步八类实体。
3. 同一业务 ID 再同步不会重复新增。
4. 远端较新会报告冲突。
5. 本地删除后飞书对应记录被删除。
6. Pexels 未配置时返回明确错误而非空成功。
7. Obsidian Bridge 私有地址可搜索、读取和写入复盘。
8. Pages 根路径直接打开模块化 V2，不重定向 Classic。

## 安全边界

- 不在源码、ZIP、日志或截图中写真实 Secret。
- Obsidian Bridge 不应直接暴露到公网；需要私有隧道或访问控制。
- 原始照片不上传飞书八表。
- `ALLOWED_ORIGINS` 只包含实际部署域名。
