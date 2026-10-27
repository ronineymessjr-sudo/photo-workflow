# S01 · 古风汉服庭院人像

用例 `style-hanfu-court`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名穿汉服的成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：汉服裙摆自然垂落，妆发整洁
- **场地**：江南园林庭院（白天）
- **光线**：自然光，模特面朝门洞光源，正面用白色反光板补光，光比1:2
- **调色**：low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff
- **画幅**：竖幅 2:3
- **焦段序列**：85mm → 85mm → 85mm → 85mm → 85mm → 85mm → 85mm → 85mm → 85mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame
- **原始要求**：全程仅使用85mm；机位保持距主体3米以外压缩背景；月洞门框景至少2镜；裙摆铺开构图要写清风势应对。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Chinese ancient style, a lady in hanfu standing inside a moon gate in a Jiangnan garden, side pose, hands folded, eyes looking down, natural daylight, elegant and restrained mood, flowing skirt, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Chinese ancient style, a lady in hanfu standing inside a moon gate in a Jiangnan garden, side pose, hands folded, eyes looking down, natural daylight, elegant and restrained mood, flowing skirt, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Chinese ancient style, a lady in hanfu standing inside a moon gate in a Jiangnan garden, side pose, hands folded, eyes looking down, natural daylight, elegant and restrained mood, flowing skirt, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 月洞门框景开场 | 全身 | 平视 | 85mm | f/4 | 距主体约4米，机位高度1.5米，正对月洞门中心 |
| 2 | 庭院小径漫步 | 全身 | 平视 | 85mm | f/4 | 距主体约3.5米，机位高度1.2米，侧面跟随 |
| 3 | 月洞门二镜半身特写 | 近景 | 平视 | 85mm | f/2 | 距主体约3米，机位高度1.6米，正对月洞门 |
| 4 | 廊下倚柱侧影 | 全身 | 平视 | 85mm | f/4 | 距主体约4米，机位高度1.4米，在廊柱斜前方 |
| 5 | 裙摆铺开坐姿 | 全身 | 平视 | 85mm | f/4 | 距主体约3.5米，机位高度1.5米，正前方略侧 |
| 6 | 面部特写眼神 | 特写 | 平视 | 85mm | f/1.8 | 距主体约3米，机位高度1.6米，正对模特脸部 |
| 7 | 手部细节特写 | 大特写 | 高机位俯拍 | 85mm | f/1.8 | 距主体约3米，机位高度1.2米，俯拍手部 |
| 8 | 庭院全景环境人像 | 全景 | 平视 | 85mm | f/5.6 | 距主体约5米，机位高度1.6米，正面拍摄 |
| 9 | 回眸半身 | 近景 | 平视 | 85mm | f/2 | 距主体约3.5米，机位高度1.5米，侧后方 |

### S01-01　月洞门框景开场

- 文件名：`style-hanfu-court__01.png`　全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度1.5米，正对月洞门中心
- 动作：侧身站立，双手交叠于腹前，视线望向镜头外斜下方
- 服装：汉服裙摆自然垂落，妆发整洁，待确认具体形制与发饰
- 光线：自然光，模特面朝门洞光源，正面用白色反光板补光，光比1:2
- 道具：无
- 裁切／必见：上至门框顶部，下至裙摆边缘，左右包含完整门洞　｜　月洞门框景、模特全身、裙摆垂顺
- 废片判据：门框不完整、模特出框、反光板穿帮

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Chinese ancient style, a lady in hanfu standing inside a moon gate in a Jiangnan garden, side pose, hands folded, eyes looking down, natural daylight, full body shot, elegant and restrained mood, flowing skirt, 85mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S01-02　庭院小径漫步

- 文件名：`style-hanfu-court__02.png`　全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约3.5米，机位高度1.2米，侧面跟随
- 动作：缓步向前，双手自然交叠于身前，目光低垂
- 服装：汉服裙摆随步伐轻微摆动，妆发整洁，待确认具体形制与发饰
- 光线：自然侧光，用反光板在阴影侧补光，光比1:3
- 道具：无
- 裁切／必见：全身，上下留出小径环境，左右包含部分廊柱　｜　模特行走动态、裙摆摆动、庭院小径与廊柱环境
- 废片判据：步伐僵硬、裙摆糊成一片、背景杂乱的游客

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Chinese ancient style, a lady in hanfu walking slowly on a garden path, hands folded, eyes down, side view, natural daylight, full body, elegant and restrained, 85mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S01-03　月洞门二镜半身特写

- 文件名：`style-hanfu-court__03.png`　近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约3米，机位高度1.6米，正对月洞门
- 动作：身体微侧，一手轻抬至胸前，手指微曲，目光望向镜头
- 服装：汉服领口整齐，发饰待确认，妆容淡雅
- 光线：自然光为主，用柔光板在正面补光，强调面部柔和
- 道具：无
- 裁切／必见：半身，上至头顶留空，下至腰部，左右包含部分门框　｜　模特半身、月洞门框景、面部表情婉约
- 废片判据：面部阴影过重、门框切割头部、表情僵硬

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Chinese ancient style, a lady in hanfu half-body inside a moon gate, side pose, one hand raised to chest, looking at camera, soft natural light, gentle expression, 85mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S01-04　廊下倚柱侧影

- 文件名：`style-hanfu-court__04.png`　全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度1.4米，在廊柱斜前方
- 动作：侧身倚靠廊柱，一手轻扶柱子，目光望向廊外
- 服装：汉服袖口垂落，裙摆自然，发饰待确认
- 光线：廊下阴影处，用反光板从廊外反射自然光补光，光比1:2
- 道具：无
- 裁切／必见：全身，包含廊柱和部分庭院背景　｜　模特倚柱姿态、廊柱结构、庭院环境
- 废片判据：倚柱姿势别扭、廊柱遮挡面部、背景过曝

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Chinese ancient style, a lady in hanfu leaning against a wooden pillar in a garden corridor, side view, one hand on pillar, looking outside, soft reflected light, full body, 85mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S01-05　裙摆铺开坐姿

- 文件名：`style-hanfu-court__05.png`　全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约3.5米，机位高度1.5米，正前方略侧
- 动作：端坐于石阶上，双腿并拢斜放，双手叠放膝上，目光平视
- 服装：裙摆铺开展示层次，妆发端庄，待确认具体形制
- 光线：自然侧光，用反光板补阴影，注意裙摆褶皱的立体感
- 道具：无
- 裁切／必见：全身，重点展示裙摆铺开形状，上下留出环境　｜　裙摆铺开的形态、模特坐姿、石阶环境
- 废片判据：裙摆被风吹乱未整理、坐姿不雅、裙摆超出画面

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Chinese ancient style, a lady in hanfu sitting on a stone step, skirt spread out, hands folded on lap, natural side light, full body, dignified pose, 85mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S01-06　面部特写眼神

- 文件名：`style-hanfu-court__06.png`　特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约3米，机位高度1.6米，正对模特脸部
- 动作：面部微侧，眼神低垂，嘴角含羞
- 服装：汉服领口微露，发丝垂落，妆容淡雅
- 光线：柔光补光，使用反光板或柔光箱，避免硬阴影
- 道具：无
- 裁切／必见：特写，上至发际线，下至锁骨，左右留出少量空间　｜　面部细节、眼神情绪、皮肤质感
- 废片判据：面部阴影杂乱、眼神失焦、妆容油光

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Chinese ancient style, close-up of a lady's face in hanfu, eyes downcast, gentle smile, soft light, detailed skin texture, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S01-07　手部细节特写

- 文件名：`style-hanfu-court__07.png`　大特写 / 高机位俯拍 / 85mm / f/1.8 / 竖幅
- 机位：距主体约3米，机位高度1.2米，俯拍手部
- 动作：双手交叠，手指纤长，袖口露出
- 服装：袖口整齐，手部干净，可佩戴简单戒指（待确认）
- 光线：侧光强调手部轮廓，用反光板补阴影
- 道具：无
- 裁切／必见：特写，仅包含手部和部分袖口　｜　手部姿势、手指细节、袖口纹理
- 废片判据：手部抖虚、袖口杂乱、光线平淡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Chinese ancient style, close-up of hands folded in hanfu sleeves, delicate fingers, soft side light, detail shot, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S01-08　庭院全景环境人像

- 文件名：`style-hanfu-court__08.png`　全景 / 平视 / 85mm / f/5.6 / 竖幅
- 机位：距主体约5米，机位高度1.6米，正面拍摄
- 动作：站立于庭院中央，背对镜头，微微侧头
- 服装：汉服裙摆自然垂落，发饰待确认
- 光线：自然光，注意环境光比，必要时用反光板补面部
- 道具：无
- 裁切／必见：全景，包含庭院建筑、植物和模特全身　｜　庭院环境全貌、模特与环境的比例关系
- 废片判据：环境杂乱、模特太小、建筑切割不当

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Chinese ancient style, a lady in hanfu standing in a Jiangnan garden, back to camera, head slightly turned, full body, environmental portrait, natural daylight, 85mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S01-09　回眸半身

- 文件名：`style-hanfu-court__09.png`　近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约3.5米，机位高度1.5米，侧后方
- 动作：向前行走时突然回眸，裙摆微转
- 服装：汉服裙摆因转身微扬，发丝飘动，妆容待确认
- 光线：侧逆光勾勒轮廓，正面用反光板补光
- 道具：无
- 裁切／必见：半身，包含头部至腰部，背景虚化　｜　回眸瞬间、面部表情、裙摆动态
- 废片判据：回眸生硬、裙摆糊、面部阴影过重

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Chinese ancient style, a lady in hanfu walking then looking back over shoulder, half-body, dynamic skirt, side backlight, graceful moment, 85mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S01-01 ｜ 镜头名 ｜ 85mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

