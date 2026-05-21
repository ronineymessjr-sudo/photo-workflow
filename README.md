# PhotoAtelier - 摄影方案智能工作流

> 一个为摄影师打造的智能拍摄方案生成与管理工作流平台。基于 AI 生成个性化拍摄方案，支持模特特征分析、场景推荐、光线指导、后期调色建议，以及一键生成参考图。

[![Deploy to Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?logo=cloudflare)](https://photo-workflow.pages.dev)
[![Worker API](https://img.shields.io/badge/API-Cloudflare%20Workers-F38020?logo=cloudflare)](https://photo-workflow-img.photomagic.workers.dev)

---

## 功能特性

### 核心功能
- **AI 方案生成** - 根据风格、场景、模特特征生成完整拍摄方案
- **模特特征预设** - 6 维度特征选择器（身高、体型、脸型、发型、肤色、五官）
- **12 种摄影风格模板** - 日系、港风、复古、森系、商业、韩系、情绪、杂志、度假、法式、古风、婚纱
- **智能提示词反推** - 从方案自动生成英文 AI 绘画提示词（支持 Midjourney/Stable Diffusion/MiniMax）
- **批量图片生成** - 一键生成 9 张不同角度的参考图
- **日程管理** - 拍摄日程日历视图、拖拽排序、右键菜单
- **飞书同步** - 日程同步到飞书日历、多维表格

### 技术栈
- **前端**: 纯 HTML/CSS/JS (无框架依赖)
- **后端**: Cloudflare Workers (Node.js)
- **数据库**: Supabase (PostgreSQL)
- **图片生成**: MiniMax image-01 API
- **部署**: Cloudflare Pages + Workers

---

## 项目结构

```
photo-workflow/
├── 📁 api/                      # Cloudflare Worker API
│   ├── index.js                 # 主入口：路由、认证、API 端点
│   ├── imageGeneration.js       # MiniMax 图片生成
│   ├── worker.js                # Worker 工具函数
│   └── vercel.json              # Vercel 配置（已弃用）
│
├── 📁 .github/workflows/        # GitHub Actions
│   ├── deploy.yml               # 部署到 GitHub Pages
│   └── deploy-pages.yml         # Cloudflare Pages 部署
│
├── 📁 skills/                   # AI Skill 文档
│   └── photo-shot-analyzer.md   # 拍摄分析 Skill
│
├── 📝 index.html                # 主应用（单页应用）
├── 📝 landing.html              # 落地页
├── 📝 dashboard.html            # 仪表盘
├── 📝 portfolio.html            # 作品集展示
├── 📝 preview.html              # 预览页面
│
├── ⚙️ wrangler.toml             # Wrangler 配置（Worker）
├── ⚙️ vercel.json               # Vercel 配置
├── 📄 _headers                  # Cloudflare Pages 响应头
├── 📄 _redirects                # Cloudflare Pages 重定向
├── 📄 robots.txt                # SEO 爬虫配置
├── 📄 sitemap.xml               # SEO 站点地图
│
├── 📖 README.md                 # 本文件
├── 📖 BUILD.md                  # Tauri 桌面版构建指南
└── 📖 portfolio-design.md       # 作品集设计文档
```

### 关键文件说明

| 文件 | 说明 |
|------|------|
| `api/index.js` | Worker 主入口，包含所有 API 路由和逻辑 |
| `index.html` | 主应用，包含完整的摄影方案工作流 UI |
| `wrangler.toml` | Worker 部署配置 |
| `_headers` | Pages 自定义响应头（CORS 等） |

---

## 多平台部署指南

### 1. Cloudflare Pages + Workers（推荐）

#### 前置要求
- Cloudflare 账号
- Wrangler CLI: `npm install -g wrangler`
- 登录: `wrangler login`

#### 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/ronineymessjr-sudo/photo-workflow.git
cd photo-workflow

# 2. 部署 Worker（后端 API）
npx wrangler deploy
# 输出: https://photo-workflow-img.photomagic.workers.dev

# 3. 部署 Pages（前端）
npx wrangler pages deploy . --project-name=photo-workflow
# 输出: https://photo-workflow.pages.dev

# 4. 更新前端 API 地址
# 编辑 index.html 第 3636 行:
# const API_BASE = 'https://你的-worker-地址/api';
```

#### 环境变量配置

在 Cloudflare Dashboard → Workers → 你的 Worker → Settings → Variables 中添加：

```
MINIMAX_API_KEY = your_minimax_api_key
```

---

### 2. OpenFlow 部署

OpenFlow 支持标准的静态网站托管和 Serverless 函数。

```bash
# 1. 安装 OpenFlow CLI
npm install -g @openflow/cli

# 2. 登录
openflow login

# 3. 配置 oflow.json
cat > oflow.json << 'EOF'
{
  "name": "photo-workflow",
  "type": "static",
  "build": {
    "output": "."
  },
  "functions": {
    "api/*": {
      "runtime": "nodejs18",
      "entry": "api/index.js"
    }
  }
}
EOF

# 4. 部署
openflow deploy
```

---

### 3. Cloud Code 部署

Cloud Code 是 Google Cloud 的开发工具，支持 Cloud Run 和 App Engine。

```bash
# 1. 安装 Cloud Code CLI
gcloud components install cloud-code

# 2. 创建 app.yaml（App Engine）
cat > app.yaml << 'EOF'
runtime: nodejs18
handlers:
  - url: /api/.*
    script: auto
  - url: /(.*)
    static_files: \1
    upload: (.*)
EOF

# 3. 部署到 App Engine
gcloud app deploy

# 或者部署到 Cloud Run
gcloud run deploy photo-workflow --source . --port 8080
```

---

### 4. CodeDesk 部署

CodeDesk 是代码即平台的部署方案。

```bash
# 1. 安装 CodeDesk CLI
npm install -g @codedesk/cli

# 2. 初始化项目
codedesk init

# 3. 配置 codedesk.yml
cat > codedesk.yml << 'EOF'
name: photo-workflow
version: 1.0.0
build:
  type: static
  output: .
functions:
  - path: /api/*
    handler: api/index.js
    runtime: node
EOF

# 4. 部署
codedesk deploy
```

---

### 5. Vercel 部署（备用）

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel --prod

# 注意：Vercel Serverless 配置在 api/ 目录下
# 但项目已迁移到 Cloudflare Workers，建议使用 Workers
```

---

### 6. GitHub Pages 部署

```bash
# 1. 启用 GitHub Pages
# Settings → Pages → Source: GitHub Actions

# 2. 推送代码到 master 分支
# .github/workflows/deploy.yml 会自动触发部署

# 3. 注意：GitHub Pages 只托管静态文件
# API 需要另外部署到 Workers/Vercel/Netlify Functions
```

---

### 7. 本地开发

```bash
# 1. 启动本地 HTTP 服务器
python -m http.server 8080
# 或
npx serve .

# 2. 启动 Worker 本地开发
npx wrangler dev

# 3. 访问
# 前端: http://localhost:8080
# API: http://localhost:8787
```

---

## 开发规范

### 代码风格
- **缩进**: 4 空格
- **引号**: 单引号优先
- **分号**: 语句末尾必须加分号
- **注释**: `//` 单行，`/* */` 多行

### 命名规范
```javascript
// 常量: 全大写 + 下划线
const API_BASE = 'https://...';
const SK_SCHED = 'pw_schedule';

// 函数: 驼峰式
function handleLogin() {}
function renderSchedules() {}

// 变量: 驼峰式
let currentLang = 'zh';
let draggedItem = null;

// 全局挂载: window.xxx
window.api = {...};
window.addSchedule = function() {};
```

### 文件组织
```
新增功能时:
1. UI 组件 → index.html (搜索 "<!-- 功能区域 -->" 定位)
2. API 端点 → api/index.js (添加到 router)
3. 工具函数 → api/index.js 底部或新建文件
4. 样式 → index.html 的 <style> 标签内
```

### Git 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试相关
chore: 构建/工具相关

示例:
feat: 添加模特特征预设选择器
fix: 修复 catch 块语法错误
docs: 更新 README 部署指南
```

---

## API 端点列表

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/login` | POST | 用户登录/注册 |
| `/api/plans` | GET/POST | 获取/创建方案 |
| `/api/schedules` | GET/POST/DELETE | 日程管理 |
| `/api/imageGeneration` | POST | MiniMax 图片生成 |
| `/api/feishu/sync-calendar` | POST | 同步到飞书日历 |
| `/api/feishu/bitable` | POST | 同步到飞书多维表格 |

---

## 配置说明

### 必需环境变量

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| `MINIMAX_API_KEY` | MiniMax API 密钥 | [MiniMax 开发者平台](https://www.minimaxi.com/) |

### 内置配置（无需修改）

- **Supabase**: 数据库配置已硬编码在 `api/index.js`
- **飞书**: App ID/Secret 已硬编码（生产环境建议改为环境变量）

---

## 故障排除

### 常见问题

**Q: 登录按钮点击无反应**
```
原因: catch 块的 } 被 // 注释隐藏
解决: 确保 catch 块的 } 单独一行
```

**Q: 图片生成失败**
```
原因: MINIMAX_API_KEY 未设置
解决: 在 Cloudflare Dashboard 添加环境变量
```

**Q: API 请求超时**
```
原因: Worker 未部署或网络问题
检查: curl https://你的-worker地址/api/auth/login
```

---

## 更新日志

### v1.0.0 (2025-01-20)
- ✨ AI 方案生成（基于模特特征个性化）
- ✨ 12 种摄影风格模板
- ✨ MiniMax 图片生成集成
- ✨ 飞书日历/多维表格同步
- ✨ 日程管理（拖拽排序、右键菜单）

---

## 许可证

MIT License

---

## 贡献者

- 开发者: ronineymessjr-sudo

---

## 相关链接

- **线上地址**: https://photo-workflow.pages.dev
- **API 文档**: https://photo-workflow-img.photomagic.workers.dev
- **GitHub**: https://github.com/ronineymessjr-sudo/photo-workflow
