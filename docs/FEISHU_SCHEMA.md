# PhotoAtelier V2 飞书八表结构

- 业务唯一键：`id`
- 项目隔离键：除 Projects 外均使用 `projectId`
- 无损字段：每张表保留 `payloadJson`
- 删除：本地墓碑队列同步成功后清除
- 冲突：比较 `updatedAt`，远端较新时不静默覆盖

## 公共字段

`id`、`createdAt`、`updatedAt`、`payloadJson`

## Projects

`title`、`status`、`shootingType`、`date`、`location`、`style`、`brief`

## References

`projectId`、`title`、`sourcePlatform`、`sourceUrl`、`styleTags`、`category`、`notes`、`provider`、`externalId`、`previewUrl`、`photographer`、`obsidianPath`

验证状态、许可信息和关系绑定保存在 `payloadJson`。

## Plans

`projectId`、`concept`、`rationale`、`generationMode`、`visualDirection`、`equipment`、`risks`、`status`、`planStatus`、`executionStatus`、`deliveryStatus`、`scheduledAt`、`scheduleLocation`、`backupPrimary`、`backupSecondary`、`materialPath`、`selectedCount`、`editVersion`、`feedbackStatus`、`agentRunId`、`agentStatus`、`provider`、`model`、`promptVersion`、`schemaVersion`、`contextSnapshotJson`、`outputJson`、`validationJson`、`userApproved`、`parentPlanId`、`traceId`、`approvedAt`

## Shots

`projectId`、`planId`、`sequence`、`scene`、`shotSize`、`focalLength`、`composition`、`lighting`、`pose`、`durationMinutes`、`priority`、`fallback`、`captureStatus`、`referenceIds`

## Tasks

`projectId`、`planId`、`taskType`、`phase`、`status`、`title`、`startAt`、`endAt`、`dueAt`、`location`、`timezone`、`deliveryStatus`

- 普通任务：`taskType=checklist`
- 拍摄通告：`taskType=shoot-call`
- 后期任务：`taskType=post-production`

## LUTs

`projectId`、`planId`、`name`、`inputColorSpace`、`fileUrl`、`style`、`strength`、`notes`

`.cube` 文件本体只在体积允许时本地保存，默认不写入飞书展开字段。

## Reviews

`projectId`、`planId`、`planScore`、`executionScore`、`keepRate`、`successes`、`failures`、`lightingIssues`、`finalGrade`、`clientFeedback`、`reusableInsights`、`nextActions`、`obsidianPath`

## Messages

`projectId`、`type`、`severity`、`status`、`relatedEntity`、`relatedId`、`traceId`、`content`、`metadataJson`

## 数字字段

`sequence`、`durationMinutes`、`strength`、`planScore`、`executionScore`、`keepRate`、`selectedCount`

## 变更规则

修改字段时必须同时更新：

1. 本文件。
2. `worker/src/index.js` 的 `ENTITY_FIELDS` / `NUMBER_FIELDS`。
3. 飞书真实表结构。
4. 同步集成测试与真实账户验收记录。
