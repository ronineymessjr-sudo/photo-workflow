# S19 · 立交桥车流夜景

用例 `scene-overpass-night`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：深色外套，长发自然披散，妆面
- **场地**：过街天桥（人行的）
- **光线**：现场路灯侧光，无闪光灯，利用车流灯光作轮廓光
- **调色**：high-saturation cyan and magenta neon, deep shadows, wet reflections
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash；no tripod visible
- **原始要求**：35mm全程；车流光轨为背景2镜（依靠桥体护栏稳定机身而非三脚架，三脚架未备）；人物在桥面中央区；机位写明距主体距离与与护栏距离；禁用闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
of an adult standing on a pedestrian overpass at night, back to camera, hands on railing, looking at traffic below, long exposure light trails of cars, city lights, no flash, realistic photography, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
of an adult standing on a pedestrian overpass at night, back to camera, hands on railing, looking at traffic below, long exposure light trails of cars, city lights, no flash, realistic photography, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
of an adult standing on a pedestrian overpass at night, back to camera, hands on railing, looking at traffic below, long exposure light trails of cars, city lights, no flash, realistic photography, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 天桥全景定场 | 全身 | 平视 | 35mm | f/4 | 距主体约5米，机位高度1.6米，距后方护栏约1.5米 |
| 2 | 中景侧影观流 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，机位高度1.5米，距侧护栏约2米 |
| 3 | 近景扶栏凝视 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1.5米，机位高度1.5米，距前方护栏约0.5米 |
| 4 | 特写手部光轨 | 大特写 | 高机位俯拍 | 35mm | f/1.8 | 距主体手部约0.5米，机位高度1.2米，距护栏约0.3米 |
| 5 | 低角度人物与光轨 | 全身 | 低机位仰拍 | 35mm | f/4 | 距主体约2米，机位高度0.5米，距护栏约1米 |
| 6 | 中近景倚栏远眺 | 近景 | 平视 | 35mm | f/2 | 距主体约2.5米，机位高度1.4米，距侧护栏约1.5米 |
| 7 | 全景行走穿梭 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，机位高度1.6米，距后方护栏约2米 |
| 8 | 中景边缘等待 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，机位高度1.5米，距护栏约1米 |
| 9 | 近景回眸一瞥 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1.5米，机位高度1.5米，距后方护栏约1米 |

### S19-01　天桥全景定场

- 文件名：`scene-overpass-night__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约5米，机位高度1.6米，距后方护栏约1.5米
- 动作：背对镜头，双手扶护栏，身体直立，目视前方车流
- 服装：深色外套，长发自然披散，妆面待确认
- 光线：现场路灯与车流尾灯作环境光，无闪光灯，必要时用桥灯补光
- 道具：无
- 裁切／必见：全身入画，保留天桥结构及车流光轨　｜　人物全身、天桥护栏、车流光轨
- 废片判据：人物模糊、光轨断裂、构图倾斜

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Full body shot of an adult standing on a pedestrian overpass at night, back to camera, hands on railing, looking at traffic below, long exposure light trails of cars, city lights, no flash, realistic photography, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-02　中景侧影观流

- 文件名：`scene-overpass-night__02.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度1.5米，距侧护栏约2米
- 动作：侧身站立，双手轻扶护栏，头部微转看向桥下车流
- 服装：深色外套，长发自然披散，妆面待确认
- 光线：现场路灯侧光，无闪光灯，利用车流灯光作轮廓光
- 道具：无
- 裁切／必见：半身至大腿，保留部分护栏和光轨　｜　人物侧脸、护栏、车流光轨
- 废片判据：面部死黑、光轨过曝

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Medium shot of an adult standing sideways on a pedestrian overpass at night, hands on railing, looking at traffic below, long exposure light trails, side lighting from street lamps, no flash, realistic photography, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-03　近景扶栏凝视

- 文件名：`scene-overpass-night__03.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，机位高度1.5米，距前方护栏约0.5米
- 动作：正面站立，双手扶护栏，目光望向镜头方向
- 服装：深色外套，长发自然披散，妆面待确认
- 光线：现场路灯正面补光，无闪光灯，必要时用白色反光板补光
- 道具：无
- 裁切／必见：胸部以上，保留肩部与部分护栏　｜　人物面部表情、眼神、护栏
- 废片判据：面部过暗或过曝、眼神呆滞

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Close-up shot of an adult standing on a pedestrian overpass at night, hands on railing, looking towards camera, city lights background, no flash, realistic photography, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-04　特写手部光轨

- 文件名：`scene-overpass-night__04.png`　大特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体手部约0.5米，机位高度1.2米，距护栏约0.3米
- 动作：手部特写，手指轻抚护栏表面，背景车流光轨
- 服装：深色外套袖口，手部无饰品，妆发不适用
- 光线：现场路灯侧光，无闪光灯，利用车流灯光作背景
- 道具：无
- 裁切／必见：手部与部分护栏，背景虚化光轨　｜　手部细节、护栏纹理、光轨
- 废片判据：手部模糊、光轨过曝

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Extreme close-up of a hand touching a metal railing on a pedestrian overpass at night, with blurred car light trails in background, no flash, realistic photography, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-05　低角度人物与光轨

- 文件名：`scene-overpass-night__05.png`　全身 / 低机位仰拍 / 35mm / f/4 / 竖幅
- 机位：距主体约2米，机位高度0.5米，距护栏约1米
- 动作：站立，身体微微前倾，望向桥下车流
- 服装：深色外套，长发自然披散，妆面待确认
- 光线：现场路灯顶光，无闪光灯，车流灯光作背景
- 道具：无
- 裁切／必见：全身，仰拍视角，包含天桥结构　｜　人物全身、天桥结构、车流光轨
- 废片判据：人物变形、背景杂乱

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Low angle shot of an adult standing on a pedestrian overpass at night, leaning slightly forward, looking down at traffic, long exposure light trails, no flash, realistic photography, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-06　中近景倚栏远眺

- 文件名：`scene-overpass-night__06.png`　近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约2.5米，机位高度1.4米，距侧护栏约1.5米
- 动作：背部倚靠护栏，双臂自然下垂，头部微仰望向远方
- 服装：深色外套，长发自然披散，妆面待确认
- 光线：现场路灯侧光，无闪光灯，利用车流灯光作轮廓光
- 道具：无
- 裁切／必见：腰部以上，包含部分护栏和光轨　｜　人物姿态、护栏、车流光轨
- 废片判据：背景过曝、人物模糊

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Medium close-up of an adult leaning back against railing on a pedestrian overpass at night, looking into distance, car light trails background, no flash, realistic photography, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-07　全景行走穿梭

- 文件名：`scene-overpass-night__07.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度1.6米，距后方护栏约2米
- 动作：行走姿态，双臂自然摆动，目视前方
- 服装：深色外套，长发自然披散，妆面待确认
- 光线：现场路灯顶光，无闪光灯，车流灯光作环境点缀
- 道具：无
- 裁切／必见：全身，保留天桥通道及护栏　｜　人物全身、行走动态、天桥环境
- 废片判据：人物模糊、构图失衡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Full body shot of an adult walking on a pedestrian overpass at night, arms swinging naturally, looking ahead, city lights and car light trails in background, no flash, realistic photography, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-08　中景边缘等待

- 文件名：`scene-overpass-night__08.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度1.5米，距护栏约1米
- 动作：站立，单手轻扶护栏，头部转向车流方向
- 服装：深色外套，长发自然披散，妆面待确认
- 光线：现场路灯侧光，无闪光灯，利用车流灯光作背景光
- 道具：无
- 裁切／必见：半身，包含护栏和背景光轨　｜　人物侧面、护栏、车流光轨
- 废片判据：面部过暗、构图呆板

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Medium shot of an adult standing at the edge of a pedestrian overpass at night, one hand on railing, looking towards traffic, car light trails background, no flash, realistic photography, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-09　近景回眸一瞥

- 文件名：`scene-overpass-night__09.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，机位高度1.5米，距后方护栏约1米
- 动作：背对镜头向前行走，突然回头看向镜头，表情自然
- 服装：深色外套，长发自然飘动，妆面待确认
- 光线：现场路灯侧光，无闪光灯，车流灯光作背景
- 道具：无
- 裁切／必见：胸部以上，包含部分天桥背景　｜　人物面部表情、回眸动态、背景光轨
- 废片判据：面部模糊、眼神不自然

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: high-saturation cyan and magenta neon, deep shadows, wet reflections, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Close-up shot of an adult walking on a pedestrian overpass at night, turning head back towards camera, natural expression, car light trails in background, no flash, realistic photography, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S19-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

