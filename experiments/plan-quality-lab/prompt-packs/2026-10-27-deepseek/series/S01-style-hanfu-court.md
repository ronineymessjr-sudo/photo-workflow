# S01 · 古风汉服庭院人像

用例 `style-hanfu-court`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | long hair worn loose | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 汉服裙摆自然垂落，妆发整洁 | 换衣即断系列 |
| 场地 | 江南园林庭院（白天） | 同一处，背景元素不跑 |
| 光线 | 自然光，模特面朝门洞光源，正面用白色反光板补光，光比1:2 | 主光方向不变 |
| 调色 | low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Chinese ancient style, a lady in hanfu standing inside a moon gate in a Jiangnan garden, side pose, hands folded, eyes looking down, natural daylight, elegant and restrained mood, flowing skirt, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Chinese ancient style, a lady in hanfu standing inside a moon gate in a Jiangnan garden, side pose, hands folded, eyes looking down, natural daylight, elegant and restrained mood, flowing skirt, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Chinese ancient style, a lady in hanfu standing inside a moon gate in a Jiangnan garden, side pose, hands folded, eyes looking down, natural daylight, elegant and restrained mood, flowing skirt, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-hanfu-court__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 月洞门框景开场 | 全身 | 平视 | 85mm | f/4 | 距主体约4米，机位高度1.5米，正对月洞门中心 |
| 2 | 庭院小径漫步 | 全身 | 平视 | 85mm | f/4 | 距主体约3.5米，机位高度1.2米，侧面跟随 |
| 3 | 月洞门二镜半身特写 | 近景 | 平视 | 85mm | f/2 | 距主体约3米，机位高度1.6米，正对月洞门 |
| 4 | 廊下倚柱侧影 | 全身 | 平视 | 85mm | f/4 | 距主体约4米，机位高度1.4米，在廊柱斜前方 |
| 5 | 裙摆铺开坐姿 | 全身 | 平视 | 85mm | f/4 | 距主体约3.5米，机位高度1.5米，正前方略侧 |
| 6 | 面部特写眼神 | 特写 | 平视 | 85mm | f/1.8 | 距主体约3米，机位高度1.6米，正对模特脸部 |
| 7 | 手部细节特写 | 大特写 | 高机位俯拍 | 85mm | f/1.8 | 距主体约3米，机位高度1.2米，俯拍手部 |
| 8 | 庭院全景环境人像 | 全景 | 平视 | 85mm | f/5.6 | 距主体约5米，机位高度1.6米，正面拍摄 |
| 9 | 回眸半身 | 近景 | 平视 | 85mm | f/2 | 距主体约3.5米，机位高度1.5米，侧后方 |

### S01-01　月洞门框景开场

- 文件名：`style-hanfu-court__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度1.5米，正对月洞门中心
- 动作：侧身站立，双手交叠于腹前，视线望向镜头外斜下方
- 道具：无　｜　裁切：上至门框顶部，下至裙摆边缘，左右包含完整门洞
- 必见：月洞门框景、模特全身、裙摆垂顺　｜　废片判据：门框不完整、模特出框、反光板穿帮

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/9] 2:3 vertical, Chinese ancient style, a lady in hanfu standing inside a moon gate in a Jiangnan garden, side pose, hands folded, eyes looking down, natural daylight, full body shot, elegant and restrained mood, flowing skirt, 85mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S01-02　庭院小径漫步

- 文件名：`style-hanfu-court__02.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约3.5米，机位高度1.2米，侧面跟随
- 动作：缓步向前，双手自然交叠于身前，目光低垂
- 道具：无　｜　裁切：全身，上下留出小径环境，左右包含部分廊柱
- 必见：模特行走动态、裙摆摆动、庭院小径与廊柱环境　｜　废片判据：步伐僵硬、裙摆糊成一片、背景杂乱的游客

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/9] 2:3 vertical, Chinese ancient style, a lady in hanfu walking slowly on a garden path, hands folded, eyes down, side view, natural daylight, full body, elegant and restrained, 85mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S01-03　月洞门二镜半身特写

- 文件名：`style-hanfu-court__03.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约3米，机位高度1.6米，正对月洞门
- 动作：身体微侧，一手轻抬至胸前，手指微曲，目光望向镜头
- 道具：无　｜　裁切：半身，上至头顶留空，下至腰部，左右包含部分门框
- 必见：模特半身、月洞门框景、面部表情婉约　｜　废片判据：面部阴影过重、门框切割头部、表情僵硬

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/9] 2:3 vertical, Chinese ancient style, a lady in hanfu half-body inside a moon gate, side pose, one hand raised to chest, looking at camera, soft natural light, gentle expression, 85mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S01-04　廊下倚柱侧影

- 文件名：`style-hanfu-court__04.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度1.4米，在廊柱斜前方
- 动作：侧身倚靠廊柱，一手轻扶柱子，目光望向廊外
- 道具：无　｜　裁切：全身，包含廊柱和部分庭院背景
- 必见：模特倚柱姿态、廊柱结构、庭院环境　｜　废片判据：倚柱姿势别扭、廊柱遮挡面部、背景过曝

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/9] 2:3 vertical, Chinese ancient style, a lady in hanfu leaning against a wooden pillar in a garden corridor, side view, one hand on pillar, looking outside, soft reflected light, full body, 85mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S01-05　裙摆铺开坐姿

- 文件名：`style-hanfu-court__05.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约3.5米，机位高度1.5米，正前方略侧
- 动作：端坐于石阶上，双腿并拢斜放，双手叠放膝上，目光平视
- 道具：无　｜　裁切：全身，重点展示裙摆铺开形状，上下留出环境
- 必见：裙摆铺开的形态、模特坐姿、石阶环境　｜　废片判据：裙摆被风吹乱未整理、坐姿不雅、裙摆超出画面

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/9] 2:3 vertical, Chinese ancient style, a lady in hanfu sitting on a stone step, skirt spread out, hands folded on lap, natural side light, full body, dignified pose, 85mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S01-06　面部特写眼神

- 文件名：`style-hanfu-court__06.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约3米，机位高度1.6米，正对模特脸部
- 动作：面部微侧，眼神低垂，嘴角含羞
- 道具：无　｜　裁切：特写，上至发际线，下至锁骨，左右留出少量空间
- 必见：面部细节、眼神情绪、皮肤质感　｜　废片判据：面部阴影杂乱、眼神失焦、妆容油光

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/9] 2:3 vertical, Chinese ancient style, close-up of a lady's face in hanfu, eyes downcast, gentle smile, soft light, detailed skin texture, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S01-07　手部细节特写

- 文件名：`style-hanfu-court__07.png`
- 景别/角度/焦段/光圈：大特写 / 高机位俯拍 / 85mm / f/1.8 / 竖幅
- 机位：距主体约3米，机位高度1.2米，俯拍手部
- 动作：双手交叠，手指纤长，袖口露出
- 道具：无　｜　裁切：特写，仅包含手部和部分袖口
- 必见：手部姿势、手指细节、袖口纹理　｜　废片判据：手部抖虚、袖口杂乱、光线平淡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/9] 2:3 vertical, Chinese ancient style, close-up of hands folded in hanfu sleeves, delicate fingers, soft side light, detail shot, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S01-08　庭院全景环境人像

- 文件名：`style-hanfu-court__08.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 85mm / f/5.6 / 竖幅
- 机位：距主体约5米，机位高度1.6米，正面拍摄
- 动作：站立于庭院中央，背对镜头，微微侧头
- 道具：无　｜　裁切：全景，包含庭院建筑、植物和模特全身
- 必见：庭院环境全貌、模特与环境的比例关系　｜　废片判据：环境杂乱、模特太小、建筑切割不当

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/9] 2:3 vertical, Chinese ancient style, a lady in hanfu standing in a Jiangnan garden, back to camera, head slightly turned, full body, environmental portrait, natural daylight, 85mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S01-09　回眸半身

- 文件名：`style-hanfu-court__09.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约3.5米，机位高度1.5米，侧后方
- 动作：向前行走时突然回眸，裙摆微转
- 道具：无　｜　裁切：半身，包含头部至腰部，背景虚化
- 必见：回眸瞬间、面部表情、裙摆动态　｜　废片判据：回眸生硬、裙摆糊、面部阴影过重

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/9] 2:3 vertical, Chinese ancient style, a lady in hanfu walking then looking back over shoulder, half-body, dynamic skirt, side backlight, graceful moment, 85mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-hanfu-court__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-hanfu-court__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

