# S03 · 极简白墙人像

用例 `style-minimal-white`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 建议纯色无图案的简约款式；妆发自然，不佩戴显眼饰品。 | 换衣即断系列 |
| 场地 | 纯白墙面与单把椅子（椅子现场已有） | 同一处，背景元素不跑 |
| 光线 | 仅使用现场自然光，关闭所有人工光源，利用白墙漫反射补光，确保光线柔和均匀。 | 主光方向不变 |
| 调色 | high-key near-monochrome, clean whites, low contrast, no colour cast | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Minimalist portrait, an adult sitting on a single chair against a pure white wall, side profile, body upright, hands on thighs, calm and restrained expression, natural light only, large negative space, full shot, eye level, white wall background, no artificial lighting, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Minimalist portrait, an adult sitting on a single chair against a pure white wall, side profile, body upright, hands on thighs, calm and restrained expression, natural light only, large negative space, full shot, eye level, white wall background, no artificial lighting, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Minimalist portrait, an adult sitting on a single chair against a pure white wall, side profile, body upright, hands on thighs, calm and restrained expression, natural light only, large negative space, full shot, eye level, white wall background, no artificial lighting, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-minimal-white__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 白墙极简环境交代 | 全身 | 平视 | 50mm | f/4 | 距主体约6米，与模特视线同高，平视拍摄。 |
| 2 | 白墙中景情绪 | 中景 | 平视 | 50mm | f/2.8 | 距主体约4米，机位高度与模特眼睛齐平，平视拍摄。 |
| 3 | 白墙近景侧脸 | 特写 | 平视 | 50mm | f/1.8 | 距主体约2米，机位高度与模特眼睛齐平，从侧面拍摄。 |
| 4 | 白墙特写手部 | 大特写 | 高机位俯拍 | 50mm | f/1.8 | 距主体约1米，机位高度与模特手部齐平，俯视角度拍摄。 |
| 5 | 白墙低角度坐姿 | 全身 | 低机位仰拍 | 50mm | f/4 | 距主体约3米，机位高度约50厘米，低角度仰拍。 |
| 6 | 白墙高角度俯拍 | 近景 | 高机位俯拍 | 50mm | f/2 | 距主体约2.5米，机位高度约2米，俯拍。 |
| 7 | 白墙地面视角 | 全身 | 地面低角度 | 50mm | f/4 | 距主体约3米，机位贴地，地面高度拍摄。 |
| 8 | 白墙中近景聚焦 | 近景 | 平视 | 50mm | f/2 | 距主体约2米，机位高度与模特胸部齐平，平视拍摄。 |
| 9 | 白墙俯拍细节 | 近景 | 高机位俯拍 | 50mm | f/2 | 距主体约1.5米，机位高度约2米，俯拍。 |

### S03-01　白墙极简环境交代

- 文件名：`style-minimal-white__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约6米，与模特视线同高，平视拍摄。
- 动作：模特侧身坐在椅子上，背部挺直不靠椅背，双手自然放在大腿上，目光平视前方，表情克制。
- 道具：椅子（现场已有）。　｜　裁切：保留模特的完整坐姿，包括头顶和脚部，画面留白占三分之二以上。
- 必见：模特与椅子的相对位置，白墙背景，大面积的留白空间。　｜　废片判据：画面中出现其他杂物或人工光源痕迹；模特姿势僵硬或表情出戏；留白不足三分之二。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, Minimalist portrait, an adult sitting on a single chair against a pure white wall, side profile, body upright, hands on thighs, calm and restrained expression, natural light only, large negative space, full shot, eye level, white wall background, no artificial lighting, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-02　白墙中景情绪

- 文件名：`style-minimal-white__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约4米，机位高度与模特眼睛齐平，平视拍摄。
- 动作：模特坐在椅子上，身体微微前倾，双肘撑在膝盖上，双手交握，目光低垂，表情克制而内敛。
- 道具：椅子（现场已有）。　｜　裁切：拍摄模特膝盖以上至头顶，椅子部分入画，留白占三分之二以上。
- 必见：模特前倾坐姿，交握的双手，低垂的目光，白墙背景和留白。　｜　废片判据：手部动作模糊或僵硬；脸部光线过硬出现明显阴影；留白不足。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, Minimalist portrait, an adult sitting on a chair, leaning forward with elbows on knees, hands clasped, looking down, restrained expression, pure white wall background, natural light, medium shot, eye level, large negative space, no artificial lighting, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-03　白墙近景侧脸

- 文件名：`style-minimal-white__03.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约2米，机位高度与模特眼睛齐平，从侧面拍摄。
- 动作：模特坐在椅子上，身体转向侧面，头部微微上扬，目光看向远方，表情平静克制。
- 道具：椅子（现场已有）。　｜　裁切：拍摄模特胸部以上至头顶，留白占三分之二以上。
- 必见：模特侧脸轮廓，平静的眼神，白墙背景和留白。　｜　废片判据：侧脸阴影过重失去细节；眼神不自然；留白不足。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, Minimalist portrait, an adult sitting on a chair, side profile, head slightly tilted up, looking into distance, calm restrained expression, pure white wall background, natural side light, close-up, eye level, large negative space, no artificial lighting, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-04　白墙特写手部

- 文件名：`style-minimal-white__04.png`
- 景别/角度/焦段/光圈：大特写 / 高机位俯拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度与模特手部齐平，俯视角度拍摄。
- 动作：模特坐在椅子上，双手自然放在大腿上，手指微微交叠，动作松弛。
- 道具：椅子（现场已有）。　｜　裁切：特写手部及部分大腿，留白占三分之二以上。
- 必见：手部的自然姿态，手指细节，白墙背景和留白。　｜　废片判据：手部皮肤过曝或欠曝；手指动作僵硬；背景杂乱。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, Minimalist portrait, close-up of hands resting on thighs, fingers slightly intertwined, relaxed, pure white wall background, natural light, extreme close-up, high angle, large negative space, no artificial lighting, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-05　白墙低角度坐姿

- 文件名：`style-minimal-white__05.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，机位高度约50厘米，低角度仰拍。
- 动作：模特坐在椅子上，双腿自然垂放，背部挺直，双手放在膝盖上，目光平视前方，表情克制。
- 道具：椅子（现场已有）。　｜　裁切：拍摄模特全身，包括脚部，留白占三分之二以上。
- 必见：模特的坐姿全身，椅子结构，白墙背景和留白。　｜　废片判据：低角度导致模特变形或椅子显得突兀；光线不均；留白不足。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, Minimalist portrait, an adult sitting on a chair, legs hanging naturally, back straight, hands on knees, looking forward, restrained expression, pure white wall background, natural light, full shot, low angle, large negative space, no artificial lighting, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-06　白墙高角度俯拍

- 文件名：`style-minimal-white__06.png`
- 景别/角度/焦段/光圈：近景 / 高机位俯拍 / 50mm / f/2 / 竖幅
- 机位：距主体约2.5米，机位高度约2米，俯拍。
- 动作：模特坐在椅子上，身体微微后仰，头部抬起看向镜头，表情平静克制。
- 道具：椅子（现场已有）。　｜　裁切：拍摄模特上半身及椅子部分，留白占三分之二以上。
- 必见：模特的俯视角度，平静的眼神，白墙背景和留白。　｜　废片判据：俯拍导致脸部变形或阴影过重；眼神不自然；留白不足。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, Minimalist portrait, an adult sitting on a chair, leaning back slightly, head raised looking at camera, calm restrained expression, pure white wall background, natural light, medium close-up, high angle, large negative space, no artificial lighting, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-07　白墙地面视角

- 文件名：`style-minimal-white__07.png`
- 景别/角度/焦段/光圈：全身 / 地面低角度 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，机位贴地，地面高度拍摄。
- 动作：模特坐在椅子上，双脚平放地面，双手自然垂放身侧，目光低垂，表情克制。
- 道具：椅子（现场已有）。　｜　裁切：拍摄模特全身，包括脚部，留白占三分之二以上。
- 必见：模特的坐姿全身，脚部与地面的关系，白墙背景和留白。　｜　废片判据：地面视角导致人物变形；光线不足；留白不足。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, Minimalist portrait, an adult sitting on a chair, feet flat on floor, hands resting on sides, looking down, restrained expression, pure white wall background, natural light, full shot, ground level, large negative space, no artificial lighting, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-08　白墙中近景聚焦

- 文件名：`style-minimal-white__08.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约2米，机位高度与模特胸部齐平，平视拍摄。
- 动作：模特坐在椅子上，身体微微侧转，一手轻搭在椅背上，目光看向镜头，表情克制。
- 道具：椅子（现场已有）。　｜　裁切：拍摄模特胸部以上至头顶，留白占三分之二以上。
- 必见：模特的手搭在椅背上的动作，平静的眼神，白墙背景和留白。　｜　废片判据：手部动作不自然；光线过硬；留白不足。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, Minimalist portrait, an adult sitting on a chair, body slightly turned, one hand resting on chair back, looking at camera, restrained expression, pure white wall background, natural light, medium close-up, eye level, large negative space, no artificial lighting, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-09　白墙俯拍细节

- 文件名：`style-minimal-white__09.png`
- 景别/角度/焦段/光圈：近景 / 高机位俯拍 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度约2米，俯拍。
- 动作：模特坐在椅子上，双手放在膝盖上，手指自然弯曲，头部微低，目光看向手部。
- 道具：椅子（现场已有）。　｜　裁切：拍摄模特膝盖以上至头顶，手部为重点，留白占三分之二以上。
- 必见：手部细节，低垂的目光，白墙背景和留白。　｜　废片判据：俯拍导致脸部变形；手部模糊；留白不足。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], high-key near-monochrome, clean whites, low contrast, no colour cast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, Minimalist portrait, an adult sitting on a chair, hands on knees, fingers naturally curved, head slightly lowered looking at hands, restrained expression, pure white wall background, natural light, medium close-up, high angle, large negative space, no artificial lighting, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-minimal-white__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: 椅子（现场已有）。.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-minimal-white__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

