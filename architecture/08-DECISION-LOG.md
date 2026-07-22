# 08｜架构决策记录

## ADR-002｜保留现有产品，做兼容式领域重构

状态：Accepted

不写新 PRD，不推翻 V2.3。通过 Feature Flag 和 Use Case 逐步替换页面内业务编排。

## ADR-003｜摄影师是完整业务拥有者

状态：Accepted

模特和助理是同一项目的受限投影。完整方案默认不发送给模特和助理。

## ADR-004｜资源本体与项目分配分离

状态：Accepted

设备、场地和模特必须跨项目复用。项目只保存 Assignment。

## ADR-005｜真实参考资产与关系分离

状态：Accepted

ReferenceAsset 是全局本体；ProjectReferenceLink 和 ShotReferenceLink 表达用途。

## ADR-006｜GenerationRun 与 Plan 分离

状态：Accepted

Agent 运行不是正式方案。批准后才创建 Candidate PlanRevision。

## ADR-007｜确认方案版本不可变

状态：Accepted

已确认版本修改必须产生新 Revision，保证已发送通告和历史拍摄可追溯。

## ADR-008｜AI 概念图是 Synthetic Asset

状态：Accepted

AI 图不能作为真实摄影案例或默认实拍参考。必须保存 provider、model、prompt 和 synthetic 标记。

## ADR-009｜CalendarEvent、Task、FinancialEntry 分离

状态：Accepted

日程、待办和金额具有不同生命周期，不再共用 Tasks。

## ADR-010｜后期从 Plan 中拆出

状态：Accepted

Plan 描述拍什么；PostProductionJob 描述拍完后如何处理和交付。

## ADR-011｜总看板最后开发

状态：Accepted

总看板只读取现有模块，不允许产生新的独立业务状态。

## ADR-012｜第一阶段不重做 UI

状态：Accepted

先稳定领域、用例、适配器和测试。Product Design 在业务合同稳定后再进行。

## ADR-013｜不立即强制 TypeScript 或框架重写

状态：Accepted

使用 ESM JavaScript、JSDoc 和 JSON Schema降低迁移风险。TypeScript 可在领域层稳定后渐进引入。

## ADR-014｜模特视觉分析属于未来受控扩展

状态：Accepted

当前仅预留 consent/status/summary 字段。不实现吸引力评分、身体价值判断或无授权分析。
