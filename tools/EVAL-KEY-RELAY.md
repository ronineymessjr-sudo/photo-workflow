# 评测密钥中转（EVAL-KEY-RELAY）使用说明

用途：让任何 AI 会话（WorkBuddy / Codex / Claude Code / GPT 等）在不接触用户 API 密钥明文的前提下，用用户自配的 DeepSeek 密钥跑真实方案生成评测。用户把密钥粘进本机页面，密钥只存在本机服务内存里；AI 通过本机接口在运行时取用。

## 位置与启动

脚本：`tools/eval-key-server.mjs`（本仓库）。

```bash
cd D:\AI项目\摄影系统\photo-workflow-web-discovery-fix
node tools/eval-key-server.mjs
```

启动后用户在本机浏览器打开 `http://127.0.0.1:8129/`，粘贴 DeepSeek 密钥（模型默认 `deepseek-flash`），点"保存到本机内存"。

## 接口（全部仅限 127.0.0.1）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/` | 用户粘贴密钥的页面 |
| POST | `/key` | 页面提交 `{apiKey, model}`，存入内存 |
| GET | `/status` | 掩码状态（末 4 位 + 剩余时间），AI 可安全读取 |
| GET | `/key` | 返回 `{apiKey, model}`，**仅供评测脚本运行时取用，禁止输出到聊天/日志/文件** |
| POST | `/clear` | 立即清空内存中的密钥 |

密钥 2 小时自动清空；可随时页面点"立即清除"或 `POST /clear`。

## AI 会话使用流程

1. 确认服务已启动（`GET /status` 返回 `configured:true`；未启动则先请用户启动并粘贴密钥）。
2. 运行评测（脚本会自动从 `/key` 取用，无需也不得把密钥写进命令行或文件）：

```bash
cd experiments/plan-quality-lab
node real-model-eval.mjs --backend deepseek                     # 全部四组需求
node real-model-eval.mjs --backend deepseek --only rain-high-angle --out results/real-model-2026-10-26-deepseek-retry   # 单独重跑某组
```

3. 结果落在 `results/<目录>/`：每组一个 JSON（含生产校验结论）+ `summary.json`。失败组照实保留，用 `--only <id>` 重新生成重试（模拟用户点"重新生成"），不要润色原始返回。
4. **测完立即** `curl -X POST http://127.0.0.1:8129/clear` 清空密钥，并向用户确认。

## 安全规则（对 AI 会话的硬性要求）

- 禁止把 `/key` 的返回内容写入聊天回复、日志、截图、文件、git 或任何持久化位置；
- 禁止把密钥放进命令行参数、环境变量导出语句或文档；
- 只允许通过 HTTPS 调用 `api.deepseek.com`，不得转发给任何第三方；
- 用户可在 DeepSeek 后台随时吊销密钥，AI 应主动提醒这一兜底手段。

## 已验收记录（2026-10-26）

DeepSeek 真实端到端：四组需求全部通过生产校验（window-portrait / two-friends / overcast-park 一次过，rain-high-angle 第 2 次生成通过；第 1 次的镜头 6 裁切违反"完整全身"被校验器正确拦截——这是设计行为，不是误报）。证据：`experiments/plan-quality-lab/results/real-model-2026-10-26-deepseek*/`。
