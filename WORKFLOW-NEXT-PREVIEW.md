# PhotoAtelier 下一版工作流预览

日期：2026-10-04。仅本地预览，未提交、未推送、未部署。

## 入口

- 电脑端：http://127.0.0.1:8126/?view=library
- 手机尺寸预览：http://127.0.0.1:8126/assets/workflow-mobile-preview.html
- 两个入口运行同一套应用。手机预览是本机浏览器里的 390px 窗口，不是公网手机地址。
- 若服务关闭，在本仓库运行 `node tools/serve-workflow-preview.mjs 8126`。仅监听回环地址。

## 怎么看效果

1. 在方案库的“快速起稿”选一个方向，编辑需求后生成。
2. 查看分镜总表，展开任一镜头，点“编辑分镜与参考”。
3. 修改动作、机位、光线、预计用时；参考仅添加原页链接和借鉴点。
4. 点“安排拍摄”，确定日期、时间和地点。
5. 在方案库或日程打开“拍摄通告”，切换摄影师、模特、摄影助理。
6. 打开“进入当天拍摄”，标记完成或补拍、计时、调整执行次序、保存备注。
7. 刷新重开同一日程，记录仍在；同一方案另一个日期的记录独立。

## 已完成

| 部分 | 本版行为 |
| --- | --- |
| 方案库 | 我的方案在前，显示分镜数量、场景及排期状态；快速起稿在后；每次拍摄有独立入口 |
| 生成结果 | 生成后分镜成为主工作区；需求表单收起，可返回修改；电脑总表、手机纵向列表 |
| 可编辑分镜 | 动作、机位、构图、景别、焦段、光线、备注和预计用时可编辑；保存到方案本身 |
| 参考用途 | 保存原页 URL 和具体借鉴点；明确标注 AI 概念图；普通外链不擅自宣称实拍或已授权 |
| 统一内容 | 当前编辑稿用于页面、打印稿、角色通告和现场；旧 pa_shots 数据保留，首次编辑后以方案本身为准 |
| 拍摄日通告 | 时间、地点、集合点、联系人、妆造、器材和备注；按角色呈现动作或准备重点，可导出打印/PDF |
| 核对记录 | 明确是本机记录；方案或集合信息改变后旧核对失效，不伪造跨账号回执 |
| 现场执行 | 每个 scheduleId 单独保存顺序、待拍/完成/补拍、备注、计时；切换镜头自动暂停上一镜计时 |
| 分镜变更 | 已完成镜头编辑后提示重新核对；原有实拍备注仍保留 |
| 生图保护 | 编辑 Director 分镜后原合同标记待审核，旧候选不冒充新图；可恢复原始生成版后重新使用原合同 |
| 兼容修复 | 生成后不再显示空白提示；本机统计不带本地假 token 请求云端；提示条不拦截按钮 |
| 手机预览封面 | 图片铺满整张方案卡片外层，标题、说明和操作叠在暗色半透明层上；真实方案封面优先，演示图明确标识 AI 概念图；只装饰预览 DOM，不写入方案、引用或用户浏览器数据 |

## 边界

- 8126 使用已有 `createGuestPlanDraft` 规则编排，页面明确标注来源；不是真实 Director 服务性能或图像美学测试。
- 原 `serve-director.mjs` 默认仍调用 Director。本次没有改训练、领域合同或云端生成逻辑。
- 未调用外部生图、未新增供应商、未消耗图像额度。编辑过的 Director 合同不会自动改写或擅自重新生图。
- 本次新增的编辑、通告、现场状态保存于当前浏览器。电脑和手机的独立设备不会因此自动同步。
- 切换角色是内容预览，不是多用户权限隔离。通告导出后由用户自行发给参与人，未接入自动发送和接收人确认。
- 未新增天气、日照、商业图库、LUT 或公开部署；这轮完成的是拍摄工作流本地预览。
- 没有引入或复制其他产品的开源代码，也没有下载外站作品作配图。

## 文件

- `assets/shoot-workflow-model.js`：分镜更新、参考校验、拍摄日状态、角色通告的纯逻辑。
- `assets/shoot-workflow.js`：编辑、通告、现场界面及持久化。
- `assets/shoot-workflow.css`：电脑/手机布局、对话框、状态和低饱和样式。
- `assets/workflow-mobile-preview.html`：390px 本地预览容器。
- `assets/workflow-preview-covers.js`、`assets/demo-covers/`：仅本地手机预览使用的 AI 概念封面和标注，不作为真实拍摄参考。
- `index.html`：挂接入口、结果视图、日程与角色入口、生图旧合同保护。
- `assets/plan-print-export.js`：打印稿补充用时、参考用途与来源。
- `tools/serve-workflow-preview.mjs`：规则草稿预览服务。
- `tools/serve-director.mjs`：增加可注入方案工厂；原有他人修改保留。
- `tests/shoot-workflow.test.mjs`：新增状态、迁移、参考与打印回归测试。

## 验收

自动测试：

```powershell
node --test tests/director-integration.test.mjs tests/plan-print-export.test.mjs tests/shoot-workflow.test.mjs tests/cloud-director-routes.test.mjs
```

结果：32/32 通过。`node --check assets/shoot-workflow.js`、`git diff --check` 通过。

浏览器验证使用 Playwright（Browser plugin not available），全程在独立测试上下文，不写入用户原有浏览器数据。

| 宽度 | 场景 | 结果 |
| --- | --- | --- |
| 1440px | 生成 11 镜、编辑、引用、PDF、两次排期、角色通告、实拍记录、排序、计时、刷新、键盘打开与关闭 | 通过 |
| 390px | 同上；全屏现场模式与纵向分镜总表 | 通过 |
| 360px | 同上；窄屏无页面/对话框横向溢出 | 通过 |

三个上下文均无测试流程相关的 console error/pageerror。测试链接使用 example.com 占位并明确标为测试，不代表任何真实作品或授权。

证据目录：`C:\Users\user\.codex\visualizations\2026\05\31\019e7ca7-6869-7573-b2ba-70bb233283fe`

- `workflow-next-qa.cjs` / `workflow-next-qa.json`：可重跑脚本与结果。
- `workflow-1440-storyboard.png` / `workflow-1440-library.png`：电脑方案和方案库。
- `workflow-390-storyboard.png` / `workflow-390-field.png`：手机方案和现场。
- `workflow-390-editor.png` / `workflow-390-model-call.png`：编辑和模特通告。
- `workflow-1440-plan.pdf` / `workflow-1440-call.pdf`：真实浏览器导出的方案与通告样本。

仓库原有 `outputs/`、`test-results/`、审计工具及其他未提交内容没有删除或打包推送。
