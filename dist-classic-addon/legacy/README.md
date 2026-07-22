# Classic Workbench（历史对照）

`legacy/index.html` 保存改造前已验证的完整工作台，用于功能核对和回归。

- 不再作为默认入口。
- 不继续添加新业务逻辑。
- 新功能和修复优先进入根目录模块化 V2。
- `cloud-api/` 是已废弃的 Supabase/JWT Worker，仅供历史阅读，不进入公开构建或 CI 部署。
