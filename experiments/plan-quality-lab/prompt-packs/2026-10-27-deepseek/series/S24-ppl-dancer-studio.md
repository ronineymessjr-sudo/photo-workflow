# S24 · 舞者练功房

用例 `ppl-dancer-studio`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 舞者穿着深色紧身练功服（头发扎起，无饰品。 | 换衣即断系列 |
| 场地 | 舞蹈教室（把杆与镜墙现场已有） | 同一处，背景元素不跑 |
| 光线 | 利用教室顶部现有荧光灯，关闭闪光灯，必要时用反光板从正面补光（如现场有）。 | 主光方向不变 |
| 调色 | low-contrast pastel with faint green shadows and fine 400-speed grain | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, A  of a dancer standing still with back to camera, facing a mirror wall in a dance studio. The mirror reflects her front view. She wears dark tight practice clothes, hair tied back. Natural fluorescent lighting, no flash. Composition places dancer on right third, mirror reflection on left., eye level, depth of field showing the studio space including barre. Artistic and powerful mood, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, A  of a dancer standing still with back to camera, facing a mirror wall in a dance studio. The mirror reflects her front view. She wears dark tight practice clothes, hair tied back. Natural fluorescent lighting, no flash. Composition places dancer on right third, mirror reflection on left., eye level, depth of field showing the studio space including barre. Artistic and powerful mood, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, A  of a dancer standing still with back to camera, facing a mirror wall in a dance studio. The mirror reflects her front view. She wears dark tight practice clothes, hair tied back. Natural fluorescent lighting, no flash. Composition places dancer on right third, mirror reflection on left., eye level, depth of field showing the studio space including barre. Artistic and powerful mood, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `ppl-dancer-studio__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 镜墙空间交代 | 全身 | 平视 | 50mm | f/4 | 距主体约5米，相机高度1.5米，平视。 |
| 2 | 把杆压腿力量感 | 中景 | 低机位仰拍 | 50mm | f/2.8 | 距主体约3米，相机高度1.2米，略低于眼平线。 |
| 3 | 跳跃凝固一 | 全身 | 平视 | 50mm | f/4 | 距主体约5米，相机高度1米，平视。 |
| 4 | 跳跃凝固二 | 中景 | 平视 | 50mm | f/2.8 | 距主体约4米，相机高度1.5米，平视。 |
| 5 | 慢门拖影把杆旋转 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2米，相机高度1米，平视。 |
| 6 | 镜面反射焦点 | 近景 | 平视 | 50mm | f/2 | 距主体约2.5米，相机高度1.2米，平视。 |
| 7 | 把杆细节手部特写 | 特写 | 平视 | 50mm | f/1.8 | 距主体约0.5米，相机高度1米，平视。 |
| 8 | 跳跃落地缓冲 | 全身 | 低机位仰拍 | 50mm | f/4 | 距主体约4米，相机高度1米，低角度。 |
| 9 | 结束姿态肖像 | 近景 | 平视 | 50mm | f/2 | 距主体约3米，相机高度1.5米，平视。 |

### S24-01　镜墙空间交代

- 文件名：`ppl-dancer-studio__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约5米，相机高度1.5米，平视。
- 动作：舞者背对镜头，面向镜墙，双手自然下垂，头部微低，呈现准备前的静止状态。
- 道具：无　｜　裁切：从头顶到脚底完整纳入，保留镜中倒影的头顶空间。
- 必见：舞者背影、镜中正面倒影、把杆局部、教室空间深度。　｜　废片判据：摄影师入镜、倒影不完整、闪光灯痕迹、镜面眩光过曝。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/9] 2:3 vertical, A full-body shot of a dancer standing still with back to camera, facing a mirror wall in a dance studio. The mirror reflects her front view. She wears dark tight practice clothes, hair tied back. Natural fluorescent lighting, no flash. Composition places dancer on right third, mirror reflection on left., eye level, depth of field showing the studio space including barre. Artistic and powerful mood, 50mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S24-02　把杆压腿力量感

- 文件名：`ppl-dancer-studio__02.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，相机高度1.2米，略低于眼平线。
- 动作：舞者侧对把杆，一条腿放在把杆上，身体前倾压腿，手臂伸直，表情专注。
- 道具：把杆（现场已有）　｜　裁切：从头顶到脚踝，保留把杆完整。
- 必见：舞者身体拉伸的张力、肌肉线条、把杆与身体的接触点。　｜　废片判据：姿势松散、光线平淡、把杆被裁切、背景杂乱。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/9] 2:3 vertical, A side view of a dancer stretching at a barre, one leg on the barre, body leaning forward, arms extended. She wears a tight practice outfit, hair in a bun. Side-back lighting accentuates her silhouette and muscle tension., slightly low angle. The barre is visible. Artistic and powerful, 50mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: 把杆（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S24-03　跳跃凝固一

- 文件名：`ppl-dancer-studio__03.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约5米，相机高度1米，平视。
- 动作：舞者从地面跃起，双腿在空中分开成180度，双臂向上伸展，头部抬起。
- 道具：无　｜　裁切：全身入镜，保留跳跃的顶点空间。
- 必见：空中的姿态、肌肉线条、面部表情。　｜　废片判据：动作模糊、肢体裁切、背景过曝。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/9] 2:3 vertical, A dancer frozen mid-air in a grand jeté, legs split 180 degrees, arms raised. Wearing a tight practice outfit. Shot with, eye level, fast shutter speed to freeze motion. High key lighting, no flash. Artistic and powerful, 50mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S24-04　跳跃凝固二

- 文件名：`ppl-dancer-studio__04.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约4米，相机高度1.5米，平视。
- 动作：舞者从把杆旁跃起，空中转身，手臂展开，眼神看向镜头方向。
- 道具：把杆（现场已有）　｜　裁切：膝盖以上至头顶，保留镜中反射。
- 必见：空中转身的动势、镜中倒影、面部表情。　｜　废片判据：摄影师入镜、动作不清晰、光线混乱。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/9] 2:3 vertical, A dancer jumping mid-air, turning, arms extended, looking towards camera. Shot with, eye level, fast shutter. Mirror reflection visible without photographer. Side lighting, no flash. Artistic and powerful, 50mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: 把杆（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S24-05　慢门拖影把杆旋转

- 文件名：`ppl-dancer-studio__05.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，相机高度1米，平视。
- 动作：舞者双手扶把杆，单腿支撑，另一腿向后延伸，缓慢旋转身体。
- 道具：把杆（现场已有）　｜　裁切：从头顶到脚踝，保留旋转轨迹。
- 必见：身体旋转的拖影、把杆的稳定感、面部表情。　｜　废片判据：拖影过度或不足、把杆模糊、背景杂乱。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/9] 2:3 vertical, A dancer holding a barre, one leg extended, slowly turning, creating a motion blur effect. Shot with, slow shutter speed, camera stabilized by resting on the barre. Natural lighting, no flash. Artistic and powerful, 50mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: 把杆（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S24-06　镜面反射焦点

- 文件名：`ppl-dancer-studio__06.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约2.5米，相机高度1.2米，平视。
- 动作：舞者侧对镜子，单手扶把杆，另一手轻轻触碰镜面，眼神与镜中自己对视。
- 道具：无　｜　裁切：从头顶到腰部，重点突出镜中倒影和眼神。
- 必见：舞者与镜中倒影的眼神交流、手部动作、把杆局部。　｜　废片判据：摄影师入镜、镜面反光过强、构图不平衡。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/9] 2:3 vertical, A dancer touching a mirror wall, looking at her reflection, one hand on the barre. Shot with, eye level. Composition focuses on the reflection and eye contact. Soft lighting, no flash. Artistic and powerful, 50mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S24-07　把杆细节手部特写

- 文件名：`ppl-dancer-studio__07.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，相机高度1米，平视。
- 动作：舞者双手紧握把杆，手指关节用力，青筋微显。
- 道具：把杆（现场已有）　｜　裁切：仅手部与部分把杆，手腕以上裁切。
- 必见：手部肌肉张力、把杆质感。　｜　废片判据：光线平淡、手部模糊、把杆不清晰。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/9] 2:3 vertical, A close-up of a dancer's hands gripping a barre, knuckles white, veins visible. Shot with, eye level. Side lighting to emphasize texture. No flash. Artistic and powerful, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 把杆（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S24-08　跳跃落地缓冲

- 文件名：`ppl-dancer-studio__08.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，相机高度1米，低角度。
- 动作：舞者从跳跃落地，膝盖弯曲缓冲，身体前倾，手臂向后伸展，保持平衡。
- 道具：无　｜　裁切：全身入镜，保留地面反射。
- 必见：落地瞬间的肌肉控制、面部表情、身体线条。　｜　废片判据：动作模糊、地面过曝。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/9] 2:3 vertical, A dancer landing from a jump, knees bent in a plié, arms back for balance, body leaning forward. Shot with, low angle. Fast shutter to freeze motion. No flash. Artistic and powerful, 50mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S24-09　结束姿态肖像

- 文件名：`ppl-dancer-studio__09.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约3米，相机高度1.5米，平视。
- 动作：舞者站立，微微喘息，汗水在皮肤上闪光，眼神坚定地看向镜头。
- 道具：无　｜　裁切：从头顶到胸部，保留面部表情。
- 必见：汗水、疲惫但坚定的表情、皮肤质感。　｜　废片判据：表情僵硬、光线平淡。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/9] 2:3 vertical, A half-body portrait of a dancer after practice, slightly out of breath, sweat glistening on skin, looking at camera with determination. Shot with, eye level. Soft side lighting, no flash. Artistic and powerful, 50mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-dancer-studio__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `ppl-dancer-studio__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

