# S05 · 法式复古咖啡馆

用例 `style-french-cafe`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | long hair worn loose | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 复古风格服装，妆容自然，发型蓬松微乱 | 换衣即断系列 |
| 场地 | 临街咖啡馆（桌椅与杯具现场已有） | 同一处，背景元素不跑 |
| 光线 | 利用窗外自然光与店内暖黄吊灯，无闪光灯，必要时用反光板从模特正面补光 | 主光方向不变 |
| 调色 | warm amber highlights, muted browns, gentle contrast, vintage lens character | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
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
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Full shot of an adult model standing sideways in a French vintage cafe window, one hand resting on a chair back, gazing out, soft daylight and warm interior lighting, no flash, shot with, no photographer reflection, natural lazy mood, eye level, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Full shot of an adult model standing sideways in a French vintage cafe window, one hand resting on a chair back, gazing out, soft daylight and warm interior lighting, no flash, shot with, no photographer reflection, natural lazy mood, eye level, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Full shot of an adult model standing sideways in a French vintage cafe window, one hand resting on a chair back, gazing out, soft daylight and warm interior lighting, no flash, shot with, no photographer reflection, natural lazy mood, eye level, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-french-cafe__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 临街橱窗全景 | 全身 | 平视 | 28mm | f/4 | 距主体约6米，站在街边人行道，机位高度与胸口平齐 |
| 2 | 窗边入座侧影 | 近景 | 平视 | 50mm | f/2 | 距主体约3米，站在店内靠墙一侧，机位高度与眼睛平齐 |
| 3 | 手与杯的细节 | 大特写 | 平视 | 50mm | f/1.8 | 距主体约0.5米，机位高度与桌面平齐 |
| 4 | 慵懒趴桌近景 | 特写 | 高机位俯拍 | 50mm | f/1.8 | 距主体约2米，站在桌子对面，机位略高于模特头部 |
| 5 | 玻璃反光拍法一 | 近景 | 平视 | 50mm | f/2 | 距主体约1.5米，站在玻璃外侧偏左，机位与眼睛平齐，镜头与玻璃成30度角避开倒影 |
| 6 | 玻璃反光拍法二 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1.2米，站在玻璃外侧偏右，机位与眼睛平齐，镜头与玻璃成20度角 |
| 7 | 咖啡馆环境交代 | 全景 | 平视 | 50mm | f/5.6 | 距主体约5米，站在店门内侧，机位与胸口平齐 |
| 8 | 窗光下的侧颜特写 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1米，站在模特侧前方，机位与眼睛平齐 |
| 9 | 低角度慵懒收尾 | 全身 | 低机位仰拍 | 28mm | f/4 | 距主体约3.5米，蹲下，机位离地约50厘米 |

### S05-01　临街橱窗全景

- 文件名：`style-french-cafe__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 28mm / f/4 / 竖幅
- 机位：距主体约6米，站在街边人行道，机位高度与胸口平齐
- 动作：侧身站立，右手轻搭椅背，目光望向窗外，身体重量落在后脚，呈放松站姿
- 道具：临街咖啡馆现场已有的桌椅和杯具　｜　裁切：完整包含橱窗边框、模特全身、前景桌椅和咖啡杯，上方保留店招边缘
- 必见：橱窗玻璃反光、法式复古窗框、模特慵懒站姿　｜　废片判据：画面中出现摄影师倒影、闪光灯痕迹或背景杂乱行人

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/9] 2:3 vertical, Full shot of an adult model standing sideways in a French vintage cafe window, one hand resting on a chair back, gazing out, soft daylight and warm interior lighting, no flash, shot with, no photographer reflection, natural lazy mood, eye level, 28mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: 临街咖啡馆现场已有的桌椅和杯具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S05-02　窗边入座侧影

- 文件名：`style-french-cafe__02.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约3米，站在店内靠墙一侧，机位高度与眼睛平齐
- 动作：侧身坐在窗边椅上，一手托腮，肘部支在桌面，视线低垂
- 道具：桌面已有咖啡杯和托盘　｜　裁切：半身至腰部，保留窗框、手臂和咖啡杯
- 必见：侧脸轮廓、托腮手势、咖啡杯与窗台　｜　废片判据：脸部被窗框遮挡、杯子位置错乱或眼神僵硬

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/9] 2:3 vertical, Medium close-up of an adult model sitting sideways by a cafe window, resting chin on hand, soft window light from left, warm interior fill, vintage French cafe, lazy mood, no flash, 50mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: 桌面已有咖啡杯和托盘.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S05-03　手与杯的细节

- 文件名：`style-french-cafe__03.png`
- 景别/角度/焦段/光圈：大特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，机位高度与桌面平齐
- 动作：右手轻握咖啡杯柄，拇指自然搭在杯沿，手腕放松
- 道具：现场已有的咖啡杯和杯碟　｜　裁切：特写手部与咖啡杯，裁切至手腕，保留杯碟边缘
- 必见：手指自然姿态、杯具细节、桌布纹理　｜　废片判据：手指僵硬、杯具变形或光线过平

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/9] 2:3 vertical, Extreme close-up of a hand gently holding a coffee cup in a French vintage cafe, soft window light, natural skin texture, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: 现场已有的咖啡杯和杯碟.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S05-04　慵懒趴桌近景

- 文件名：`style-french-cafe__04.png`
- 景别/角度/焦段/光圈：特写 / 高机位俯拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约2米，站在桌子对面，机位略高于模特头部
- 动作：双臂交叠趴在桌上，下巴搁在手臂上，眼睛半闭
- 道具：桌面已有咖啡杯　｜　裁切：头部至手臂，裁切掉下半身，保留杯沿
- 必见：慵懒眼神、手臂线条、头发质感　｜　废片判据：面部阴影过重、眼睛全闭或手臂遮挡过多

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/9] 2:3 vertical, Close-up of an adult model resting head on crossed arms at a cafe table, eyes half closed, soft window light from above right, vintage French style, lazy mood, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: 桌面已有咖啡杯.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S05-05　玻璃反光拍法一

- 文件名：`style-french-cafe__05.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，站在玻璃外侧偏左，机位与眼睛平齐，镜头与玻璃成30度角避开倒影
- 动作：站在玻璃内侧，手指轻触玻璃，侧脸朝向镜头，眼神望向窗外
- 道具：无　｜　裁切：半身，包含玻璃反光和模特侧脸
- 必见：玻璃反光层次、模特侧脸、窗外模糊街景　｜　废片判据：摄影师倒影入镜、反光过曝或模特面部模糊

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/9] 2:3 vertical, Medium close-up of an adult model standing behind a cafe window, touching glass, side profile, soft reflections on glass, French vintage cafe, no photographer reflection, no flash, 50mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S05-06　玻璃反光拍法二

- 文件名：`style-french-cafe__06.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1.2米，站在玻璃外侧偏右，机位与眼睛平齐，镜头与玻璃成20度角
- 动作：坐在窗边，身体前倾，手肘撑桌，下巴轻放于交叠的手背，眼睛直视玻璃
- 道具：桌面已有咖啡杯　｜　裁切：胸部以上，保留玻璃反光与杯沿
- 必见：玻璃反光中的模特眼神、手部姿态、咖啡杯　｜　废片判据：摄影师倒影出现、反光过强遮挡面部或眼神呆滞

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/9] 2:3 vertical, Close-up of an adult model sitting at a window, leaning forward, chin on hands, looking into glass, soft reflections, French vintage cafe, no photographer reflection, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: 桌面已有咖啡杯.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S05-07　咖啡馆环境交代

- 文件名：`style-french-cafe__07.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 50mm / f/5.6 / 竖幅
- 机位：距主体约5米，站在店门内侧，机位与胸口平齐
- 动作：坐在画面深处，身体侧向窗户，手持咖啡杯，自然放松
- 道具：现场已有的桌椅、杯具和窗边装饰　｜　裁切：全景，包含天花板吊灯、地面、多组桌椅
- 必见：咖啡馆空间布局、复古陈设、模特与环境关系　｜　废片判据：画面杂乱、光线不均或模特被遮挡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/9] 2:3 vertical, Wide shot of a French vintage cafe interior, an adult model sitting in the background near window, foreground empty tables and chairs, warm ambient light, no flash, 50mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 现场已有的桌椅、杯具和窗边装饰.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S05-08　窗光下的侧颜特写

- 文件名：`style-french-cafe__08.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，站在模特侧前方，机位与眼睛平齐
- 动作：头部微仰，侧脸迎向窗光，眼睛微闭，嘴唇放松
- 道具：无　｜　裁切：特写头部至颈部，裁切至头顶上方
- 必见：睫毛、皮肤纹理、光影过渡　｜　废片判据：皮肤过曝、阴影死黑或眼神造作

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/9] 2:3 vertical, Close-up side profile of an adult model in a cafe, face turned to window light, eyes gently closed, soft light and shadow, French vintage, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S05-09　低角度慵懒收尾

- 文件名：`style-french-cafe__09.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 28mm / f/4 / 竖幅
- 机位：距主体约3.5米，蹲下，机位离地约50厘米
- 动作：身体斜靠椅背，一条腿伸展，手臂垂落，眼神慵懒看向镜头
- 道具：现场已有的桌椅和杯具　｜　裁切：全身，包含地面与天花板边缘，强调低角度透视
- 必见：慵懒姿态、腿部线条、咖啡馆空间感　｜　废片判据：人物变形、背景杂乱或光线昏暗

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], warm amber highlights, muted browns, gentle contrast, vintage lens character, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/9] 2:3 vertical, Full shot from low angle of an adult model lounging on a chair in a French vintage cafe, lazy gaze, window light backlight, no flash, 28mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-french-cafe__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: 现场已有的桌椅和杯具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-french-cafe__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

