# Photo Atelier V3.0 Planning Flow Upgrade — 交接文档

**日期**: 2026-07-22
**分支**: feat-photo-atelier-vnext-refactor-nWfuzz
**测试**: all-v5 scope 33/33 PASS

---

## 一、变更目标

重构方案生成核心链路，解决五个问题：

1. 参考图没有真正参与方案生成
2. 创意方向与执行模板错配
3. Shot List 与用户需求不一致
4. PDF 执行稿信息结构混乱
5. 生成结果无法直接指导拍摄

核心原则：**Reference First** — 参考图是方案生成的核心输入，不是装饰。

---

## 二、生成链路变更

### 旧链路（一步到位）

```
Snapshot → createGenerationRun → Plan Output
```

### 新链路（三步分离）

```
Step 1: 参考图 → VisualAnalysisService.analyze() → VisualDNA
Step 2: VisualDNA + Brief → CreativeDirectionService.generateDirections() → CreativeDirection[3]
                                                             → selectDirection() → 选定方向
Step 3: CreativeDirection + VisualDNA → ShotDesignService.designShots() → Shot[]
```

每步独立端点、独立降级、独立可测。

---

## 三、新增文件

### 1. `src/v5/planning/visual-analysis-service.js`

**VisualAnalysisService** — 参考图视觉分析

| 方法 | 入参 | 出参 |
|------|------|------|
| `analyze(command)` | `{ projectId }` | `{ visualDNA, events }` |

**VisualDNA 实体字段**：

```
id, projectId, referenceAssetIds[],
compositionAnalysis: { description, patterns[] },
lensAnalysis: { description, focalRecommendations: [{ mm, purpose }] },
subjectAnalysis: { description, avoid[], recommend[] },
lightingAnalysis: { description, direction, approach },
colorAnalysis: { description, saturation, temperature, texture },
immutable: true, createdAt
```

降级策略：无 Vision Gateway 时走 `deterministicVisualDNA()`，基于参考图 tags + brief 风格推断。

### 2. `src/v5/planning/creative-direction-service.js`

**CreativeDirectionService** — 创意方向生成与选择

| 方法 | 入参 | 出参 |
|------|------|------|
| `generateDirections(command)` | `{ projectId, visualDNAId }` | `{ directions, events }` |
| `selectDirection(command)` | `{ id, projectId }` | `{ selected, rejected, events }` |

**CreativeDirection 实体字段**：

```
id, projectId, visualDNAId,
title, keywords[], styleTags[], moodDescription,
referenceAssetIds[],
status: 'candidate' | 'selected' | 'rejected',
selectedAt, createdAt
```

每次生成 3 个候选方向（A/B/C），用户选定一个后其余自动 rejected。

### 3. `src/v5/planning/shot-design-service.js`

**ShotDesignService** — 镜头设计

| 方法 | 入参 | 出参 |
|------|------|------|
| `designShots(command)` | `{ projectId, creativeDirectionId, visualDNAId, shootingScale, equipmentItemIds?, instruction? }` | `{ shots, events }` |

**Shot 新增字段**：

```
emotion: string        — 情绪关键词（如 "克制、安静"）
mood: string           — 画面情绪（如 "清冷"）
referenceAssetId: string | null — 主参考图 1:1 绑定
learningFocus: string  — 从参考图学习什么
```

**Shot 数量动态化**（`shootingScale`）：

| 规模 | 数量范围 | 确定性降级默认 |
|------|---------|-------------|
| simple | 5-8 | 6 |
| standard | 10-15 | 12 |
| comprehensive | 15-25 | 20 |

---

## 四、修改文件

### 实体注册

| 文件 | 变更 |
|------|------|
| `src/core/schema.js` | V5_LOCAL_ENTITIES 新增 `visualDNAs`, `creativeDirections` |
| `src/v5/repositories/data-service-repositories.js` | names 数组同步新增 |

### Gateway

| 文件 | 变更 |
|------|------|
| `src/v5/gateways/http-gateways.js` | 新增 `HttpVisionGateway` 类，方法 `analyzeReferences(payload)` |

### Application 组装

| 文件 | 变更 |
|------|------|
| `src/v5/application.js` | 新增 `visionGateway` 参数；实例化三个新服务；返回 `visualAnalysis`, `creativeDirection`, `shotDesign` |

### PlanningContext

| 文件 | 变更 |
|------|------|
| `src/v5/planning/planning-context.js` | `build()` 新增 `visualDNAId`、`shootingScale` 字段；`createBriefFromLegacyProject()` 默认 `shootingScale: 'standard'`；新增 `normalizeShootingScale()` |

### 合同 Schema

| 文件 | 变更 |
|------|------|
| `architecture/contracts/plan-generation-output.schema.json` | 版本 v2.4→v3.0；Shot 新增 `emotion`, `mood`, `referenceAssetId`, `learningFocus` |
| `architecture/contracts/planning-context.schema.json` | 版本 v2.4→v3.0；新增 `visualDNAId`, `shootingScale` (enum, default standard) |

### 校验器

| 文件 | 变更 |
|------|------|
| `src/v5/contracts/validators.js` | `validatePlanGenerationOutput` 新增 emotion/learningFocus 类型校验；`validatePlanningContext` 新增 visualDNAId/shootingScale 校验 |

### 查询服务

| 文件 | 变更 |
|------|------|
| `src/v5/queries/query-services.js` | `planningWorkspace` 返回新增 `visualDNAs`, `creativeDirections`；新增 `visualAnalysisWorkspace` 查询 |

### Worker

| 文件 | 变更 |
|------|------|
| `worker/src/index.js` | 三个新端点（见下）；6 个新增 handler/降级函数；health 端点新增 `visionAgent` 状态 |

### PDF 执行稿

| 文件 | 变更 |
|------|------|
| `src/app-enhancements.js` | `exportPlanPrintView` 完全重写 |

---

## 五、Worker 新端点

### `POST /api/v1/visual-dna/analyze`

**请求**：
```json
{ "references": [...], "snapshot": { "brief": {...} } }
```

**响应**：
```json
{
  "ok": true,
  "requestId": "uuid",
  "analysis": { "compositionAnalysis": {...}, "lensAnalysis": {...}, ... },
  "provider": "vision-agent | photoatelier-worker",
  "model": "..."
}
```

**环境变量**：`AGENT_VISION_ENDPOINT`, `AGENT_VISION_API_KEY`

### `POST /api/v1/creative-directions/generate`

**请求**：
```json
{ "visualDNA": {...}, "brief": {...} }
```

**响应**：
```json
{
  "ok": true,
  "requestId": "uuid",
  "directions": [{ "title": "...", "keywords": [...], ... }, ...],
  "provider": "..."
}
```

### `POST /api/v1/shots/design`

**请求**：
```json
{
  "visualDNA": {...},
  "creativeDirection": {...},
  "brief": {...},
  "equipment": [...],
  "shootingScale": "simple | standard | comprehensive"
}
```

**响应**：
```json
{
  "ok": true,
  "requestId": "uuid",
  "shots": [{ "sequence": 1, "emotion": "...", "referenceAssetId": "...", ... }],
  "provider": "..."
}
```

---

## 六、PDF 执行稿新结构

**删除**：方案目录、大段创意说明、主视觉描述、定场/试装/现场准备/电池设备提醒

**Page 1 — Shot List 总览**：

| # | 画面 | 场景 | 景别 | 焦段 | 情绪 | 参考图 |
|---|------|------|------|------|------|--------|
| 1 | 环境人像 | 白墙空间 | 远景 | 35mm | 清冷 | Ref01 |

**逐 Shot 详情页** — 每个 Shot 固定格式：

```
Shot 01 · 环境人像                    [必拍]

┌─────────────┐  学习重点
│   参考图     │  人物比例、留白关系、冷色氛围
└─────────────┘

景别: 远景        焦段: 35mm        机位: 平视
动作: 环境建立     构图: 全景构图     光线: 自然光
情绪: 克制、安静   预计: 15分钟      备选: -
```

---

## 七、降级策略

| 组件 | 有外部服务 | 无外部服务（降级） |
|------|-----------|-----------------|
| VisualDNA | `AGENT_VISION_ENDPOINT` → 调 Vision Agent | `deterministicVisualDNA()` — 基于参考图 tags + brief 风格规则推断 |
| CreativeDirection | `planningGateway.generateCreativeDirections()` | `deterministicCreativeDirections()` — 基于 VisualDNA 五维分析生成 3 个方向 |
| Shot Design | `planningGateway.designShots()` | `deterministicShotDesign()` — 基于 VisualDNA + CreativeDirection 生成模板化镜头 |

Worker 端点降级逻辑相同：检测环境变量 → 有则调外部 → 无则走确定性函数。

---

## 八、环境变量清单

| 变量 | 用途 | 必需 |
|------|------|------|
| `AGENT_VISION_ENDPOINT` | Vision Agent API 地址 | 否（无则降级） |
| `AGENT_VISION_API_KEY` | Vision Agent 鉴权 | 否 |
| `AGENT_ENDPOINT_V5` | 外部 Planning Agent（创意方向 + 镜头设计） | 否（已有，降级已有） |
| `AGENT_API_KEY` | Planning Agent 鉴权 | 否（已有） |

---

## 九、已知限制与待办

### 已完成（P0）

- [x] 三步生成链路拆分
- [x] 参考图提前至方案生成前
- [x] VisualDNA 五维分析
- [x] 创意方向候选 + 用户选择
- [x] Shot List 动态数量
- [x] Shot 绑定参考图 + emotion/learningFocus
- [x] PDF 执行稿重构
- [x] Worker 三端点 + 确定性降级
- [x] 合同 schema v3.0
- [x] 33/33 测试通过

### 待完成（P1）

- [ ] Agent 拆分上线（独立 Vision Agent 部署）
- [ ] 历史案例学习（从已执行方案中提取 VisualDNA 模式）
- [ ] 风格数据库（积累 VisualDNA 模式形成可检索库）
- [ ] UI 适配：新建项目流程改为「先上传参考图」
- [ ] UI 适配：创意方向选择界面
- [ ] UI 适配：shootingScale 选择器
- [ ] E2E 浏览器测试覆盖新流程

### 待完成（P2）

- [ ] 妆造 Agent
- [ ] 天气 Agent
- [ ] 场地 Agent
- [ ] 器材 Agent

---

## 十、前端对接要点

### 项目创建流程变更

```
旧: 创建方案 → 选择类型 → 选择风格 → 生成方案 → 添加参考图
新: 创建项目 → 上传参考图 → AI 分析 → 生成创意方向 → 选择方向 → 生成 Shot
```

前端需要新增三个 API 调用阶段，对应三个 Worker 端点。

### application 暴露的新服务

```javascript
app.visualAnalysis.analyze({ projectId })
app.creativeDirection.generateDirections({ projectId, visualDNAId })
app.creativeDirection.selectDirection({ id, projectId })
app.shotDesign.designShots({ projectId, creativeDirectionId, visualDNAId, shootingScale })
```

### Brief 新字段

```javascript
brief.shootingScale  // 'simple' | 'standard' | 'comprehensive'
```

### PlanningContext 新字段

```javascript
snapshot.visualDNAId    // string | null
snapshot.shootingScale  // 'simple' | 'standard' | 'comprehensive'
```

### Query 新接口

```javascript
queries.visualAnalysisWorkspace.get(projectId)
// → { references, assets, visualDNAs, latestVisualDNA }

queries.planningWorkspace.get(projectId)
// → { ...原有字段, visualDNAs, creativeDirections }
```
