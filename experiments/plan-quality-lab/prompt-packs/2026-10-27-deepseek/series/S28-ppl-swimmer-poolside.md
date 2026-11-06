# S28 · 游泳者出水瞬间

用例 `ppl-swimmer-poolside`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 泳帽与泳镜按现场既有装备，款式颜色；无额外妆发 | 换衣即断系列 |
| 场地 | 室内游泳馆（已获许可，池畔拍摄） | 同一处，背景元素不跑 |
| 光线 | 使用泳馆顶部既有照明，关掉所有闪光灯；ISO提高保证1/1000秒以上快门 | 主光方向不变 |
| 调色 | bright airy pastel, golden backlight bloom, clean highlights | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, side view , adult swimmer rising from water with one arm sweeping upward, water droplets chained in air, indoor pool ceiling light, reflector fill, no flash, muscular dynamic, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, side view , adult swimmer rising from water with one arm sweeping upward, water droplets chained in air, indoor pool ceiling light, reflector fill, no flash, muscular dynamic, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, side view , adult swimmer rising from water with one arm sweeping upward, water droplets chained in air, indoor pool ceiling light, reflector fill, no flash, muscular dynamic, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `ppl-swimmer-poolside__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 池畔环境定场 | 全景 | 平视 | 35mm | f/5.6 | 距主体约8米，站在池畔防滑垫上，机位高约1.6米平视 |
| 2 | 蹬壁前蓄力 | 中景 | 低机位仰拍 | 85mm | f/2.8 | 距主体约7米，侧向站在池畔，机位高约0.8米低角度 |
| 3 | 破水前水面压缩 | 近景 | 低机位仰拍 | 135mm | f/2 | 距池边2米、距泳者约8米以上，站在湿滑区的防滑垫上，机位高约1.2米略低 |
| 4 | 出水瞬间水花爆发 | 近景 | 平视 | 135mm | f/2 | 距池边2米、距主体约8米，站在防滑垫上，机位高约1.5米平视 |
| 5 | 仰头吸气特写 | 特写 | 平视 | 135mm | f/1.8 | 距池边2米、距主体约8米，站在防滑垫上，机位高约1.6米平视 |
| 6 | 手臂拨水上举 | 中景 | 平视 | 85mm | f/2.8 | 距主体约6米，侧向站在池畔，机位高约1.4米平视 |
| 7 | 挺胸站起半身 | 中景 | 平视 | 85mm | f/2.8 | 距主体约7米，正面站在池畔防滑垫上，机位高约1.5米平视 |
| 8 | 水珠凝固细节 | 大特写 | 平视 | 100mm | f/1.8 | 距主体约5米，正面稍低站位，机位高约1.2米 |
| 9 | 踏上池岸出水上岸 | 全身 | 低机位仰拍 | 50mm | f/4 | 距主体约4米，侧后方向站在防滑垫上，机位高约1.0米低角度 |
| 10 | 站稳喘息收束 | 中全 | 平视 | 35mm | f/3.5 | 距主体约3米，正面站在防滑垫上，机位高约1.5米平视 |

### S28-01　池畔环境定场

- 文件名：`ppl-swimmer-poolside__01.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 35mm / f/5.6 / 竖幅
- 机位：距主体约8米，站在池畔防滑垫上，机位高约1.6米平视
- 动作：泳者在泳道中段踩水待命，双臂在水下轻划保持浮力，目视前方不朝镜头
- 道具：无　｜　裁切：保留池岸上缘与水面，不裁掉泳道线起点
- 必见：泳者待命姿态、泳道线与池畔湿滑地面　｜　废片判据：闪光灯痕迹、泳者被裁切、构图明显倾斜

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/10] 2:3 vertical, indoor swimming pool wide establishing shot, adult swimmer treading water mid-lane, lane ropes receding, wet pool deck in foreground, available ceiling light only, no flash, eye level, dynamic documentary photography, 35mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-02　蹬壁前蓄力

- 文件名：`ppl-swimmer-poolside__02.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 85mm / f/2.8 / 竖幅
- 机位：距主体约7米，侧向站在池畔，机位高约0.8米低角度
- 动作：泳者屈膝蹬住池壁，身体前倾收紧，双臂前伸准备出发，面部绷紧
- 道具：无　｜　裁切：从头部至腰部，保留蹬壁脚部的一部分
- 必见：屈膝蹬壁的发力姿态与水珠　｜　废片判据：对焦落在水面而非人物、姿态松垮、反光板穿帮

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/10] 2:3 vertical, low angle side view, adult swimmer crouched against pool wall ready to push off, tense powerful posture, water droplets, indoor pool light, reflector fill, no flash, dynamic sports photography, 85mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-03　破水前水面压缩

- 文件名：`ppl-swimmer-poolside__03.png`
- 景别/角度/焦段/光圈：近景 / 低机位仰拍 / 135mm / f/2 / 竖幅
- 机位：距池边2米、距泳者约8米以上，站在湿滑区的防滑垫上，机位高约1.2米略低
- 动作：泳者低头收颌，双臂并拢前伸，身体呈流线型入水前一刻
- 道具：无　｜　裁切：头顶留少量空间，底部保留水面波纹
- 必见：流线型身体与水珠　｜　废片判据：手抖虚焦、泳者出画、闪光灯补光

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/10] 2:3 vertical, telephoto, adult swimmer in streamlined position just before breaking water surface, droplets frozen, indoor pool overhead light, no flash, high shutter speed, powerful silence before splash, 135mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-04　出水瞬间水花爆发

- 文件名：`ppl-swimmer-poolside__04.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 135mm / f/2 / 竖幅
- 机位：距池边2米、距主体约8米，站在防滑垫上，机位高约1.5米平视
- 动作：泳者从水中向上冲起，头肩先破水面，双臂向上甩开，嘴微张呼气
- 道具：无　｜　裁切：头顶上方留少量水花空间，裁到大腿附近
- 必见：破水瞬间的头肩与飞溅水珠　｜　废片判据：水花糊成一片、面部全黑、对焦落在背景

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/10] 2:3 vertical, telephoto, adult swimmer bursting up out of pool water, head and shoulders breaking surface, spray frozen in air, side backlight from ceiling, no flash, 1/2500s, powerful dynamic sports moment, 135mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-05　仰头吸气特写

- 文件名：`ppl-swimmer-poolside__05.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 135mm / f/1.8 / 竖幅
- 机位：距池边2米、距主体约8米，站在防滑垫上，机位高约1.6米平视
- 动作：泳者出水后仰头吸气，下巴抬起，水珠沿面颊滑落
- 道具：无　｜　裁切：头部至上胸，保留水珠滑落轨迹
- 必见：吸气表情、水珠与泳镜细节　｜　废片判据：面部阴影过重、水珠被抹掉、镜头进水

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/10] 2:3 vertical, telephoto close up, adult swimmer emerging, head tilted back inhaling, droplets sliding down face, goggles pushed up, reflector fill from left, no flash, indoor pool, 1/2000s, 135mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-06　手臂拨水上举

- 文件名：`ppl-swimmer-poolside__06.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约6米，侧向站在池畔，机位高约1.4米平视
- 动作：泳者单臂向上拨水，肘部抬高，手掌张开推水，身体侧转
- 道具：无　｜　裁切：从手部到腰线，保留手臂延伸空间
- 必见：上举手臂与水珠链条　｜　废片判据：手臂被裁断、背景杂乱、水花遮挡面部

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/10] 2:3 vertical, side view medium shot, adult swimmer rising from water with one arm sweeping upward, water droplets chained in air, indoor pool ceiling light, reflector fill, no flash, muscular dynamic, 85mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-07　挺胸站起半身

- 文件名：`ppl-swimmer-poolside__07.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约7米，正面站在池畔防滑垫上，机位高约1.5米平视
- 动作：泳者半个身体露出水面，挺胸立起，双臂自然下摆，目光坚定向前
- 道具：无　｜　裁切：腰部以上，保留水面线
- 必见：挺胸站姿与坚定目光　｜　废片判据：人物虚化、构图歪斜、水面线切脖子

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/10] 2:3 vertical, frontal medium shot, adult swimmer emerging half body from pool, chest up, confident gaze, water line at waist, indoor pool overhead lighting, no flash, strong posture, 85mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-08　水珠凝固细节

- 文件名：`ppl-swimmer-poolside__08.png`
- 景别/角度/焦段/光圈：大特写 / 平视 / 100mm / f/1.8 / 竖幅
- 机位：距主体约5米，正面稍低站位，机位高约1.2米
- 动作：泳者保持头部不动，水珠从下颌滴落，肩部微耸
- 道具：无　｜　裁切：从嘴唇到锁骨，极紧裁切
- 必见：悬空水珠与皮肤纹理　｜　废片判据：水珠拖影、噪点过多、对焦落到背景

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/10] 2:3 vertical, macro close up, water droplets suspended from adult swimmer jaw and shoulder, side backlight making droplets glow, indoor pool, no flash, 1/2500s, crisp texture, 100mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-09　踏上池岸出水上岸

- 文件名：`ppl-swimmer-poolside__09.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，侧后方向站在防滑垫上，机位高约1.0米低角度
- 动作：泳者双手撑住池岸，用力把身体推上地面，单膝先触岸，身体前倾
- 道具：无　｜　裁切：全身入画，保留池岸边缘线与滴落水迹
- 必见：撑岸发力动作与湿滑地面　｜　废片判据：地面水迹不自然、人物被栏杆遮挡、摄影师脚入画

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/10] 2:3 vertical, low angle side view full body, adult swimmer pushing up onto pool deck, wet body, water dripping, side backlight from ceiling, wet slippery deck, no flash, powerful exit moment, 50mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S28-10　站稳喘息收束

- 文件名：`ppl-swimmer-poolside__10.png`
- 景别/角度/焦段/光圈：中全 / 平视 / 35mm / f/3.5 / 竖幅
- 机位：距主体约3米，正面站在防滑垫上，机位高约1.5米平视
- 动作：泳者站直在池岸边，双手撑膝略低头喘息，然后抬头直视前方
- 道具：无　｜　裁切：从头顶到脚踝，底部保留湿脚印
- 必见：喘息姿态、湿脚印与泳池背景　｜　废片判据：人物站在无防滑垫的湿滑处、背景过曝、构图拥挤

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 10/10] 2:3 vertical, frontal medium full shot, adult swimmer standing on wet pool deck catching breath, hands on knees then looking up, water dripping, wet footprints, indoor pool background, no flash, resilient mood, 35mm lens at f/3.5, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-swimmer-poolside__REF-A.png. Change only camera position, framing and pose to match FRAME 10. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `ppl-swimmer-poolside__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

