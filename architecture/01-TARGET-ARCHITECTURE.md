# 01｜目标架构

## 原则

1. 不重写产品，只抽离现有规则。
2. 领域层不依赖 DOM、localStorage、fetch、飞书或具体 AI。
3. 页面不编排跨实体写入。
4. 所有关系使用稳定 ID。
5. 所有 AI 输出均可追溯、可审查、可重生成。
6. 真实参考和 AI 合成资产永远不混淆。
7. 总看板是 Read Model，不是业务真源。
8. V2.4 第一阶段继续使用 ESM JavaScript，不强制框架和 TypeScript 重写。

## 分层

```text
presentation/
  当前页面与未来 Product Design UI
       ↓ commands / queries
application/
  用例、事务编排、权限与状态机
       ↓ repositories / gateways
 domain/
  实体、值对象、规则、事件、纯函数
       ↑ implementations
infrastructure/
  local repository、Feishu、Obsidian、AI、图像生成、PWA
```

依赖只能向内。

## 建议目录

```text
src/
  domain/
    project/
    catalog/
    reference/
    planning/
    schedule/
    post/
    sharing/
    common/
  application/
    project/
    catalog/
    reference/
    planning/
    schedule/
    post/
    sharing/
    dashboard/
  ports/
    repositories.js
    planning-model-gateway.js
    image-generation-gateway.js
    reference-source-gateway.js
    sync-gateway.js
    knowledge-gateway.js
  infrastructure/
    storage/
    feishu/
    obsidian/
    agent/
    image-generation/
  presentation/
    legacy-v2-pages/
  contracts/
  seed/
    equipment-models.json
    plan-templates.json
```

第一阶段可以保留现有 `src/pages/`，让它们逐步调用 application use cases。不要一次移动所有文件。

## Bounded Contexts

### Project

项目身份、Brief、参与者和当前阶段。

### Catalog

全局可复用设备、场地、模特和模板。

### Reference

真实参考资产、集合、项目选择和镜头绑定。

### Planning

上下文快照、Agent Run、方案、版本、镜头、预期成片。

### Schedule & Finance

日历事件、任务、预计收入、已收和费用。

### Post Production

备份、选片、修图、色彩、版本、交付。

### Sharing

模特和助理可见投影、版本和撤销。

### Integrations

飞书、Obsidian、外部图库、文字 Agent 和图像 Agent。

## Application Boundary

页面只能调用类似命令：

```js
await useCases.projects.createProject(command)
await useCases.catalog.assignEquipmentToProject(command)
await useCases.planning.createGenerationRun(command)
await useCases.planning.approveGenerationRun(command)
await useCases.schedule.createShootEvent(command)
await useCases.post.startPostProduction(command)
await useCases.sharing.publishModelPacket(command)
```

页面不允许直接：

```js
data.update('plans', ...)
data.create('tasks', ...)
storage.set(...)
```

查询通过 Query Services：

```js
queries.projectWorkspace.get(projectId)
queries.referenceLibrary.search(filters)
queries.calendar.getRange(range)
queries.revenue.getSummary(range)
queries.modelWorkspace.get(packetId)
```

## 事务边界

以下操作必须作为单个应用事务：

- 批准 GenerationRun：创建 Candidate PlanRevision、Shots 和关联。
- 确认 PlanRevision：锁定版本并允许创建 CalendarEvent。
- 创建拍摄事件：关联正式 PlanRevision 和参与者。
- 开始拍摄：检查正式方案、授权和必需资源。
- 确认拍摄完成：创建或更新 PostProductionJob。
- 发布角色包：生成脱敏快照和版本号。

即使 localStorage 不支持真正数据库事务，也必须通过 UnitOfWork 先构建变更集，全部校验后统一写入，并在失败时回滚快照。

## Read Models

为 UI 提供专用投影，避免页面临时拼装：

- PhotographerProjectWorkspace
- ReferenceLibraryView
- ResourceLibraryView
- CalendarRangeView
- PostProductionWorkspace
- ModelPacketView
- AssistantPacketView
- DashboardSummary（后做）

## 技术选择

### 第一阶段

- 保持原生 ESM JavaScript
- 使用 JSDoc 类型
- JSON Schema 校验外部和 AI DTO
- Node test 作为主要领域测试
- 浏览器 E2E 只验证关键纵向链路

### 延后

- React/Vue/Svelte 重写
- TypeScript 全量迁移
- SQLite/Tauri
- 复杂事件总线
- 微服务拆分

这些不是当前业务正确性的必要条件。
