# S16 · 自助洗衣店之夜

用例 `scene-laundry-night`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 美式复古休闲装：牛仔夹克、白色T恤、深色直筒裤、帆布鞋；发型自然蓬松；妆面干净。品牌。 | 换衣即断系列 |
| 场地 | 24小时自助洗衣店 | 同一处，背景元素不跑 |
| 光线 | 店内荧光灯顶光为主，利用门口自然光与室内荧光灯混合，不开闪光灯。 | 主光方向不变 |
| 调色 | warm amber highlights, muted browns, gentle contrast, vintage lens character | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, A  of an adult model entering a 24-hour laundromat at night, wearing a vintage denim jacket, white t-shirt, dark straight pants, and canvas shoes, pushing the door open, natural relaxed expression, illuminated by fluorescent lights, no flash, shot on, eye level, American retro style, lifestyle photography, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, A  of an adult model entering a 24-hour laundromat at night, wearing a vintage denim jacket, white t-shirt, dark straight pants, and canvas shoes, pushing the door open, natural relaxed expression, illuminated by fluorescent lights, no flash, shot on, eye level, American retro style, lifestyle photography, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, A  of an adult model entering a 24-hour laundromat at night, wearing a vintage denim jacket, white t-shirt, dark straight pants, and canvas shoes, pushing the door open, natural relaxed expression, illuminated by fluorescent lights, no flash, shot on, eye level, American retro style, lifestyle photography, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-laundry-night__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 洗衣店夜光全景 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，机位高度约1.5米，平视。 |
| 2 | 中景装载衣物 | 中景 | 低机位仰拍 | 35mm | f/2.8 | 距主体约2米，机位高度约1.2米，略低角度。 |
| 3 | 滚筒玻璃后的脸特写1 | 特写 | 平视 | 35mm | f/1.8 | 机位贴近滚筒玻璃30厘米，高度与模特脸部平齐。 |
| 4 | 滚筒玻璃后的脸特写2 | 特写 | 平视 | 35mm | f/1.8 | 机位贴近滚筒玻璃30厘米，高度与模特脸部平齐，侧面角度。 |
| 5 | 中景等待洗衣 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，机位高度约1.5米，平视。 |
| 6 | 近景整理衣领 | 近景 | 平视 | 35mm | f/2 | 距主体约1.5米，机位高度约1.4米，平视。 |
| 7 | 全景倚机阅读 | 全身 | 低机位仰拍 | 35mm | f/4 | 距主体约3.5米，机位高度约1.2米，略低角度。 |
| 8 | 中近景凝视滚筒 | 近景 | 平视 | 35mm | f/2 | 距主体约2米，机位高度约1.3米，平视。 |
| 9 | 近景手部特写 | 特写 | 高机位俯拍 | 35mm | f/1.8 | 距主体约1米，机位高度约1.2米，俯视。 |

### S16-01　洗衣店夜光全景

- 文件名：`scene-laundry-night__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度约1.5米，平视。
- 动作：模特推门进入洗衣店，身体半侧，右手扶门把，左手自然下垂，视线扫向店内。
- 道具：无（仅店内现有滚筒洗衣机、荧光灯）。　｜　裁切：完整保留模特全身和门框，顶部留出荧光灯管，底部不裁脚。
- 必见：模特全身、洗衣店门框、店内滚筒洗衣机阵列、荧光灯管。　｜　废片判据：模特被裁切不完整，其他顾客正面入镜，出现闪光灯硬影。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/9] 2:3 vertical, A full-body shot of an adult model entering a 24-hour laundromat at night, wearing a vintage denim jacket, white t-shirt, dark straight pants, and canvas shoes, pushing the door open, natural relaxed expression, illuminated by fluorescent lights, no flash, shot on, eye level, wide shot, American retro style, lifestyle photography, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S16-02　中景装载衣物

- 文件名：`scene-laundry-night__02.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高度约1.2米，略低角度。
- 动作：模特站在洗衣机前，弯腰将衣物放入滚筒，双手动作，侧脸朝向镜头。
- 道具：无（仅店内现有洗衣机、衣物）。　｜　裁切：裁切至大腿中部，保留手部动作和洗衣机滚筒开口。
- 必见：模特侧脸、手部放入衣物的动作、洗衣机滚筒。　｜　废片判据：手部模糊，洗衣机滚筒开口不完整，其他顾客正面入镜。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/9] 2:3 vertical, A medium shot of an adult model loading clothes into a washing machine in a laundromat, side profile, wearing a white t-shirt and dark pants, denim jacket draped over shoulder, natural relaxed expression, illuminated by overhead fluorescent lights, no flash, shot on, slightly low angle, American retro lifestyle, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S16-03　滚筒玻璃后的脸特写1

- 文件名：`scene-laundry-night__03.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：机位贴近滚筒玻璃30厘米，高度与模特脸部平齐。
- 动作：模特蹲在洗衣机前，脸贴近滚筒玻璃，双手轻扶玻璃边缘，眼神好奇地看向滚筒内部。
- 道具：无。　｜　裁切：裁切至头部和肩部，滚筒玻璃边缘入画。
- 必见：模特脸部、滚筒玻璃反光、眼神。　｜　废片判据：玻璃反光过强遮挡面部，脸部失焦，出现闪光灯。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/9] 2:3 vertical, A close-up shot of an adult model's face seen through the glass door of a washing machine, hands gently touching the glass, curious expression, illuminated by soft fluorescent light from inside the machine and overhead, no flash, shot on at 30cm distance, eye level, American retro style, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S16-04　滚筒玻璃后的脸特写2

- 文件名：`scene-laundry-night__04.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：机位贴近滚筒玻璃30厘米，高度与模特脸部平齐，侧面角度。
- 动作：模特侧脸贴近滚筒玻璃，闭眼微笑，额头轻靠玻璃，表现出松弛感。
- 道具：无。　｜　裁切：裁切至头部和颈部，保留玻璃边缘。
- 必见：模特闭眼微笑的侧脸、玻璃上的轻微反光。　｜　废片判据：表情僵硬，玻璃反光过曝，脸部不清晰。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/9] 2:3 vertical, A close-up shot of an adult model's side profile leaning against the glass door of a washing machine, eyes closed, gentle smile, relaxed mood, illuminated by side fluorescent light, no flash, shot on at 30cm distance, eye level, American retro style, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S16-05　中景等待洗衣

- 文件名：`scene-laundry-night__05.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度约1.5米，平视。
- 动作：模特靠在洗衣机旁，双手插兜，目光望向洗衣机方向，身体放松。
- 道具：无。　｜　裁切：裁切至膝盖以上，保留洗衣机操作面板。
- 必见：模特松弛姿态、洗衣机、店内环境背景。　｜　废片判据：姿势僵硬，背景杂乱，其他顾客正面入镜。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/9] 2:3 vertical, A medium shot of an adult model leaning against a washing machine in a laundromat, hands in pockets, looking towards the machine, relaxed posture, wearing a denim jacket and white t-shirt, illuminated by overhead fluorescent lights, no flash, shot on, eye level, American retro lifestyle, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S16-06　近景整理衣领

- 文件名：`scene-laundry-night__06.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度约1.4米，平视。
- 动作：模特低头整理牛仔夹克的衣领，手指动作细腻，眼神向下。
- 道具：无。　｜　裁切：裁切至胸部，突出手部和衣领细节。
- 必见：模特手部整理衣领的动作、衣领细节。　｜　废片判据：手部动作模糊，衣领不清晰，光线过暗。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/9] 2:3 vertical, A close-up shot of an adult model adjusting the collar of a denim jacket, looking down, detailed hand movement, wearing a white t-shirt, illuminated by overhead fluorescent light, no flash, shot on, eye level, American retro style, 35mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S16-07　全景倚机阅读

- 文件名：`scene-laundry-night__07.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 35mm / f/4 / 竖幅
- 机位：距主体约3.5米，机位高度约1.2米，略低角度。
- 动作：模特坐在洗衣机前的长椅上，低头看手中的杂志（假设杂志为现场道具，若无可改为看手机或发呆），双腿交叉，姿态放松。
- 道具：杂志（若现场无则改为无道具，动作改为发呆）。　｜　裁切：保留全身和周围洗衣机，顶部留荧光灯。
- 必见：模特放松坐姿、杂志（如有）、洗衣机环境。　｜　废片判据：道具不存在，姿势不自然，裁切脚部。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/9] 2:3 vertical, A full-body shot of an adult model sitting on a bench in a laundromat, reading a magazine, legs crossed, relaxed posture, wearing a denim jacket and white t-shirt, illuminated by overhead fluorescent lights, no flash, shot on, slightly low angle, American retro lifestyle, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 杂志（若现场无则改为无道具，动作改为发呆）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S16-08　中近景凝视滚筒

- 文件名：`scene-laundry-night__08.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约2米，机位高度约1.3米，平视。
- 动作：模特站在洗衣机前，双手撑在机器上，身体前倾，凝视滚筒内的衣物旋转。
- 道具：无。　｜　裁切：裁切至腰部，保留滚筒和手部。
- 必见：模特凝视表情、手撑机器、滚筒内衣物。　｜　废片判据：眼神不聚焦，滚筒内无衣物，光线平淡。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/9] 2:3 vertical, A medium close-up shot of an adult model standing in front of a washing machine, hands resting on the machine, leaning forward, gazing into the rotating drum, wearing a denim jacket and white t-shirt, illuminated by overhead fluorescent light and drum light, no flash, shot on, eye level, American retro style, 35mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S16-09　近景手部特写

- 文件名：`scene-laundry-night__09.png`
- 景别/角度/焦段/光圈：特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度约1.2米，俯视。
- 动作：模特的手轻抚洗衣机操作面板，手指按下按钮，动作缓慢。
- 道具：无。　｜　裁切：裁切至手腕，突出手指和按钮。
- 必见：手指按按钮的动作、操作面板细节。　｜　废片判据：手部模糊，按钮不清晰，光线过暗。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/9] 2:3 vertical, A close-up shot of an adult model's hand pressing a button on a washing machine control panel, wearing a denim jacket sleeve, illuminated by overhead fluorescent light, no flash, shot on, high angle, American retro style, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-laundry-night__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-laundry-night__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

