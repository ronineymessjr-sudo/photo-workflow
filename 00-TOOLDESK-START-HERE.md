# PhotoAtelier V2.5｜ToolDesk 直接接手入口

> **只需要先读本文件和根目录 `AGENTS.md`。** 旧版本报告已经归档到 `docs/history-handoff-v2.2-v2.4.zip`，不要先解压或重新分析历史项目。

## 1. 当前状态

这是已经完成领域层实现、迁移、真实数据目录和自动测试的 V2.5 基线，不是空模板，也不是新建项目。

已验证基线：

- Node／集成测试：`68 / 68` 通过；
- JavaScript 语法检查：通过；
- 静态 Smoke：通过；
- V2 构建与三类发布包：通过；
- 公开文件安全扫描：通过；
- `npm audit`：0 个已知漏洞；
- 最终 ZIP 已从空目录解压并执行 `npm ci` + `npm run test:release`；
- 浏览器 E2E 在原沙箱被管理员策略阻止访问 localhost，因此**未标记为通过**。

机器可读记录：`BASELINE-VERIFIED.json`。

## 2. 不要重复做的工作

接手后不要：

1. 重新写 PRD 或重新定义领域字段；
2. 重做 V2.4 架构审查；
3. 重新实现资源库、参考关系、PlanningContextSnapshot、GenerationRun、PlanRevision、日历财务、后期状态机、SharePacket 或 Schema v5 迁移；
4. 导入后立刻重跑完整 `test:release`；
5. 每修改一个文件就跑全部 68 项测试；
6. 把 AI 合成图当成实拍参考；
7. 把设备型号目录当作用户已拥有设备；
8. 把 CalendarEvent、Task、FinancialEntry 再次合并；
9. 让页面绕过 `context.v5` 直接编排多个实体写入。

除非发现包损坏、依赖锁文件异常或基础代码被外部修改，否则直接信任已经记录的基线。

## 3. 当前唯一主任务

**把现有兼容页面逐步迁移到 V5 Use Cases，不进行最终视觉重设计。**

执行顺序：

1. 资源选择：设备、场地、模特；
2. 参考库与项目／镜头关系；
3. 方案生成、人工批准和方案版本；
4. 日历事件、任务和收入；
5. 现场执行；
6. 后期流程；
7. 模特／助理分享。

规则：

- 页面只能调用 `context.v5` 服务或查询模型；
- 跨实体写入必须走 V5 Application／Use Case；
- 保持当前 DOM 和视觉，UI 重设计推迟到全部页面完成 V5 接入之后；
- 每完成一个页面，删除该页面对应的旧 DataService 编排，但不能破坏 V2.3 数据读取兼容。

详细外部任务见：`EXTERNAL-INTEGRATION-TASKS-V2.5.md`。

## 4. 代码真源

```text
src/v5/
├── application.js                  应用组装和事务边界
├── catalog/                        设备、场地、模特、方案模板
├── references/                     全局素材及项目／镜头关系
├── planning/                       快照、生成运行、方案版本、预期成片
├── schedule/                       日历、冲突、财务
├── onset/                          开拍检查和现场记录
├── post/                           后期、备份、LUT、交付
├── sharing/                        模特／助理最小信息投影
├── queries/                        页面查询模型
├── migration/                      Schema v5 迁移与回滚
└── repositories/                   兼容 Repository 适配器
```

外部 Worker 合同：

```text
worker/src/index.js
POST /api/v1/agent/plans/draft-v5
POST /api/v1/images/expected-look
```

## 5. 测试策略：不要每次全测

先安装依赖（仅当 `node_modules` 不存在）：

```bash
npm ci
```

按修改范围运行：

```bash
npm run test:scope -- catalog
npm run test:scope -- references
npm run test:scope -- planning
npm run test:scope -- schedule
npm run test:scope -- post
npm run test:scope -- sharing
npm run test:scope -- migration
npm run test:scope -- worker
npm run test:scope -- ui
npm run test:scope -- all-v5
```

只有以下情况运行完整门禁：

- 一个完整任务批次结束；
- 修改了 Schema、Repository、迁移、构建脚本或 Worker 公共合同；
- 准备生成下一份交接包。

完整门禁：

```bash
npm run test:release
```

浏览器 E2E 不要每次运行。只在多个页面完成 V5 接入后、准备合并或部署时运行一次：

```bash
npm run test:e2e
```

## 6. 完成定义

一个页面迁移任务只有同时满足以下条件才算完成：

- 页面不再直接组织多个实体写入；
- 使用稳定实体 ID；
- 非法状态返回领域错误，不静默吞错；
- 对应范围测试通过；
- 没有重写领域合同；
- 未引入虚构个人数据；
- 没有顺便重做不相关 UI。

## 7. 需要真实环境才能完成的项目

这些不要用 Mock 冒充完成：

- 飞书真实账号和 V5 投影验收；
- 真实文字模型质量、429、超时和 5xx；
- 真实 AI 预期成片图；
- Obsidian Vault、Pexels 和飞书权限；
- 正常 Chrome／Chromium 环境的完整 E2E；
- 最终 Product Design UI；
- 地图、日照、模特脸型／身型分析、高级 LUT 市场。

## 8. ToolDesk 输出要求

每个任务完成后只需输出：

1. 改了哪些文件；
2. 哪个 V5 Use Case 被接入；
3. 跑了哪个 targeted scope；
4. 是否存在需要 GPT 决策的合同变化；
5. 下一步一个明确任务。

不要重新生成大篇市场报告、PRD 或历史总结。
