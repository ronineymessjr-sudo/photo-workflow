# 00｜V2.3 现状架构审查

## 审查结论

V2.3 已经具有可运行的本地优先基础、迁移、飞书同步、Agent 审批、日程、现场记录和后期字段，测试基线也稳定。但当前代码仍是“页面驱动的通用 CRUD 应用”，还没有形成摄影师业务所需的稳定领域边界。

最重要的不是增加新页面，而是把现有数据从临时项目记录重构为可复用库、项目选择关系、生成上下文和独立状态机。

## 已验证基线

在未修改源码的解压目录执行：

```bash
npm ci
npm run test:release
```

结果：

- 38/38 Node 与集成测试通过
- 语法检查通过
- Smoke 通过
- V2 构建通过
- 分发包与安全扫描通过

## 关键问题一：通用 DataService 不能保护摄影业务规则

当前：

- `src/services/data-service.js` 提供字符串实体的通用 create/update/remove。
- 页面直接组合跨实体状态变化。
- 例如 `src/pages/schedule.js` 自己完成日程创建、方案状态变化、镜头状态、现场记录和拍摄完成判断。
- `src/pages/post.js` 直接把后期字段写回 Plan。

风险：

- 不同模型只要修改页面，就可能绕过状态约束。
- 同一业务规则会在页面、Worker 和测试里重复。
- UI 重做时必须重新搬运业务逻辑。

决策：引入 Application Use Cases。页面只能调用命令服务，不得直接编排跨实体写入。

## 关键问题二：资源库被建模成项目临时数据

当前：

- `equipment`、`venues`、`people` 都被 `listByProject()` 查询。
- `crew.js` 添加设备时必须填写 `projectId`。
- 每个新项目都要重新录入设备。

这与用户的真实需求相反：

- 设备应有全局主流型号目录。
- 摄影师应维护自己的库存或可租设备。
- 项目只负责“选择和分配”已有设备。
- 场地和模特也应可跨项目复用。

决策：拆成全局 Catalog 与 Project Assignment。

## 关键问题三：参考库被项目锁死

当前：

- `references` 是飞书同步实体，但页面仅使用 `listByProject('references')`。
- Agent Worker 也只读取 `projectId` 相同的参考。

结果：

- 飞书中的个人全局参考库无法直接被多个项目复用。
- 同一张参考图可能被重复导入。
- 参考图与镜头绑定、项目选择和素材本体混在一起。

决策：ReferenceAsset 是全局资产；ProjectReferenceLink 和 ShotReferenceLink 才是项目关系。

## 关键问题四：Agent 运行记录和正式方案混在 Plans

当前：

- Worker 把待批准 Agent Run 存进 Plans 表。
- Plan 同时承担 agentStatus、userApproved、planStatus、executionStatus 和 deliveryStatus。
- Worker 批准时写 `status: approved`，本地 fallback 写 `planStatus: candidate`，存在行为差异。
- `planVersions` 已存在但几乎没有进入主流程。

风险：

- 重生成、批准、确认、归档和执行状态互相干扰。
- Agent 失败记录会污染正式方案库。
- 已确认方案无法安全版本化。

决策：GenerationRun 与 Plan 分离；PlanRevision 保存不可变版本；批准 Run 才产生 Candidate PlanRevision。

## 关键问题五：资源记录并未真正进入远端 Agent 上下文

当前 Worker 的 `buildProjectContext()`：

- 从飞书读取 Projects、References、Plans、Reviews。
- equipment 只读取 `project.equipment` 或 `project.equipmentJson`。
- 本地 `equipment`、`venues`、`people` 不属于八个同步实体。

因此即使用户在 V2 页面添加设备，远端 Agent 通常看不到这些记录。

决策：前端通过 PlanningContextBuilder 生成不可变上下文快照并发送给 Worker；Worker校验快照，而不是自行猜测本地数据。

## 关键问题六：Tasks 承担了过多职责

当前 Tasks 同时表示：

- 普通待办
- shoot-call 拍摄通告
- post-production 后期任务
- publishing 发布任务

用户现在需要苹果日历式日程和收入统计。继续塞进 Tasks 会导致时间、金额、参与者和重复规则越来越复杂。

决策：

- Task：可完成事项。
- CalendarEvent：有时间范围的日程事件。
- FinancialEntry：预计收入、已收收入和费用。

## 关键问题七：后期状态被写进 Plan

当前 Plan 保存：

- backupPrimary / backupSecondary
- materialPath
- selectedCount
- editVersion
- feedbackStatus
- deliveryStatus

这些属于后期生产，不属于方案定义。

决策：创建 PostProductionJob，确认方案时从 ExpectedLook 复制后期意图快照。

## 关键问题八：AI 概念图在 V2 中缺失

Classic 中存在 Pollinations 批量生图逻辑，但 V2 没有正式的生成资产模型和适配器。预期成片功能不能简单回抄旧 DOM 代码。

决策：

- ImageGenerationRun：记录请求、提供商和状态。
- GeneratedAsset：保存结果元数据。
- synthetic=true：与真实参考严格区分。
- 方案可以选择是否启用预期成片生成。

## 关键问题九：角色视图是展示偏好，不是稳定输出合同

V2.3 的 role workspace 能生成不同摘要，这是有价值的。但用户确认的产品关系是：

- 摄影师编辑完整项目。
- 摄影师确认方案后主动发送模特或助理所需内容。
- 模特和助理不直接读取完整方案。

决策：角色视图改为由 SharePacketService 生成的版本化投影，而不是在 UI 中直接过滤同一份对象。

## 关键问题十：代码身份仍有混淆

根目录 `src/` 同时包含：

- 模块化 V2 源码
- Classic 专用 `domain.js`、`storage.js`、`app-enhancements.js`、`feishu-sync.js`

构建脚本已经把它们分发到 Classic Add-on，但仓库路径仍会误导执行模型。

后续应在不影响 Classic 的前提下迁到 `legacy/src/`，但这不是第一批业务重构的阻塞项。

## 当前应保留

- local-first 基础
- StorageRepository 的备份与回滚能力
- 飞书同步适配器
- Obsidian Bridge
- Agent 必须人工批准
- Plan / Execution / Delivery 三维状态概念
- LUT 解析器
- V2.3 现有回归测试

## 当前不应继续扩展

- 页面直接 CRUD
- 项目级重复设备记录
- Agent 记录继续写进正式 Plans
- Tasks 继续承载日程和财务
- 把 AI 概念图当真实参考图
- 在业务模型稳定前重做 UI
