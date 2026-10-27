# 提示词交付包 · DeepSeek 真实端到端 28 组

生成时间：2026-10-27T04:11:23.042Z　用例：28 组　镜头：259

## 文件清单

> **现在只交这一份：`PROMPTS-GRID.md`。** 28 个系列 = 28 条提示词，一条生成一张 3×3 九宫格，裁开就是一套组图。
> 为什么要这样：**分开调用 9 次，人物一定漂**（每次从噪声重采一张脸，提示词锁不住）；**一张画布出 9 格，人物天然一致**（同一次采样）。这是不装本地模型时唯一可靠的锁。

| 文件 | 给谁看 | 用途 |
|---|---|---|
| **`PROMPTS-GRID.md` / `.jsonl`** | **生图直接用** | **单图多格：每系列 1 张九宫格，含裁剪对照表** |
| `PROMPTS-ALL.md` / `.txt` | 备查 | 逐帧提示词（343 条），用于单帧精修或换参考图重出 |
| `01-人看版-拍摄详单.md` | 人 | 每镜 15 字段 + 画幅/光圈/快门/ISO/白平衡 |
| `02`~`03` | 备查 | GPT 版与弱模型版逐帧提示词 |
| `04-自审报告.md` | 人 | 方案自洽性 + 与小红书爆款差距 |
| `06-回图审核-12镜小样.md` | 人 | 上一批拼贴的逐格审核（3 个 C 档问题） |
| `07-AI味诊断与去AI化方案.md` | 人 | AI 味 10 个信号 + 去 AI 化两步法 |
| `08-本地锁定管线方案.md` | **已搁置** | 本地 ComfyUI + FaceID 方案，仅技术备查，不采用 |
| `01-人看版-拍摄详单.md` | 人 | 每镜 15 字段 + 推导出的画幅/光圈/快门/ISO/白平衡，用于核对方案本身 |
| `02-提示词-GPTImage.md` / `.jsonl` | GPT Image 2 / 2.5 | 完整自然语言提示词（已补画幅、光圈、景深、写实约束） |
| `03-提示词-弱模型.md` / `.jsonl` | SDXL / SD1.5 / Turbo / Flux-schnell | 精简标签式正向 + 固化负向 + 参数档位 |
| `04-自审报告.md` | 人 | 方案自洽性审核 + 与小红书爆款规律的差距 |
| `05-回图验收清单.md` | 我（回图后审） | 逐图打分标准与判定口径 |
| `06-prompts-all.json` | 程序 / 另一会话 | 全字段 + 两版提示词的结构化总表 |
| `06-回图审核-12镜小样.md` | 人 | 5 张拼贴的逐格审核结论（含 3 个 C 档问题） |
| `series/` | **生图主入口** | 28 个系列组图包：系列圣经 + 定妆参考帧 + 分镜序列 + 拼贴规范 + 一致性自检 |

## ⚠️ 生成单元：不是"一镜一图"，是"一次拍摄一套组图"

第一轮的错误做法：12 个不同主题各出 1 张，拼成"精选集"——结果 5 次重跑换了 5 组人脸和衣服，成不了系列。

正确做法：**1 个主题 = 1 次拍摄 = 一个系列 = 9–10 帧同一人同一场景的组图**。

每个系列的出图顺序（`series/S01…S28` 每份都写好了）：

1. **定妆参考帧 3 张**（正面胸像 / 45° 侧脸 / 全身定妆）→ 挑一张作 **REF**
2. **以 REF 为参考图逐帧图生图**（编辑模式，`input_fidelity` 调高），提示词只改机位与姿势
3. **全系列出完 → 排 3×3 / 4×3 接触印样**
4. **过一遍一致性自检 7 项**（脸 / 发 / 衣 / 场地 / 光位 / 色温 / 画幅）

三条硬规矩：
- 英文提示词里**不重复描述**人物与服装，只用 `same person / same outfit as the reference image`——既避免中英混写拖累模型，又比再描述一遍更严格。
- **图内绝对不生成文字**。上一轮 12 格里 5 格的焦段/光圈是模型自己编的（16mm f/8 写成 f/4、50mm f/1.8 写成 85mm f/2.8），标签一律后期排版加。
- 同系列**一套调色**，否则拼在一起就是"精选集"不是"一次拍摄"。

## 人物不变、风格不变 —— 怎么被强制住的

每个系列里，**每帧提示词的开头是两段逐字相同的锁**（不是"大概写得像"）：

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
[STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, ..., one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

三道保险：

1. **字符串级一致**：`check-series-consistency.mjs` 逐帧比对两段锁和 hash，任何一帧被改动、画幅混排、正文混进中文，都会直接报错（当前 28 系列 259 帧全过）。
2. **参考图为准**：身份不靠文字描述锁，靠 REF 图编辑（GPT Image 2 编辑模式 / Flux Kontext / IP-Adapter FaceID / InstantID）。
3. **可量化验收**：用 InsightFace 比对每帧与 REF 的人脸相似度，≥0.55 同一人、0.40–0.55 疑似换脸、<0.40 直接废片。

身份卡（Identity Card）里把性别年龄、发型、脸型五官、肤色妆容、服装、场地、光线、调色逐项写死；换任何一项都要全系列重出，不允许"这一帧换件衣服"。

## 治"AI 味"：第三道锁 [REALISM LOCK]

上一批图的问题是"AI 味太重、不像真的"。诊断与做法见 **`07-AI味诊断与去AI化方案.md`**，核心是提示词里不能只写 `photorealistic` 这种形容词，要给物理约束：

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain,
skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching,
no beauty filter, available light with true falloff, the unlit side drops into shadow,
mixed colour temperature between window light and practicals, real venue with wear:
scuffed stone, faint water stains, dust in the air, a few scattered real objects,
natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette,
documentary realism, not an advertisement
```

配套负面：`plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop`。

**光靠提示词只能压到一半，第二步必做**：出图后做 img2img 低重绘（denoise 0.15–0.25，提示词只写 `35mm film scan, natural grain, unretouched skin`），再叠 5–8% 胶片颗粒。可选再叠一张真实场地照做 reference（IP-Adapter 权重 0.3–0.4），把"布景感"压下去。

验收按 16 分真实感评分卡（皮肤/光比/逆光/虚化/场地/发丝衣料/手部/一致性），≥12 分可用、8–11 需回炉、<8 重出。

## 回图命名规范（重要）

请按 `{用例ID}__{两位镜号}.png` 命名，例如 `style-hanfu-court__01.png`。
系列参考帧命名 `{用例ID}__REF-A.png` / `__REF-B.png` / `__REF-C.png`。
放回目录：`prompt-packs/2026-10-27-deepseek/returned/<模型名>/`，我按文件名自动对回方案逐镜审核。

## 建议的喂图批次

1. **先跑 12 镜小样**，确认口径再全量。这 12 镜覆盖了最容易翻车的类型（竖幅全身、低角度仰拍、微俯半身、贴脸特写、逆光发丝、超广角、长焦压缩、多人、无人物元素）：

| # | 镜头 ID | 类型 | 为什么选它 |
|---|---|---|---|
| 1 | `style-hanfu-court#1` | 85mm 竖幅全身 | 检验竖屏全身构图与门框框景 |
| 2 | `style-minimal-white#1` | 50mm 大留白 | 检验负空间与干净背景 |
| 3 | `ppl-skater-dusk#2` | 24mm 低角度仰拍 | 检验透视拉长与广角畸变 |
| 4 | `ppl-business-portrait#5` | 35mm 高机位俯拍 | 检验俯拍是否拍成大头娃娃 |
| 5 | `style-newchinese-tea#3` | 40cm 手部特写 | 检验手部与道具细节 |
| 6 | `style-flower-field#3` | 135mm 背景压缩 | 检验长焦压缩与虚化 |
| 7 | `scene-spiral-stairs#1` | 16mm 超广角俯拍 | 检验极端透视与几何 |
| 8 | `scene-museum-quiet#4` | 50mm 侧脸近景 | 检验射灯光斑与侧脸轮廓 |
| 9 | `ppl-kids-sportsday#9` | 200mm 远距抓拍 | 检验远摄压缩与人数控制 |
| 10 | `scene-parking-garage#2` | 24mm 冷调低角度 | 检验低光噪点与色温 |
| 11 | `ppl-cat-home#6` | 30cm 趴地低角度 | 检验人与宠物同框 |
| 12 | `scene-pool-dusk#6` | 逆光剪影 | 检验逆光曝光与人脸可辨 |

2. 弱模型单独目录，跑同一批 12 镜，看降级到什么程度。
3. 每镜同参数出 3 张，取最好一张进验收（弱模型尤其必要）。

## 关于"弱模型能不能控住质量"

能控住下限，控不住上限，办法是四个手段叠加（详见 `03` 的末尾）：
1. **提示词降维**：≤60 token 的视觉标签，去掉距离数字与否定句（弱模型会把 "no flash" 画成闪光灯）。
2. **负向固化**：手部/多肢/文字水印/过度饱和等一律进负面，不占正向权重。
3. **比例锁定**：竖幅 832×1216、横幅 1216×832，避免 1024 方图裁切导致构图崩坏。
4. **多种子取样 + 阈值验收**：每镜 3 种子，按 `05` 的清单过线即收，不过线就换种子或改用图生图修补。
