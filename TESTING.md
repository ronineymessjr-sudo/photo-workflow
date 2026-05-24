# PhotoAtelier 测试文档总览

本文档汇总了 PhotoAtelier 项目的所有测试相关资源，为开发者和测试人员提供统一的入口。

---

## 测试策略概览

```
┌─────────────────────────────────────────────────────────────┐
│                    PhotoAtelier 测试体系                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   单元测试    │  │  集成测试    │  │  用户测试    │      │
│  │  Unit Tests  │  │ Integration  │  │ Usability    │      │
│  │              │  │    Tests     │  │   Testing    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         ▼                 ▼                 ▼              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  测试目标                            │  │
│  │  • 验证核心功能正确性  • 确保模块协同工作            │  │
│  │  • 发现回归问题        • 验证端到端流程              │  │
│  │  • 提升代码信心        • 评估真实用户体验            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 文档导航

### 1. 部署与配置

| 文档 | 说明 | 适用场景 |
|------|------|----------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 后端服务部署指南 | 部署测试环境、生产环境 |

**关键内容**:
- Supabase 数据库配置
- Cloudflare Workers 部署
- 环境变量设置
- 数据库 Schema 和 RLS 策略

---

### 2. 自动化测试

| 文档 | 说明 | 适用场景 |
|------|------|----------|
| [tests/unit/test-utils.js](./tests/unit/test-utils.js) | 测试工具库 | 编写测试用例时使用 |
| [tests/unit/core-functions.test.js](./tests/unit/core-functions.test.js) | 核心功能测试用例 | 运行单元测试 |

**运行测试**:

```bash
# 安装依赖
npm install --save-dev jest jest-environment-jsdom

# 运行所有测试
npm test

# 运行特定测试文件
npm test core-functions.test.js

# 监视模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

**测试覆盖范围**:
- ✅ 存储管理 (Storage)
- ✅ 计划生成 (Plan Generation)
- ✅ 日程管理 (Schedule Management)
- ✅ 工具函数 (Utilities)
- ✅ API 调用 (API)
- ✅ 国际化 (i18n)
- ✅ 主题切换 (Theme)

---

### 3. 用户测试

| 文档 | 说明 | 适用场景 |
|------|------|----------|
| [USABILITY-TESTING.md](./USABILITY-TESTING.md) | 真实用户可用性测试计划 | 招募用户、执行测试、收集反馈 |

**测试流程**:

```
准备阶段 → 招募用户 → 执行测试 → 数据分析 → 报告输出
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
环境搭建   筛选条件    任务清单    定量/定性   行动计划
测试账号   用户画像    观察记录    指标统计    优先级排序
示例数据   知情同意    出声思考    问题归类    改进方案
```

**测试任务组**:
- **A组**: 首次使用体验 (注册、登录、角色选择)
- **B组**: 核心功能使用 (创建计划、管理日程、智能助手)
- **C组**: 进阶功能 (导入导出、主题切换)
- **D组**: 移动端体验 (响应式适配、触摸操作)

---

## 测试检查清单

### 发布前检查

#### 功能测试
- [ ] 用户注册/登录流程正常
- [ ] AI 计划生成可用
- [ ] 分镜编辑功能完整
- [ ] 日程添加/编辑/删除正常
- [ ] 数据导入导出正确
- [ ] 主题切换生效
- [ ] 多语言切换正常

#### 兼容性测试
- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] Edge 最新版
- [ ] iOS Safari
- [ ] Android Chrome

#### 性能测试
- [ ] 首屏加载 < 3秒
- [ ] AI 生成响应 < 10秒
- [ ] 页面切换流畅
- [ ] 移动端性能可接受

#### 安全测试
- [ ] 密码加密存储
- [ ] JWT 令牌正确签发
- [ ] API 鉴权生效
- [ ] XSS 防护有效
- [ ] 敏感数据不泄露

---

## 测试环境配置

### 本地开发环境

```bash
# 1. 克隆项目
git clone <repository-url>
cd photo-workflow

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 填入测试配置

# 4. 启动开发服务器
npm run dev

# 5. 运行测试
npm test
```

### 测试环境变量示例

```env
# 后端 API
API_BASE_URL=http://localhost:8787

# Supabase (测试实例)
SUPABASE_URL=https://test-project.supabase.co
SUPABASE_ANON_KEY=test-anon-key

# JWT 密钥 (测试用，生产需更换)
JWT_SECRET=test-secret-key

# AI 服务 (测试配额)
MINIMAX_API_KEY=test-api-key
POLLINATIONS_API_URL=https://image.pollinations.ai
```

---

## 常见问题

### Q: 单元测试失败怎么办？

**A**: 按以下步骤排查：

1. 检查 `localStorage` mock 是否正确初始化
2. 确认测试环境变量已设置
3. 查看具体错误信息，定位问题代码
4. 检查异步操作是否使用 `async/await`

```javascript
// 示例：修复异步测试
test('async operation', async () => {
  await expect(asyncFunction()).resolves.toBe(expected);
});
```

### Q: 如何添加新的测试用例？

**A**: 参考现有测试结构：

```javascript
// 1. 在 core-functions.test.js 中添加
describe('新功能模块', () => {
  beforeEach(() => {
    // 重置状态
  });

  test('应该完成某项功能', () => {
    // Arrange - 准备数据
    const input = {...};
    
    // Act - 执行操作
    const result = functionUnderTest(input);
    
    // Assert - 验证结果
    expect(result).toBe(expected);
  });
});
```

### Q: 后端部署后如何验证？

**A**: 使用以下检查清单：

```bash
# 1. 验证 API 可达
curl https://your-worker.your-subdomain.workers.dev/health

# 2. 测试注册接口
curl -X POST https://your-worker.your-subdomain.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# 3. 验证数据库连接
# 登录 Supabase Dashboard 查看数据

# 4. 前端联调
# 打开应用，测试完整登录流程
```

---

## 持续集成建议

### GitHub Actions 工作流

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test -- --coverage
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 相关资源

### 测试工具

- [Jest](https://jestjs.io/) - JavaScript 测试框架
- [Testing Library](https://testing-library.com/) - 测试工具集
- [Playwright](https://playwright.dev/) - E2E 测试工具

### 参考文档

- [API 文档](./api/API.md) - 后端接口规范
- [CHANGELOG.md](./CHANGELOG.md) - 版本变更记录
- [README.md](./README.md) - 项目简介

---

## 反馈与支持

如发现测试相关的问题或有改进建议，请：

1. 提交 Issue 描述问题
2. 补充测试用例覆盖边界情况
3. 更新本文档以反映最新测试策略

---

*最后更新: 2025-01-XX*
