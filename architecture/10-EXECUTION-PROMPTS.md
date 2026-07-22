# 10｜执行模型 Prompt 模板

## 通用前缀

将以下前缀放在所有执行模型任务前：

```text
你正在实现 PhotoAtelier V2.4 的一个受限任务。
代码基线是 V2.3，架构合同由 GPT 维护。
你不是产品架构师，不得修改产品方向、实体语义、状态机或接口命名。

开始前必须阅读：
1. START-HERE-ARCHITECTURE-V2.4.md
2. architecture/01-TARGET-ARCHITECTURE.md
3. architecture/02-DOMAIN-MODEL.md
4. architecture/04-CONTRACTS-AND-PORTS.md
5. architecture/07-ACCEPTANCE-TEST-MATRIX.md
6. 你所负责的任务章节

规则：
- 先运行 npm ci 和 npm run test:release，记录基线。
- 只修改任务允许的文件和目录。
- 先新增失败测试，再实现。
- 不重做 UI，不引入前端框架。
- 不新增依赖，除非任务单明确允许。
- 不直接修改 Classic。
- 不在页面内新增跨实体业务编排。
- 遇到合同缺失或冲突，停止实现并输出“Architecture Question”，不要自行决定。
- 完成后列出变更文件、测试命令、测试结果、剩余风险。
```

## T01 资源库 Prompt

```text
实现 T01 Resource Catalog。

允许新增：
- src/domain/catalog/**
- src/application/catalog/**
- src/ports/catalog-repository.js
- src/infrastructure/storage/catalog-local-repository.js
- src/seed/equipment-models.json
- tests/node/catalog/**

不允许修改：
- src/pages/**
- worker/**
- V2.3 migration existing behavior

必须实现：EquipmentModel、EquipmentItem、Venue、TalentProfile、ProjectResourceAssignment。
必须通过 architecture/07 中 A 组全部测试。
内置设备 seed 必须幂等；未知设备允许 customName。
```

## T02 参考库 Prompt

```text
实现 T02 Reference Library。

核心要求：ReferenceAsset 是全局资产，ProjectReferenceLink 和 ShotReferenceLink 是关系。
不要继续使用“复制一条带 projectId 的参考记录”表达项目选择。
实现来源去重和 synthetic 过滤。
必须通过 architecture/07 中 B 组全部测试。
```

## T03 Planning Context Prompt

```text
实现 T03 PlanningContextBuilder。

只从命令中明确选择的 assignment/link 读取上下文。
输出必须符合 architecture/contracts/planning-context.schema.json。
Snapshot 必须不可变并包含 contextHash。
本任务不调用任何 AI，也不创建 Plan。
```

## T04 GenerationRun / PlanRevision Prompt

```text
实现 T04。

把 Agent 运行与正式 Plan 分离。
创建 Run 时不能产生正式 Shot。
批准 Run 才创建 Candidate PlanRevision 和 Shot。
确认 Revision 后不可原地修改。
保持 V2.3 旧路径兼容，但新写入只走新 Use Case。
必须解决本地 fallback 和 Worker 对 planStatus 的语义差异。
```

## T05 预期成片 Prompt

```text
实现 T05 ExpectedLook 与 ImageGenerationGateway。

AI 图必须使用 GeneratedAsset，synthetic=true。
不得把 AI 图写成 ReferenceAsset(real_photo)。
lookRequest.enabled=false 时禁止调用 provider。
Provider 失败不能阻止文字方案批准。
不要制作新 UI。
```

## T06 日历与收入 Prompt

```text
实现 T06 CalendarEvent 与 FinancialEntry。

不要继续把 shoot-call 存成 Task。
金额必须区分 expected_revenue、received_revenue 和 expense。
实现日、周、月聚合和时间冲突检测。
不要开发最终看板 UI。
```

## T07 后期 Prompt

```text
实现 T07 PostProductionJob。

从 confirmed PlanRevision 创建唯一 Job，并复制 ExpectedLook 快照。
后期状态不允许写回 PlanRevision。
LUTPreset 只作为库引用。
```

## T08 角色投影 Prompt

```text
实现 T08 SharePacket。

Model/Assistant Packet 必须来自 confirmed PlanRevision 和 CalendarEvent。
输出是不可变版本；修改项目后旧版本不自动改变。
严格执行隐私排除测试。
不要把角色视图实现成复制项目数据。
```

## T09 迁移 Prompt

```text
实现 T09 Schema v5 migration。

必须阶段化、Dry Run、幂等、可回滚。
不得删除 V2.3 原记录。
每条新记录保留 legacyId/migrationKey。
迁移失败恢复完整快照。
```

## 集成模型 Prompt

```text
你负责 T10 集成，不负责重新设计架构。
先检查各任务输出是否符合合同；不符合时退回对应任务，不在集成分支临时发明兼容字段。
页面只改为调用 Use Cases，保留现有 UI 结构。
完成后运行 npm run test:release 和 npm run test:e2e。
生成 integration-report.md，列出所有合同偏差。
```
