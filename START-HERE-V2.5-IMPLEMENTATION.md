# START HERE｜PhotoAtelier V2.5 Domain Implementation

## 1. 本包是什么

本包是在 V2.3 稳定基线与 V2.4 架构蓝图上完成的 **领域实现版**。

它没有推翻现有产品，也没有重做 UI。它把方案、参考、资源、日程、后期、分享和迁移落实成了可独立测试的 V5 领域层，为后续 Product Design 重做前端提供稳定业务接口。

当前版本：`2.5.0-domain-implementation`

## 2. 先执行

```bash
npm ci
npm run test:release
npm run test:e2e
```

`test:release` 应通过。`test:e2e` 需要正常 Chrome／Chromium 环境；若出现本地地址被管理员策略禁止，先在 GitHub Actions 或普通开发机复跑，不要修改业务代码来规避浏览器策略。

## 3. 先阅读

1. `IMPLEMENTATION-REPORT-V2.5.md`
2. `EXTERNAL-INTEGRATION-TASKS-V2.5.md`
3. `TEST-REPORT-V2.5.md`
4. `architecture/01-TARGET-ARCHITECTURE.md`
5. `architecture/02-DOMAIN-MODEL.md`
6. `architecture/07-ACCEPTANCE-TEST-MATRIX.md`

## 4. 主要代码位置

```text
src/v5/
├── common/          错误、实体、稳定序列化、事务执行器
├── contracts/       输入／输出合同验证
├── repositories/    V5 Repository 适配器
├── catalog/         设备、场地、模特和模板目录
├── references/      全局参考素材、关系和来源适配
├── planning/        快照、生成运行、方案版本、预期成片
├── schedule/        日历、冲突和财务
├── onset/           开拍检查与现场记录
├── post/            后期状态机、备份、LUT、交付
├── sharing/         模特和助理分享投影
├── queries/         工作台查询模型
├── migration/       Schema v5 迁移／回滚
└── application.js   应用组装与事务边界
```

Worker 新合同位于：

```text
worker/src/index.js
POST /api/v1/agent/plans/draft-v5
POST /api/v1/images/expected-look
```

## 5. 已完成与未完成

### 已完成

- V2.4 T00–T09 的本地领域与迁移实现。
- T10 的应用组装、兼容初始化、查询服务和 Worker 合同。
- 真实目录和真实参考数据包。
- 自动测试、构建拆包和安全扫描。

### 部分完成

- T10 的页面迁移：V5 已在 `src/app.js` 初始化并作为 `context.v5` 暴露，但现有页面仍有大量 V2.3 DataService 调用。

### 留给外部环境

- 真实飞书 V5 表结构和账号同步验收。
- 真实文字／图像模型质量和错误重试验收。
- 真实 Obsidian、Pexels 和飞书数据权限验收。
- 正常浏览器环境中的完整 E2E。
- 最终 UI／UX 设计和页面迁移。

## 6. 禁止事项

- 不要重新定义领域字段。
- 不要把 AI 图当作真实参考图。
- 不要把型号目录批量标记为用户拥有。
- 不要把 CalendarEvent、Task、FinancialEntry 再合并。
- 不要让模特／助理 SharePacket 读取完整内部方案。
- 不要在页面里重新编排跨实体写入；调用 V5 Use Cases。
- 不要为了临时 UI 方便绕过 Repository。

## 7. Codex 下一步建议

1. 在正常 Chrome 环境跑 `npm run test:e2e`。
2. 根据 `EXTERNAL-INTEGRATION-TASKS-V2.5.md` 验证真实服务。
3. 为现有页面建立 V5 Presenter／ViewModel，逐页消除直接 DataService 编排。
4. 所有 UI 页面完成 V5 接入后，再开始 Product Design 视觉重构。
