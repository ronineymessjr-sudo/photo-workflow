# GitHub Actions 部署

工作流：`.github/workflows/deploy.yml`

## 执行顺序

1. `npm ci`
2. Node 与 Smoke 测试
3. 构建 `dist-v2`
4. 模块化 V2 浏览器主流程
5. 上传构建 Artifact
6. 主分支分别部署 Pages 和 Worker
7. 可选 Worker 健康检查

## GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Worker 业务 Secret 推荐直接使用 Wrangler 配置到 Cloudflare，不要复制到普通仓库变量。

## GitHub Variable

- `PHOTOATELIER_WORKER_URL`：可选，用于部署后的 `/api/health` 检查。

## 注意

- Pull Request 只运行质量门禁，不部署。
- 工作流不再部署 `legacy/cloud-api/`。
- 若浏览器可执行文件路径变化，设置 `CHROME_PATH`。
