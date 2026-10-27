# S03 · 极简白墙人像

用例 `style-minimal-white`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：建议纯色无图案的简约款式；妆发自然，不佩戴显眼饰品。
- **场地**：纯白墙面与单把椅子（椅子现场已有）
- **光线**：仅使用现场自然光，关闭所有人工光源，利用白墙漫反射补光，确保光线柔和均匀。
- **调色**：high-key, near-monochrome, clean whites, minimal contrast
- **画幅**：竖幅 2:3
- **焦段序列**：50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame
- **原始要求**：仅用50mm；人物与椅子位置每镜写明相对关系与距离；画面留白不少于三分之二；不开任何人工光源。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Minimalist portrait, an adult sitting on a single chair against a pure white wall, side profile, body upright, hands on thighs, calm and restrained expression, natural light only, large negative space, full shot, eye level, white wall background, no artificial lighting, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Minimalist portrait, an adult sitting on a single chair against a pure white wall, side profile, body upright, hands on thighs, calm and restrained expression, natural light only, large negative space, full shot, eye level, white wall background, no artificial lighting, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Minimalist portrait, an adult sitting on a single chair against a pure white wall, side profile, body upright, hands on thighs, calm and restrained expression, natural light only, large negative space, full shot, eye level, white wall background, no artificial lighting, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`style-minimal-white__01.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约6米，与模特视线同高，平视拍摄。
- 动作：模特侧身坐在椅子上，背部挺直不靠椅背，双手自然放在大腿上，目光平视前方，表情克制。
- 服装：服装待确认，建议纯色无图案的简约款式；妆发自然，不佩戴显眼饰品。
- 光线：仅使用现场自然光，关闭所有人工光源，利用白墙漫反射补光，确保光线柔和均匀。
- 道具：椅子（现场已有）。
- 裁切／必见：保留模特的完整坐姿，包括头顶和脚部，画面留白占三分之二以上。　｜　模特与椅子的相对位置，白墙背景，大面积的留白空间。
- 废片判据：画面中出现其他杂物或人工光源痕迹；模特姿势僵硬或表情出戏；留白不足三分之二。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Minimalist portrait, an adult sitting on a single chair against a pure white wall, side profile, body upright, hands on thighs, calm and restrained expression, natural light only, large negative space, full shot, eye level, white wall background, no artificial lighting, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-02　白墙中景情绪

- 文件名：`style-minimal-white__02.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约4米，机位高度与模特眼睛齐平，平视拍摄。
- 动作：模特坐在椅子上，身体微微前倾，双肘撑在膝盖上，双手交握，目光低垂，表情克制而内敛。
- 服装：服装待确认，建议深色或中性色简约上衣；妆发自然，不佩戴饰品。
- 光线：仅用自然光，关闭人工光源，利用白墙反光补暗部，保持高调柔和。
- 道具：椅子（现场已有）。
- 裁切／必见：拍摄模特膝盖以上至头顶，椅子部分入画，留白占三分之二以上。　｜　模特前倾坐姿，交握的双手，低垂的目光，白墙背景和留白。
- 废片判据：手部动作模糊或僵硬；脸部光线过硬出现明显阴影；留白不足。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Minimalist portrait, an adult sitting on a chair, leaning forward with elbows on knees, hands clasped, looking down, restrained expression, pure white wall background, natural light, medium shot, eye level, large negative space, no artificial lighting, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-03　白墙近景侧脸

- 文件名：`style-minimal-white__03.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约2米，机位高度与模特眼睛齐平，从侧面拍摄。
- 动作：模特坐在椅子上，身体转向侧面，头部微微上扬，目光看向远方，表情平静克制。
- 服装：服装待确认，建议简洁无领或低领上衣，突出颈部线条；妆发干净。
- 光线：自然光从侧面照射，利用白墙反射补光，保持面部光影柔和。
- 道具：椅子（现场已有）。
- 裁切／必见：拍摄模特胸部以上至头顶，留白占三分之二以上。　｜　模特侧脸轮廓，平静的眼神，白墙背景和留白。
- 废片判据：侧脸阴影过重失去细节；眼神不自然；留白不足。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Minimalist portrait, an adult sitting on a chair, side profile, head slightly tilted up, looking into distance, calm restrained expression, pure white wall background, natural side light, close-up, eye level, large negative space, no artificial lighting, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-04　白墙特写手部

- 文件名：`style-minimal-white__04.png`　大特写 / 高机位俯拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度与模特手部齐平，俯视角度拍摄。
- 动作：模特坐在椅子上，双手自然放在大腿上，手指微微交叠，动作松弛。
- 服装：服装待确认，衣袖不宜过长，避免遮挡手部；手部保持干净无饰品。
- 光线：自然光从上方漫射，避免手部出现明显阴影。
- 道具：椅子（现场已有）。
- 裁切／必见：特写手部及部分大腿，留白占三分之二以上。　｜　手部的自然姿态，手指细节，白墙背景和留白。
- 废片判据：手部皮肤过曝或欠曝；手指动作僵硬；背景杂乱。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Minimalist portrait, close-up of hands resting on thighs, fingers slightly intertwined, relaxed, pure white wall background, natural light, extreme close-up, high angle, large negative space, no artificial lighting, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-05　白墙低角度坐姿

- 文件名：`style-minimal-white__05.png`　全身 / 低机位仰拍 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，机位高度约50厘米，低角度仰拍。
- 动作：模特坐在椅子上，双腿自然垂放，背部挺直，双手放在膝盖上，目光平视前方，表情克制。
- 服装：服装待确认，建议裤装或长裙，保持线条简洁；妆发自然。
- 光线：自然光从正面漫射，低角度拍摄时注意避免下巴阴影过重，可利用白墙反光补光。
- 道具：椅子（现场已有）。
- 裁切／必见：拍摄模特全身，包括脚部，留白占三分之二以上。　｜　模特的坐姿全身，椅子结构，白墙背景和留白。
- 废片判据：低角度导致模特变形或椅子显得突兀；光线不均；留白不足。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Minimalist portrait, an adult sitting on a chair, legs hanging naturally, back straight, hands on knees, looking forward, restrained expression, pure white wall background, natural light, full shot, low angle, large negative space, no artificial lighting, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-06　白墙高角度俯拍

- 文件名：`style-minimal-white__06.png`　近景 / 高机位俯拍 / 50mm / f/2 / 竖幅
- 机位：距主体约2.5米，机位高度约2米，俯拍。
- 动作：模特坐在椅子上，身体微微后仰，头部抬起看向镜头，表情平静克制。
- 服装：服装待确认，建议领口简洁，避免俯拍时走光；妆发干净。
- 光线：自然光从上方照射，利用白墙反光补光，保持面部光线均匀。
- 道具：椅子（现场已有）。
- 裁切／必见：拍摄模特上半身及椅子部分，留白占三分之二以上。　｜　模特的俯视角度，平静的眼神，白墙背景和留白。
- 废片判据：俯拍导致脸部变形或阴影过重；眼神不自然；留白不足。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Minimalist portrait, an adult sitting on a chair, leaning back slightly, head raised looking at camera, calm restrained expression, pure white wall background, natural light, medium close-up, high angle, large negative space, no artificial lighting, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-07　白墙地面视角

- 文件名：`style-minimal-white__07.png`　全身 / 地面低角度 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，机位贴地，地面高度拍摄。
- 动作：模特坐在椅子上，双脚平放地面，双手自然垂放身侧，目光低垂，表情克制。
- 服装：服装待确认，建议长裤或长裙，避免地面视角走光；妆发自然。
- 光线：自然光从侧面照射，地面反光较弱，可适当提高曝光补偿。
- 道具：椅子（现场已有）。
- 裁切／必见：拍摄模特全身，包括脚部，留白占三分之二以上。　｜　模特的坐姿全身，脚部与地面的关系，白墙背景和留白。
- 废片判据：地面视角导致人物变形；光线不足；留白不足。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Minimalist portrait, an adult sitting on a chair, feet flat on floor, hands resting on sides, looking down, restrained expression, pure white wall background, natural light, full shot, ground level, large negative space, no artificial lighting, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-08　白墙中近景聚焦

- 文件名：`style-minimal-white__08.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约2米，机位高度与模特胸部齐平，平视拍摄。
- 动作：模特坐在椅子上，身体微微侧转，一手轻搭在椅背上，目光看向镜头，表情克制。
- 服装：服装待确认，建议简约上衣，袖子不宜过宽；妆发干净。
- 光线：自然光从正面偏侧照射，利用白墙反光补暗部，保持柔和。
- 道具：椅子（现场已有）。
- 裁切／必见：拍摄模特胸部以上至头顶，留白占三分之二以上。　｜　模特的手搭在椅背上的动作，平静的眼神，白墙背景和留白。
- 废片判据：手部动作不自然；光线过硬；留白不足。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Minimalist portrait, an adult sitting on a chair, body slightly turned, one hand resting on chair back, looking at camera, restrained expression, pure white wall background, natural light, medium close-up, eye level, large negative space, no artificial lighting, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S03-09　白墙俯拍细节

- 文件名：`style-minimal-white__09.png`　近景 / 高机位俯拍 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度约2米，俯拍。
- 动作：模特坐在椅子上，双手放在膝盖上，手指自然弯曲，头部微低，目光看向手部。
- 服装：服装待确认，建议袖口简洁，不遮挡手部；手部干净无饰品。
- 光线：自然光从上方漫射，避免手部阴影过重，可利用白墙反光。
- 道具：椅子（现场已有）。
- 裁切／必见：拍摄模特膝盖以上至头顶，手部为重点，留白占三分之二以上。　｜　手部细节，低垂的目光，白墙背景和留白。
- 废片判据：俯拍导致脸部变形；手部模糊；留白不足。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-key, near-monochrome, clean whites, minimal contrast, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Minimalist portrait, an adult sitting on a chair, hands on knees, fingers naturally curved, head slightly lowered looking at hands, restrained expression, pure white wall background, natural light, medium close-up, high angle, large negative space, no artificial lighting, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 椅子（现场已有）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S03-01 ｜ 镜头名 ｜ 50mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

