# Photography Workflow App - Tauri Setup

## 安装步骤

### 1. 安装 Rust（如果没有）
powershell -Command "irm https://rustup.rs | iex"

安装后重启 PowerShell，确认：
rustc --version

### 2. 创建 Tauri 项目
cd D:\AI工具\photo-workflow
npm create tauri-app@latest . -- --template vanilla --manager npm --force

### 3. 配置
# src-tauri/tauri.conf.json 中确认：
- devtools: true（开发时用）
- identifier: "com.photo.workflow.app"

### 4. 构建发布版本
npm run tauri build

输出：src-tauri/target/release/bundle/nsis/*.exe