#!/bin/bash

# PhotoAtelier 后端部署脚本
# 使用方法: ./deploy.sh

set -e

echo "🚀 PhotoAtelier 后端部署脚本"
echo "=============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠️  wrangler 未安装，正在安装...${NC}"
    npm install -g wrangler
fi

# 检查是否登录
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  请先登录 Cloudflare${NC}"
    wrangler login
fi

echo ""
echo "📋 部署前检查清单:"
echo "  [ ] Supabase 项目已创建"
echo "  [ ] 数据库 Schema 已执行"
echo "  [ ] JWT_SECRET 已生成 (建议: openssl rand -base64 32)"
echo "  [ ] MINIMAX_API_KEY 已获取"
echo ""

read -p "是否已完成以上准备? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ 请先完成准备工作${NC}"
    exit 1
fi

# 设置密钥
echo ""
echo "🔐 设置环境密钥..."

if ! wrangler secret list | grep -q "JWT_SECRET"; then
    echo "设置 JWT_SECRET..."
    read -s -p "输入 JWT_SECRET (或留空自动生成): " JWT_SECRET
    echo
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        echo "已自动生成: $JWT_SECRET"
        echo "⚠️  请保存此密钥，丢失后无法恢复"
    fi
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET
fi

if ! wrangler secret list | grep -q "SUPABASE_URL"; then
    read -p "输入 SUPABASE_URL: " SUPABASE_URL
    echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL
fi

if ! wrangler secret list | grep -q "SUPABASE_ANON_KEY"; then
    read -s -p "输入 SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
    echo
    echo "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY
fi

if ! wrangler secret list | grep -q "MINIMAX_API_KEY"; then
    read -s -p "输入 MINIMAX_API_KEY (可选): " MINIMAX_API_KEY
    echo
    if [ -n "$MINIMAX_API_KEY" ]; then
        echo "$MINIMAX_API_KEY" | wrangler secret put MINIMAX_API_KEY
    fi
fi

# 部署
echo ""
echo "🚀 开始部署..."
wrangler deploy

echo ""
echo -e "${GREEN}✅ 部署完成!${NC}"
echo ""
echo "📍 API 地址:"
wrangler info | grep "Worker URL"
echo ""
echo "🧪 测试命令:"
echo "  curl https://your-worker.your-subdomain.workers.dev/health"
echo ""
