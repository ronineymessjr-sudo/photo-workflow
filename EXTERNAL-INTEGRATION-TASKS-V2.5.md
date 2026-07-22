# PhotoAtelier V2.5 外部集成与 Codex 验收任务

本文件只列出必须依赖真实账号、密钥、线上权限或正常浏览器环境的工作。执行模型不得用 Mock 成功响应代替真实验收。

## P0｜正常浏览器 E2E

执行：

```bash
npm ci
npm run test:release
npm run test:e2e
```

验收：

- 根路径可打开；
- 创建项目；
- V5 初始化不破坏旧数据；
- 现有 V2.3 主流程仍可完成；
- Console 无未处理异常；
- 移动端无横向溢出。

当前沙箱结果：Chromium 被管理员策略禁止访问 `127.0.0.1`，错误为 `ERR_BLOCKED_BY_ADMINISTRATOR`。这不是通过结果，也不是业务失败结论。

## P0｜飞书真实账号

### 当前情况

现有 Worker 继续同步八张兼容表。V5 新实体目前为本地真源，没有为每个新实体创建独立飞书表。

### 需要决定

优先建议：保持八表不变，把 V5 新实体以版本化 `payloadJson` 投影进现有表，而不是立即增加二十多张表。

### 验收项

- 真实 App ID、Secret、App Token 和 Table ID；
- 列表、upsert、删除墓碑；
- 冲突时本地／远端更新时间判断；
- 两个项目共享同一 ReferenceAsset 时不重复本体；
- SharePacket 不同步隐私之外的字段；
- 日历收入的预计、已收和支出不混淆；
- 网络错误有可重试状态，不造成半写入。

## P0｜文字 Agent Provider

配置：

- `AGENT_ENDPOINT_V5`
- 对应 API Key

必须用真实 PlanningContextSnapshot 测试：

- 只引用被选择的设备；
- 只引用被选择的参考 ID；
- 不能凭空声称用户拥有设备；
- 输出符合 V5 合同；
- 非法输出返回结构化验证错误；
- 超时、429、5xx 可理解地反馈；
- provider 失败后可以选择确定性降级方案；
- provider、model、promptVersion、traceId 和原始输出进入 GenerationRun。

质量验收应至少覆盖：人像、商业产品、活动婚礼三个真实摄影项目。

## P0｜预期成片图像 Provider

配置：

- `IMAGE_GENERATION_ENDPOINT`
- 对应 API Key

验收：

- 未勾选预期成片图时零 API 请求；
- 只传递必要的 Brief、参考和 ExpectedLook；
- 返回图片保存真实 provider 元数据；
- 所有图片强制 `synthetic=true`；
- 失败不影响文字方案；
- 429／超时／内容拒绝均有明确错误；
- 不把失败占位图保存为生成资产。

## P1｜Obsidian

真实 Vault 验收：

- 搜索使用 Bridge 实际合同；
- 读取图片附件与 Markdown 笔记；
- 笔记只进入知识来源，不伪装成图片；
- 重新链接 25 条缺失 Vault 图片；
- 写入复盘 Markdown；
- 路径转义、中文文件名和重复写入；
- Vault 不在线时本地工作流不受阻。

## P1｜Pexels

使用真实 API Key 验收：

- 搜索分页；
- 摄影师姓名和 Pexels 页面链接；
- 图片 URL 和授权归属；
- externalId 去重；
- 请求限额；
- 网络失败；
- 选中后再写入 ReferenceAsset，不批量污染素材库。

## P1｜页面迁移到 V5 Use Cases

这是代码集成，不是 UI 重设计。

原则：

- 页面只调用 `context.v5` 服务和查询模型；
- 不在页面里直接组织多实体写入；
- 不直接访问 V5 localStorage key；
- 保留当前页面视觉和 DOM，减少一次性风险；
- 每迁移一页补 E2E，再删除旧编排。

推荐顺序：

1. 资源选择；
2. 参考库；
3. 方案生成与批准；
4. 日历与收入；
5. 现场；
6. 后期；
7. 分享。

## P2｜明确延后

- 地图与日照服务；
- 模特脸型／身型分析 Agent；
- 高级 LUT 市场；
- CRM 合同、发票和支付；
- 最终 UI 重设计。
