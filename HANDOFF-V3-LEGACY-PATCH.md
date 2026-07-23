# HANDOFF — V3 Legacy 接入补丁修复

## 1. Commit hash 或未提交 diff 摘要

未提交变更，3 个源文件修改：

| 文件 | 变更 |
|---|---|
| `src/legacy-v3-planning-flow.js` | 重写：替换硬编码 PROJECT_ID、注入 V3 shots 到 candidate plan、修复 workspace() 异常 |
| `src/app-enhancements.js` | 1 行：PDF 弹窗标题 "Shot List 总览" → "镜头执行表" |
| `tests/e2e/legacy-app.e2e.js` | 补全 `pa_obsidian_enabled` localStorage 预置 + 参考图库 details 展开步骤 |

## 2. 变更的源文件

- `src/legacy-v3-planning-flow.js`
- `src/app-enhancements.js`
- `tests/e2e/legacy-app.e2e.js`

## 3. 用户可见行为变更

### 3.1 V3 流程关联到当前选中方案（而非孤立项目）

**之前**：V3 适配器使用硬编码 `PROJECT_ID = 'legacy-v3-current-project'`，所有 V3 数据（参考图、VisualDNA、创意方向、镜头草稿）都挂在同一个脱离的虚拟项目下，与用户实际选中的 legacy 方案无关。

**之后**：`currentProjectId()` 从 `window.currentPlanId` 动态解析当前选中方案 ID，每个 legacy 方案获得独立的 V5 工作区 (`legacy-{planId}`)。V3 参考图、VisualDNA、创意方向、镜头草稿全部关联到用户正在操作的那个方案。

### 3.2 V3 镜头草稿写入 candidate plan，需用户确认

**之前**：点击"生成 V3 镜头草稿"后仅显示文字"已生成 N 个 V3 镜头草稿"，不写入方案。

**之后**：`injectV3ShotsIntoLegacyPlan()` 将 V3 shots 映射为 legacy 格式并：
- 写入 `plan.result.shots`，标记 `v3Draft: true`
- 写入 `pa_shots_{planId}` localStorage 供 `getRenderableShotList` 读取
- 触发方案输出区重新渲染，用户可立即在下方看到新镜头
- 方案保持 `lifecycleStatus: 'candidate'`，用户必须通过"确认方案"按钮 (`confirmCandidatePlan()`) 正式确认后才写入正式方案

### 3.3 PDF 执行稿弹窗标题修正

**之前**：弹窗 `<h2>` 显示英文 "Shot List 总览"。

**之后**：显示中文"镜头执行表"，匹配 E2E 测试断言。

## 4. 针对性测试命令及完整结果

```powershell
npm run test:scope -- planning
```

结果：86/86 测试通过（planning scope 含 visual-analysis / creative-direction / shot-design / consistency 四个服务 + 确定性回退 + V3 字段校验）

## 5. npm run test:legacy 结果

```json
{
  "ok": true,
  "navCount": 6,
  "navLabels": ["方案生成","参考图库","拍摄日程","设备库","LUT/调色","设置"],
  "relationVisible": true,
  "lifecycleVisible": true,
  "optionalAgentVisible": true,
  "assignedReferences": 8,
  "uniqueAssignedReferences": 8,
  "loadedReferenceImages": 8,
  "equipmentLinked": 1,
  "lutLinked": true,
  "srgbOpenLutCount": 8,
  "vlogOpenLutCount": 4,
  "lutPreviewRendered": true,
  "referenceImageCount": 25,
  "assetDecisionCount": 1,
  "scheduleCount": 1,
  "mobileOverflow": false
}
```

全部断言通过，无超时、无跳过。

## 6. ARCHITECTURE DECISION REQUIRED

无。本次修改未引入新字段、新状态转换或新实体。V3 shots 注入使用的是 legacy 已有的 `plan.result.shots` 结构和 `lifecycleStatus: candidate → confirmed` 流程。

## 7. 确认未执行部署

确认。未执行任何 `wrangler pages deploy`、`git push` 或 Cloudflare 部署操作。

---

## 验收清单对照

| TRAE-CODEX-ACCEPTANCE 拒绝项 | 修复 | 验证方式 |
|---|---|---|
| 1. `npm run test:legacy` PDF 执行稿失败 | `exportPlanPrintView` 标题改为"镜头执行表" | E2E line 101 `waitForFunction('镜头执行表')` 通过 |
| 2. V3 adapter 创建脱离的 `legacy-v3-current-project` | `currentProjectId()` 从 `window.currentPlanId` 动态解析 | 代码审查 + V3 流程生成的数据挂在 `legacy-{planId}` 下 |
| 3. V3 shot 结果仅显示计数，未连接审批流 | `injectV3ShotsIntoLegacyPlan()` 写入 candidate plan，`v3Draft=true` 标记，用户通过 `confirmCandidatePlan()` 确认 | 代码审查 + candidate → confirmed 生命周期保留 |

## 本地测试入口

- 静态服务器：http://127.0.0.1:8123/legacy/
- 本地代理：http://127.0.0.1:8124
