# S23 · 商务人士办公室肖像

用例 `ppl-business-portrait`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 商务正装（深色西装外套、浅色衬衫），妆发干净利落 | 换衣即断系列 |
| 场地 | 办公室（落地窗、办公桌现场已有） | 同一处，背景元素不跑 |
| 光线 | 仅用落地窗自然侧光，不开启闪光灯；窗光从模特左前方45度入射，若反差过大可在暗部用白墙反光板补光，但不得直射 | 主光方向不变 |
| 调色 | neutral daylight, clean whites, restrained saturation | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Business portrait of an adult professional standing beside an office desk, side to floor-to-ceiling window, hands relaxed, looking toward window light, dark suit and light shirt, clean grooming, natural window side light, no flash,  with window and desk in frame, trustworthy and capable mood, eye level, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Business portrait of an adult professional standing beside an office desk, side to floor-to-ceiling window, hands relaxed, looking toward window light, dark suit and light shirt, clean grooming, natural window side light, no flash,  with window and desk in frame, trustworthy and capable mood, eye level, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Business portrait of an adult professional standing beside an office desk, side to floor-to-ceiling window, hands relaxed, looking toward window light, dark suit and light shirt, clean grooming, natural window side light, no flash,  with window and desk in frame, trustworthy and capable mood, eye level, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `ppl-business-portrait__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 环境交代·窗光全景 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，相机高度约1.6米，与模特视线平齐 |
| 2 | 窗光侧位·中景半身 | 近景 | 平视 | 85mm | f/2 | 距主体约2米，相机高度约1.2米，略低于模特视线，形成轻微仰感 |
| 3 | 窗光侧位·近景特写 | 特写 | 平视 | 85mm | f/1.8 | 距主体约1.2米，相机高度与模特眼睛平齐 |
| 4 | 背对落地窗·剪影半身 | 中景 | 平视 | 85mm | f/2.8 | 距主体约3米，相机高度约1.5米，与模特胸部平齐 |
| 5 | 桌面工作·中景俯拍 | 中景 | 高机位俯拍 | 35mm | f/2.8 | 距主体约2米，相机高度约1.8米，从上向下俯拍 |
| 6 | 坐姿肖像·中近景平视 | 近景 | 平视 | 85mm | f/2 | 距主体约1.8米，相机高度约1.3米，与模特胸部平齐 |
| 7 | 站立远眺·中景侧影 | 中景 | 平视 | 85mm | f/2.8 | 距主体约2.5米，相机高度约1.5米，与模特胸部平齐 |
| 8 | 细节特写·手部与西装 | 大特写 | 平视 | 85mm | f/1.8 | 距手部约1.2米，相机高度约1米，从侧面平视 |
| 9 | 思考神态·近景侧脸 | 特写 | 平视 | 85mm | f/1.8 | 距主体约1.2米，相机高度约1.2米，与模特眼睛平齐 |
| 10 | 动态转身·中景抓拍 | 中景 | 平视 | 85mm | f/2.8 | 距主体约3米，相机高度约1.5米，与模特胸部平齐 |

### S23-01　环境交代·窗光全景

- 文件名：`ppl-business-portrait__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，相机高度约1.6米，与模特视线平齐
- 动作：站在办公桌旁，身体侧对落地窗，双手自然垂放，目光望向窗外光线方向
- 道具：无　｜　裁切：全身入画，保留落地窗顶部与地面，不裁切头部与脚部
- 必见：落地窗、办公桌一角、人物全身自然站姿与窗外光线方向　｜　废片判据：人物剪影过暗无细节、窗框切割头部、桌面杂物未经同意入镜、闪光灯痕迹

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/10] 2:3 vertical, Business portrait of an adult professional standing beside an office desk, side to floor-to-ceiling window, hands relaxed, looking toward window light, dark suit and light shirt, clean grooming, natural window side light, no flash, full body shot with window and desk in frame, trustworthy and capable mood, eye level, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-02　窗光侧位·中景半身

- 文件名：`ppl-business-portrait__02.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约2米，相机高度约1.2米，略低于模特视线，形成轻微仰感
- 动作：坐在办公桌后，身体微向左侧转，一手轻搭桌面，另一手自然放腿上，目光平视镜头
- 道具：无（桌面原有物品需提前征得同意方可入镜）　｜　裁切：裁切至胸部以上，保留完整头部与肩部，不裁切手部动作
- 必见：模特面部神态、西装领口层次、窗光在脸上的过渡　｜　废片判据：面部阴影过重无细节、眼神呆滞、领口歪斜、背景杂物干扰、补光过硬产生第二阴影

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/10] 2:3 vertical, Business portrait of an adult professional seated at an office desk, body slightly turned left, one hand on desk, looking at camera, dark suit and light shirt, clean hair, natural window side light from left, subtle fill from right, no flash, medium close-up, eye level, trustworthy mood, 85mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-03　窗光侧位·近景特写

- 文件名：`ppl-business-portrait__03.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1.2米，相机高度与模特眼睛平齐
- 动作：身体正对镜头，头部微向左侧窗光方向倾斜，眼神坚定看镜头，嘴角带一丝自信微笑
- 道具：无　｜　裁切：裁切至肩部，保留完整头部与颈部，不裁切额头或下巴
- 必见：眼神光、皮肤纹理、西装面料质感、窗光在眼中的反射　｜　废片判据：眼神光缺失、鼻影过重切断面部、领口不整、反光板穿帮、背景出现可识别人物或杂物

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/10] 2:3 vertical, Close-up business portrait of an adult professional facing camera, head slightly tilted toward window light on left, confident slight smile, dark suit and light shirt with top button open, natural skin texture, window side light from left with soft fill, no flash, eye level, trustworthy and sharp mood, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-04　背对落地窗·剪影半身

- 文件名：`ppl-business-portrait__04.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约3米，相机高度约1.5米，与模特胸部平齐
- 动作：背对落地窗站立，身体正对镜头，双手自然交叠在身前，目光平视镜头
- 道具：无　｜　裁切：裁切至腰部以上，保留完整头部与肩部轮廓，不裁切手臂动作
- 必见：人物剪影轮廓、窗框线条、面部若隐若现的细节　｜　废片判据：面部完全死黑无细节、窗框与人物头部重叠、背景过曝丢失窗格、反光板穿帮

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/10] 2:3 vertical, Half-body silhouette portrait of an adult professional standing with back to floor-to-ceiling window, facing camera, hands clasped in front, dark suit and light shirt, strong window backlight, minimal fill, no flash, eye level, capable and trustworthy mood, 85mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-05　桌面工作·中景俯拍

- 文件名：`ppl-business-portrait__05.png`
- 景别/角度/焦段/光圈：中景 / 高机位俯拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，相机高度约1.8米，从上向下俯拍
- 动作：坐在办公桌前，身体前倾，双手放在桌面上做书写状（无实物动作），目光看向桌面
- 道具：无（仅使用桌面原有物品，且需提前征得同意）　｜　裁切：裁切至人物膝盖以上，保留桌面动作区域与背景窗格
- 必见：模特专注表情、桌面工作姿态、窗光在桌面形成的光影　｜　废片判据：桌面杂物未经同意入镜、人物头部被裁切、俯拍导致面部变形、光线过平无层次

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/10] 2:3 vertical, Medium shot of an adult professional sitting at an office desk, leaning forward, hands on desk as if writing, looking down at desk, dark suit and light shirt, natural window side light, no flash, high angle view, focused and capable mood, background floor-to-ceiling window blurred, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-06　坐姿肖像·中近景平视

- 文件名：`ppl-business-portrait__06.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约1.8米，相机高度约1.3米，与模特胸部平齐
- 动作：坐在办公椅上，背部挺直，双手轻握放在桌沿，目光平视镜头，表情从容
- 道具：无　｜　裁切：裁切至胸部以下、手部以上，保留完整头部与手部动作
- 必见：模特从容表情、手部自然姿态、西装剪裁线条　｜　废片判据：手部动作僵硬、领口歪斜、背景出现杂物、光线过平无立体感

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/10] 2:3 vertical, Medium close-up portrait of an adult professional sitting upright in an office chair, hands lightly gripping desk edge, looking at camera with calm expression, dark suit and light shirt, natural window side light, subtle fill, no flash, eye level, trustworthy mood, 85mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-07　站立远眺·中景侧影

- 文件名：`ppl-business-portrait__07.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，相机高度约1.5米，与模特胸部平齐
- 动作：站在落地窗前，侧身面向窗外，一只手轻搭在窗框或窗台上，目光远眺
- 道具：无　｜　裁切：裁切至大腿中部，保留完整头部与手部动作，窗外景色不裁切过多
- 必见：模特侧脸轮廓、远眺神态、窗框与窗外光线　｜　废片判据：窗外过曝失去细节、人物面部死黑、手部动作不自然、窗框切割头部

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/10] 2:3 vertical, Medium shot of an adult professional standing by floor-to-ceiling window, side profile facing out, one hand resting on window frame, looking into distance, dark suit and light shirt, natural window light, subtle fill, no flash, eye level, contemplative and capable mood, 85mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-08　细节特写·手部与西装

- 文件名：`ppl-business-portrait__08.png`
- 景别/角度/焦段/光圈：大特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距手部约1.2米，相机高度约1米，从侧面平视
- 动作：只拍摄手部：双手在桌面自然交叠，手指微曲，手腕露出衬衫袖口
- 道具：无（若模特自带手表且同意入镜，可作为道具）　｜　裁切：裁切至小臂中部，保留双手完整与部分袖口
- 必见：手部皮肤纹理、西装面料细节、衬衫袖口层次　｜　废片判据：手部动作僵硬不自然、光线过平缺乏质感、背景杂乱、手表未经同意入镜

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/10] 2:3 vertical, Close-up detail shot of hands of an adult professional resting on office desk, fingers slightly curved, suit and shirt cuffs visible, natural window side light, no flash, eye level, shallow depth of field, focused and trustworthy mood, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-09　思考神态·近景侧脸

- 文件名：`ppl-business-portrait__09.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1.2米，相机高度约1.2米，与模特眼睛平齐
- 动作：坐在办公椅上，身体微向前倾，一手轻托下巴，目光看向窗外光线方向，若有所思
- 道具：无　｜　裁切：裁切至肩部以下、手部以上，保留完整头部与托下巴的手
- 必见：模特侧脸轮廓、思考神态、手部托下巴动作　｜　废片判据：手部遮挡过多面部、光线过平无立体感、背景杂乱、眼神空洞

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/10] 2:3 vertical, Close-up of an adult professional sitting at desk, body slightly leaning forward, one hand resting on chin, looking away toward window light, thoughtful expression, dark suit and light shirt, natural window side light, subtle fill, no flash, eye level, contemplative mood, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S23-10　动态转身·中景抓拍

- 文件名：`ppl-business-portrait__10.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约3米，相机高度约1.5米，与模特胸部平齐
- 动作：从背对镜头转身面向镜头，西装外套自然摆动，表情从严肃过渡到微笑
- 道具：无　｜　裁切：裁切至大腿中部，保留完整头部与转身动作
- 必见：转身动态、西装摆动衣角、面部表情变化　｜　废片判据：动态模糊过度、面部失焦、表情不自然、背景线条切割人物

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 10/10] 2:3 vertical, Medium shot of an adult professional turning from back to face camera, suit jacket swaying with motion, expression transitioning from serious to smile, dark suit and light shirt, natural window light, subtle fill, no flash, eye level, dynamic and trustworthy mood, 85mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-business-portrait__REF-A.png. Change only camera position, framing and pose to match FRAME 10. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `ppl-business-portrait__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
| Flux Kontext / nano-banana | 参考图 + "same person as input image" | 多图参考时 REF 放第一位 |
| SDXL + IP-Adapter FaceID / InstantID / PuLID | 参考图作 face embedding，权重 0.7–0.9 | 没有这些插件，纯文生图必漂 |
| SD1.5 + Roop/Reactor 后处理 | 先出图再统一换脸，最后统一调色 | 保底方案，适合批量 |
| 任意模型 + 固定种子 | 同种子同提示词只改机位句 | 仅对同构图有效，换景别仍会漂 |

## 六、一致性自检（出完逐项过，不过就重出该帧）

- [ ] 脸型/五官一致（不是"长得像"，是同一个人）
- [ ] 发型/发色一致
- [ ] 服装一致（版型、颜色、配饰都在）
- [ ] 场地一致（背景建筑、家具、标识不跑）
- [ ] 主光方向一致（阴影落点不跳边）
- [ ] 色温/对比一致（拼在一起不像两张片子）
- [ ] 画幅一致（竖就全竖，不混排）
- [ ] 无文字/水印/多余人

**"同一个人"的量化口径**（不靠肉眼）：用 InsightFace/ArcFace 提取每帧人脸 embedding，与 REF 帧比对余弦相似度——

| 相似度 | 判定 | 处理 |
|---|---|---|
| ≥ 0.55 | 同一人 | 收 |
| 0.40–0.55 | 疑似换脸 | 优先重出；必须用时只保留侧脸/背影帧 |
| < 0.40 | 换人了 | 直接废片，重出

批量脚本可以一次跑完整个系列，把低于阈值的帧号直接列出来。

