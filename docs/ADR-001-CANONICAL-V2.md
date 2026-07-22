# ADR-001：模块化 V2 是唯一正式运行版本

- 状态：Accepted
- 日期：2026-07-14
- 适用版本：V2.3 Iterative Handoff

## 背景

仓库此前同时存在根目录模块化 V2 和 `legacy/index.html` Classic 工作台。旧入口逻辑默认跳转到 Classic，文档、部署和测试也混合描述两套运行时，容易导致后续开发在错误位置继续扩展。

## 决策

1. 根目录 `index.html` 是唯一正式入口。
2. `legacy/` 仅用于历史功能对照和回归，不再添加新业务逻辑。
3. 正式领域模型由 `src/core/schema.js` 定义。
4. 页面不得直接读写业务 localStorage；统一经 `StorageRepository` 和 `DataService`。
5. 正式远端为 `worker/`：Cloudflare Worker → 飞书八表。
6. `legacy/cloud-api/` 的 Supabase/JWT Worker 已废弃，不进入 CI/CD。
7. 新功能必须首先进入模块化 V2，并添加 Node 或浏览器测试。
8. 正式部署包为轻量 `dist-v2/`；Classic 与大型素材进入独立 `dist-classic-addon/`。
9. 内部 Call Sheet 与外部脱敏角色包必须分开。

## 状态模型

方案状态、执行状态和交付状态分离：

- `planStatus`: draft / candidate / confirmed / archived / cancelled
- `executionStatus`: unscheduled / scheduled / preparing / shooting / completed / cancelled
- `deliveryStatus`: not_started / backed_up / selecting / editing / awaiting_feedback / delivered

界面阶段由三组状态推导，不再使用一个字段承担全部生命周期。

## 后果

- V2 可以独立演进和部署。
- Classic 仍保留以便核对尚未迁移的高级能力。
- 在功能完全等价前，不删除 Classic 文件。
- 任何回到 Classic DOM 或 `pw_*` 直接写入的新增实现都视为架构回退。
