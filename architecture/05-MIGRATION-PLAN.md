# 05｜V2.3 → V2.4 兼容迁移

## 总原则

- Schema 目标版本：5
- 不删除 V2.3 数据
- 迁移先 Dry Run
- 记录 legacyId 与 migrationKey
- 重复执行结果相同
- 失败自动恢复快照
- UI 在迁移期间继续使用 V2.3 页面

## 阶段 0：冻结合同

先添加：

- 新 Entity 常量
- JSON Schema
- Repository Ports
- Application Use Case 测试

不改页面。

## 阶段 1：资源库

### Equipment

当前：每个 `equipment` 记录带 projectId。

迁移：

1. 以品牌、型号、分类或规范化名称去重生成 EquipmentItem。
2. 原 projectId 转成 ProjectResourceAssignment。
3. 保留原 equipment.id 为 legacyId。
4. 无法识别型号的记录使用 customName。

### Venue

- 创建全局 Venue。
- projectId 转 ProjectResourceAssignment。

### People

- 创建 TalentProfile。
- projectId、role、planId 转 ParticipantAssignment。
- privateNotes 不进入普通同步 payload。

## 阶段 2：参考库

当前 project-scoped Reference：

1. 去除项目关系字段后计算资产指纹。
2. 相同 sourceUrl / externalId / contentHash 合并为 ReferenceAsset。
3. 每个旧 projectId 创建 ProjectReferenceLink。
4. 旧 Shot.referenceIds 迁成 ShotReferenceLink。

## 阶段 3：GenerationRun 与 Plan

对于含 `agentRunId` 的旧 Plan：

- 将 agent 元数据复制到 GenerationRun。
- 保留正式 Plan.id。
- 从 output/正式字段创建 PlanRevision。
- 若 planStatus=candidate/confirmed，设置 Plan.activeRevisionId。
- 已确认方案设置 confirmedRevisionId。

旧字段暂时保留一版作为兼容读，写入只走新实体。

## 阶段 4：日程与财务

- taskType=shoot-call → CalendarEvent。
- 普通 checklist/post-production 保留为 Task。
- 旧任务金额若存在，迁为 FinancialEntry(expected_revenue)。
- 不把旧金额默认标记为已收。

## 阶段 5：后期

从 Plan 的以下字段创建 PostProductionJob：

- backupPrimary
- backupSecondary
- materialPath
- selectedCount
- editVersion
- feedbackStatus
- deliveryStatus

Plan 上旧字段保留只读兼容一版。

## 阶段 6：角色包

V2.3 没有真正发布记录。不要迁移临时 UI 角色选择。已有导出内容如无版本元数据，不自动视作 Published SharePacket。

## 飞书迁移策略

### 第一阶段：兼容八表

不立刻要求用户重建所有飞书表：

- Projects/Plans/Shots/Tasks 等旧表继续同步旧实体。
- 新 Library 与 Link 实体先本地持久化。
- PlanningContextSnapshot 发送给 Worker，不要求 Worker从新表拼装。

### 第二阶段：扩展表

建议新增：

- ResourceCatalog
- ResourceAssignments
- ReferenceLinks
- GenerationRuns
- CalendarEvents
- FinancialEntries
- PostProductionJobs
- SharePackets

若希望减少表数，可将 Equipment/Venue/Talent 统一到 ResourceCatalog，但必须通过 `resourceType` 和 payload schema 校验。

## Feature Flag

```text
architectureV24Enabled
catalogV24Enabled
planningRunsV24Enabled
calendarV24Enabled
postV24Enabled
```

每个纵向切片单独启用，避免一次切换全部功能。

## 回滚

- migration 前创建 backup v5-preflight。
- 每阶段记录 inserted/linked/skipped/warnings。
- 回滚只删除 migrationKey 属于该阶段的新记录。
- 不修改原 V2.3 记录直到该阶段验收通过。
