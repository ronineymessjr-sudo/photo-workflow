# 04｜接口合同与 Ports

## Repository Ports

```js
/** @interface */
export class ProjectRepository {
  get(id) {}
  save(project) {}
}

export class CatalogRepository {
  searchEquipmentModels(query, filters) {}
  listEquipmentItems(filters) {}
  saveEquipmentItem(item) {}
  listVenues(filters) {}
  saveVenue(venue) {}
  listTalentProfiles(filters) {}
  saveTalentProfile(profile) {}
}

export class ReferenceRepository {
  searchAssets(filters) {}
  saveAsset(asset) {}
  listProjectLinks(projectId) {}
  saveProjectLink(link) {}
  saveShotLink(link) {}
}

export class PlanningRepository {
  saveContextSnapshot(snapshot) {}
  saveGenerationRun(run) {}
  getGenerationRun(id) {}
  savePlan(plan) {}
  savePlanRevision(revision) {}
  saveShots(shots) {}
}

export class ScheduleRepository {
  listEvents(range) {}
  saveEvent(event) {}
  listFinancialEntries(range) {}
  saveFinancialEntry(entry) {}
}

export class PostRepository {
  getByPlanRevision(planRevisionId) {}
  saveJob(job) {}
  listLutPresets(filters) {}
}

export class SharePacketRepository {
  save(packet) {}
  getPublished(id) {}
  revoke(id) {}
}
```

## External Gateways

### PlanningModelGateway

```js
createPlanDraft({ contextSnapshot, instruction, schemaVersion })
```

返回必须通过 `contracts/plan-generation-output.schema.json`。

### ImageGenerationGateway

```js
generateConceptImages({ projectId, planRevisionId, prompt, count, aspectRatio, providerOptions })
```

返回：provider asset IDs 或临时 URL；应用层负责写 GeneratedAsset。

### ReferenceSourceGateway

```js
search(query, filters)
read(sourceId)
ingest(sourceItem)
```

实现可以是 Feishu、Obsidian、Pexels、本地索引。

### SyncGateway

```js
pull(entityType, cursor?)
push(changeSet)
delete(tombstones)
```

领域层不知道飞书表名。

### KnowledgeGateway

```js
searchNotes(query, filters)
writeReview(document)
```

## Command DTO 示例

### BuildPlanningContextCommand

```json
{
  "projectId": "project-1",
  "templateId": "portrait-editorial-v1",
  "equipmentAssignmentIds": ["assignment-eq-1"],
  "venueAssignmentId": "assignment-venue-1",
  "talentAssignmentIds": ["assignment-talent-1"],
  "projectReferenceLinkIds": ["project-ref-1"],
  "lookRequest": {
    "enabled": true,
    "generateConceptImages": true,
    "count": 4,
    "colorIntent": "低饱和暖肤色",
    "retouchIntent": "保留皮肤纹理，清理临时瑕疵"
  }
}
```

### ApproveGenerationRunCommand

```json
{
  "generationRunId": "run-1",
  "editedOutput": null,
  "expectedVersion": 1
}
```

### CreateShootEventCommand

```json
{
  "projectId": "project-1",
  "planRevisionId": "revision-2",
  "startAt": "2026-08-02T14:00:00+08:00",
  "endAt": "2026-08-02T18:00:00+08:00",
  "timezone": "Asia/Shanghai",
  "location": "某摄影棚",
  "participantAssignmentIds": ["participant-model-1", "participant-assistant-1"],
  "expectedRevenue": 1800,
  "currency": "CNY"
}
```

## Domain Events

当前不用引入复杂消息总线，但用例应返回事件供后续处理：

- PlanningContextBuilt
- GenerationRunCompleted
- GenerationRunApproved
- PlanRevisionConfirmed
- ShootEventCreated
- ShootStarted
- ShootCompleted
- PostProductionStarted
- SharePacketPublished
- RevenueReceived

## 错误合同

禁止只抛中文自由文本。Application Error 至少包含：

```json
{
  "code": "PLAN_REVISION_NOT_CONFIRMED",
  "message": "只有已确认方案版本可以创建拍摄日程",
  "details": {
    "planRevisionId": "revision-1"
  }
}
```

## 并发与版本

所有修改命令应支持 `expectedVersion` 或比较 `updatedAt`，避免不同模型实现后远端覆盖本地新数据。
