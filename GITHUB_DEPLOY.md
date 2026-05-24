# GitHub Actions 自动部署指南

配置完成后，每次推送代码到 `main` 分支，后端会自动部署到 Cloudflare Workers。

---

## 配置步骤

### 1. 创建 GitHub 仓库

```bash
cd C:\Users\user\Documents\trae-soio\photo-workflow
git init
git add .
git commit -m "Initial commit"
git branch -M main

# 在 GitHub 创建仓库后执行
git remote add origin https://github.com/你的用户名/photoatelier.git
git push -u origin main
```

### 2. 获取 Cloudflare API Token

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击右上角头像 → **My Profile**
3. 选择 **API Tokens** 标签
4. 点击 **Create Token**
5. 选择 **Edit Cloudflare Workers** 模板
6. 配置权限：
   - **Account**: 你的账户
   - **Zone**: 你的域名（如果没有可跳过）
7. 点击 **Continue to summary** → **Create Token**
8. **复制 Token**（只显示一次）

### 3. 设置 GitHub Secrets

在 GitHub 仓库页面：

1. 点击 **Settings** 标签
2. 左侧菜单选择 **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下 Secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `CLOUDFLARE_API_TOKEN` | 第2步复制的 Token | Cloudflare API 访问令牌 |
| `JWT_SECRET` | `photoatelier-jwt-secret-2025` | JWT 签名密钥 |
| `SUPABASE_URL` | `woywgfoqurumrkyoznnb.supabase.co` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Supabase Anon Key |
| `MINIMAX_API_KEY` | （可选）你的 MiniMax Key | AI 生成服务 |

> **注意**: SUPABASE_ANON_KEY 的完整值从 `api/index.js` 第7行复制

### 4. 触发部署

```bash
# 推送任意更改到 main 分支
git add .
git commit -m "Setup auto deploy"
git push origin main
```

---

## 查看部署状态

1. 打开 GitHub 仓库页面
2. 点击 **Actions** 标签
3. 查看工作流运行状态

---

## 常见问题

### 部署失败：权限不足

**解决**: 检查 Cloudflare API Token 是否有 **Cloudflare Workers** 编辑权限

### 密钥未生效

**解决**: 在 GitHub Secrets 中检查密钥值是否正确，注意不能有多余空格

### Worker 地址是什么

部署成功后，Worker 地址为：
```
https://photoatelier-api.你的账户名.workers.dev
```

或在 Cloudflare Dashboard → Workers & Pages 中查看

---

## 更新前端 API 地址

部署成功后，修改 `index.html` 中的 API 地址：

```javascript
const API_BASE_URL = 'https://photoatelier-api.你的账户名.workers.dev';
```

然后推送前端代码到 GitHub Pages 或 Cloudflare Pages。
