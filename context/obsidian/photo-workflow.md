# photo-workflow -- 摄影工作流 App

> 整理日期：2026-05-30

## 项目信息

- **技术栈**: Tauri (Rust) + vanilla JS + Cloudflare Workers
- **GitHub**: github.com/ronineymessjr-sudo/photo-workflow
- **主目录**: D:\AI工具\photo-workflow (11 文件, Tauri 版)
- **Trae 副本**: ~\.trae-cn\work\*\photo-workflow (988 文件, 含 node_modules)
- **photo-site**: D:\AI工具\photo-site (1 HTML 文件)

## 架构

`
Tauri Desktop App (Rust + JS)
  └── Cloudflare Workers API
       ├── worker.js          -- 主入口
       └── imageGeneration.js -- 图片生成
`

## 构建

`ash
cd D:\AI工具\photo-workflow
npm create tauri-app@latest . -- --template vanilla
npm run tauri build
# 输出: src-tauri/target/release/bundle/nsis/*.exe
`

## SOIO 工作区 (Documents\trae-soio)

相关文件:
- PhotoAtelier-Config.md -- 配置
- PhotoAtelier-Code-Review-Report.md -- 代码审查
- photoatelier-test-report.md -- 测试报告
- PhotoAtelier-多视角审查汇总.md -- 多视角审查
- PhotoAtelier-客户视角审查报告.md
- PhotoAtelier-摄影师视角审查报告.md
- PhotoAtelier-竞品分析.md -- 竞品分析
- tab-*.html -- UI 组件测试 (eq/gen/hist/model/portfolio/tpl/venue)
- template-test-report.md -- 模板测试
