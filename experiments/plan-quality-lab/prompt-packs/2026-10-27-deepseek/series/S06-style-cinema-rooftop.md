# S06 · 电影感青橙调天台

用例 `style-cinema-rooftop`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：建议深色外套以突出青橙对比，妆发自然
- **场地**：住宅楼天台（已获物业书面许可）
- **光线**：现场天光，蓝调时刻，无补光，利用天空余晖和远处城市灯光
- **调色**：teal shadows with warm skin tones, cinematic contrast
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame
- **原始要求**：35mm全程；人物全程在平台中央距边缘两米以上；黄昏蓝调窗口前后各2镜；光源只用天光与远处城市灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Cinematic  of an adult standing alone on a residential rooftop during blue hour, back to camera, looking at the sky, dark jacket, teal and orange color grading, distant city lights, eye level, atmospheric, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Cinematic  of an adult standing alone on a residential rooftop during blue hour, back to camera, looking at the sky, dark jacket, teal and orange color grading, distant city lights, eye level, atmospheric, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Cinematic  of an adult standing alone on a residential rooftop during blue hour, back to camera, looking at the sky, dark jacket, teal and orange color grading, distant city lights, eye level, atmospheric, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`style-cinema-rooftop__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约8米，机位高度与胸口齐平，平视
- 动作：背对镜头站立，双臂自然下垂，头部微仰望向前方天空，保持静止
- 服装：待确认；建议深色外套以突出青橙对比，妆发自然
- 光线：现场天光，蓝调时刻，无补光，利用天空余晖和远处城市灯光
- 道具：无
- 裁切／必见：画面包含人物全身及天台地面和远处天际线，不裁切头部和脚部　｜　人物全身轮廓、天台平台、远处城市灯光与蓝调天空
- 废片判据：人物不完整、天台边缘不可见、天空过曝或死黑

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Cinematic wide shot of an adult standing alone on a residential rooftop during blue hour, back to camera, looking at the sky, dark jacket, teal and orange color grading, distant city lights, eye level, full body, atmospheric, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S06-02　孤勇侧影

- 文件名：`style-cinema-rooftop__02.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约5米，机位高度与眼睛齐平，平视
- 动作：身体侧对镜头90度，目光坚定望向前方，双手自然垂于身侧
- 服装：待确认；深色外套，头发可被微风吹动
- 光线：现场天光为主，蓝调时刻，无补光，利用天空柔和光线勾勒轮廓
- 道具：无
- 裁切／必见：从头顶到膝盖以上，保留部分天台背景　｜　人物侧脸轮廓、坚定表情、身体姿态
- 废片判据：面部过暗、背景杂乱干扰主体、人物姿势松散

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Cinematic medium shot of an adult in profile on a rooftop, looking ahead with determination, dark jacket, teal and orange color grading, blue hour sky, distant city lights, eye level, half body, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S06-03　细节紧握

- 文件名：`style-cinema-rooftop__03.png`　大特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，机位高度与手部齐平，略俯视
- 动作：手部特写，单手握拳，手臂微微抬起，展示手部关节
- 服装：待确认；袖子挽起或自然露出前臂
- 光线：现场天光，利用天空光照明手部，无补光，保持青橙色调
- 道具：无
- 裁切／必见：仅手部及小臂，不露脸　｜　手部握拳的细节、皮肤纹理、青橙光线
- 废片判据：手部模糊、光线平淡、背景干扰

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Cinematic extreme close-up of a clenched fist on a rooftop, teal and orange color grading, blue hour light, high angle, detailed skin texture, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S06-04　远眺城市

- 文件名：`style-cinema-rooftop__04.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约7米，机位高度与胸口齐平，平视
- 动作：侧身站立，一手自然垂放，另一手微抬指向远方，目光跟随手指方向
- 服装：待确认；深色外套，头发自然
- 光线：现场天光，蓝调时刻，城市灯光作为背景光，无补光
- 道具：无
- 裁切／必见：包含人物全身和右侧城市天际线，不裁切人物　｜　人物远眺姿态、城市灯光、蓝调天空
- 废片判据：人物与背景重叠过多、城市灯光不明显、构图失衡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Cinematic full shot of an adult standing on a rooftop pointing towards distant city lights, teal and orange color grading, blue hour, eye level, composition with subject on left third, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S06-05　静立凝望

- 文件名：`style-cinema-rooftop__05.png`　近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约4米，机位高度与眼睛齐平，平视
- 动作：正面站立，双手插兜，目光直视镜头，表情平静而坚定
- 服装：待确认；深色外套，内搭浅色衣物形成对比
- 光线：现场天光，利用天空最后余晖照亮面部，无补光
- 道具：无
- 裁切／必见：从头顶到腰部，保留部分天台背景　｜　人物面部表情、眼神、服装细节
- 废片判据：面部阴影过重、眼神无光、背景过亮

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Cinematic medium close-up of an adult standing on a rooftop facing camera, hands in pockets, calm determined expression, teal and orange color grading, blue hour, eye level, half body, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S06-06　仰角孤影

- 文件名：`style-cinema-rooftop__06.png`　中景 / 低机位仰拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约1.5米，机位高度低于腰部，仰拍
- 动作：正面站立，双臂微微张开，抬头望天，身体挺直
- 服装：待确认；深色外套，下摆可随风微动
- 光线：现场天光，以天空为背景，人物处于逆光或侧逆光，保持青橙色调
- 道具：无
- 裁切／必见：从头顶到膝盖以上，天空占据背景大部分　｜　人物挺立姿态、天空、孤勇情绪
- 废片判据：人物面部完全黑暗、构图松散、天空无细节

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Cinematic low angle shot of an adult standing on a rooftop looking up at the sky, arms slightly open, teal and orange color grading, blue hour, low angle, dramatic, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S06-07　天台地面特写

- 文件名：`style-cinema-rooftop__07.png`　特写 / 正俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约0.3米，机位高度贴近地面，俯视
- 动作：脚部特写，双脚自然分开站立，鞋底紧贴地面
- 服装：待确认；深色裤子和鞋子
- 光线：现场天光，地面反射微弱光线，无补光
- 道具：无
- 裁切／必见：仅脚部及地面纹理，不露腿以上　｜　鞋子细节、地面材质、青橙色调
- 废片判据：脚部模糊、地面无细节、光线过平

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Cinematic close-up of feet standing on a rooftop floor, teal and orange color grading, blue hour light, overhead, ground texture, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S06-08　剪影轮廓

- 文件名：`style-cinema-rooftop__08.png`　全景 / 平视 / 35mm / f/5.6 / 横幅
- 机位：距主体约10米，机位高度与胸口齐平，平视
- 动作：背对镜头，双手自然下垂，站在天台中央，面向城市灯光
- 服装：待确认；深色服装以形成剪影
- 光线：现场天光已暗，主要靠远处城市灯光勾勒轮廓，人物呈剪影，无补光
- 道具：无
- 裁切／必见：包含人物全身和周围环境，不裁切　｜　人物剪影、城市灯光、天台环境
- 废片判据：剪影不清晰、背景过亮、人物细节丢失

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Cinematic silhouette of an adult standing on a rooftop facing city lights, teal and orange color grading, night, eye level, full body, atmospheric, 35mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S06-09　表情特写

- 文件名：`style-cinema-rooftop__09.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约0.8米，机位高度与眼睛齐平，平视
- 动作：正面面部特写，目光坚定看向镜头，嘴唇微闭
- 服装：待确认；发型整洁，可有无形风吹动发丝
- 光线：现场天光，利用远处城市灯光作为眼神光，无补光
- 道具：无
- 裁切／必见：从额头到下巴，裁切掉肩膀　｜　眼睛、表情、皮肤质感
- 废片判据：眼睛无光、面部过曝或过暗、表情不自然

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: teal shadows with warm skin tones, cinematic contrast, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Cinematic close-up of an adult's face on a rooftop, determined expression, teal and orange color grading, city lights in eyes, eye level, detailed skin, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S06-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

