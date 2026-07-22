# ToolDesk 接手说明

**请先只阅读 [`00-TOOLDESK-START-HERE.md`](00-TOOLDESK-START-HERE.md) 和 [`AGENTS.md`](AGENTS.md)。** 已验证基线无需导入后立即重复全量测试；按模块使用 `npm run test:scope -- <scope>`。

---

# PhotoAtelier V2.5 Domain Implementation

PhotoAtelier 是一个免登录、本地优先、以摄影师工作流为核心的摄影生产工作台。

V2.5 的重点不是重新设计 UI，而是把 V2.4 架构蓝图落实为可测试的领域层、Repository、迁移、真实资源目录和外部服务合同。现有 V2.3 页面继续作为兼容界面，后续可以在不重写业务逻辑的情况下重新设计。

## 摄影师业务主线

```text
项目 Brief
→ 选择方案模板
→ 选择设备／场地／模特
→ 选择真实参考素材
→ 冻结 PlanningContextSnapshot
→ GenerationRun 生成草稿
→ 人工批准为 PlanRevision
→ 确认方案
→ 创建 CalendarEvent 与收入记录
→ 现场执行 Shots
→ 自动创建 PostProductionJob
→ 后期、交付、复盘
→ 生成模特／助理最小信息 SharePacket
```

## V2.5 已实现

- Schema v5、稳定 ID、记录版本和领域错误合同。
- 可回滚跨实体命令执行器与 DomainEvent 审计。
- 资源库：62 个真实主流设备型号、个人设备、场地、模特及项目关系。
- 方案模板：人像、商业产品、活动婚礼、个人品牌四类专业模板。
- 全局参考素材与项目／镜头关系，不再复制素材本体。
- 12 张包内真实可加载参考图、237 条知识来源、25 条待重新链接记录。
- PlanningContextSnapshot、GenerationRun、PlanRevision、ExpectedLook。
- 真实参考图与 AI 合成图严格分离，AI 图永久标记 `synthetic=true`。
- CalendarEvent、Task、FinancialEntry 分离，并支持冲突和日／周／月收益查询。
- 现场执行、双备份、后期状态机、LUTPreset、交付记录。
- 模特／助理版本化、可撤销、最小信息分享包。
- Schema v5 Dry Run、幂等迁移、回滚与旧 Agent 审计数据迁移。
- Worker V5 方案接口；无外部模型时使用真实快照生成确定性降级方案。
- 图像生成未配置时明确失败，不返回虚假图片。

## 真实数据原则

内置型号目录表示“可选择的真实型号”，**不代表用户拥有这些设备**。

项目包不会自动创建虚构的模特、场地、订单、预约、收入或客户。个人业务数据只能由用户添加，或从飞书／Obsidian 等真实来源迁入。

## 运行

```bash
npm ci
npm run start
```

打开：`http://127.0.0.1:8123/legacy/`

`npm run start` 会同时启动工作台和 Obsidian 本地代理。日常使用可直接双击 `Start-PhotoAtelier.cmd`；不要再单独运行 `python -m http.server`，否则本地图库检索没有代理可用。

## 测试

```bash
npm run test:release
npm run test:e2e
```

- `test:release`：语法、Node／集成、Smoke、构建、发布包、安全扫描。
- `test:e2e`：真实浏览器流程，需要本机 Chrome／Chromium 能访问本地服务器。

## 构建产物

```bash
npm run build:v2
```

生成：

- `dist-v2/`：正式轻量应用壳，约 426 KiB。
- `dist-reference-addon/`：12 张真实参考图和来源目录，约 1.8 MiB。
- `dist-classic-addon/`：Classic、大型 LUT 和历史素材，可选包，约 18 MiB。

正式部署可以只发布 `dist-v2/`。需要包内参考素材时，把 `dist-reference-addon/` 覆盖到同一静态根目录。

## 重要边界

- V2.5 领域能力已经实现并暴露给应用，但现有所有页面尚未全部改为调用 V5 Use Cases。
- UI 重设计明确延后，不能把当前兼容页面当作最终产品设计。
- 飞书 V5 新实体远端表结构、真实 AI 模型、图像生成、Pexels／Obsidian／飞书账号权限仍需线上验收。

## 交接入口

- [V2.5 实现入口](START-HERE-V2.5-IMPLEMENTATION.md)
- [完整实现报告](IMPLEMENTATION-REPORT-V2.5.md)
- [外部集成任务](EXTERNAL-INTEGRATION-TASKS-V2.5.md)
- [测试报告](TEST-REPORT-V2.5.md)
- [变更记录](CHANGELOG-V2.5-DOMAIN.md)
- [V2.4 架构蓝图](START-HERE-ARCHITECTURE-V2.4.md)
