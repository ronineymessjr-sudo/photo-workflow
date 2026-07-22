# PhotoAtelier V2.5 干净复现报告

## 验证方法

1. 从当前源码生成不包含 `node_modules`、密钥和缓存的候选 ZIP。
2. 使用 `unzip -t` 检查压缩结构。
3. 解压到全新的空目录。
4. 在解压目录执行：

```bash
npm ci
npm run test:release
```

## 验证结果

- ZIP 结构检查：通过；
- `npm ci`：通过；
- npm audit：0 个已知漏洞；
- 语法检查：通过；
- Node／集成测试：68 / 68 通过；
- 静态 Smoke：通过；
- 三类发布包重新构建：通过；
- 正式应用壳：425.8 KiB；
- 发布包检查：通过；
- 公开文件安全扫描：通过。

## 浏览器边界

候选包在当前沙箱运行 `npm run test:e2e` 时，Chromium 被管理员策略禁止访问 `http://127.0.0.1:8123/`，错误为 `ERR_BLOCKED_BY_ADMINISTRATOR`。因此浏览器 E2E 没有被列为通过。

## 跨平台文件名

原始历史 Obsidian 导出包含 40 个非 UTF-8 文件名。为保证交接包可跨平台解压：

- 文件内容按原始字节复制到 `context/obsidian-portable/files/`；
- `manifest.json` 记录原路径字节、SHA-256 和便携文件名；
- 不可表示的原始路径不进入 ZIP；
- V2.5 运行时和真实参考数据不依赖该历史目录。
