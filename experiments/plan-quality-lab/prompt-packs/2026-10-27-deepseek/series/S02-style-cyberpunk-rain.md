# S02 · 赛博朋克雨夜霓虹

用例 `style-cyberpunk-rain`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 妆发；建议深色系防水外套，避免反光材质。 | 换衣即断系列 |
| 场地 | 霓虹招牌密集的夜市街道 | 同一处，背景元素不跑 |
| 光线 | 仅环境光：利用街道两侧密集霓虹招牌的混合色光，不补光，确保模特面部受一侧招牌色光照射。 | 主光方向不变 |
| 调色 | high-saturation cyan and magenta neon, deep blacks, wet reflective highlights | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Cyberpunk night market street, neon signs dense, wet ground with puddles reflecting colorful lights, an adult walking away from camera, back view, dark waterproof jacket, face lit by a neon sign from the side, no flash, high saturation, eye level, full shot, cinematic, atmospheric, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Cyberpunk night market street, neon signs dense, wet ground with puddles reflecting colorful lights, an adult walking away from camera, back view, dark waterproof jacket, face lit by a neon sign from the side, no flash, high saturation, eye level, full shot, cinematic, atmospheric, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Cyberpunk night market street, neon signs dense, wet ground with puddles reflecting colorful lights, an adult walking away from camera, back view, dark waterproof jacket, face lit by a neon sign from the side, no flash, high saturation, eye level, full shot, cinematic, atmospheric, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-cyberpunk-rain__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 霓虹夜市全景起幅 | 全身 | 平视 | 35mm | f/4 | 距主体约10米，机位高度1.6米，平视。 |
| 2 | 水洼倒影仰拍机位 | 中全 | 地面低角度 | 35mm | f/3.5 | 距主体约1.5米，机位高度0.1米，贴近地面水洼。 |
| 3 | 侧逆光中景半身 | 近景 | 平视 | 50mm | f/2 | 距主体约2米，机位高度1.5米，平视，位于模特侧前方45度。 |
| 4 | 招牌前过肩特写 | 特写 | 平视 | 50mm | f/1.8 | 距主体约0.8米，机位高度1.6米，越过模特肩膀拍摄。 |
| 5 | 低头行走中景跟拍 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，机位高度1.2米，略低于平视，在模特侧前方后退跟拍。 |
| 6 | 积水倒影俯拍特写 | 特写 | 正俯拍 | 50mm | f/1.8 | 距主体约1米，机位高度1.8米，从上向下俯拍。 |
| 7 | 霓虹光斑前景半身 | 近景 | 平视 | 50mm | f/2 | 距主体约1.5米，机位高度1.5米，平视，镜头前有霓虹灯串作为前景。 |
| 8 | 巷道纵深广角 | 全景 | 平视 | 35mm | f/5.6 | 距主体约8米，机位高度1.4米，平视，位于巷道一端。 |
| 9 | 面部特写眼神光 | 大特写 | 平视 | 50mm | f/1.8 | 距主体约0.5米，机位高度1.6米，平视。 |

### S02-01　霓虹夜市全景起幅

- 文件名：`style-cyberpunk-rain__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约10米，机位高度1.6米，平视。
- 动作：模特背对镜头，缓步向夜市街深处走去，双臂自然下垂，头部微微抬起看向前方霓虹招牌。
- 道具：无（现场自然存在的霓虹招牌、水洼、街道设施）。　｜　裁切：全幅，保留顶部霓虹招牌和地面水洼反光。
- 必见：模特背身行走姿态、街道纵深、密集霓虹招牌、地面积水反光。　｜　废片判据：模特面部完全阴影；招牌过曝无细节；水洼不明显；画面出现未授权人物正脸。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, Cyberpunk night market street, neon signs dense, wet ground with puddles reflecting colorful lights, an adult walking away from camera, back view, dark waterproof jacket, face lit by a neon sign from the side, no flash, high saturation, eye level, full shot, cinematic, atmospheric, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-02　水洼倒影仰拍机位

- 文件名：`style-cyberpunk-rain__02.png`
- 景别/角度/焦段/光圈：中全 / 地面低角度 / 35mm / f/3.5 / 竖幅
- 机位：距主体约1.5米，机位高度0.1米，贴近地面水洼。
- 动作：模特站在水洼边缘，低头看向水面，双手插在外套口袋，一只脚微微向前。
- 道具：无（现场自然存在的水洼和霓虹招牌）。　｜　裁切：裁切掉天空，保留模特膝盖以上及完整倒影。
- 必见：模特面部被招牌色光照亮、水洼中清晰的倒影、霓虹色彩在水面的反射。　｜　废片判据：倒影不完整或模糊；面部光线不足；水洼范围过小；模特姿态僵硬。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, Low angle shot of an adult standing at edge of puddle, looking down, hands in pockets, reflection in puddle, cyberpunk neon lights, wet ground, face illuminated by neon sign, no flash, high saturation, ground level, medium full shot, moody, 35mm lens at f/3.5, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-03　侧逆光中景半身

- 文件名：`style-cyberpunk-rain__03.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约2米，机位高度1.5米，平视，位于模特侧前方45度。
- 动作：模特侧身站立，头部微低，眼神迷离望向画面左下，一只手轻触颈侧，另一只手自然垂落。
- 道具：无。　｜　裁切：半身，头部上方留少量空间，底部裁至腰部。
- 必见：面部轮廓光、眼神迷离、霓虹色彩映在皮肤上。　｜　废片判据：面部死黑；轮廓光过强导致过曝；姿态不自然；背景杂乱喧宾夺主。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, Side backlit medium close-up of an adult, side profile, head slightly down, dreamy eyes, hand touching neck, neon signs behind creating rim light, face lit by front neon sign, cyberpunk night street, no flash, high saturation, eye level, medium shot, cinematic, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-04　招牌前过肩特写

- 文件名：`style-cyberpunk-rain__04.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.8米，机位高度1.6米，越过模特肩膀拍摄。
- 动作：模特站在霓虹招牌前，微微抬头，嘴唇微张，眼神迷离望向招牌方向。
- 道具：无。　｜　裁切：特写，裁切至肩部，保留招牌部分文字或图案。
- 必见：面部被招牌色光染色、迷离眼神、招牌细节作为背景。　｜　废片判据：招牌文字不可辨；面部光线平淡；眼神不聚焦；背景过曝。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, Over-the-shoulder close-up of an adult looking up at neon sign, lips slightly parted, dreamy eyes, face illuminated by colored neon light, cyberpunk night market, background neon signs, no flash, high saturation, eye level, close-up, cinematic, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-05　低头行走中景跟拍

- 文件名：`style-cyberpunk-rain__05.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度1.2米，略低于平视，在模特侧前方后退跟拍。
- 动作：模特低头行走，步伐缓慢，双手自然摆动，视线落在地面。
- 道具：无。　｜　裁切：中景，裁切至膝盖以上，保留头顶空间。
- 必见：行走动态、面部招牌光、地面湿滑反光。　｜　废片判据：模特面部阴影；步伐僵硬；背景行人干扰；对焦不实。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, Medium shot of an adult walking towards camera, head down, slow pace, neon lights on both sides, face lit by side neon sign, wet street reflecting lights, cyberpunk night market, no flash, high saturation, eye level, medium shot, dynamic, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-06　积水倒影俯拍特写

- 文件名：`style-cyberpunk-rain__06.png`
- 景别/角度/焦段/光圈：特写 / 正俯拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度1.8米，从上向下俯拍。
- 动作：模特蹲在水洼边，手指轻点水面，低头注视倒影。
- 道具：无（仅现场水洼）。　｜　裁切：特写水洼及模特手部，裁掉模特头部以上。
- 必见：手指触碰水面的涟漪、水中倒影的霓虹色彩、模特手部细节。　｜　废片判据：水面平静无涟漪；倒影色彩暗淡；手部动作不自然；画面过暗。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, Overhead close-up of an adult crouching by puddle, finger touching water surface, ripples, reflection of neon lights in water, cyberpunk night, wet ground, face partially visible, neon light on face, no flash, high saturation, overhead, close-up, detailed, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-07　霓虹光斑前景半身

- 文件名：`style-cyberpunk-rain__07.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度1.5米，平视，镜头前有霓虹灯串作为前景。
- 动作：模特正对镜头，微微仰头，眼神迷离，嘴唇微张，双手自然垂在身侧。
- 道具：无（现场霓虹灯串自然存在）。　｜　裁切：半身，裁切至胸部以下，保留头顶空间。
- 必见：面部清晰、霓虹光斑虚化前景、迷离表情。　｜　废片判据：前景光斑遮挡面部；光斑不够虚化；面部光线平淡；表情呆滞。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, Half-body shot of an adult facing camera, head slightly tilted up, dreamy eyes, lips parted, neon light strings as blurred foreground, face illuminated by neon sign, cyberpunk night street, no flash, high saturation, eye level, medium close-up, bokeh, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-08　巷道纵深广角

- 文件名：`style-cyberpunk-rain__08.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 35mm / f/5.6 / 竖幅
- 机位：距主体约8米，机位高度1.4米，平视，位于巷道一端。
- 动作：模特站在巷道中间，背靠墙壁，一条腿微微屈起，抬头望向对面霓虹招牌。
- 道具：无。　｜　裁切：广角，保留巷道顶部和两侧招牌，底部保留水洼反光。
- 必见：巷道纵深、密集霓虹、模特小比例但面部有光、地面湿滑。　｜　废片判据：巷道尽头无光；模特完全剪影；画面杂乱无重点；广角畸变严重。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, Wide shot of an adult standing in narrow alley, back against wall, one leg bent, looking up at neon sign, neon signs both sides, wet ground reflecting lights, cyberpunk night market, face lit by side neon, no flash, high saturation, eye level, wide shot, atmospheric, 35mm lens at f/5.6, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-09　面部特写眼神光

- 文件名：`style-cyberpunk-rain__09.png`
- 景别/角度/焦段/光圈：大特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，机位高度1.6米，平视。
- 动作：模特面部正对镜头，微微低头，眼神上挑看向镜头，嘴唇微闭，表情迷离。
- 道具：无。　｜　裁切：特写，仅面孔，裁切至下巴和额头边缘。
- 必见：眼神光、皮肤上的霓虹色彩、迷离表情、睫毛细节。　｜　废片判据：眼睛无眼神光；面部光线不均匀；皮肤质感过差；对焦不实。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-saturation cyan and magenta neon, deep blacks, wet reflective highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, Extreme close-up of an adult face, head slightly down, eyes looking up at camera, dreamy expression, neon light illuminating one side of face, catchlight in eyes, cyberpunk night, high saturation, no flash, eye level, extreme close-up, detailed skin, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-cyberpunk-rain__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-cyberpunk-rain__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

