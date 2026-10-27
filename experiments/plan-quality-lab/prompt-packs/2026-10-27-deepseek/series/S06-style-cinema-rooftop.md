# S06 · 电影感青橙调天台

用例 `style-cinema-rooftop`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 建议深色外套以突出青橙对比，妆发自然 | 换衣即断系列 |
| 场地 | 住宅楼天台（已获物业书面许可） | 同一处，背景元素不跑 |
| 光线 | 现场天光，蓝调时刻，无补光，利用天空余晖和远处城市灯光 | 主光方向不变 |
| 调色 | teal shadows and warm skin tones, cinematic contrast, subtle halation | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Cinematic  of an adult standing alone on a residential rooftop during blue hour, back to camera, looking at the sky, dark jacket, teal and orange color grading, distant city lights, eye level, atmospheric, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Cinematic  of an adult standing alone on a residential rooftop during blue hour, back to camera, looking at the sky, dark jacket, teal and orange color grading, distant city lights, eye level, atmospheric, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Cinematic  of an adult standing alone on a residential rooftop during blue hour, back to camera, looking at the sky, dark jacket, teal and orange color grading, distant city lights, eye level, atmospheric, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-cinema-rooftop__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 蓝调天台定场 | 全身 | 平视 | 35mm | f/4 | 距主体约8米，机位高度与胸口齐平，平视 |
| 2 | 孤勇侧影 | 中景 | 平视 | 35mm | f/2.8 | 距主体约5米，机位高度与眼睛齐平，平视 |
| 3 | 细节紧握 | 大特写 | 高机位俯拍 | 35mm | f/1.8 | 距主体约0.5米，机位高度与手部齐平，略俯视 |
| 4 | 远眺城市 | 全身 | 平视 | 35mm | f/4 | 距主体约7米，机位高度与胸口齐平，平视 |
| 5 | 静立凝望 | 近景 | 平视 | 35mm | f/2 | 距主体约4米，机位高度与眼睛齐平，平视 |
| 6 | 仰角孤影 | 中景 | 低机位仰拍 | 35mm | f/2.8 | 距主体约1.5米，机位高度低于腰部，仰拍 |
| 7 | 天台地面特写 | 特写 | 正俯拍 | 35mm | f/1.8 | 距主体约0.3米，机位高度贴近地面，俯视 |
| 8 | 剪影轮廓 | 全景 | 平视 | 35mm | f/5.6 | 距主体约10米，机位高度与胸口齐平，平视 |
| 9 | 表情特写 | 特写 | 平视 | 35mm | f/1.8 | 距主体约0.8米，机位高度与眼睛齐平，平视 |

### S06-01　蓝调天台定场

- 文件名：`style-cinema-rooftop__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约8米，机位高度与胸口齐平，平视
- 动作：背对镜头站立，双臂自然下垂，头部微仰望向前方天空，保持静止
- 道具：无　｜　裁切：画面包含人物全身及天台地面和远处天际线，不裁切头部和脚部
- 必见：人物全身轮廓、天台平台、远处城市灯光与蓝调天空　｜　废片判据：人物不完整、天台边缘不可见、天空过曝或死黑

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/9] 2:3 vertical, Cinematic wide shot of an adult standing alone on a residential rooftop during blue hour, back to camera, looking at the sky, dark jacket, teal and orange color grading, distant city lights, eye level, full body, atmospheric, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S06-02　孤勇侧影

- 文件名：`style-cinema-rooftop__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约5米，机位高度与眼睛齐平，平视
- 动作：身体侧对镜头90度，目光坚定望向前方，双手自然垂于身侧
- 道具：无　｜　裁切：从头顶到膝盖以上，保留部分天台背景
- 必见：人物侧脸轮廓、坚定表情、身体姿态　｜　废片判据：面部过暗、背景杂乱干扰主体、人物姿势松散

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/9] 2:3 vertical, Cinematic medium shot of an adult in profile on a rooftop, looking ahead with determination, dark jacket, teal and orange color grading, blue hour sky, distant city lights, eye level, half body, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S06-03　细节紧握

- 文件名：`style-cinema-rooftop__03.png`
- 景别/角度/焦段/光圈：大特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，机位高度与手部齐平，略俯视
- 动作：手部特写，单手握拳，手臂微微抬起，展示手部关节
- 道具：无　｜　裁切：仅手部及小臂，不露脸
- 必见：手部握拳的细节、皮肤纹理、青橙光线　｜　废片判据：手部模糊、光线平淡、背景干扰

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/9] 2:3 vertical, Cinematic extreme close-up of a clenched fist on a rooftop, teal and orange color grading, blue hour light, high angle, detailed skin texture, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S06-04　远眺城市

- 文件名：`style-cinema-rooftop__04.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约7米，机位高度与胸口齐平，平视
- 动作：侧身站立，一手自然垂放，另一手微抬指向远方，目光跟随手指方向
- 道具：无　｜　裁切：包含人物全身和右侧城市天际线，不裁切人物
- 必见：人物远眺姿态、城市灯光、蓝调天空　｜　废片判据：人物与背景重叠过多、城市灯光不明显、构图失衡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/9] 2:3 vertical, Cinematic full shot of an adult standing on a rooftop pointing towards distant city lights, teal and orange color grading, blue hour, eye level, composition with subject on left third, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S06-05　静立凝望

- 文件名：`style-cinema-rooftop__05.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约4米，机位高度与眼睛齐平，平视
- 动作：正面站立，双手插兜，目光直视镜头，表情平静而坚定
- 道具：无　｜　裁切：从头顶到腰部，保留部分天台背景
- 必见：人物面部表情、眼神、服装细节　｜　废片判据：面部阴影过重、眼神无光、背景过亮

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/9] 2:3 vertical, Cinematic medium close-up of an adult standing on a rooftop facing camera, hands in pockets, calm determined expression, teal and orange color grading, blue hour, eye level, half body, 35mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S06-06　仰角孤影

- 文件名：`style-cinema-rooftop__06.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约1.5米，机位高度低于腰部，仰拍
- 动作：正面站立，双臂微微张开，抬头望天，身体挺直
- 道具：无　｜　裁切：从头顶到膝盖以上，天空占据背景大部分
- 必见：人物挺立姿态、天空、孤勇情绪　｜　废片判据：人物面部完全黑暗、构图松散、天空无细节

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/9] 2:3 vertical, Cinematic low angle shot of an adult standing on a rooftop looking up at the sky, arms slightly open, teal and orange color grading, blue hour, low angle, dramatic, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S06-07　天台地面特写

- 文件名：`style-cinema-rooftop__07.png`
- 景别/角度/焦段/光圈：特写 / 正俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约0.3米，机位高度贴近地面，俯视
- 动作：脚部特写，双脚自然分开站立，鞋底紧贴地面
- 道具：无　｜　裁切：仅脚部及地面纹理，不露腿以上
- 必见：鞋子细节、地面材质、青橙色调　｜　废片判据：脚部模糊、地面无细节、光线过平

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/9] 2:3 vertical, Cinematic close-up of feet standing on a rooftop floor, teal and orange color grading, blue hour light, overhead, ground texture, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S06-08　剪影轮廓

- 文件名：`style-cinema-rooftop__08.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 35mm / f/5.6 / 竖幅
- 机位：距主体约10米，机位高度与胸口齐平，平视
- 动作：背对镜头，双手自然下垂，站在天台中央，面向城市灯光
- 道具：无　｜　裁切：包含人物全身和周围环境，不裁切
- 必见：人物剪影、城市灯光、天台环境　｜　废片判据：剪影不清晰、背景过亮、人物细节丢失

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/9] 2:3 vertical, Cinematic silhouette of an adult standing on a rooftop facing city lights, teal and orange color grading, night, eye level, full body, atmospheric, 35mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S06-09　表情特写

- 文件名：`style-cinema-rooftop__09.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约0.8米，机位高度与眼睛齐平，平视
- 动作：正面面部特写，目光坚定看向镜头，嘴唇微闭
- 道具：无　｜　裁切：从额头到下巴，裁切掉肩膀
- 必见：眼睛、表情、皮肤质感　｜　废片判据：眼睛无光、面部过曝或过暗、表情不自然

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], teal shadows and warm skin tones, cinematic contrast, subtle halation, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/9] 2:3 vertical, Cinematic close-up of an adult's face on a rooftop, determined expression, teal and orange color grading, city lights in eyes, eye level, detailed skin, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cinema-rooftop__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-cinema-rooftop__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

