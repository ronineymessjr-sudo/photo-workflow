# 03｜应用用例

## Project

### CreateProject

输入：名称、Brief 初始字段、模板 ID、时区、货币。

输出：Project、ProjectBrief、模板启动任务。

### UpdateProjectBrief

只更新 Brief，不写 Plan 或资源实体。

## Catalog

### ImportEquipmentModels

从内置 seed 更新主流型号目录。按稳定 model ID 幂等，不覆盖用户自定义记录。

### AddOwnedEquipment

从 EquipmentModel 创建 EquipmentItem，或创建 customName 设备。

### AssignResourceToProject

将 EquipmentItem、Venue 或 TalentProfile 关联到项目。

### RemoveResourceAssignment

只删除关系，不删除全局资源本体。

## Reference

### IngestReferenceAsset

从飞书、Obsidian、本地或 URL 导入全局 ReferenceAsset，执行去重和来源验证。

### SelectReferenceForProject

创建 ProjectReferenceLink，同一素材可被多个项目选择。

### BindReferenceToShot

创建 ShotReferenceLink，支持锁定、拒绝和说明。

## Planning

### BuildPlanningContext

读取 Brief、模板、项目资源关系、项目参考关系和历史复盘，生成不可变 Snapshot。

硬规则：

- 只包含项目明确选中的资源。
- 设备必须携带 equipmentItemId 和 model 信息。
- 真实参考必须携带 referenceAssetId。
- 可选预期成片请求必须明确 enabled。

### CreatePlanGenerationRun

保存 Snapshot 后调用 PlanningModelGateway。Agent 返回的每项建议应包含 sourceTrace。

### RegeneratePlan

基于旧 Snapshot 或新 Snapshot 创建新 Run，不修改旧 Run。

### ApproveGenerationRun

- 校验 Run 状态和输出 Schema。
- 创建 Plan 或新 PlanRevision。
- 写入 Shots、ExpectedLook 和引用关系。
- Plan 进入 candidate。
- 幂等：相同 Run 只能批准一次。

### ConfirmPlanRevision

- 将 Candidate Revision 锁定为 confirmed。
- 更新 Plan.confirmedRevisionId。
- 其他已确认版本标记 superseded。
- 允许创建 CalendarEvent 和 SharePacket。

### RequestExpectedLookImages

仅当 ExpectedLook.enabled=true 执行。

- 构建专用图像 Prompt。
- 调用 ImageGenerationGateway。
- 生成 ImageGenerationRun 和 GeneratedAsset。
- synthetic 永远为 true。
- 失败不阻止文字方案保存。

## Schedule

### CreateShootEvent

要求：

- confirmed PlanRevision
- start/end 合法
- 不与不可重叠事件冲突
- 参与者来自 ParticipantAssignment

创建 CalendarEvent，不创建 shoot-call Task。

### RecordExpectedRevenue

写 FinancialEntry(type=expected_revenue)。日历上的金额是预计值。

### RecordReceivedRevenue

写独立 received_revenue，不能覆盖预计金额。

### GetRevenueSummary

按日、周、月返回：expected、received、expense、netReceived。

## On-set

### StartShoot

检查：

- confirmed PlanRevision
- CalendarEvent 已确认
- 必要授权
- 必需设备分配
- 必拍镜头存在

### UpdateShotCaptureStatus

只改变 Shot 的现场状态并写 ShootRecord/Event，不改方案内容。

### CompleteShoot

当必拍镜头满足完成规则时，CalendarEvent 标记 completed，并确保 PostProductionJob 存在。

## Post

### StartPostProduction

从 confirmed PlanRevision 创建 PostProductionJob，并复制 ExpectedLook 快照。

### AdvancePostProduction

使用独立状态机推进备份、选片、修图、反馈和交付。

### SelectLUTPreset

关联 LUTPreset，不把 LUT 文件内容塞入 Plan。

## Sharing

### BuildModelPacket

从 confirmed PlanRevision、CalendarEvent 和对应 ParticipantAssignment 生成：

- 到场信息
- 本人任务和拍摄目标
- 准备要求
- 授权范围

排除完整内部方案、其他人联系方式、内部费用和无关镜头。

### BuildAssistantPacket

生成日程、设备清单、执行任务和必要镜头提示。

### PublishPacket

保存不可变版本。修改后必须发布新版本。

## Dashboard

只提供查询，不提供写命令：

```text
GetDashboardSummary(dateRange)
```

聚合即将拍摄、待确认、拍前阻塞、后期状态和收入，不新增业务字段。
