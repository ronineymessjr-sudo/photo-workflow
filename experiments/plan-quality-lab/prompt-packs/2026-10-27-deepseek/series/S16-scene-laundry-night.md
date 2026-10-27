# S16 · 自助洗衣店之夜

用例 `scene-laundry-night`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：美式复古休闲装：牛仔夹克、白色T恤、深色直筒裤、帆布鞋；发型自然蓬松；妆面干净。品牌。
- **场地**：24小时自助洗衣店
- **光线**：店内荧光灯顶光为主，利用门口自然光与室内荧光灯混合，不开闪光灯。
- **调色**：warm amber highlights, muted browns, soft contrast
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：35mm全程；滚筒玻璃后的脸2镜（机位贴近滚筒玻璃30厘米）；只利用店内荧光灯；禁用闪光灯；避开其他顾客入镜正面。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
A  of an adult model entering a 24-hour laundromat at night, wearing a vintage denim jacket, white t-shirt, dark straight pants, and canvas shoes, pushing the door open, natural relaxed expression, illuminated by fluorescent lights, no flash, shot on, eye level, American retro style, lifestyle photography, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
A  of an adult model entering a 24-hour laundromat at night, wearing a vintage denim jacket, white t-shirt, dark straight pants, and canvas shoes, pushing the door open, natural relaxed expression, illuminated by fluorescent lights, no flash, shot on, eye level, American retro style, lifestyle photography, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
A  of an adult model entering a 24-hour laundromat at night, wearing a vintage denim jacket, white t-shirt, dark straight pants, and canvas shoes, pushing the door open, natural relaxed expression, illuminated by fluorescent lights, no flash, shot on, eye level, American retro style, lifestyle photography, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 洗衣店夜光全景 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，机位高度约1.5米，平视。 |
| 2 | 中景装载衣物 | 中景 | 低机位仰拍 | 35mm | f/2.8 | 距主体约2米，机位高度约1.2米，略低角度。 |
| 3 | 滚筒玻璃后的脸特写1 | 特写 | 平视 | 35mm | f/1.8 | 机位贴近滚筒玻璃30厘米，高度与模特脸部平齐。 |
| 4 | 滚筒玻璃后的脸特写2 | 特写 | 平视 | 35mm | f/1.8 | 机位贴近滚筒玻璃30厘米，高度与模特脸部平齐，侧面角度。 |
| 5 | 中景等待洗衣 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，机位高度约1.5米，平视。 |
| 6 | 近景整理衣领 | 近景 | 平视 | 35mm | f/2 | 距主体约1.5米，机位高度约1.4米，平视。 |
| 7 | 全景倚机阅读 | 全身 | 低机位仰拍 | 35mm | f/4 | 距主体约3.5米，机位高度约1.2米，略低角度。 |
| 8 | 中近景凝视滚筒 | 近景 | 平视 | 35mm | f/2 | 距主体约2米，机位高度约1.3米，平视。 |
| 9 | 近景手部特写 | 特写 | 高机位俯拍 | 35mm | f/1.8 | 距主体约1米，机位高度约1.2米，俯视。 |

### S16-01　洗衣店夜光全景

- 文件名：`scene-laundry-night__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度约1.5米，平视。
- 动作：模特推门进入洗衣店，身体半侧，右手扶门把，左手自然下垂，视线扫向店内。
- 服装：美式复古休闲装：牛仔夹克、白色T恤、深色直筒裤、帆布鞋；发型自然蓬松；妆面干净。品牌待确认。
- 光线：店内荧光灯顶光为主，利用门口自然光与室内荧光灯混合，不开闪光灯。
- 道具：无（仅店内现有滚筒洗衣机、荧光灯）。
- 裁切／必见：完整保留模特全身和门框，顶部留出荧光灯管，底部不裁脚。　｜　模特全身、洗衣店门框、店内滚筒洗衣机阵列、荧光灯管。
- 废片判据：模特被裁切不完整，其他顾客正面入镜，出现闪光灯硬影。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, A full-body shot of an adult model entering a 24-hour laundromat at night, wearing a vintage denim jacket, white t-shirt, dark straight pants, and canvas shoes, pushing the door open, natural relaxed expression, illuminated by fluorescent lights, no flash, shot on, eye level, wide shot, American retro style, lifestyle photography, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S16-02　中景装载衣物

- 文件名：`scene-laundry-night__02.png`　中景 / 低机位仰拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高度约1.2米，略低角度。
- 动作：模特站在洗衣机前，弯腰将衣物放入滚筒，双手动作，侧脸朝向镜头。
- 服装：牛仔夹克脱下搭在肩上，白色T恤，深色直筒裤；发型自然。品牌待确认。
- 光线：顶部荧光灯照明，模特面部受光均匀，无需补光。
- 道具：无（仅店内现有洗衣机、衣物）。
- 裁切／必见：裁切至大腿中部，保留手部动作和洗衣机滚筒开口。　｜　模特侧脸、手部放入衣物的动作、洗衣机滚筒。
- 废片判据：手部模糊，洗衣机滚筒开口不完整，其他顾客正面入镜。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, A medium shot of an adult model loading clothes into a washing machine in a laundromat, side profile, wearing a white t-shirt and dark pants, denim jacket draped over shoulder, natural relaxed expression, illuminated by overhead fluorescent lights, no flash, shot on, slightly low angle, American retro lifestyle, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S16-03　滚筒玻璃后的脸特写1

- 文件名：`scene-laundry-night__03.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：机位贴近滚筒玻璃30厘米，高度与模特脸部平齐。
- 动作：模特蹲在洗衣机前，脸贴近滚筒玻璃，双手轻扶玻璃边缘，眼神好奇地看向滚筒内部。
- 服装：白色T恤，头发略乱；妆面自然。品牌待确认。
- 光线：仅利用洗衣机内部荧光灯和店内顶光，面部受光柔和，不开闪光灯。
- 道具：无。
- 裁切／必见：裁切至头部和肩部，滚筒玻璃边缘入画。　｜　模特脸部、滚筒玻璃反光、眼神。
- 废片判据：玻璃反光过强遮挡面部，脸部失焦，出现闪光灯。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, A close-up shot of an adult model's face seen through the glass door of a washing machine, hands gently touching the glass, curious expression, illuminated by soft fluorescent light from inside the machine and overhead, no flash, shot on at 30cm distance, eye level, American retro style, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S16-04　滚筒玻璃后的脸特写2

- 文件名：`scene-laundry-night__04.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：机位贴近滚筒玻璃30厘米，高度与模特脸部平齐，侧面角度。
- 动作：模特侧脸贴近滚筒玻璃，闭眼微笑，额头轻靠玻璃，表现出松弛感。
- 服装：白色T恤，头发自然散落；妆面干净。品牌待确认。
- 光线：仅利用店内荧光灯，从侧面照射，面部轮廓柔和。
- 道具：无。
- 裁切／必见：裁切至头部和颈部，保留玻璃边缘。　｜　模特闭眼微笑的侧脸、玻璃上的轻微反光。
- 废片判据：表情僵硬，玻璃反光过曝，脸部不清晰。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, A close-up shot of an adult model's side profile leaning against the glass door of a washing machine, eyes closed, gentle smile, relaxed mood, illuminated by side fluorescent light, no flash, shot on at 30cm distance, eye level, American retro style, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S16-05　中景等待洗衣

- 文件名：`scene-laundry-night__05.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度约1.5米，平视。
- 动作：模特靠在洗衣机旁，双手插兜，目光望向洗衣机方向，身体放松。
- 服装：牛仔夹克重新穿上，白色T恤，深色直筒裤；发型随意；妆面自然。品牌待确认。
- 光线：顶部荧光灯照明，整体环境明亮。
- 道具：无。
- 裁切／必见：裁切至膝盖以上，保留洗衣机操作面板。　｜　模特松弛姿态、洗衣机、店内环境背景。
- 废片判据：姿势僵硬，背景杂乱，其他顾客正面入镜。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, A medium shot of an adult model leaning against a washing machine in a laundromat, hands in pockets, looking towards the machine, relaxed posture, wearing a denim jacket and white t-shirt, illuminated by overhead fluorescent lights, no flash, shot on, eye level, American retro lifestyle, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S16-06　近景整理衣领

- 文件名：`scene-laundry-night__06.png`　近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度约1.4米，平视。
- 动作：模特低头整理牛仔夹克的衣领，手指动作细腻，眼神向下。
- 服装：牛仔夹克、白色T恤；发型自然；妆面干净。品牌待确认。
- 光线：荧光灯顶光，面部有轻微阴影，可稍侧身让光线均匀。
- 道具：无。
- 裁切／必见：裁切至胸部，突出手部和衣领细节。　｜　模特手部整理衣领的动作、衣领细节。
- 废片判据：手部动作模糊，衣领不清晰，光线过暗。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, A close-up shot of an adult model adjusting the collar of a denim jacket, looking down, detailed hand movement, wearing a white t-shirt, illuminated by overhead fluorescent light, no flash, shot on, eye level, American retro style, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S16-07　全景倚机阅读

- 文件名：`scene-laundry-night__07.png`　全身 / 低机位仰拍 / 35mm / f/4 / 竖幅
- 机位：距主体约3.5米，机位高度约1.2米，略低角度。
- 动作：模特坐在洗衣机前的长椅上，低头看手中的杂志（假设杂志为现场道具，若无可改为看手机或发呆），双腿交叉，姿态放松。
- 服装：牛仔夹克敞开，白色T恤，深色直筒裤，帆布鞋；发型自然。品牌待确认。
- 光线：荧光灯从上方照射，人物面部和杂志受光均匀。
- 道具：杂志（若现场无则改为无道具，动作改为发呆）。
- 裁切／必见：保留全身和周围洗衣机，顶部留荧光灯。　｜　模特放松坐姿、杂志（如有）、洗衣机环境。
- 废片判据：道具不存在，姿势不自然，裁切脚部。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, A full-body shot of an adult model sitting on a bench in a laundromat, reading a magazine, legs crossed, relaxed posture, wearing a denim jacket and white t-shirt, illuminated by overhead fluorescent lights, no flash, shot on, slightly low angle, American retro lifestyle, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 杂志（若现场无则改为无道具，动作改为发呆）。.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S16-08　中近景凝视滚筒

- 文件名：`scene-laundry-night__08.png`　近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约2米，机位高度约1.3米，平视。
- 动作：模特站在洗衣机前，双手撑在机器上，身体前倾，凝视滚筒内的衣物旋转。
- 服装：牛仔夹克、白色T恤；发型略乱；妆面自然。品牌待确认。
- 光线：顶部荧光灯和滚筒内灯光，面部受光柔和。
- 道具：无。
- 裁切／必见：裁切至腰部，保留滚筒和手部。　｜　模特凝视表情、手撑机器、滚筒内衣物。
- 废片判据：眼神不聚焦，滚筒内无衣物，光线平淡。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, A medium close-up shot of an adult model standing in front of a washing machine, hands resting on the machine, leaning forward, gazing into the rotating drum, wearing a denim jacket and white t-shirt, illuminated by overhead fluorescent light and drum light, no flash, shot on, eye level, American retro style, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S16-09　近景手部特写

- 文件名：`scene-laundry-night__09.png`　特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度约1.2米，俯视。
- 动作：模特的手轻抚洗衣机操作面板，手指按下按钮，动作缓慢。
- 服装：牛仔夹克袖口，白色T恤袖口；手部干净。品牌待确认。
- 光线：荧光灯顶光，手部受光均匀，面板有轻微反光。
- 道具：无。
- 裁切／必见：裁切至手腕，突出手指和按钮。　｜　手指按按钮的动作、操作面板细节。
- 废片判据：手部模糊，按钮不清晰，光线过暗。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, A close-up shot of an adult model's hand pressing a button on a washing machine control panel, wearing a denim jacket sleeve, illuminated by overhead fluorescent light, no flash, shot on, high angle, American retro style, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S16-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

