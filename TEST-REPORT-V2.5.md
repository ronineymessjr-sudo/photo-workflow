# PhotoAtelier V2.5 测试报告

## 环境

- Node.js：22.16.0
- npm：使用项目 lockfile
- 版本：`2.5.0-domain-implementation`

## 发布门禁

执行：

```bash
npm ci
npm run test:release
npm audit --audit-level=high
```

最近一次开发目录结果：

- JavaScript 语法检查：通过；
- Node／集成测试：68 / 68 通过；
- 静态 Smoke：通过；
- V2 构建：通过；
- `dist-v2` 检查：通过；
- `dist-reference-addon` 检查：通过；
- `dist-classic-addon` 检查：通过；
- 公开文件安全扫描：通过；
- npm audit：0 个已知漏洞；
- 正式应用壳：约 426 KiB，低于 2 MiB 预算。

## V5 覆盖范围

自动测试覆盖：

- Schema、稳定 ID 和并发版本冲突；
- 设备型号目录幂等导入和个人设备分离；
- 场地／模特跨项目复用；
- 真实参考素材去重和关系；
- Pexels／Obsidian／飞书来源 DTO；
- PlanningContextSnapshot 和哈希；
- 不可用设备和不完整 Brief 拦截；
- GenerationRun、批准幂等和 PlanRevision；
- AI 输出越界引用拦截；
- ExpectedLook 和 synthetic 资产规则；
- 日历冲突和参与者查询；
- 预计收入、已收和支出分离；
- 开拍就绪、镜头记录和后期创建；
- 双备份和后期状态机；
- 模特／助理 SharePacket 隐私、版本、撤销和过期；
- 跨实体失败回滚和 DomainEvent；
- Schema v5 Dry Run、Commit、幂等和回滚；
- 旧参考素材去重和旧 Agent 审计迁移；
- Worker V5 文字降级方案和图像未配置错误；
- 真实数据目录数量与文件存在性。

## 浏览器 E2E

执行：

```bash
npm run test:e2e
```

依赖安装后，Chromium 能启动，但访问：

```text
http://127.0.0.1:8123/
```

返回：

```text
net::ERR_BLOCKED_BY_ADMINISTRATOR
```

结论：当前沙箱管理员策略阻止浏览器访问本地地址，因此浏览器 E2E **未通过也未完成**。服务器和非浏览器测试正常，仍必须在普通开发机或 GitHub Actions 中复跑。

## 最终 ZIP 复现

最终交接 ZIP 生成后，应在全新目录执行：

```bash
npm ci
npm run test:release
```

最终打包过程会把复现结果和 ZIP SHA-256 写入交接摘要。

## 干净解压复现结果

候选交接包已在全新目录完成 `npm ci && npm run test:release`：68 / 68 通过，三类发布包和安全扫描均通过。详见 `CLEAN-REPRODUCIBILITY-REPORT-V2.5.md`。
