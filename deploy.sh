#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "[1/4] Installing dependencies"
npm ci

echo "[2/4] Running tests"
npm test

echo "[3/4] Building V2"
npm run build:v2

echo "[4/4] Deployment"
echo "Run one or both commands after Cloudflare credentials and Worker secrets are configured:"
echo "  npm run deploy:worker"
echo "  npm run deploy:pages"
