# PhotoAtelier - 摄影方案智能工作流

AI 驱动的摄影方案生成工具，智能生成拍摄方案，管理日程、场地与模特资源，一键同步飞书日历与多维表格。

## 功能特性

- **智能方案生成** - 输入主题、风格、场景，AI 自动生成完整拍摄方案
- **分镜脚本** - 自动生成分镜描述、情绪引导、参考图建议
- **日程管理** - 日历视图管理拍摄日程，支持飞书日历同步
- **场地/模特库** - 管理拍摄场地和模特资源
- **数据看板** - 统计分析拍摄数据，趋势图表
- **中英文切换** - 支持中文/英文双语界面
- **多主题** - 暗色/亮色/日出/日落四种主题

## 技术架构

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   前端 (HTML)   │────▶│  Cloudflare      │────▶│   Supabase      │
│   单文件应用    │     │   Workers API    │     │   PostgreSQL    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │   Pollinations   │
                        │   AI 生成        │
                        └──────────────────┘
```

## 快速开始

### 前端部署

1. 克隆仓库
```bash
git clone https://github.com/ronineymessjr-sudo/photo-workflow.git
```

2. 部署到 GitHub Pages
   - 仓库已自动配置 GitHub Pages
   - 访问: https://ronineymessjr-sudo.github.io/photo-workflow/

### 后端部署 (Cloudflare Workers)

1. 安装 Wrangler
```bash
npm install -g wrangler
```

2. 配置环境变量
```bash
wrangler secret put JWT_SECRET
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put PASSWORD_SALT
```

3. 部署
```bash
wrangler deploy --name photoatelier-api
```

## API 端点

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/health` | GET | 健康检查 | 无 |
| `/api/auth/login` | POST | 登录/注册 | 无 |
| `/api/schedules` | GET/POST | 日程管理 | 需要 |
| `/api/plans` | GET/POST | 方案管理 | 需要 |
| `/api/messages` | GET/POST | 消息管理 | 需要 |
| `/api/dashboard/stats` | GET | 数据统计 | 需要 |

## 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `JWT_SECRET` | JWT 签名密钥 | ✅ |
| `SUPABASE_URL` | Supabase 项目地址 | ✅ |
| `SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ |
| `PASSWORD_SALT` | 密码加盐值 | ✅ |

## 项目结构

```
photo-workflow/
├── index.html          # 前端单文件应用
├── api/
│   └── index.js        # 后端 API (Cloudflare Workers)
├── assets/
│   └ bg-fluid-silk.jpg # 背景图
├── tests/
│   └ unit/             # 单元测试
├── .github/
│   └ workflows/
│       └ deploy.yml    # CI/CD 配置
├── wrangler.toml       # Cloudflare 配置
└── README.md           # 本文档
```

## 安全特性

- JWT 认证，7天过期
- 密码加盐哈希 (SHA256)
- 输入验证和消毒
- 用户数据隔离
- CORS 跨域配置

## 许可证

MIT License

## 作者

Ronineymessjr-sudo