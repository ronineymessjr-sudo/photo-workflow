# PhotoAtelier 后端服务部署指南

## 概述

PhotoAtelier 后端服务基于 Cloudflare Workers + Supabase 构建，提供用户认证、数据存储和 AI 生成功能。

## 架构图

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

## 部署步骤

### 第一步：创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 注册/登录
2. 创建新项目，记下项目 URL 和 anon key
3. 在 SQL Editor 中执行以下建表语句：

```sql
-- 用户表（与前端 localStorage 同步）
create table if not exists public.users (
    id uuid default gen_random_uuid() primary key,
    email text unique not null,
    password_hash text not null,
    role text default 'photographer',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 方案表
create table if not exists public.plans (
    id text primary key,
    user_id uuid references public.users(id) on delete cascade,
    title text not null,
    input jsonb not null,
    sections jsonb not null,
    images jsonb default '[]'::jsonb,
    ai_generated boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 日程表
create table if not exists public.schedules (
    id text primary key,
    user_id uuid references public.users(id) on delete cascade,
    date date not null,
    title text not null,
    time text,
    location text,
    description text,
    status text default 'pending',
    plan_id text references public.plans(id),
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 设备器材表
create table if not exists public.equipment (
    id text primary key,
    user_id uuid references public.users(id) on delete cascade,
    name text not null,
    category text,
    specs jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 场地表
create table if not exists public.venues (
    id text primary key,
    user_id uuid references public.users(id) on delete cascade,
    name text not null,
    address text,
    features jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 模特表
create table if not exists public.models (
    id text primary key,
    user_id uuid references public.users(id) on delete cascade,
    name text not null,
    height integer,
    weight integer,
    measurements jsonb,
    note text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 消息表
create table if not exists public.messages (
    id text primary key,
    user_id uuid references public.users(id) on delete cascade,
    type text not null,
    title text not null,
    content text,
    read boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 启用 RLS (行级安全)
alter table public.users enable row level security;
alter table public.plans enable row level security;
alter table public.schedules enable row level security;
alter table public.equipment enable row level security;
alter table public.venues enable row level security;
alter table public.models enable row level security;
alter table public.messages enable row level security;

-- 创建访问策略
create policy "Users can only access their own data" on public.users
    for all using (auth.uid() = id);

create policy "Users can only access their own plans" on public.plans
    for all using (auth.uid() = user_id);

create policy "Users can only access their own schedules" on public.schedules
    for all using (auth.uid() = user_id);

create policy "Users can only access their own equipment" on public.equipment
    for all using (auth.uid() = user_id);

create policy "Users can only access their own venues" on public.venues
    for all using (auth.uid() = user_id);

create policy "Users can only access their own models" on public.models
    for all using (auth.uid() = user_id);

create policy "Users can only access their own messages" on public.messages
    for all using (auth.uid() = user_id);
```

### 第二步：部署 Cloudflare Workers

1. 安装 Wrangler CLI:
```bash
npm install -g wrangler
```

2. 登录 Cloudflare:
```bash
wrangler login
```

3. 创建 Workers 项目:
```bash
mkdir photo-workflow-api
cd photo-workflow-api
wrangler init
```

4. 复制 `api/index.js` 到项目目录

5. 配置环境变量:
```bash
wrangler secret put SUPABASE_URL
# 输入: https://your-project.supabase.co

wrangler secret put SUPABASE_KEY
# 输入: your-anon-key

wrangler secret put JWT_SECRET
# 输入: 随机生成的32位字符串
```

6. 部署:
```bash
wrangler deploy
```

7. 记下 Workers URL (如: https://photo-workflow-api.your-subdomain.workers.dev)

### 第三步：配置前端

1. 修改 `index.html` 中的 API_BASE:
```javascript
const API_BASE = 'https://photo-workflow-api.your-subdomain.workers.dev';
```

2. 部署前端到任意静态托管服务:
   - Cloudflare Pages
   - Vercel
   - Netlify
   - GitHub Pages
   - 或自有服务器

### 第四步：验证部署

1. 访问前端页面
2. 测试注册/登录
3. 测试方案生成
4. 测试数据同步

## 环境变量清单

| 变量名 | 说明 | 获取方式 |
|--------|------|----------|
| SUPABASE_URL | Supabase 项目 URL | Supabase Dashboard > Settings > API |
| SUPABASE_KEY | Supabase anon key | Supabase Dashboard > Settings > API |
| JWT_SECRET | JWT 签名密钥 | 随机生成 32 位字符串 |

## 故障排查

### 登录失败
- 检查 SUPABASE_URL 和 SUPABASE_KEY 是否正确
- 检查数据库表是否创建
- 检查 RLS 策略是否正确

### AI 生成失败
- 检查 Pollinations API 是否可用
- 检查网络连接

### 数据不同步
- 检查 JWT token 是否正确生成
- 检查前端是否正确存储 token

## 监控与日志

1. 在 Cloudflare Dashboard 查看 Workers 日志
2. 在 Supabase Dashboard 查看数据库日志
3. 建议添加 Sentry 错误追踪

## 备份策略

1. 启用 Supabase 自动备份
2. 定期导出重要数据
3. 配置数据库触发器记录变更历史
