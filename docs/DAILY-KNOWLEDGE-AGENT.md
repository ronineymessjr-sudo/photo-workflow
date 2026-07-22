# 每日知识增量代理

## 目标

这条管道只做一件事：把本人小红书、抖音收藏页里新增的可见链接和公开元数据增量写入现有摄影知识库。它不下载原帖，不抓评论，不绕过登录或验证码，也不改变现有摄影知识分类体系。

流程：

```text
本人登录态收藏页
-> 低频读取可见链接
-> URL 归一化与去重
-> 本地模型分类（失败时规则兜底）
-> Obsidian 每日记录
-> 非敏感兴趣画像
-> 自动化状态报告
```

## 平台边界

- 抖音开放平台提供账号授权、投稿、经营和数据能力，但当前能力列表没有普通用户“我的收藏列表”接口：<https://developer.open-douyin.com/docs/resource/zh-CN/dop/ability/common-solution>
- 小红书开放平台也没有面向个人收藏夹的公开读取接口：<https://open.xiaohongshu.com/>
- 因此平台侧使用本人登录后的浏览器会话，只读取页面当前可见链接。页面要求验证码或登录时停止，不做规避。
- MediaCrawler 可作为未来自托管研究适配器，但其公开说明同样基于 Playwright 登录态，并明确禁止大规模或侵权用途：<https://github.com/NanmiCoder/MediaCrawler>

## 分类代理

默认配置使用 Ollama 的 OpenAI 兼容接口：

```text
http://127.0.0.1:11434/v1/chat/completions
```

官方兼容说明：<https://docs.ollama.com/api/openai-compatibility>

本机没有安装 Ollama 时，系统自动使用规则分类并在状态页标记 `rules-fallback`，每日入库不会中断。安装 Ollama 后可自行拉取配置中的模型：

```powershell
ollama pull qwen3:8b
```

也可通过 `.env` 把 `DAILY_KB_AGENT_BASE_URL`、`DAILY_KB_AGENT_MODEL` 和 `DAILY_KB_AGENT_API_KEY` 指向其他 OpenAI 兼容服务。不要把真实密钥提交到仓库。

## 使用

首次建立专用登录态：

```powershell
npm run agent:daily:login
```

只预览待处理增量，不写文件：

```powershell
npm run agent:daily:dry-run
```

手动执行完整每日任务：

```powershell
npm run agent:daily:scheduled
```

只处理已经生成的捕获文件，不访问平台：

```powershell
npm run agent:daily
```

## Obsidian 输出

- `摄影知识库/09_每日收集/00_每日收集索引.md`
- `摄影知识库/09_每日收集/YYYY-MM-DD.md`
- `摄影知识库/10_个人兴趣画像.md`
- `摄影知识库/11_每日自动化状态.md`

兴趣画像只统计主题、创作阶段、内容类型、平台与时间变化，不推断敏感属性。所有平台条目默认 `metadata-only` 和 `needs-review`。
