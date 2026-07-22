# PhotoAtelier Reference Workflow

## 数据库文件

- `assets/reference-database.json`：参考素材主库，包含 Obsidian 笔记、表格行、本地图片、平台收藏抓取结果和外部图库入口。
- `assets/reference-database.csv`：参考素材主库的多维表/Excel 导入版。
- `assets/workflow-database.json`：选题、拍摄前清单、复盘模板、文案标题库、调色/LUT库。
- `assets/topic-database.csv`：选题库的多维表/Excel 导入版。
- `assets/slot-mapping.csv`：选题槽位映射表，明确每条参考素材进入“素材/角度/姿势/构图/光线/LUT/文案”哪个位置。
- `assets/shot-plan.csv`：镜头执行表，包含景别、机位、运动、构图、焦段、姿势口令、光线和对应参考素材。
- `assets/open-source-reference-sources.json`：开源项目/公开标准映射，包含 IPTC、DAM、镜头景别、镜头运动、构图、LUT 与 AI 风格参考来源。
- `assets/external-source-audit.json`：外部来源审计表，记录数据量、专业背书、许可证、社区反馈、采用等级和调用方式。

## 当前已生成内容

- 参考素材：262 条。
- 开源/公开标准映射：12 个来源。
- 审计通过并参与字段生成：7 个来源。
- 可执行选题：6 个。
- 专业槽位：7 类，分别是素材参考、拍摄角度/景别、姿势引导、构图、光线、LUT/调色、发布/SEO文案。
- 镜头执行表：每个选题 3 个核心镜头。
- 拍摄前检查清单：6 套。
- 成片复盘模板：6 套。
- 发布标题/文案角度：18 条。
- 调色/LUT方向：4 套。

## 更新命令

```powershell
npm run build-all-db
```

该命令会先重建参考素材库，再根据参考素材库生成选题和工作流库。

## 专业槽位原则

- 素材参考槽：只放图片、视频、平台链接、本地示例图；它只负责看画面，不负责调色或姿势判断。
- 拍摄角度/景别槽：只放景别、机位、镜头运动、构图角度相关内容。
- 姿势引导槽：只放动作、站姿、坐姿、手部动作、现场引导词。
- 构图槽：只放三分、居中、留白、线条、前景/后景层次等构图素材。
- 光线槽：只放自然光、窗边光、逆光、夜景、霓虹、阴影高光等光线素材。
- LUT/调色槽：只放调色、LUT、胶片、HSL、肤色、Lightroom、色彩管线内容。
- 发布/SEO文案槽：只放标题、封面字、平台关键词、发布结构和文案角度。

索引文件、总览文件、收藏夹说明不会进入具体执行槽位；它们只作为来源目录存在。

## 用户任务工作台

前端 `参考库` 页面新增了用户视角工作台。用户不需要先理解数据库结构，而是按当前任务进入：

- `找灵感`：只显示素材参考、拍摄角度、姿势引导。
- `拍摄执行`：只显示镜头执行表、机位、景别、构图、姿势口令、光线和拍摄相关槽位。
- `后期调色`：只显示 LUT/调色槽、色彩流程和避坑。
- `发布文案`：只显示标题角度、封面字、SEO 关键词和平台参考。
- `复盘沉淀`：只显示复盘问题，以及应该回流到参考库的素材/姿势/调色经验。

每个模式都有独立的复制按钮，复制出来的是当前任务卡，不是整份数据库。

## 平台收藏抓取

小红书收藏源配置在：

```text
assets/platform-collections.json
```

抓取小红书：

```powershell
npm run collect:xhs
npm run build-all-db
```

抓取抖音时，先在 `assets/platform-collections.json` 的 `douyin` 数组里添加收藏页链接，再运行：

```powershell
npm run collect:douyin
npm run build-all-db
```

原始抓取结果保存在 `data/platform-captures/`，调试截图和 HTML 保存在 `data/platform-debug/`。这些目录已被 `.gitignore` 忽略。

## 多维表建议

建议建 5 张表：

- `参考素材库`：标题、类型、分类、平台、来源链接、本地文件、作者、标签、摘要、素材链接、检索语句、适用场景、适用对象、可复刻程度、拍摄风险、核心看点、适合价格档、是否值得模仿、值得看的原因、SEO标题、SEO关键词、用途备注、状态、优先级。
- `选题库`：标题、分类、适合对象、季节、价格档、难度、核心画面、场景关键词、道具、姿势、调色方向、风险、参考素材ID。
- `拍摄前清单`：选题ID、分组、检查项、负责人、状态。
- `成片复盘库`：选题ID、拍摄日期、场地、出片率、最有效姿势、失败动作、调色参数、客户反馈、可复用经验。
- `文案标题库`：平台、选题ID、标题、封面字、标签、正文结构、SEO关键词。
- `调色/LUT库`：名称、适用选题、色板、Lightroom建议、避免问题。

## 已套用的开源/公开分类

- `IPTC Photo Metadata`：直接采用。用于标题、描述、作者、版权、关键词、来源、AI 提示等标准元数据字段。
- `digiKam DAM model`：直接采用。用于 DAM 检索思路，包括标签、评分、日期、地点、EXIF/IPTC/XMP。
- `CADB composition dataset`：直接采用。用于构图分类、构图元素和未来构图评分。
- `Alcedo Studio`：审慎借鉴。只借鉴 AI 标签、自然语言检索、keeper score 的产品思路，不复制代码。
- `Shot Type Classifier`：审慎借鉴。只采用 6 个镜头景别标签，不采用模型/数据。
- `Movie Shot Classification Dataset`：审慎借鉴。采用 10 个镜头运动分类作为视频元数据。
- `Raw Alchemy`：审慎借鉴。采用色彩管线字段，不复制 AGPL 代码。
- `Film-Luts`：仅作参考。由于 LUT 权利不清，不导入 LUT 文件，只参考索引结构。
- `Awesome Stock Resources`：仅作参考。只用于发现平台，不能替代逐平台授权审查。
- `SDXL Style Reference`：仅作参考。只借鉴 prompt 组织方式，不导入风格列表。

新增字段包括：

- `licenseClass`
- `shotSizeNormalized`
- `cameraMovement`
- `compositionNormalized`
- `workflowStage`
- `metadataStandard`
- `taxonomySources`
- `sourceAuditScore`

## 调用方式

- 参考素材构建时，`tools/build-reference-database.js` 会读取 `assets/external-source-audit.json`。
- 只有 `adoptionLevel` 为 `adopt` 或 `adapt` 的来源会进入 `taxonomySources`。
- `reference-database.json` 每条素材都会得到：
  - `licenseClass`
  - `shotSizeNormalized`
  - `cameraMovement`
  - `compositionNormalized`
  - `workflowStage`
  - `taxonomySources`
  - `sourceAuditScore`
- 前端 `参考库` 卡片会显示这些标准化字段和审计分。
- `reference-database.csv` 会同步导出这些字段，方便导入多维表。

## 来源采用结论

- 直接采用：`iptc-photo-metadata`、`digikam-dam`、`cadb-composition`
- 审慎借鉴：`alcedo-studio`、`shot-type-classifier`、`movie-shot-classification`、`raw-alchemy`
- 仅作参考：`film-luts`、`awesome-stock-resources`、`style-reference`
- 暂不使用：`apply-cube-lut`、`natural-language-image-search`
