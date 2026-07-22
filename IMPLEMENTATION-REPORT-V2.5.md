# PhotoAtelier V2.5 完整实现报告

## 执行目标

本轮依据 V2.4 架构蓝图实现业务内核，不推翻现有项目，不重做最终 UI。目标是建立一套能被 GPT 维护架构、并可由 Codex、GLM、Kimi 或 MiniMax 分模块继续实现的稳定合同。

## 1. 架构落实

### 1.1 统一领域实体

新增 Schema v5 实体：

- `ProjectBrief`
- `EquipmentModel`
- `EquipmentItem`
- `Venue`
- `TalentProfile`
- `ProjectResourceAssignment`
- `PlanTemplate`
- `ReferenceAsset`
- `ProjectReferenceLink`
- `ShotReferenceLink`
- `PlanningContextSnapshot`
- `GenerationRun`
- `PlanRevision`
- `ExpectedLook`
- `ImageGenerationRun`
- `GeneratedAsset`
- `CalendarEvent`
- `FinancialEntry`
- `ParticipantAssignment`
- `PostProductionJob`
- `LUTPreset`
- `SharePacket`
- `DomainEvent`

所有新实体包含稳定 ID、Schema 版本、时间戳和 `recordVersion`。

### 1.2 跨实体一致性

`CommandExecutor` 会在关键命令前保存相关实体快照；命令中途失败时恢复快照。成功操作写入 `DomainEvent`。

事务边界覆盖：

- 批准 GenerationRun
- 确认 PlanRevision
- 创建 CalendarEvent
- 结束现场拍摄并创建后期任务
- 推进后期阶段
- 发布／撤销分享包

这不是数据库级 ACID，但对当前 localStorage／内存仓库提供了明确、可测试的原子操作语义。

## 2. 资源库

### 2.1 设备目录和个人设备分离

内置 62 个真实主流型号，覆盖相机、镜头、灯光、稳定、音频和配件。目录记录型号、品牌、别名和官方来源；用户是否拥有、常租或借用由 `EquipmentItem` 单独保存。

因此：

- 搜索目录不会产生虚假“已拥有设备”。
- 同一型号可被多个个人设备记录引用。
- 项目通过 `ProjectResourceAssignment` 选择资源。
- 自定义设备仍受支持。

### 2.2 场地和模特

场地、模特为全局可复用资源。项目删除关系时不删除资源本体。地图和脸型／身型分析 Agent 明确延后。

## 3. 参考库和真实数据

### 3.1 全局素材模型

一张素材只创建一个 `ReferenceAsset`。项目和镜头分别通过关系实体选用，避免不同项目重复复制。

素材类型区分：

- 真实图片：`synthetic=false`
- AI 生成图片：`synthetic=true`
- 知识来源／笔记：作为来源描述，不伪装成图片
- 丢失本地图片：标记为待重新链接

### 3.2 包内真实数据

项目内实际包含：

- 12 张可加载参考图片文件；
- 文件 SHA-256、尺寸、来源和归属说明；
- 237 条知识／检索来源；
- 25 条原 Obsidian Vault 图片路径，但图片本体不在交接包中，因此标为 `relinkRequired`。

这些数据放在可选 `dist-reference-addon`，避免拖慢正式应用壳。

### 3.3 来源适配器

实现 Pexels、Obsidian、飞书统一 DTO。笔记不能直接作为照片摄入；只有明确的图片记录才能进入 `ReferenceAsset`。

## 4. 方案生成

### 4.1 PlanningContextSnapshot

方案生成前冻结：

- Brief
- PlanTemplate
- 已选且可用的设备
- 场地
- 模特
- 真实参考素材
- 既有复盘
- 约束
- 预期成片要求

快照使用稳定序列化生成 `contextHash`。以后资源库变化不会改写历史方案依据。

### 4.2 GenerationRun 与 PlanRevision

生成流程：

```text
PlanningContextSnapshot
→ GenerationRun
→ 输出合同校验
→ 人工批准
→ Plan
→ PlanRevision
→ Shots
```

输出如果引用未选择的设备或参考素材，会被拒绝，除非明确标记为外部需求。

批准操作幂等，并保留 provider、model、promptVersion、原始输出和来源追踪。

### 4.3 预期成片

文字预期效果保存在 `ExpectedLook`；图片生成过程保存为 `ImageGenerationRun`。任何生成图片都必须进入 `GeneratedAsset`，且强制 `synthetic=true`。

图像生成失败不会回滚已经批准的文字方案。

## 5. 日程、收入和现场

### 5.1 数据拆分

- `CalendarEvent`：时间、地点、参与者和关联方案。
- `Task`：准备与执行待办。
- `FinancialEntry`：预计收入、已收收入和支出。

系统不会把预计收入自动算作已收。

### 5.2 查询

支持：

- 时间冲突检测；
- 参与者日历；
- 日／周／月区间；
- 时区感知的收入汇总。

### 5.3 现场和后期衔接

开始拍摄前检查：

- 方案版本已确认；
- 必需设备可用；
- 模特授权满足要求；
- 存在必拍镜头。

现场完成后幂等创建唯一 `PostProductionJob`。

## 6. 后期

后期状态机独立于 Plan：

```text
not_started
→ ingesting
→ backed_up
→ selecting
→ editing
→ awaiting_feedback
→ delivered
```

关键能力：

- 双备份路径验证；
- 原素材路径；
- 精选数量；
- 修图版本；
- 客户反馈；
- 交付引用；
- LUTPreset；
- 确认方案的 ExpectedLook 快照。

## 7. 模特和助理分享

`SharePacket` 不是完整方案副本，而是按角色投影的最小信息集合。

支持：

- 草稿、发布、撤销和过期；
- 版本号；
- 模特只看自己和共享镜头；
- 助理只看设备、执行、时间地点和风险相关内容；
- 撤销或过期后读取失败；
- 内部联系方式、费用、其他模特边界和内部风险不会泄漏给无关角色。

## 8. 迁移

Schema v5 迁移支持：

- Dry Run；
- Commit；
- 重复执行幂等；
- 迁移报告；
- 失败回滚；
- 旧 ID 保留；
- 旧参考素材跨项目去重；
- 旧 Agent provider、model 和原始输出进入 `GenerationRun`；
- V2.3 数据继续可读。

## 9. Worker 合同

新增：

```text
POST /api/v1/agent/plans/draft-v5
POST /api/v1/images/expected-look
```

文字方案：

- 外部 provider 已配置时调用 provider；
- 未配置时基于真实 Context Snapshot 生成确定性降级方案；
- 降级输出仍包含真实设备和参考 ID 追踪。

图像生成：

- Provider 未配置时返回 `503 IMAGE_PROVIDER_NOT_CONFIGURED`；
- 绝不返回占位图冒充生成结果。

## 10. 构建和发布

为了兼顾弱网和真实素材，发布拆为：

- `dist-v2`：约 426 KiB 应用壳；
- `dist-reference-addon`：约 1.8 MiB 真实参考数据；
- `dist-classic-addon`：约 18 MiB 历史 Classic 与大型资产。

## 11. 尚未完成的部分

以下不应被描述为已完成：

1. 当前所有页面完全迁移到 V5 Use Cases。
2. 最终摄影师优先 UI／UX。
3. V5 新实体的真实飞书表结构同步。
4. 真实外部文字模型和图像模型质量验收。
5. 真实 Pexels、Obsidian、飞书账号与权限验收。
6. 当前沙箱外的完整浏览器 E2E。
7. 场地地图、模特视觉分析 Agent 和高级 LUT 市场。

这些任务需要真实账号、浏览器环境或 Product Design 阶段，不应使用虚假数据“模拟完成”。
