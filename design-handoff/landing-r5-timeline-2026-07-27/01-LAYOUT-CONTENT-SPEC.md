# PhotoAtelier Landing R5 Layout And Content Specification

## 1. Product Story

The page must let a first-time photographer understand the product in under 30 seconds:

1. Start from one visual reference.
2. Turn it into five executable shots.
3. Attach the real people, place, equipment, and LUT.
4. Put the accepted plan onto a shoot schedule.

The visual hierarchy is photography first, workflow second, technical detail third.

## 2. Visual System

### Palette

| Token | Value | Use |
| --- | --- | --- |
| `landing-bg` | `#080A09` | Main dark canvas |
| `landing-surface` | `#111412` | Product fragments |
| `landing-text` | `#F4F6F3` | Primary copy |
| `landing-muted` | `#9CA49E` | Supporting copy |
| `landing-line` | `#354039` | Timeline and dividers |
| `landing-action` | `#3CCF91` | Primary CTA and active node |
| `landing-action-dark` | `#174D37` | Selected/pressed state |
| `landing-light` | `#F5F6F4` | Optional light editorial band |

Rules:

- No purple, bright blue, neon gradients, orange/brown dominant theme, or multicolor feature categories.
- Photography supplies the changing color.
- Border radius is `0` for page bands, `4px` for media, and at most `6px` for UI fragments and buttons.
- No nested cards, decorative blobs, floating glass cards, fake device frames, or generic SaaS metrics.

### Typography

Web stack:

```css
font-family: Inter, "PingFang SC", "Microsoft YaHei UI",
  "Noto Sans SC", system-ui, -apple-system, "Segoe UI", sans-serif;
```

| Role | Desktop | Mobile | Weight |
| --- | --- | --- | --- |
| Hero title | `clamp(64px, 8.5vw, 126px)` / `0.92` | `48px` / `0.98` | 700 |
| Hero statement | `clamp(26px, 3vw, 44px)` / `1.12` | `25px` / `1.18` | 650 |
| Stage number | `36px` / `1` | `24px` / `1` | 650 |
| Stage heading | `clamp(30px, 3.2vw, 52px)` / `1.06` | `28px` / `1.12` | 650 |
| Body | `16px` / `1.65` | `16px` / `1.6` | 400 |
| Metadata | `12px` / `1.5` | `12px` / `1.5` | 500 |

Letter spacing is `0`. Keep body lines below 65 characters.

## 3. Global Page Anatomy

Desktop content width: `min(1440px, 100%)`.

Inner content width: `min(1280px, calc(100% - 96px))`.

Mobile inner width: `calc(100% - 32px)`.

Page order:

1. Global header.
2. Full-viewport hero.
3. Timeline introduction.
4. Stage 01, left.
5. Stage 02, right.
6. Stage 03, left.
7. Stage 04, right.
8. Centered final CTA.
9. Compact footer.

## 4. Header

Desktop:

- Height: `72px`.
- Position: absolute over hero, then visually becomes solid after the hero.
- Left: `PhotoAtelier` and small `Public Beta` label.
- Right: `体验`, `工作方式`, `隐私`, language selector.
- Do not add pricing, login, blog, account, notification, or hamburger controls.

Mobile:

- Height: `60px`.
- Show brand, language selector, and one `免费开始` action.
- Hide the other header links.

## 5. Hero

### Dimensions

- Desktop: `min-height: 100svh`, target composition `1440 x 900`.
- Mobile: `min-height: 88svh`.
- Full-bleed original GPT Image photography. No image card.

### Content Position

Desktop content:

- Left edge: `clamp(32px, 6vw, 96px)`.
- Bottom edge: `clamp(58px, 10vh, 110px)`.
- Maximum copy width: `760px`.
- The primary subject stays on the right half; text remains readable on a dark left region.

### Exact Copy

Eyebrow:

`摄影生产工作台`

H1:

`PhotoAtelier`

Statement:

`把参考图变成能直接开拍的方案。`

Primary CTA:

`免费开始`

Secondary action:

`查看一次真实拍摄流程`

Trust line:

`无需登录 · 免费体验 · 个人图库由你控制`

### Hero Actions

- Primary CTA routes to `/legacy/?mode=public-beta`.
- Secondary action scrolls to `#shoot-journey`.
- One filled CTA only.
- Keyboard focus must be visible.

## 6. Timeline Introduction

ID: `shoot-journey`

Height: `240px` desktop, `180px` mobile.

Copy:

Eyebrow:

`一次真实拍摄`

Heading:

`从一张参考图，到一份完整拍摄安排。`

Body:

`沿着同一条拍摄线，查看参考、分镜、资源和日程如何逐步确定。`

At the bottom center, start the timeline line. Do not add a separate workflow strip.

## 7. Shared Timeline Geometry

Desktop:

- Timeline container position: relative.
- Vertical line: `left: 50%`, width `1px`.
- Line begins below the introduction and ends above the final CTA.
- Each stage minimum height: `82svh`, minimum `720px`.
- Each stage uses a two-column grid:

```css
grid-template-columns: minmax(0, 1fr) 96px minmax(0, 1fr);
```

- Center track is reserved for the line and node.
- Odd stages use left content and an empty right side.
- Even stages use right content and an empty left side.
- Content maximum width: `520px`.
- Media maximum width: `500px`.

Timeline node:

- Outer circle: `40px`.
- Dark background, `1px` border.
- Active border and number use `landing-action`.
- Connector from line to content: maximum `48px`.

Mobile:

- Line moves to `left: 24px`.
- All stages sit to the right of the line.
- Stage min-height becomes `auto`.
- Minimum gap between stages: `96px`.
- Do not alternate narrow mobile content.

## 8. Stage 01: Reference Image

Side: left.

Number: `01`.

Eyebrow:

`REFERENCE`

Heading:

`先确定真正要靠近的画面。`

Body:

`上传一张原创概念图，明确人物、场景、光线、构图和情绪。`

Visual:

- One `4:5` original GPT Image portrait.
- Caption: `GPT Image 原创概念图`.
- Metadata: `城市建筑 · 黎明侧光 · 安静克制`.
- Mark asset type visibly: `AI 概念图`.
- Never label it as a real photo reference.

## 9. Stage 02: Five-Shot List

Side: right.

Number: `02`.

Eyebrow:

`SHOT LIST`

Heading:

`把方向拆成五个能执行的镜头。`

Body:

`每个镜头给出景别、焦段、机位、动作提示和光线目标。`

Visual:

- Five coherent GPT Image frames using the same fictional adult model, wardrobe, location, and shoot.
- Desktop layout: one vertical sequence, not a mosaic.
- Each row contains thumbnail, shot number, name, focal length, and one execution cue.

Shot copy:

| No. | Name | Lens | Execution cue |
| --- | --- | --- | --- |
| 01 | 环境建立 | 35mm | 低机位，人物进入建筑线条 |
| 02 | 全身停步 | 50mm | 正面站定，保留负空间 |
| 03 | 中景回望 | 85mm | 肩线转动，视线越过镜头 |
| 04 | 情绪特写 | 100mm | 侧逆光，降低动作幅度 |
| 05 | 收束背影 | 135mm | 人物离场，保留日出轮廓 |

## 10. Stage 03: Resources And LUT

Side: left.

Number: `03`.

Eyebrow:

`RESOURCES`

Heading:

`确认场地、人员、设备和画面感觉。`

Body:

`资源只在方案层统一选择，不为每个镜头重复寻找。`

Visual:

Use one PhotoAtelier-owned UI fragment with four rows:

1. `场地` — `城市文化中心外廊`
2. `人员` — `模特 1 · 摄影师 1 · 造型协助 1`
3. `设备` — `Sony A7 IV · 35 / 50 / 85 / 100 / 135mm · 反光板`
4. `LUT` — `柔和自然 · 35%`

LUT display:

- One selected result, not a large LUT catalogue.
- Show `原图 / 套用后` as two small consistent generated crops.
- Caption: `预览不会修改原图`.

## 11. Stage 04: Schedule And Call Sheet

Side: right.

Number: `04`.

Eyebrow:

`SCHEDULE`

Heading:

`最后把方案变成当天能照着走的日程。`

Body:

`确认日期、集合时间和地点后，方案才进入正式拍摄日程。`

Visual:

Schedule:

| Time | Item |
| --- | --- |
| 05:50 | 集合与场地确认 |
| 06:10 | 妆发检查与设备准备 |
| 06:30 | 镜头 01–02 |
| 07:10 | 镜头 03–04 |
| 07:45 | 镜头 05 与补拍 |
| 08:10 | 收工与素材核对 |

Call sheet metadata:

- Location: `城市文化中心外廊`
- Sunrise: `06:18`
- Duration: `2小时20分`
- Backup: `室内灰墙走廊`

## 12. Final CTA

Centered after the timeline.

Minimum height: `520px` desktop, `420px` mobile.

Heading:

`现在把灵感变成能直接开拍的方案。`

Body:

`无需登录。先完成一份方案，再决定是否连接自己的图库。`

Primary:

`免费开始`

Secondary:

`查看隐私说明`

No feature cards below this CTA.

## 13. Footer

- Height: approximately `120px`.
- Brand, `Public Beta`, privacy, sources, feedback, language.
- Source statement:

`本页摄影素材均为 GPT Image 原创概念图，不作为真实拍摄参考来源。`

## 14. Responsive Rules

### 1024–1439px

- Reduce inner gutters to `48px`.
- Stage center track remains.
- Media maximum width becomes `440px`.

### 768–1023px

- Keep center line only if both content columns remain at least `320px`.
- Otherwise switch to the mobile line-left layout.
- Three.js is disabled.

### 390px

- No horizontal overflow.
- H1 wraps safely.
- Hero subject remains visible.
- Timeline line at `24px`; content begins at `54px`.
- Five shots become one vertical list.
- Tap targets at least `44 x 44px`.
- No hover-only information.

## 15. Content Prohibitions

Do not add:

- Pricing or subscription claims.
- Fake user counts, ratings, testimonials, logos, awards, or performance metrics.
- Fake AI accuracy percentages.
- Login/account language.
- "Agent", "local proxy", "gateway", or schema terminology.
- External image-source links.
- A second product dashboard or a feature-card wall.

