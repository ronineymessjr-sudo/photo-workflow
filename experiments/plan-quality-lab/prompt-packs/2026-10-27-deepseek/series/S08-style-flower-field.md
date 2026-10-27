# S08 · 花田少女感

用例 `style-flower-field`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：浅色棉麻连衣裙，草帽，自然披发，淡妆
- **场地**：油菜花田田埂
- **光线**：自然光，顺光拍摄，利用现场光，无补光
- **调色**：bright airy pastel, golden backlight, gentle bloom
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 50mm → 135mm → 135mm → 85mm → 100mm → 35mm → 50mm → 85mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame
- **原始要求**：135mm长焦压缩花海4镜；机位必须在田埂上距花丛1米外不踩踏花田；逆光花瓣轮廓2镜；人物入花丛仅限已踩出的走道。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
A young woman in a light cotton dress and straw hat walking naturally along a dirt path between blooming rapeseed fields, bright and fresh atmosphere, rural pastoral style, soft sunlight, eye level, environment context, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
A young woman in a light cotton dress and straw hat walking naturally along a dirt path between blooming rapeseed fields, bright and fresh atmosphere, rural pastoral style, soft sunlight, eye level, environment context, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
A young woman in a light cotton dress and straw hat walking naturally along a dirt path between blooming rapeseed fields, bright and fresh atmosphere, rural pastoral style, soft sunlight, eye level, environment context, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 田埂环境广角交代 | 全身 | 平视 | 35mm | f/4 | 距主体约8米，站立于田埂上，机位高度约1.6米，平视 |
| 2 | 中景回眸浅笑 | 中景 | 平视 | 50mm | f/2.8 | 距主体约3米，站立于田埂上，机位高度约1.5米，平视 |
| 3 | 长焦压缩花海人像 | 中景 | 平视 | 135mm | f/2.8 | 距主体约8米，站立于田埂上，机位高度约1.7米，平视 |
| 4 | 长焦花海回头抓拍 | 近景 | 平视 | 135mm | f/2 | 距主体约8米，站立于田埂上，机位高度约1.6米，平视 |
| 5 | 逆光花瓣轮廓特写 | 特写 | 平视 | 85mm | f/1.8 | 距主体约2米，站立于田埂上，机位高度约1.4米，平视 |
| 6 | 逆光发丝与花穗特写 | 大特写 | 平视 | 100mm | f/1.8 | 距主体约1.5米，站立于田埂上，机位高度约1.3米，平视 |
| 7 | 田埂低角度仰拍 | 中景 | 地面低角度 | 35mm | f/2.8 | 距主体约4米，蹲在田埂上，机位高度约0.5米，低角度仰拍 |
| 8 | 花丛走道中景 | 中景 | 平视 | 50mm | f/2.8 | 距主体约3米，站立于走道中，机位高度约1.5米，平视 |
| 9 | 蹲姿花田细节 | 近景 | 平视 | 85mm | f/2 | 距主体约2米，站立于田埂上，机位高度约1.2米，平视 |

### S08-01　田埂环境广角交代

- 文件名：`style-flower-field__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约8米，站立于田埂上，机位高度约1.6米，平视
- 动作：沿田埂自然行走，双臂自然摆动，目视前方
- 服装：浅色棉麻连衣裙（待确认具体款式与颜色），草帽（待确认），自然披发，淡妆
- 光线：自然光，顺光拍摄，利用现场光，无补光
- 道具：无
- 裁切／必见：全身入画，保留脚部与头顶空间，画面下沿裁切至脚踝以下　｜　模特全身、田埂线条、两侧油菜花田
- 废片判据：模特走出田埂、花田被踩踏、画面倾斜过度

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, A young woman in a light cotton dress and straw hat walking naturally along a dirt path between blooming rapeseed fields, wide shot, bright and fresh atmosphere, rural pastoral style, soft sunlight, eye level, full body, environment context, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-02　中景回眸浅笑

- 文件名：`style-flower-field__02.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，站立于田埂上，机位高度约1.5米，平视
- 动作：站立田埂，侧身回头看向镜头，嘴角上扬，眼神明亮
- 服装：浅色棉麻连衣裙，草帽（待确认），自然披发，淡妆
- 光线：自然光，侧逆光，用白色反光板在模特正面补光，光比柔和
- 道具：无
- 裁切／必见：裁切至大腿中部，保留头部与手部动作空间　｜　模特回眸表情、眼神、油菜花背景虚化
- 废片判据：表情僵硬、反光板穿帮、花田被踩踏

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Medium shot of a young woman standing on a field path, turning head back to camera with a bright smile, wearing a light cotton dress and straw hat, rapeseed flowers around, soft side backlight, reflector fill, fresh and pastoral mood, eye level, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-03　长焦压缩花海人像

- 文件名：`style-flower-field__03.png`　中景 / 平视 / 135mm / f/2.8 / 竖幅
- 机位：距主体约8米，站立于田埂上，机位高度约1.7米，平视
- 动作：侧身站立于田埂，面朝花海，微微仰头闭眼感受微风
- 服装：浅色棉麻连衣裙，草帽（待确认），自然披发，淡妆
- 光线：自然光，侧逆光，用反光板在正面补光，强调发丝轮廓光
- 道具：无
- 裁切／必见：裁切至膝盖以上，顶部保留少量花海　｜　花海密集背景、人物轮廓、发丝高光
- 废片判据：背景杂乱、主体不突出、花田被踩踏

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Telephoto portrait of a young woman standing on a dirt path, side view, eyes closed, feeling the breeze, surrounded by blurred rapeseed flowers, compressed background, backlight rim light on hair, light cotton dress and straw hat, eye level, medium shot, 135mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-04　长焦花海回头抓拍

- 文件名：`style-flower-field__04.png`　近景 / 平视 / 135mm / f/2 / 竖幅
- 机位：距主体约8米，站立于田埂上，机位高度约1.6米，平视
- 动作：沿田埂向前走，突然回头看向镜头，头发自然飘动
- 服装：浅色棉麻连衣裙，草帽（待确认），自然披发，淡妆
- 光线：自然光，侧逆光，反光板正面补光，确保面部清晰
- 道具：无
- 裁切／必见：裁切至腰部以上，保留头部运动空间　｜　回头瞬间的动态、发丝飘动、面部表情
- 废片判据：面部模糊、表情不自然、背景虚化不足

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Telephoto shot of a young woman walking on a field path and turning back to camera, hair flowing, bright expression, compressed rapeseed flower background, backlight rim light, light cotton dress and straw hat, eye level, medium shot, 135mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-05　逆光花瓣轮廓特写

- 文件名：`style-flower-field__05.png`　特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约2米，站立于田埂上，机位高度约1.4米，平视
- 动作：站立于田埂，手轻抚油菜花花瓣，侧脸朝向光线
- 服装：浅色棉麻连衣裙，草帽（待确认），自然披发，淡妆
- 光线：自然逆光，太阳在模特后方，用反光板正面补光，曝光以花瓣高光为准
- 道具：无
- 裁切／必见：裁切至手部以上，保留花瓣与侧脸　｜　花瓣半透明轮廓光、发丝边缘光、手部细节
- 废片判据：花瓣过曝无细节、手部阴影过重、逆光轮廓不清晰

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Close-up of a young woman's hand gently touching rapeseed flowers, side face partially visible, backlit petals showing translucent outlines, hair rim light, light cotton dress, eye level, fresh pastoral style, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-06　逆光发丝与花穗特写

- 文件名：`style-flower-field__06.png`　大特写 / 平视 / 100mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，站立于田埂上，机位高度约1.3米，平视
- 动作：低头轻嗅花穗，眼睛微闭，表情陶醉
- 服装：浅色棉麻连衣裙，草帽（待确认），自然披发，淡妆
- 光线：自然逆光，太阳在模特侧后方，用反光板补光面部，突出发丝轮廓
- 道具：无
- 裁切／必见：裁切至额头以上，下巴以下，保留花穗与发丝　｜　发丝金色轮廓光、花穗细节、面部陶醉表情
- 废片判据：面部补光不足、发丝轮廓光不明显、花穗模糊

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Extreme close-up of a young woman's face smelling rapeseed flowers, eyes closed, blissful expression, backlight creating golden rim light on hair, flower details, light cotton dress, eye level, soft and fresh, 100mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-07　田埂低角度仰拍

- 文件名：`style-flower-field__07.png`　中景 / 地面低角度 / 35mm / f/2.8 / 竖幅
- 机位：距主体约4米，蹲在田埂上，机位高度约0.5米，低角度仰拍
- 动作：站在田埂上，双手自然下垂，微微仰头，迎接阳光
- 服装：浅色棉麻连衣裙，草帽（待确认），自然披发，淡妆
- 光线：自然光，顺光或侧光，用反光板补光下巴阴影
- 道具：无
- 裁切／必见：裁切至腰部以上，保留天空与花田　｜　人物与天空、花田的层次，低角度带来的视觉冲击
- 废片判据：人物变形、背景过曝、花田被踩踏

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Low angle shot of a young woman standing on a field path, looking up slightly, arms relaxed, surrounded by rapeseed flowers and open sky, light cotton dress and straw hat, fresh and bright, ground level, medium shot, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-08　花丛走道中景

- 文件名：`style-flower-field__08.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，站立于走道中，机位高度约1.5米，平视
- 动作：在已踩出的走道中缓慢行走，手指轻触两侧花朵，眼神温柔
- 服装：浅色棉麻连衣裙，草帽（待确认），自然披发，淡妆
- 光线：自然光，侧光，用反光板补光面部，保持花丛层次
- 道具：无
- 裁切／必见：裁切至腰部以上，保留走道与两侧花丛　｜　人物与走道的关系、两侧花丛、自然步态
- 废片判据：踩踏花田、走道不清晰、人物比例失调

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Medium shot of a young woman walking slowly in a narrow path through rapeseed flowers, gently touching flowers on both sides, gentle expression, side light, light cotton dress and straw hat, fresh pastoral atmosphere, eye level, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-09　蹲姿花田细节

- 文件名：`style-flower-field__09.png`　近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约2米，站立于田埂上，机位高度约1.2米，平视
- 动作：蹲在田埂上，双手托腮，对着镜头微笑
- 服装：浅色棉麻连衣裙，草帽（待确认），自然披发，淡妆
- 光线：自然光，侧逆光，用反光板补光面部，保持眼神光
- 道具：无
- 裁切／必见：裁切至膝盖以上，保留手部与面部　｜　蹲姿自然、手部动作、微笑表情、花田背景
- 废片判据：姿势僵硬、表情不自然、花田被压到

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Close-up of a young woman squatting on a dirt path, hands on cheeks, smiling at camera, surrounded by rapeseed flowers, backlight with reflector fill, light cotton dress and straw hat, eye level, fresh and bright, 85mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S08-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

