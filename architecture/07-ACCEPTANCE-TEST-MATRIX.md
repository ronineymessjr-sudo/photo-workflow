# 07｜验收测试矩阵

## A. 资源库

1. 同一 EquipmentItem 可以分配给三个项目，资源本体只有一条。
2. 删除项目分配不会删除 EquipmentItem。
3. 内置型号不存在时允许 customName。
4. 方案默认只使用项目已分配且可用的设备。
5. 推荐未拥有设备时必须标记 externalRequirement。

## B. 参考库

1. 同一 URL 导入两次只产生一个 ReferenceAsset。
2. 同一 ReferenceAsset 可以关联多个项目。
3. 移除项目关系不删除参考资产。
4. ShotReferenceLink 删除不影响 ProjectReferenceLink。
5. synthetic 资产不能通过 real_photo 查询返回。

## C. Planning Context

1. Snapshot 只包含命令中选中的资源和参考。
2. Snapshot 保存 ID、显示字段和 contextHash。
3. 库数据后续修改不改变旧 Snapshot。
4. Worker 接收 Snapshot 后不再次猜测本地资源。
5. 缺少必要 Brief 时返回结构化错误。

## D. GenerationRun 与 Plan

1. 创建 Run 不产生正式 Plan 或 Shot。
2. 批准一次产生 Candidate PlanRevision 和 Shots。
3. 重复批准同一 Run 不重复写入。
4. 重生成创建新 Run，不修改旧 Run。
5. Confirm 后 Revision 不可原地编辑。
6. Worker 和本地 fallback 产生相同 planStatus 语义。

## E. 预期成片

1. enabled=false 不调用 ImageGenerationGateway。
2. enabled=true 可产生独立 ImageGenerationRun。
3. 图像失败时文字方案仍可批准。
4. GeneratedAsset.synthetic 必须为 true。
5. AI 图和真实参考在查询与导出中明确标记。
6. ExpectedLook 同时支持真实参考、AI 概念图、色彩和修图意图。

## F. 日程与收入

1. 只有 confirmed PlanRevision 可创建 Shoot Event。
2. 时间重叠冲突正确检测；首尾相接不冲突。
3. 模特和助理只看到分配给自己的事件。
4. 今日/本周/本月分别汇总 expected、received、expense。
5. 预计收入不会自动变为已收。
6. 取消事件不删除历史 FinancialEntry。

## G. 现场与后期

1. 未确认授权时不能开始涉及该模特的拍摄。
2. 必拍镜头未完成时给出明确阻塞或人工覆盖流程。
3. Shoot completed 后创建唯一 PostProductionJob。
4. PostProductionJob 复制 ExpectedLook 快照。
5. 后期状态变化不修改 PlanRevision。
6. 交付完成记录 deliveredAt 和版本。

## H. 角色包

1. Model Packet 只来自 confirmed Revision。
2. 不包含其他成员联系方式、内部费用、摄影师私密备注。
3. 只包含与该模特有关的镜头或目标。
4. Assistant Packet 包含设备和执行任务。
5. 方案更新后旧 Packet 不自动变化；必须发布新版本。
6. revoked Packet 无法继续读取。

## I. 迁移

1. V2.3 Equipment 迁为资源本体+项目关系。
2. V2.3 Reference 去重后保留项目关系。
3. shoot-call 转 CalendarEvent，checklist 仍是 Task。
4. Plan 后期字段转 PostProductionJob。
5. Agent 元数据转 GenerationRun。
6. Dry Run 不写数据。
7. 重复 Commit 幂等。
8. 任意阶段失败自动回滚。
9. 所有旧 ID 可通过 legacyId 查询。

## J. 回归门禁

每个任务至少运行：

```bash
npm run test:syntax
npm run test:node
```

集成分支运行：

```bash
npm run test:release
npm run test:e2e
```

浏览器 E2E 至少覆盖：

```text
创建项目
→ 选择设备/场地/模特
→ 选择真实参考
→ 可选生成预期成片
→ 生成并批准方案
→ 确认方案
→ 创建日程和预计收入
→ 生成模特/助理包
→ 完成拍摄
→ 进入后期
```
