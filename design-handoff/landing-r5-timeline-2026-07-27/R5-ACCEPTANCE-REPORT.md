# PhotoAtelier Landing R5 验收报告

## 任务标识

`LANDING-R5-TIMELINE` — 依据 `04-AGENT-WORK-ORDER.md` 实施，按 `05-ACCEPTANCE-CHECKLIST.md` 验收。

## 1. 变更文件

| 文件 | 类型 | 说明 |
| --- | --- | --- |
| `index.html` | 修改 | R5 landing 重建：hero、journey timeline、4 stages、final CTA、footer |
| `assets/landing.css` | 修改 | R5 视觉系统：黑/白/森林绿、居中时间线、左右交替、移动端折叠导航 |
| `src/landing-motion.js` | 新增 | GSAP 动效层：scroll 进度、stage reveal、reduced-motion 降级、idempotent init |
| `assets/landing-ai/*` | 新增 | 10 个 AI 合成摄影资产（webp + sidecar JSON + manifest + contact sheet） |
| `assets/vendor/gsap/*` | 新增 | GSAP 3.12.5 vendor 交付（gsap.min.js + ScrollTrigger.min.js + NOTICE） |
| `tools/build-localized-landing.mjs` | 修改 | 四语 i18n 翻译字典同步新 landing 文案 |
| `tests/e2e/public-beta.e2e.js` | 修改 | 选择器从 `.product-visual img`/`open_public_beta` 更新为 `.hero-image`/`landing_cta_open_workspace`；移动端断言改为保留「免费开始」CTA |
| `tests/node/landing-structure.test.mjs` | 新增 | 10 项 landing 结构专项测试 |
| `dist-v2/`, `en/`, `ja/`, `ko/` | 生成 | `build:v2` 产物 |

## 2. AI 资产生成与元数据状态

- 资产数量：A01–A10 共 10 项（hero 1 + reference 1 + shots 5 + venue 1 + LUT before/after 2）+ contact sheet
- 格式：WebP，sRGB，均为本地路径 `./assets/landing-ai/*.webp`
- 元数据：每项均有 sidecar JSON，全部 `synthetic=true`
- 体积：hero 63KB（<=450KB），支撑图 21–54KB（<=220KB），初始传输 < 900KB
- 无外部摄影域名 URL
- 虚构模特/服装/场地/光线在 A01–A10 内保持连续

## 3. GSAP 交付方式

- vendor 方式：`assets/vendor/gsap/gsap.min.js` + `assets/vendor/gsap/ScrollTrigger.min.js`
- 版本：GSAP 3.12.5（UMD min）
- 引入：`index.html` 中 `<script defer>` 引入，`landing-motion.js` 幂等初始化
- 降级：GSAP 缺失或出错时 `revealAllStatically()` 保证内容可见
- reduced-motion：`prefers-reduced-motion: reduce` 仅保留 header fade，timeline 进度置满

## 4. 测试运行结果

| 测试 | 命令 | 结果 |
| --- | --- | --- |
| 语法检查 | `npm run test:scope -- ui` | 通过 |
| i18n | `node --test tests/node/i18n.test.mjs` | 5/5 通过 |
| Landing 结构专项 | `node --test tests/node/landing-structure.test.mjs` | 10/10 通过 |
| 构建 | `npm run build:v2` | 通过 |
| Dist smoke | `npm run test:dist` | 通过（24.4 MiB） |
| Public beta E2E | `npm run test:public-beta` | 通过（1440px + 390px） |

## 5. 截图清单

### R5 动效截图（`artifacts/r5-landing/`）

1. `01-desktop-hero-motion.png` — 桌面 hero 动效
2. `02-desktop-stage-01-active.png` — 桌面 Stage 01 激活
3. `03-desktop-stage-02-active.png` — 桌面 Stage 02 激活
4. `04-desktop-stage-03-active.png` — 桌面 Stage 03 激活
5. `05-desktop-stage-04-active.png` — 桌面 Stage 04 激活
6. `06-desktop-final-cta-motion.png` — 桌面 final CTA 动效
7. `07-mobile-hero-motion.png` — 移动端 hero 动效
8. `08-mobile-timeline-motion.png` — 移动端 timeline 动效
9. `09-desktop-reduced-motion.png` — 桌面 reduced-motion 降级

每张均含 `-static.png` 对照版。

### Public beta QA 截图（`artifacts/public-beta-qa/`）

- `landing-desktop.png` — 桌面 landing 全页
- `landing-en-desktop.png` — 英文桌面
- `landing-mobile.png` — 移动端
- `workspace-en.png` — 工作台英文
- `feedback-dialog.png` — 反馈弹窗

## 6. Three.js

省略。未启动 Phase D。

## 7. 未解决问题

无。

- 移动端导航 CSS 已修复：`.nav-feedback` 在 390px 现正确显示为 CTA 按钮（特异性修复：`:not(.nav-feedback)` 排除）
- public-beta.e2e.js 断言已对齐新 landing 结构
- 所有测试通过，无阻塞项
