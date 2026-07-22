# 06｜多模型实施任务拆分

## 总规则

- GPT 维护本文档、Schema、状态机和跨任务决策。
- 一个任务只能由一个执行模型拥有。
- 不允许两个模型同时改 `schema.js`、迁移器或同一 Repository。
- 执行模型遇到合同缺口必须停止并返回问题，不得自行发明字段。
- 每个任务提交：变更摘要、文件清单、测试结果、未完成项。

## 建议分支

```text
arch/v24-contracts
feat/v24-catalog
feat/v24-references
feat/v24-planning
feat/v24-image-concept
feat/v24-calendar-finance
feat/v24-post
feat/v24-sharing
feat/v24-migration
integration/v24
```

## T00｜合同与骨架

推荐：GPT 5.6 或最强推理模型审阅，执行模型编码。

允许修改：

- `src/contracts/`
- `src/domain/common/`
- 新增 repository/gateway interface 文件
- 测试合同

禁止修改页面。

完成标准：Schema 校验和错误合同测试通过。

## T01｜资源目录

适合：GLM 或 Kimi。

范围：

- EquipmentModel
- EquipmentItem
- Venue
- TalentProfile
- ProjectResourceAssignment
- 内置 equipment seed loader

必须测试：

- 跨项目复用
- 自定义设备
- 项目删除关系不删除资源本体
- 主流型号 seed 幂等

不得开发地图或模特分析 Agent。

## T02｜参考库与关系

适合：Kimi。

范围：

- ReferenceAsset
- ProjectReferenceLink
- ShotReferenceLink
- 来源去重
- 飞书/Obsidian adapter 统一 DTO

必须测试：同一素材多个项目复用而不重复本体。

## T03｜PlanningContextBuilder

适合：GPT 监督，GLM 实现。

范围：

- Context Snapshot
- 只读取选中资源和参考
- contextHash
- source trace

这是高风险核心任务，不与 T04 并行修改同一文件。

## T04｜GenerationRun 与 PlanRevision

适合：Codex 或强代码模型。

范围：

- GenerationRun Repository
- ApproveGenerationRun
- Plan / PlanRevision
- Shot 写入
- 幂等和版本锁

必须删除页面对跨实体批准流程的编排，但页面 UI 暂不重做，只改为调用 use case。

## T05｜预期成片与图像生成 Port

适合：MiniMax/GLM 实现 provider adapter，GPT 审核合同。

范围：

- ExpectedLook
- ImageGenerationRun
- GeneratedAsset
- ImageGenerationGateway
- Classic Pollinations 只作为可选 adapter 参考，不直接复制旧 DOM 代码

必须测试：关闭选项时零 API 调用；失败不阻止文字方案。

## T06｜日历与收入

适合：Kimi 或 Codex。

范围：

- CalendarEvent
- FinancialEntry
- 冲突检测
- 日/周/月聚合
- V2.3 shoot-call 兼容迁移

必须区分预计收入与已收收入。

## T07｜后期 Aggregate

适合：GLM。

范围：

- PostProductionJob
- 状态机
- LUTPreset 关系
- 从 confirmed PlanRevision 复制 ExpectedLook 快照

暂不开发高级 LUT 市场 UI。

## T08｜模特与助理投影

适合：MiniMax/Kimi。

范围：

- SharePacket
- ModelPacketBuilder
- AssistantPacketBuilder
- 版本、撤销和隐私测试

不得改变主方案。

## T09｜Schema v5 迁移

只交给一个模型，推荐 Codex。

依赖：T01、T02、T04、T06、T07 合同冻结。

范围：

- Dry Run
- 幂等迁移
- 阶段报告
- 回滚
- V2.3 兼容读

## T10｜集成

由一个集成模型完成，不分散。

顺序：

1. 合并合同
2. 合并 Catalog / Reference
3. 合并 Planning
4. 合并 Calendar / Post
5. 合并 Sharing
6. 合并 Migration
7. 修改现有页面调用 use cases
8. 跑完整回归

## 每个执行 Prompt 必须包含

```text
你是执行模型，不是产品架构师。
只实现任务单中的范围。
不得新增或重命名领域字段。
不得修改未授权目录。
先运行当前测试并记录基线。
新增失败测试，再实现。
完成后运行指定测试和 npm run test:release。
遇到合同歧义时停止并列出问题，不自行决定。
```
