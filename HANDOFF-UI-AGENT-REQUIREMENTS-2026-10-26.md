# 交接需求表：服装/道具字段 + Agent 对话式录入（交另一 AI 会话执行）

日期：2026-10-26。产出方：WorkBuddy（本仓库 photo-workflow-web-discovery-fix）。本文分四部分：已完成项（勿重做）、程序/UI 改动表、Agent 对话接口需求、验收清单。

## 一、已完成（后端合同已就位，勿重做）

1. 分镜合同从 13 字段扩为 **15 字段**：新增 `wardrobe_styling`（服装与妆发）、`shot_props`（本镜头道具）。生成提示词双通道（付费 JSON + 免费紧凑格式）均已更新，并明确"未提供的写待确认、道具只能来自用户提供或现场自然存在"。
2. 硬约束校验自动覆盖新字段：服装/道具文字也会被"未确认资源"扫描——模型在道具清单里写没提供的杯子/雨伞会被拦。
3. `director-plan.mjs` 归一化输出：`shotList[].wardrobe`、`shotList[].props`（原固定文案"以实际场地和已有资源为准"改为真实道具，空值回退）；`sections` 文案新增"服装与妆发""本镜头道具"两行。
4. 回归 88/88；DeepSeek 真实验证通过（`results/contract15-verify/`，模型正确输出"待确认：素色日常服装与自然妆发"）。
5. 评测台架 `eval-checks.mjs` 已同步 15 字段。

## 二、程序 / UI 改动表（请那边执行）

| # | 位置 | 改动 | 数据来源 | 优先级 |
|---|---|---|---|---|
| 1 | `index.html` 分镜编辑表单 | 新增"服装与妆发""本镜头道具"两个可编辑输入框（保存进 `directorContract.wardrobe_styling` / `.shot_props`） | `shotList[].wardrobe` / `.props` | 高 |
| 2 | `assets/plan-print-export.js` 打印/导出 | 分镜表加"服装与妆发""道具"两列（或两行），样式沿用现有列宽体系 | 同上 | 高 |
| 3 | `index.html` 方案详情 | 确认 `sections` 新增的"服装与妆发""本镜头道具"两行渲染正常、无样式溢出（后端已自动带出） | sections.c 数组 | 中 |
| 4 | 方案详情顶部 | 新增"成片构成配比"统计条：按 `shotSize` 派生"远景 x / 全身 x / 中景 x / 特写 x"（对齐业界"大场景3-4/中景5-8/特写2-3"惯例），纯前端统计，无需后端 | `shotList[].shotSize` | 中 |
| 5 | `director.duration` 时长估算 | 当前恒为 0（未估算）。需产品定口径：a) 按 shotSize 加权估每镜 5-10 分钟；b) 保持 0 由日程模块管理。定稿后由那边实现 | `director.duration` | 低（待口径） |
| 6 | 方案库旧数据兼容 | 旧方案无新字段：`wardrobe` 为空串、`props` 回退"以实际场地和已有资源为准"——渲染时留空即可，不要报错 | — | 高 |

## 三、Agent 对话式录入接口需求（新能力）

目标：用户在**对话框**用自然语言描述拍摄需求 → Agent 自动提取/分类/拆解 → 填充结构化 brief（经用户确认）→ 进入现有方案生成管线。

接口建议：

- 输入：`{ conversation: string, history?: [...], accountContext?: { defaultDuration?, commonScenes? } }`
- 处理：LLM 抽取并分类到 brief 字段 → 对缺失的关键字段生成追问（一次最多 2 个，不连环轰炸）
- 输出：`{ brief: { theme, style, modelDesc, scene, mood, duration, people, extra, wardrobe_hints, props_available }, missing: [...], questions: [...], confidence: 0-1 }`
- 前端：方案生成页新增"对话式录入"入口；提取结果以可编辑表单回显，**用户确认后才提交** `/api/ai/plan`，不静默生成
- 硬性要求：
  1. 对话内容禁止包含任何 API 密钥（密钥走本机中转页 `tools/eval-key-server.mjs`，见 `tools/EVAL-KEY-RELAY.md`）；
  2. 用户写的限制条款必须**原样**保留进 `extra`，不得改写或省略（硬约束校验依赖原文措辞）；
  3. 提取的 brief 直接走现有 `handleAiPlan`——15 字段合同与硬约束校验全部自动生效，接口层不得绕过校验；
  4. 置信度低于 0.6 或缺关键字段时只追问不生成。

## 四、验收清单

- [ ] 生成一份新方案：分镜详情显示"服装与妆发""本镜头道具"；打印/导出包含两列
- [ ] 旧方案打开不报错，新字段留空显示
- [ ] 对话框：一段自然语言 → 正确提取字段 → 用户可修改确认 → 生成方案成功
- [ ] 用户限制条款原样进入 extra（抽查一段含"仅35mm；无助手"的需求）
- [ ] 回归：`node --test tests/*.test.mjs` 全过（当前基线 88 项）
- [ ] 压力抽查：`experiments/plan-quality-lab` 下 `node real-model-eval.mjs --backend deepseek --briefs briefs-stress-2026-10-26.json` 通过率不低于 29/30（密钥经本机中转页提供）
