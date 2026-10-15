# 当前正式站与 Sites 同步

主站： https://photo-workflow.pages.dev/

Sites： https://photoatelier-workspace.lilacglobe7.chatgpt.site/

Sites 保留同一份 `index.html` 和所有 `assets/` 界面文件，只把默认 API 地址适配为同源转发。后端仍是 `photoatelier-api`，账号、权限和既有云端数据共用。

新增的 `/api/workspace/state` 使用现有登录签名，并按账号隔离 Durable Object。它同步原本只在浏览器保存的方案缓存、设备、场地、模特、模板、日程、待办、分镜和分镜图片数据。仅存为电脑文件路径的素材不会自动变成云端文件。访客数据保持原有本地模式；登录后才会同步，账号令牌、Pexels 密钥和连接设置不上传。

两边登录同一账号后，页面在没有编辑输入时每 15 秒同步，重新聚焦时也会检查。同一记录发生并发修改时停止同步并保留双方原数据；单次工作区上限 16 MiB，超出拒绝写入。首次建议在保存原始资料的一边先登录并完成同步。

代码跟随发布由此次 Sites 聊天负责，每 15 分钟检查原仓库已提交版本，校验后发布 Sites。它不会自动发布未提交草稿。Sites 仓库凭证每次由工具获取短期凭证，不写入源码或 GitHub Secrets。

验证：`node --test tests/workspace-sync.test.mjs tests/web-discovery.test.mjs tests/cloud-director-routes.test.mjs tests/director-integration.test.mjs tests/jev-review.test.mjs tests/plan-print-export.test.mjs`。

真实登录仍依赖当前主开发任务正在修复的服务端数据库接入。不能用访客模式或本地模拟登录作为跨站真实账号验收。
