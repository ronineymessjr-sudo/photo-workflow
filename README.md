# PhotoAtelier - 摄影方案智能工作流

> ⚠️ **智能体阅读指南**：本文档面向 AI 编程助手。修改代码前必须阅读此文档。

---

## 1. 项目概览（30秒了解）

**这是什么**：为摄影师打造的 AI 拍摄方案生成平台
- 用户选择风格 + 模特特征 → AI 生成完整拍摄方案
- 支持一键生成 9 张参考图（MiniMax API）
- 日程管理 + 飞书同步

**技术栈**：
```
前端：纯 HTML/CSS/JS（单文件 index.html）
后端：Cloudflare Workers（api/index.js）
数据库：Supabase
部署：Cloudflare Pages + Workers
```

**线上地址**：
- 前端：https://photo-workflow.pages.dev
- API：https://photo-workflow-img.photomagic.workers.dev

---

## 2. 智能体快速导航

### 2.1 文件地图（修改前必看）

```
photo-workflow/
│
├── 📄 index.html          ← 【前端主文件】所有 UI 和前端逻辑
│   └── 关键区域标记（搜索这些注释定位）：
│       - "<!-- 登录区域 -->"
│       - "<!-- 方案生成区域 -->"
│       - "<!-- 模特选择器 -->"
│       - "<!-- 日程管理 -->"
│       - "<!-- 图片生成 -->"
│       - "// ===== Auth System"        （JS 开始）
│       - "// ===== API Configuration"  （API_BASE 配置）
│       - "// ===== Image Generation"   （图片生成逻辑）
│
├── 📁 api/
│   └── index.js           ← 【后端主文件】所有 API 端点
│       └── 路由结构：
│           - /auth/login      登录
│           - /plans           方案 CRUD
│           - /schedules       日程管理
│           - /imageGeneration MiniMax 图片生成
│           - /feishu/*        飞书同步
│
├── ⚙️ wrangler.toml       ← Worker 部署配置
├── ⚙️ _headers            ← Pages 响应头配置
└── 📄 _redirects          ← Pages 路由重定向
```

### 2.2 关键配置（修改前检查）

| 配置项 | 位置 | 说明 |
|--------|------|------|
| `API_BASE` | index.html:3636 | 前端调用 API 的地址 |
| `MINIMAX_API_KEY` | Worker 环境变量 | 图片生成 API 密钥 |
| `SUPABASE_URL/KEY` | api/index.js:4-5 | 数据库（硬编码，勿改） |
| `FEISHU_APP_ID` | api/index.js:6 | 飞书应用（硬编码，勿改） |

---

## 3. 最近变更记录（智能体必读）

### 2025-01-20 - 语法错误修复
**问题**：登录按钮点击无反应  
**根因**：3 处 `catch` 块的 `}` 被同行 `//` 注释隐藏
```javascript
// ❌ 错误写法（第 3863、7496、7512 行）
} catch (e) { // console.log('error'); }

// ✅ 正确写法
} catch (e) { // console.log('error');
}
```
**状态**：✅ 已修复  
**影响范围**：`index.html` 中 `loadServerData`、`addSchedule`、`deleteSchedule` 函数

### 2025-01-20 - 登录函数全局化
**变更**：`handleLogin` 和 `logout` 从 IIFE 移到全局作用域  
**原因**：HTML 的 `onclick` 需要全局函数  
**状态**：✅ 已完成

### 2025-01-20 - MiniMax 图片生成集成
**新增**：Worker 端点 `/api/imageGeneration`  
**功能**：调用 MiniMax image-01 模型生成图片  
**状态**：✅ 已部署

---

## 4. 智能体开发规范（强制遵守）

### 4.1 修改前检查清单

```markdown
□ 阅读 "最近变更记录" 了解上下文
□ 搜索目标代码位置（使用提供的注释标记）
□ 检查是否有硬编码配置需要同步修改
□ 修改后验证括号平衡（{ }、[ ]、( )）
□ 修改后验证分号完整
□ 本地测试通过后再提交
```

### 4.2 代码风格（必须遵守）

```javascript
// 缩进：4 空格（禁止 Tab）
// 引号：单引号优先
// 分号：语句末尾必须加分号

// 常量命名
const API_BASE = 'https://...';
const SK_SCHED = 'pw_schedule';

// 函数命名
function handleLogin() {}
async function generateImages() {}

// 变量命名
let currentLang = 'zh';
let isGenerating = false;

// 全局挂载（供 HTML onclick 使用）
window.api = { ... };
window.addSchedule = async function() {};
```

### 4.3 常见陷阱（避免踩坑）

| 陷阱 | 示例 | 后果 |
|------|------|------|
| catch 块注释 | `} catch (e) { // log }` | `}` 被注释，语法错误 |
| 模板字符串换行 | `` `text ${var} text` `` | 注意 ${} 内的括号平衡 |
| IIFE 内定义函数 | `(function(){ function x(){} })()` | HTML onclick 找不到函数 |
| 缺少分号 | `const a = 1\nconst b = 2` | ASI 自动插入可能导致错误 |
| 引号嵌套 | `'It\'s a "test"'` | 注意转义 |

### 4.4 括号平衡验证

修改后必须验证：
```bash
# 提取 JS 并检查语法
cd photo-workflow
python -c "
import re
with open('index.html','r') as f:
    s = re.findall(r'<script[^>]*>(.*?)</script>', f.read(), re.DOTALL)[3]
with open('check.js','w') as f:
    f.write(s)
"
node --check check.js
# 输出为空 = 语法正确
```

---

## 5. 功能模块详解（按需阅读）

### 5.1 认证系统

**文件**：`index.html`  
**标记**：搜索 `// ===== Auth System`

```javascript
// 关键变量
const TOKEN_KEY = 'pw_token';
const USER_KEY = 'pw_user';

// 全局函数（HTML 直接调用）
async function handleLogin() { ... }
function logout() { ... }

// API 封装
window.api = {
    login(email, password) { ... },
    request(path, method, body) { ... }
};
```

### 5.2 方案生成

**文件**：`index.html`  
**标记**：搜索 `// ===== Plan Generation`

```javascript
// 流程：
// 1. 用户选择风格 + 模特特征
// 2. 调用 AI 生成中文方案
// 3. 反推英文提示词（buildImagePromptVariant）
// 4. 批量生成 9 张图片

// 关键函数
function generatePlan() { ... }
function buildImagePromptVariant(plan) { ... }
async function generateImagesBatch() { ... }
```

### 5.3 图片生成

**文件**：`api/index.js`  
**端点**：`/api/imageGeneration`

```javascript
// 请求格式
{
    "prompt": "英文提示词",
    "prompt_text": "备用字段"
}

// 响应格式
{
    "success": true,
    "imageUrl": "https://..." 或 "data:image/jpeg;base64,..."
}
```

### 5.4 日程管理

**文件**：`index.html`  
**标记**：搜索 `// ===== Calendar & Schedule`

```javascript
// 本地存储键
const SK_SCHED = 'pw_schedule';

// 关键函数
window.addSchedule = async function() { ... };
window.deleteSchedule = async function(id) { ... };
function renderCalendar() { ... };
function renderSchedules() { ... };
```

---

## 6. 部署指南（各平台）

### 6.1 Cloudflare（主部署）

```bash
# Worker（后端）
npx wrangler deploy

# Pages（前端）
npx wrangler pages deploy . --project-name=photo-workflow
```

### 6.2 其他平台

| 平台 | 命令 | 注意事项 |
|------|------|----------|
| Vercel | `vercel --prod` | 需要配置 vercel.json |
| Netlify | `netlify deploy --prod` | 需要配置 netlify.toml |
| GitHub Pages | 推送自动部署 | 仅静态，API 需另部署 |

---

## 7. 故障排查速查表

| 现象 | 可能原因 | 检查点 |
|------|----------|--------|
| 登录按钮无反应 | `handleLogin` 未定义 | 搜索 `handleLogin is not defined` |
| 页面白屏 | JS 语法错误 | `node --check` 验证 |
| API 请求失败 | `API_BASE` 错误 | 检查 index.html:3636 |
| 图片生成失败 | `MINIMAX_API_KEY` 缺失 | Worker 环境变量 |
| 飞书同步失败 | Token 过期 | 检查 `getFeishuToken()` |

---

## 8. 智能体任务模板

### 任务：添加新功能

```markdown
## 任务描述
添加 [功能名称]

## 影响文件
- index.html（UI + 前端逻辑）
- api/index.js（如需要新 API）

## 修改位置
- index.html: 搜索 "<!-- [区域] -->"
- api/index.js: 在 router 中添加新路由

## 验证步骤
1. 本地启动：python -m http.server 8080
2. 访问 http://localhost:8080 测试
3. 检查浏览器控制台无错误
4. node --check 验证语法

## 提交信息
feat: 添加 [功能名称]

- [修改点1]
- [修改点2]
```

---

## 9. 附录

### 9.1 技术栈版本
- Node.js: 18+
- Wrangler: 3.x
- MiniMax API: v1

### 9.2 外部依赖
- Supabase（数据库）
- MiniMax（图片生成）
- 飞书开放平台（日历/多维表格）

### 9.3 相关文档
- 项目设计文档：见 `skills/photo-shot-analyzer.md`
- 构建指南：见 `BUILD.md`

---

> 📌 **最后更新**：2025-01-20  
> 👤 **维护者**：AI 编程助手团队  
> 📝 **修改前必读**：第 2、3、4 节
