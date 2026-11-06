# 当前正式站与 Sites 同步

主站： https://photo.ronineymessjrstudio.cn/（2026-10-26 起为正式域名；Pages 默认域 photo-workflow.pages.dev 仍可用）

Sites： https://photoatelier-workspace.lilacglobe7.chatgpt.site/

Sites 保留同一份 `index.html` 和所有 `assets/` 界面文件，只把默认 API 地址适配为同源转发。后端仍是 `photoatelier-api`，账号、权限和既有云端数据共用。

新增的 `/api/workspace/state` 使用现有登录签名，并按账号隔离 Durable Object。它同步原本只在浏览器保存的方案缓存、设备、场地、模特、模板、日程、待办、分镜和分镜图片数据。仅存为电脑文件路径的素材不会自动变成云端文件。公开入口只显示登录页；`/api/auth/session` 验证通过后才显示工作台。角色选择不改变账号身份。账号令牌、Pexels 密钥和连接设置不上传。

切换账号时，将当前账号业务缓存保存到 IndexedDB 后再加载另一账号缓存；退出清空工作区视图。旧资料没有明确账号归属时隔离保留，不自动分配给第一个登录者。导入、导出和清空仅操作当前账号业务数据，不包含会话。另一个标签页改变账号时当前页自动关闭旧视图并重新验证。仅本机显式 `?offline=1` 开启开发离线模式，云端不允许游客或本地假登录。

两边登录同一账号后，页面在没有编辑输入时每 15 秒同步，重新聚焦时也会检查。同一记录发生并发修改时停止同步并保留双方原数据；单次工作区上限 16 MiB，超出拒绝写入。首次建议在保存原始资料的一边先登录并完成同步。

代码跟随发布由此次 Sites 聊天负责，每 15 分钟检查原仓库已提交版本，校验后发布 Sites。它不会自动发布未提交草稿。Sites 仓库凭证每次由工具获取短期凭证，不写入源码或 GitHub Secrets。

验证：`node --test tests/workspace-sync.test.mjs tests/web-discovery.test.mjs tests/cloud-director-routes.test.mjs tests/director-integration.test.mjs tests/jev-review.test.mjs tests/plan-print-export.test.mjs`。

2026-10-25：增加显式游客体验入口。游客不创建用户或令牌，不标记会话已验证；业务缓存隔离在本机 `__guest__` 档案，刷新可恢复，切换账号不自动上传。只有公开的文字方案生成允许远程调用；账号工作区与协作仍须真实登录。此前“云端不允许游客”描述由本段替代，后台认证合同不变。游客体验不能作为跨站真实账号验收。
