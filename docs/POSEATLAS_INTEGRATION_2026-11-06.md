# RuiC-PoseAtlas 接入与调试记录

## 当前实现

摄影系统网页主工作区为 `D:\AI项目\摄影系统\photo-workflow-web-discovery-fix`，分支 `fix/web-discovery-20261015`。本次在现有方案生成流程中接入 RuiC-PoseAtlas：摆姿、衣装和妆发元数据作为外部参考检索，候选保留上游 ID 与精确原站链接；方案生成时将所选参考编译成原创拍摄指导。

检索实时读取官方公开的三个静态数据集，当前可检索 3194 条：288 个姿势、1407 个衣装、1499 个妆发/人像条目。数据仅在服务内存缓存 5 分钟，单数据集最多 2 MiB，超时 6 秒。图片不下载、不镜像，卡片链接到原站。来源权属标记为 `external_reference`，不能表示为摄影系统自有素材。

## 本轮验证

- 页面输入“秋日公园人像，自然坐姿，棕色针织衫，中长发，低饱和电影感”后，从 3194 条上游数据中检索 6 个候选，覆盖姿势、秋季搭配和中长发造型；这一步模型调用 0 次。
- 姿势显示中文名称、可用角度和上游编号；衣装及妆发卡片用中文元数据做标题，细节不再重复标题信息，并显示“外部来源参考”。
- 每个候选都保留可直接打开的原站深链接。界面没有复制或显示上游图片。
- `node --test tests/*.test.mjs`：209/209 通过。
- `git diff --check` 通过。
- 上一轮真实模型生成样例保存在 `outputs/ai-studio-v5/real-deepseek-reference-plan.json` 与 `outputs/ai-studio-v5/browser-deepseek-plan.txt`，包含 9 镜方案和引用来源。

截图：`outputs/ai-studio-v5/poseatlas-live-results.jpg`。

## 本地预览

在项目根目录执行 `./tools/start-ai-studio.ps1 -Port 8134`，打开 `http://127.0.0.1:8134/`，展开“摆姿库与 AI Studio”即可检索。检索框支持按姿势、季节、颜色、衣装标签、发长和风格词匹配。

## 验证范围说明

标准测试集会通过。裸跑 `node --test` 会额外发现 `tests/unit` 下的 Jest 风格旧测试、`tools/test-free-ai.mjs` 命令行工具和需要特定证据目录的质量实验；它们不是 `tests/*.test.mjs` 标准套件，其中旧测试还会因缺少 Jest 全局而失败。
