# S02 · 赛博朋克雨夜霓虹

用例 `style-cyberpunk-rain`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：妆发；建议深色系防水外套，避免反光材质。
- **场地**：霓虹招牌密集的夜市街道
- **光线**：仅环境光：利用街道两侧密集霓虹招牌的混合色光，不补光，确保模特面部受一侧招牌色光照射。
- **调色**：high-saturation cyan and magenta neon, deep shadows, wet reflections
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 50mm → 50mm → 35mm → 50mm → 50mm → 35mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：35mm与50mm两支镜头交替使用；地面水洼倒影至少2镜；只拍环境光，禁用闪光灯；人物面部必须保留一盏招牌色光源。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Cyberpunk night market street, neon signs dense, wet ground with puddles reflecting colorful lights, an adult walking away from camera, back view, dark waterproof jacket, face lit by a neon sign from the side, no flash, high saturation, eye level, full shot, cinematic, atmospheric, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Cyberpunk night market street, neon signs dense, wet ground with puddles reflecting colorful lights, an adult walking away from camera, back view, dark waterproof jacket, face lit by a neon sign from the side, no flash, high saturation, eye level, full shot, cinematic, atmospheric, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Cyberpunk night market street, neon signs dense, wet ground with puddles reflecting colorful lights, an adult walking away from camera, back view, dark waterproof jacket, face lit by a neon sign from the side, no flash, high saturation, eye level, full shot, cinematic, atmospheric, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`style-cyberpunk-rain__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约10米，机位高度1.6米，平视。
- 动作：模特背对镜头，缓步向夜市街深处走去，双臂自然下垂，头部微微抬起看向前方霓虹招牌。
- 服装：服装待确认，妆发待确认；建议深色系防水外套，避免反光材质。
- 光线：仅环境光：利用街道两侧密集霓虹招牌的混合色光，不补光，确保模特面部受一侧招牌色光照射。
- 道具：无（现场自然存在的霓虹招牌、水洼、街道设施）。
- 裁切／必见：全幅，保留顶部霓虹招牌和地面水洼反光。　｜　模特背身行走姿态、街道纵深、密集霓虹招牌、地面积水反光。
- 废片判据：模特面部完全阴影；招牌过曝无细节；水洼不明显；画面出现未授权人物正脸。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Cyberpunk night market street, neon signs dense, wet ground with puddles reflecting colorful lights, an adult walking away from camera, back view, dark waterproof jacket, face lit by a neon sign from the side, no flash, high saturation, eye level, full shot, cinematic, atmospheric, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-02　水洼倒影仰拍机位

- 文件名：`style-cyberpunk-rain__02.png`　中全 / 地面低角度 / 35mm / f/3.5 / 竖幅
- 机位：距主体约1.5米，机位高度0.1米，贴近地面水洼。
- 动作：模特站在水洼边缘，低头看向水面，双手插在外套口袋，一只脚微微向前。
- 服装：服装待确认，妆发待确认；建议深色长外套，下摆略沾湿。
- 光线：仅环境光：模特面部由侧上方霓虹招牌提供彩色光源，水洼反射同样光源，形成上下呼应。
- 道具：无（现场自然存在的水洼和霓虹招牌）。
- 裁切／必见：裁切掉天空，保留模特膝盖以上及完整倒影。　｜　模特面部被招牌色光照亮、水洼中清晰的倒影、霓虹色彩在水面的反射。
- 废片判据：倒影不完整或模糊；面部光线不足；水洼范围过小；模特姿态僵硬。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Low angle shot of an adult standing at edge of puddle, looking down, hands in pockets, reflection in puddle, cyberpunk neon lights, wet ground, face illuminated by neon sign, no flash, high saturation, ground level, medium full shot, moody, 35mm lens at f/3.5, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-03　侧逆光中景半身

- 文件名：`style-cyberpunk-rain__03.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约2米，机位高度1.5米，平视，位于模特侧前方45度。
- 动作：模特侧身站立，头部微低，眼神迷离望向画面左下，一只手轻触颈侧，另一只手自然垂落。
- 服装：服装待确认，妆发待确认；建议深色高领上衣，头发微乱。
- 光线：仅环境光：模特背后和左侧有霓虹招牌，形成侧逆光轮廓，面部右侧由前方招牌补光，保持眼神光。
- 道具：无。
- 裁切／必见：半身，头部上方留少量空间，底部裁至腰部。　｜　面部轮廓光、眼神迷离、霓虹色彩映在皮肤上。
- 废片判据：面部死黑；轮廓光过强导致过曝；姿态不自然；背景杂乱喧宾夺主。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Side backlit medium close-up of an adult, side profile, head slightly down, dreamy eyes, hand touching neck, neon signs behind creating rim light, face lit by front neon sign, cyberpunk night street, no flash, high saturation, eye level, medium shot, cinematic, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-04　招牌前过肩特写

- 文件名：`style-cyberpunk-rain__04.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.8米，机位高度1.6米，越过模特肩膀拍摄。
- 动作：模特站在霓虹招牌前，微微抬头，嘴唇微张，眼神迷离望向招牌方向。
- 服装：服装待确认，妆发待确认；建议颈部和耳朵露出，便于光线勾勒。
- 光线：仅环境光：招牌作为主光源，从模特前侧方照射面部，形成高饱和色光，背景其他招牌提供环境色。
- 道具：无。
- 裁切／必见：特写，裁切至肩部，保留招牌部分文字或图案。　｜　面部被招牌色光染色、迷离眼神、招牌细节作为背景。
- 废片判据：招牌文字不可辨；面部光线平淡；眼神不聚焦；背景过曝。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Over-the-shoulder close-up of an adult looking up at neon sign, lips slightly parted, dreamy eyes, face illuminated by colored neon light, cyberpunk night market, background neon signs, no flash, high saturation, eye level, close-up, cinematic, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-05　低头行走中景跟拍

- 文件名：`style-cyberpunk-rain__05.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度1.2米，略低于平视，在模特侧前方后退跟拍。
- 动作：模特低头行走，步伐缓慢，双手自然摆动，视线落在地面。
- 服装：服装待确认，妆发待确认；外套下摆随步伐轻微飘动。
- 光线：仅环境光：街道两侧霓虹提供混合色光，模特面部由一侧招牌持续照亮，确保行走中光线连续。
- 道具：无。
- 裁切／必见：中景，裁切至膝盖以上，保留头顶空间。　｜　行走动态、面部招牌光、地面湿滑反光。
- 废片判据：模特面部阴影；步伐僵硬；背景行人干扰；对焦不实。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Medium shot of an adult walking towards camera, head down, slow pace, neon lights on both sides, face lit by side neon sign, wet street reflecting lights, cyberpunk night market, no flash, high saturation, eye level, medium shot, dynamic, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-06　积水倒影俯拍特写

- 文件名：`style-cyberpunk-rain__06.png`　特写 / 正俯拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度1.8米，从上向下俯拍。
- 动作：模特蹲在水洼边，手指轻点水面，低头注视倒影。
- 服装：服装待确认，妆发待确认；袖口可卷起，露出手腕。
- 光线：仅环境光：上方霓虹招牌照亮模特和水面，水面反射形成斑斓色彩。
- 道具：无（仅现场水洼）。
- 裁切／必见：特写水洼及模特手部，裁掉模特头部以上。　｜　手指触碰水面的涟漪、水中倒影的霓虹色彩、模特手部细节。
- 废片判据：水面平静无涟漪；倒影色彩暗淡；手部动作不自然；画面过暗。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Overhead close-up of an adult crouching by puddle, finger touching water surface, ripples, reflection of neon lights in water, cyberpunk night, wet ground, face partially visible, neon light on face, no flash, high saturation, overhead, close-up, detailed, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-07　霓虹光斑前景半身

- 文件名：`style-cyberpunk-rain__07.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度1.5米，平视，镜头前有霓虹灯串作为前景。
- 动作：模特正对镜头，微微仰头，眼神迷离，嘴唇微张，双手自然垂在身侧。
- 服装：服装待确认，妆发待确认；建议深色上衣，避免图案。
- 光线：仅环境光：模特面部由正前方霓虹灯串照亮，前景灯串在镜头前形成彩色光斑，背景其他招牌提供环境色。
- 道具：无（现场霓虹灯串自然存在）。
- 裁切／必见：半身，裁切至胸部以下，保留头顶空间。　｜　面部清晰、霓虹光斑虚化前景、迷离表情。
- 废片判据：前景光斑遮挡面部；光斑不够虚化；面部光线平淡；表情呆滞。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Half-body shot of an adult facing camera, head slightly tilted up, dreamy eyes, lips parted, neon light strings as blurred foreground, face illuminated by neon sign, cyberpunk night street, no flash, high saturation, eye level, medium close-up, bokeh, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-08　巷道纵深广角

- 文件名：`style-cyberpunk-rain__08.png`　全景 / 平视 / 35mm / f/5.6 / 横幅
- 机位：距主体约8米，机位高度1.4米，平视，位于巷道一端。
- 动作：模特站在巷道中间，背靠墙壁，一条腿微微屈起，抬头望向对面霓虹招牌。
- 服装：服装待确认，妆发待确认；建议深色服装与背景融合，突出面部光线。
- 光线：仅环境光：巷道两侧霓虹招牌形成夹光，模特面部由一侧招牌照亮，背景招牌提供纵深光点。
- 道具：无。
- 裁切／必见：广角，保留巷道顶部和两侧招牌，底部保留水洼反光。　｜　巷道纵深、密集霓虹、模特小比例但面部有光、地面湿滑。
- 废片判据：巷道尽头无光；模特完全剪影；画面杂乱无重点；广角畸变严重。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Wide shot of an adult standing in narrow alley, back against wall, one leg bent, looking up at neon sign, neon signs both sides, wet ground reflecting lights, cyberpunk night market, face lit by side neon, no flash, high saturation, eye level, wide shot, atmospheric, 35mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S02-09　面部特写眼神光

- 文件名：`style-cyberpunk-rain__09.png`　大特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，机位高度1.6米，平视。
- 动作：模特面部正对镜头，微微低头，眼神上挑看向镜头，嘴唇微闭，表情迷离。
- 服装：服装待确认，妆发待确认；建议整理头发露出面部轮廓。
- 光线：仅环境光：模特面部一侧由霓虹招牌提供主光，另一侧有微弱环境光，确保眼睛出现眼神光。
- 道具：无。
- 裁切／必见：特写，仅面孔，裁切至下巴和额头边缘。　｜　眼神光、皮肤上的霓虹色彩、迷离表情、睫毛细节。
- 废片判据：眼睛无眼神光；面部光线不均匀；皮肤质感过差；对焦不实。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Extreme close-up of an adult face, head slightly down, eyes looking up at camera, dreamy expression, neon light illuminating one side of face, catchlight in eyes, cyberpunk night, high saturation, no flash, eye level, extreme close-up, detailed skin, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S02-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

