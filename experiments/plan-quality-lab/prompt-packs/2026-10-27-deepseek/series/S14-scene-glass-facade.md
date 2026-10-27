# S14 · 玻璃幕墙反光街拍

用例 `scene-glass-facade`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- **场地**：商务楼玻璃幕墙前广场
- **光线**：利用下午侧光，避免正午顶光。若阳光过强，在模特左前方45度放置白色反光板补光，降低反差
- **调色**：neutral daylight, clean whites, restrained saturation
- **画幅**：竖幅 2:3
- **焦段序列**：24mm → 24mm → 85mm → 85mm → 85mm → 24mm → 85mm → 24mm → 85mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame
- **原始要求**：24mm2镜、85mm2镜；幕墙镜像构图2镜但人物主体必须清晰；避开正午顶光；机位写明距幕墙与距主体的距离。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Fashion street photography,  of an adult model standing confidently in front of a glass curtain wall office building, wearing modern urban outfit (unspecified), natural pose with one hand on hip, side lighting, sharp details, clear reflection on glass, modern city vibe, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Fashion street photography,  of an adult model standing confidently in front of a glass curtain wall office building, wearing modern urban outfit (unspecified), natural pose with one hand on hip, side lighting, sharp details, clear reflection on glass, modern city vibe, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Fashion street photography,  of an adult model standing confidently in front of a glass curtain wall office building, wearing modern urban outfit (unspecified), natural pose with one hand on hip, side lighting, sharp details, clear reflection on glass, modern city vibe, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 全景定场·幕墙前广场交代 | 全身 | 平视 | 24mm | f/4 | 距幕墙约8米，距主体约7米，机位高约1.5米，平视 |
| 2 | 低角仰拍·幕墙几何纵深 | 全身 | 低机位仰拍 | 24mm | f/4 | 距幕墙约2米，距主体约3米，机位高约0.5米，低角度仰拍 |
| 3 | 镜像构图·中景动态行走 | 近景 | 平视 | 85mm | f/2 | 距幕墙约3米，距主体约1.5米，机位高约1.2米，平视 |
| 4 | 镜像构图·近景倚靠幕墙 | 近景 | 平视 | 85mm | f/2 | 距幕墙约1.5米，距主体约1.2米，机位高约1.2米，平视 |
| 5 | 细节特写·幕墙纹理与手部 | 大特写 | 平视 | 85mm | f/1.8 | 距幕墙约0.5米，距主体约0.5米，机位高约1.2米，平视 |
| 6 | 中景·幕墙前景框架构图 | 中景 | 平视 | 24mm | f/2.8 | 距幕墙约4米，距主体约6米，机位高约1.5米，平视 |
| 7 | 中近景·侧身回眸 | 近景 | 平视 | 85mm | f/2 | 距幕墙约3米，距主体约2米，机位高约1.3米，平视 |
| 8 | 全景·幕墙倒影中的行走 | 全身 | 平视 | 24mm | f/4 | 距幕墙约10米，距主体约8米，机位高约1.6米，平视 |
| 9 | 近景·幕墙反射光斑下的面部 | 特写 | 平视 | 85mm | f/1.8 | 距幕墙约2米，距主体约1米，机位高约1.4米，平视 |

### S14-01　全景定场·幕墙前广场交代

- 文件名：`scene-glass-facade__01.png`　全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距幕墙约8米，距主体约7米，机位高约1.5米，平视
- 动作：模特背对幕墙，自然站立，重心放在右腿，左手轻搭在左侧腰际，头部微侧向镜头，目光平视前方，表情利落
- 服装：待确认（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- 光线：利用下午侧光，避免正午顶光。若阳光过强，在模特左前方45度放置白色反光板补光，降低反差
- 道具：无
- 裁切／必见：头顶留空间约1/5，脚底留地面约1/6，左右保留幕墙和广场环境　｜　完整人物从头到脚，玻璃幕墙的反射与建筑线条，广场地面材质
- 废片判据：人物过小不清晰、幕墙反光过曝完全掩盖细节、人物被切头或切脚

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Fashion street photography, full body shot of an adult model standing confidently in front of a glass curtain wall office building, wearing modern urban outfit (unspecified), natural pose with one hand on hip, side lighting, sharp details, clear reflection on glass, modern city vibe, 24mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-02　低角仰拍·幕墙几何纵深

- 文件名：`scene-glass-facade__02.png`　全身 / 低机位仰拍 / 24mm / f/4 / 竖幅
- 机位：距幕墙约2米，距主体约3米，机位高约0.5米，低角度仰拍
- 动作：模特向前迈步，左脚着地，右臂自然摆动，头部微抬，眼神坚定看向远方
- 服装：待确认（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- 光线：利用侧逆光勾勒轮廓，在模特正前方低位放置反光板补亮面部和服装暗部，避免顶光
- 道具：无
- 裁切／必见：头顶留空间，脚下保留少许地面，突出幕墙的垂直线条　｜　人物动态、幕墙的反射与线条、低角度带来的冲击感
- 废片判据：人物表情僵硬、反光板穿帮、幕墙线条倾斜过度

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Urban street fashion, low angle full body shot of an adult model walking confidently in front of a glass curtain wall, modern outfit (unspecified), dynamic pose, strong lines of building reflectingwide angle, side backlight with reflector, clear details, 24mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-03　镜像构图·中景动态行走

- 文件名：`scene-glass-facade__03.png`　近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距幕墙约3米，距主体约1.5米，机位高约1.2米，平视
- 动作：模特侧身行走，左脚前迈，右臂前摆，头部转向镜头方向，目光锐利
- 服装：待确认（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- 光线：使用侧光，在模特侧前方45度放置反光板，确保面部和服装明亮，幕墙反光保留细节
- 道具：无
- 裁切／必见：头顶以上保留约1/6空间，脚底以下保留约1/6，左右保留倒影　｜　人物清晰的主体、幕墙倒影构图、动态行走姿态
- 废片判据：人物面部模糊、倒影过强干扰主体、构图歪斜

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Mirror reflection composition, medium shot of an adult model walking sideways in front of a glass curtain wall, modern outfit (unspecified), clear reflection on glass, side lighting with reflector, sharp focus on model, urban setting, 85mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-04　镜像构图·近景倚靠幕墙

- 文件名：`scene-glass-facade__04.png`　近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距幕墙约1.5米，距主体约1.2米，机位高约1.2米，平视
- 动作：模特侧身轻靠幕墙，右肩接触玻璃，左手插兜，头部微侧，眼神冷静
- 服装：待确认（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- 光线：漫射光为主，若阳光直射，使用柔光布遮挡，并在模特正面用反光板补光，突出质感
- 道具：无
- 裁切／必见：胸部以上至膝盖，保留幕墙纹理和倒影　｜　人物表情、倚靠动作、幕墙倒影清晰
- 废片判据：面部阴影过重、倒影模糊、构图杂乱

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Mirror reflection close-up, adult model leaning sideways against glass curtain wall, modern outfit (unspecified), clear reflection in glass, soft lighting with reflector, sharp facial details, urban fashion, 85mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-05　细节特写·幕墙纹理与手部

- 文件名：`scene-glass-facade__05.png`　大特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距幕墙约0.5米，距主体约0.5米，机位高约1.2米，平视
- 动作：模特右手手指轻触幕墙玻璃，手指自然张开，其他部位在画外
- 服装：待确认（建议都市现代风格，袖口简洁），手部可佩戴简约戒指（待确认）
- 光线：侧光凸显玻璃纹理和手部轮廓，用反光板补亮暗部
- 道具：无
- 裁切／必见：手部特写，保留部分前臂和幕墙反射　｜　手指触感、玻璃反射的细节、皮肤质感
- 废片判据：手指模糊、反光过曝掩盖纹理、皮肤瑕疵明显

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Extreme close-up of a hand touching glass curtain wall, reflection visible, sharp details, side lighting, urban texture, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-06　中景·幕墙前景框架构图

- 文件名：`scene-glass-facade__06.png`　中景 / 平视 / 24mm / f/2.8 / 竖幅
- 机位：距幕墙约4米，距主体约6米，机位高约1.5米，平视
- 动作：模特站立，正面朝向镜头，双手自然下垂，下巴微收，目光直视镜头
- 服装：待确认（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- 光线：利用自然光，在人物前方用反光板补光，确保面部明亮
- 道具：无
- 裁切／必见：半身像，头顶留空间，保留幕墙框架结构　｜　人物表情、幕墙框架构图、环境交代
- 废片判据：框架切割人物不美观、人物面部光线平淡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Medium shot of an adult model framed by glass curtain wall structures, modern outfit (unspecified), direct gaze, natural lighting with reflector, urban setting, sharp focus, 24mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-07　中近景·侧身回眸

- 文件名：`scene-glass-facade__07.png`　近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距幕墙约3米，距主体约2米，机位高约1.3米，平视
- 动作：模特侧身站立，头部转向镜头，眼神锐利，右手轻抬至胸前
- 服装：待确认（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- 光线：侧逆光勾勒轮廓，正面用反光板补光，表现利落感
- 道具：无
- 裁切／必见：胸部以上至腰部，保留背景幕墙虚化　｜　回眸表情、眼神光、幕墙反射光斑
- 废片判据：眼神光缺失、表情不自然、背景过杂

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Medium close-up of an adult model looking back over shoulder, modern outfit (unspecified), sharp gaze, side backlight with reflector, glass curtain wall background with bokeh, urban fashion, 85mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-08　全景·幕墙倒影中的行走

- 文件名：`scene-glass-facade__08.png`　全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距幕墙约10米，距主体约8米，机位高约1.6米，平视
- 动作：模特背对镜头向前行走，步幅自然，手臂摆动，头部微抬
- 服装：待确认（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- 光线：自然光，避免正午顶光，选择下午侧光，用反光板补亮人物背面
- 道具：无
- 裁切／必见：全身，保留幕墙倒影的完整构图　｜　人物行走动态、倒影与实体呼应、环境氛围
- 废片判据：人物过小不清晰、倒影杂乱、构图失衡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Full body shot of an adult model walking away towards glass curtain wall, clear reflection of model in glass, modern outfit (unspecified), afternoon side light, urban street photography, sharp focus, 24mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-09　近景·幕墙反射光斑下的面部

- 文件名：`scene-glass-facade__09.png`　特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距幕墙约2米，距主体约1米，机位高约1.4米，平视
- 动作：模特正面，头部微仰，闭眼感受光线，表情放松但利落
- 服装：待确认（建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落
- 光线：利用幕墙反射的光斑作为背景光，正面用柔光板补光，创造柔和光影
- 道具：无
- 裁切／必见：头部和肩部，保留光斑背景　｜　面部细节、皮肤质感、背景光斑
- 废片判据：光斑过曝、面部阴影不自然、表情僵硬

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Close-up of an adult model's face with eyes closed, glass curtain wall reflection creating bokeh light spots in background, modern outfit (unspecified), soft lighting, urban fashion, sharp facial details, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S14-01 ｜ 镜头名 ｜ 24mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

