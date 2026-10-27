# S17 · 地下车库冷调人像

用例 `scene-parking-garage`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：（建议深色系服装），妆发
- **场地**：公共地下车库空置区（已获物业许可）
- **光线**：利用车库顶部连续光带作为主光源，不补光，关闭闪光灯；机位方向追光但避免光带过曝
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：24mm → 24mm → 50mm → 50mm → 24mm → 24mm → 50mm → 50mm → 24mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：24mm低角度2镜、50mm2镜；顶灯光带引导线构图2镜；全部机位写明与行车通道的距离（不少于2米）；禁用闪光灯；不占用消防通道。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
of an adult standing in an empty underground parking garage, cool blue lighting, leading lines from overhead light strips, wide angle, low noise, urban cool mood, no flash, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
of an adult standing in an empty underground parking garage, cool blue lighting, leading lines from overhead light strips, wide angle, low noise, urban cool mood, no flash, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
of an adult standing in an empty underground parking garage, cool blue lighting, leading lines from overhead light strips, wide angle, low noise, urban cool mood, no flash, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 光带引导线全景 | 全身 | 平视 | 24mm | f/4 | 距主体约8米，机位高1.5米，平视，机位与行车通道边缘距离≥3米 |
| 2 | 低角度仰拍中景 | 中景 | 低机位仰拍 | 24mm | f/2.8 | 距主体约2.5米，机位高0.5米，低角度仰拍，机位与行车通道边缘距离≥2米 |
| 3 | 中景平视半身 | 近景 | 平视 | 50mm | f/2 | 距主体约3米，机位高1.2米，平视，机位与行车通道边缘距离≥2米 |
| 4 | 半身侧拍光带 | 近景 | 平视 | 50mm | f/2 | 距主体约4米，机位高1.5米，平视，机位与行车通道边缘距离≥2米 |
| 5 | 顶光光带纵深全景 | 全身 | 平视 | 24mm | f/4 | 距主体约6米，机位高1.6米，平视，机位与行车通道边缘距离≥3米 |
| 6 | 坐地低角度全景 | 全身 | 低机位仰拍 | 24mm | f/4 | 距主体约2.5米，机位高0.3米，低角度，机位与行车通道边缘距离≥2米 |
| 7 | 倚柱中景 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2米，机位高1.2米，平视，机位与行车通道边缘距离≥2米（确保不占用通道） |
| 8 | 面部特写 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1米，机位高1.5米，平视，机位与行车通道边缘距离≥2米 |
| 9 | 引导线纵深全景 | 全身 | 平视 | 24mm | f/4 | 距主体约10米，机位高1.5米，平视，机位与行车通道边缘距离≥3米 |

### S17-01　光带引导线全景

- 文件名：`scene-parking-garage__01.png`　全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距主体约8米，机位高1.5米，平视，机位与行车通道边缘距离≥3米
- 动作：双脚与肩同宽站立，双手自然垂放，下巴微收，视线看向镜头
- 服装：待确认（建议深色系服装，避免反光材质），妆发待确认
- 光线：利用车库顶部连续光带作为主光源，不补光，关闭闪光灯；机位方向追光但避免光带过曝
- 道具：无
- 裁切／必见：头部保留至脚部，包含顶部光带和地面反光　｜　顶灯光带、人物全身、空旷车库环境
- 废片判据：光带过曝无细节、人物剪影、画面杂乱、占用通道

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Full body shot of an adult standing in an empty underground parking garage, cool blue lighting, leading lines from overhead light strips, wide angle, low noise, urban cool mood, no flash, 24mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S17-02　低角度仰拍中景

- 文件名：`scene-parking-garage__02.png`　中景 / 低机位仰拍 / 24mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，机位高0.5米，低角度仰拍，机位与行车通道边缘距离≥2米
- 动作：侧身站立，一只脚向前，手臂自然下垂，头部转向镜头，表情酷
- 服装：待确认（建议深色系服装），妆发待确认
- 光线：车库顶灯作为主光，从头顶打下，形成冷调阴影；不补光，关闭闪光灯
- 道具：无
- 裁切／必见：膝盖以上至头部，保留顶部空间　｜　人物酷感表情、低角度带来的张力、车库顶部结构
- 废片判据：人物姿态呆板、光线过暗、背景杂乱

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Low angle medium shot of an adult standing in an underground parking garage, cool lighting, urban mood, looking at camera with cool expression, no flash, 24mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S17-03　中景平视半身

- 文件名：`scene-parking-garage__03.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约3米，机位高1.2米，平视，机位与行车通道边缘距离≥2米
- 动作：正对镜头，双手插兜（若服装有口袋），肩部放松，直视镜头
- 服装：待确认（建议深色系服装），妆发待确认
- 光线：利用车库顶灯作为主光，面部稍暗，可让模特微微抬头迎光；不补光，关闭闪光灯
- 道具：无
- 裁切／必见：胸部以上至头部　｜　人物面部表情、眼神、酷感
- 废片判据：面部过暗、眼神无光、背景过曝

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Medium close-up of an adult looking at camera in an underground parking garage, cool lighting, urban style, no flash, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S17-04　半身侧拍光带

- 文件名：`scene-parking-garage__04.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约4米，机位高1.5米，平视，机位与行车通道边缘距离≥2米
- 动作：侧身站立，头部回望镜头，一只手轻触脖颈
- 服装：待确认（建议深色系服装），妆发待确认
- 光线：侧逆光来自顶部光带，勾勒人物轮廓，正面稍暗；不补光，关闭闪光灯
- 道具：无
- 裁切／必见：腰部以上至头部，包含部分光带　｜　人物侧身轮廓、光带作为背景元素
- 废片判据：面部完全黑暗、轮廓不清晰、光带断裂

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Side profile half body shot of an adult in an underground parking garage, overhead light strip in background, cool tone, no flash, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S17-05　顶光光带纵深全景

- 文件名：`scene-parking-garage__05.png`　全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距主体约6米，机位高1.6米，平视，机位与行车通道边缘距离≥3米
- 动作：背对镜头向前走，突然回头，抓拍动态
- 服装：待确认（建议深色系服装），妆发待确认
- 光线：顶灯光带作为主光源，形成强烈的明暗对比；不补光，关闭闪光灯
- 道具：无
- 裁切／必见：全身，包含顶部光带和地面反射　｜　光带引导线、人物动态、车库深邃感
- 废片判据：光带过曝、人物模糊、构图不紧凑

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Full body shot of an adult walking in an underground parking garage, overhead light strips leading lines, cool atmosphere, no flash, 24mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S17-06　坐地低角度全景

- 文件名：`scene-parking-garage__06.png`　全身 / 低机位仰拍 / 24mm / f/4 / 竖幅
- 机位：距主体约2.5米，机位高0.3米，低角度，机位与行车通道边缘距离≥2米
- 动作：坐在地上，一条腿伸直一条腿弯曲，手搭在膝盖上，看向镜头
- 服装：待确认（建议深色系服装，注意地面清洁），妆发待确认
- 光线：顶灯从上方打下，人物面部有阴影，可让模特稍抬头；不补光，关闭闪光灯
- 道具：无（仅利用地面）
- 裁切／必见：全身，包含地面和部分背景　｜　人物坐姿、低角度视角、车库环境
- 废片判据：地面脏污影响画面、人物比例失调、光线过暗

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Low angle full body shot of an adult sitting on the ground in an underground parking garage, cool lighting, urban mood, no flash, 24mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S17-07　倚柱中景

- 文件名：`scene-parking-garage__07.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高1.2米，平视，机位与行车通道边缘距离≥2米（确保不占用通道）
- 动作：后背轻靠立柱，一只脚踩在柱子上，手臂交叉胸前，酷感表情
- 服装：待确认（建议深色系服装），妆发待确认
- 光线：顶灯从侧面打来，形成半明半暗的面部效果；不补光，关闭闪光灯
- 道具：无（仅利用现场立柱）
- 裁切／必见：大腿以上至头部，包含立柱　｜　人物倚靠姿态、立柱质感、车库环境
- 废片判据：立柱不牢固影响安全、姿态不自然、光线平淡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Medium shot of an adult leaning against a concrete pillar in an underground parking garage, cool lighting, urban style, no flash, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S17-08　面部特写

- 文件名：`scene-parking-garage__08.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高1.5米，平视，机位与行车通道边缘距离≥2米
- 动作：脸部特写，眼神直视镜头，表情冷酷，嘴唇微闭
- 服装：待确认（妆面需突出眼部轮廓），发型待确认
- 光线：利用顶灯作为主光源，面部有冷调光影，可让模特微微仰头；不补光，关闭闪光灯
- 道具：无
- 裁切／必见：头部和肩部，裁切至头顶以上　｜　眼神光、皮肤质感、酷感表情
- 废片判据：面部过曝或过暗、眼神光缺失、皮肤油光

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Close-up of an adult face in an underground parking garage, cool lighting, intense gaze, urban mood, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S17-09　引导线纵深全景

- 文件名：`scene-parking-garage__09.png`　全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距主体约10米，机位高1.5米，平视，机位与行车通道边缘距离≥3米
- 动作：正对镜头站立，双手插兜，身体微微后仰，展现自信姿态
- 服装：待确认（建议深色系服装），妆发待确认
- 光线：顶灯光带从前景延伸到背景，形成强烈纵深感；不补光，关闭闪光灯
- 道具：无
- 裁切／必见：全身，包含整个纵深空间　｜　引导线构图、人物自信姿态、车库冷调环境
- 废片判据：引导线不明显、人物过小、光带过曝

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Full body shot of an adult standing in an underground parking garage, strong leading lines from overhead lights and floor markings, cool urban atmosphere, no flash, 24mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S17-01 ｜ 镜头名 ｜ 24mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

