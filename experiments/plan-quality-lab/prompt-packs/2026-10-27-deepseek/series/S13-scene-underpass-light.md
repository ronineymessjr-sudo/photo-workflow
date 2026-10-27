# S13 · 桥洞隧道光

用例 `scene-underpass-light`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：建议深色硬挺外套与长裤，避免反光材质，妆发自然冷峻。
- **场地**：人行桥洞（非机动车道外安全区）
- **光线**：自然光，洞口逆光形成剪影，无补光，利用洞内暗部与外部亮部对比。
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash；do not enter restricted area
- **原始要求**：35mm全程；洞口逆光剪影2镜、洞内灯光层次2镜；机位不进入机动车道并写明与车道距离；人物不触碰桥洞设施；无闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Urban hard-edged style, a lone adult standing at the entrance of a pedestrian underpass, back to camera, silhouetted against bright tunnel exit, eye level, natural backlight, no flash, dark clothing, cool mood, architectural arch framing, safe zone beside non-motorized lane, no vehicles in frame, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Urban hard-edged style, a lone adult standing at the entrance of a pedestrian underpass, back to camera, silhouetted against bright tunnel exit, eye level, natural backlight, no flash, dark clothing, cool mood, architectural arch framing, safe zone beside non-motorized lane, no vehicles in frame, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Urban hard-edged style, a lone adult standing at the entrance of a pedestrian underpass, back to camera, silhouetted against bright tunnel exit, eye level, natural backlight, no flash, dark clothing, cool mood, architectural arch framing, safe zone beside non-motorized lane, no vehicles in frame, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 远景定场·桥洞全貌 | 全身 | 平视 | 35mm | f/4 | 距主体约8米，站在非机动车道外侧安全区，机位高度约1.5米，平视。 |
| 2 | 中景逆光·洞口半身剪影 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，站在安全区，机位高度约1.2米，平视。 |
| 3 | 中全景·洞内灯光层次与人物 | 中全 | 平视 | 35mm | f/3.5 | 距主体约5米，站在安全区，机位高度约1.5米，平视。 |
| 4 | 近景·洞内灯光细节与冷峻表情 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1.5米，站在安全区，机位高度约1.6米，平视。 |
| 5 | 低角度·桥洞结构与人 | 中景 | 低机位仰拍 | 35mm | f/2.8 | 距主体约2米，站在安全区，机位高度约0.8米，低角度仰拍。 |
| 6 | 全景·人物与桥洞纵深 | 全身 | 平视 | 35mm | f/4 | 距主体约6米，站在安全区，机位高度约1.5米，平视。 |
| 7 | 特写·脚步与地面光影 | 大特写 | 地面低角度 | 35mm | f/1.8 | 距主体约1米，蹲下，机位高度约0.3米，低角度。 |
| 8 | 中近景·侧面轮廓与隧道光 | 近景 | 平视 | 35mm | f/2 | 距主体约2.5米，站在安全区，机位高度约1.5米，平视。 |
| 9 | 大远景·桥洞出口与城市背景 | 大远景 | 平视 | 35mm | f/8 | 距主体约15米，站在安全区，机位高度约1.6米，平视。 |

### S13-01　远景定场·桥洞全貌

- 文件名：`scene-underpass-light__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约8米，站在非机动车道外侧安全区，机位高度约1.5米，平视。
- 动作：模特背对镜头，站在人行桥洞入口处，双脚与肩同宽，双手自然下垂，面朝洞内深处，保持静止。
- 服装：待确认；建议深色硬挺外套与长裤，避免反光材质，妆发自然冷峻。
- 光线：自然光，洞口逆光形成剪影，无补光，利用洞内暗部与外部亮部对比。
- 道具：无
- 裁切／必见：头顶保留桥洞上沿，脚下保留地面，左右包含洞壁。　｜　桥洞整体拱形结构、人物剪影、非机动车道与安全区边界。
- 废片判据：人物细节过曝或欠曝、构图不完整、背景有杂乱车辆干扰。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Urban hard-edged style, a lone adult standing at the entrance of a pedestrian underpass, back to camera, silhouetted against bright tunnel exit, wide shot, eye level, natural backlight, no flash, dark clothing, cool mood, architectural arch framing, safe zone beside non-motorized lane, no vehicles in frame, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-02　中景逆光·洞口半身剪影

- 文件名：`scene-underpass-light__02.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，站在安全区，机位高度约1.2米，平视。
- 动作：模特侧身站立，头部转向洞外，下巴微抬，手臂自然下垂，呈现冷峻侧脸轮廓。
- 服装：待确认；硬挺外套领口立起，发型利落。
- 光线：自然逆光，洞口亮部形成轮廓光，面部处于阴影但保留细节，无补光。
- 道具：无
- 裁切／必见：取半身，头顶留空，裁至腰部。　｜　人物侧脸轮廓、逆光边缘光、桥洞出口亮部。
- 废片判据：面部死黑无细节、轮廓光缺失、背景过曝溢出。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Medium shot, side profile of an adult standing at tunnel exit, backlit silhouette with rim light, eye level, cool urban style, no flash, natural light, dark clothing, hard outline, bright exit background, safe zone, no vehicles, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-03　中全景·洞内灯光层次与人物

- 文件名：`scene-underpass-light__03.png`　中全 / 平视 / 35mm / f/3.5 / 竖幅
- 机位：距主体约5米，站在安全区，机位高度约1.5米，平视。
- 动作：模特正面朝向镜头，缓慢向前走，双手自然摆动，目光直视前方。
- 服装：待确认；深色服装，避免图案。
- 光线：现场洞内灯光作为主光源，形成明暗层次，无额外补光，利用顶灯在人物身上产生光斑。
- 道具：无
- 裁切／必见：取全身，保留头顶灯带和脚下地面。　｜　人物行走动态、洞内灯光在墙面和地面的光斑、纵深层次。
- 废片判据：人物运动模糊、灯光层次平淡、背景杂乱。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Medium full shot, adult walking towards camera inside pedestrian underpass, eye level, overhead tunnel lights creating light pools and depth, hard urban style, dark clothing, cool mood, no flash, safe zone, no vehicles, 35mm lens at f/3.5, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-04　近景·洞内灯光细节与冷峻表情

- 文件名：`scene-underpass-light__04.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，站在安全区，机位高度约1.6米，平视。
- 动作：模特停下脚步，头部微侧，目光看向画面左侧，嘴唇微闭，表情冷峻。
- 服装：待确认；外套领口微敞，发型整洁。
- 光线：洞内顶灯作为顶光，在面部形成轻微阴影，无补光，保留现场光质感。
- 道具：无
- 裁切／必见：胸部以上，头顶保留少量空间。　｜　面部表情、眼神光、灯光在皮肤上的质感。
- 废片判据：面部过暗或过曝、眼神光缺失、背景杂乱。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Close-up shot, adult with cold expression inside pedestrian underpass, eye level, overhead tunnel light casting subtle shadows, hard urban style, dark clothing, no flash, detailed skin texture, background wall with light patterns, safe zone, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-05　低角度·桥洞结构与人

- 文件名：`scene-underpass-light__05.png`　中景 / 低机位仰拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，站在安全区，机位高度约0.8米，低角度仰拍。
- 动作：模特站立，双脚分开与肩同宽，双手插兜，抬头看向洞顶。
- 服装：待确认；硬挺外套，长裤，鞋子简洁。
- 光线：混合光，洞口自然光与洞内灯光，人物面部受光均匀，无补光。
- 道具：无
- 裁切／必见：取大半身，保留头顶拱顶和脚下地面。　｜　桥洞拱形结构、人物仰头姿态、空间压迫感。
- 废片判据：人物变形、拱顶不完整、光线平淡。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Low angle shot, adult standing inside underpass looking up, ground level, arch structure converging above, urban hard style, dark clothing, mixed natural and tunnel light, no flash, safe zone, no vehicles, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-06　全景·人物与桥洞纵深

- 文件名：`scene-underpass-light__06.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约6米，站在安全区，机位高度约1.5米，平视。
- 动作：模特背对镜头向洞内深处走去，步伐自然，双手下垂。
- 服装：待确认；深色服装，与隧道光影融合。
- 光线：洞内灯光形成纵深光斑，人物处于逆光与侧光交界，无补光。
- 道具：无
- 裁切／必见：取全身，包含洞顶和地面。　｜　人物行走动态、隧道光影层次、纵深透视。
- 废片判据：人物模糊、光影平淡、构图松散。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Full shot, adult walking away into pedestrian underpass, eye level, tunnel lights creating depth, urban hard style, dark clothing, backlit, no flash, safe zone, no vehicles, cool mood, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-07　特写·脚步与地面光影

- 文件名：`scene-underpass-light__07.png`　大特写 / 地面低角度 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1米，蹲下，机位高度约0.3米，低角度。
- 动作：模特站立，一只脚微微向前，重心在后脚。
- 服装：待确认；深色长裤与硬朗鞋款，鞋面避免反光。
- 光线：洞内灯光在地面形成光斑，侧光勾勒鞋面轮廓，无补光。
- 道具：无
- 裁切／必见：取脚部至膝盖，保留地面纹理。　｜　鞋部细节、地面光影、脚步姿态。
- 废片判据：鞋部过曝或欠曝、地面杂乱、构图不紧凑。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Close-up shot of feet and lower legs standing on tunnel floor, ground level, light patterns on concrete floor, hard urban style, dark pants and shoes, no flash, cool mood, safe zone, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-08　中近景·侧面轮廓与隧道光

- 文件名：`scene-underpass-light__08.png`　近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约2.5米，站在安全区，机位高度约1.5米，平视。
- 动作：模特侧身站立，手臂自然下垂，头部保持中立，目光平视前方。
- 服装：待确认；外套轮廓清晰，发型利落。
- 光线：洞内灯光作为侧光，勾勒人物轮廓，面部半明半暗，无补光。
- 道具：无
- 裁切／必见：取半身，裁至腰部。　｜　侧脸轮廓、肩部线条、隧道背景光点。
- 废片判据：面部全黑或全亮、背景光点杂乱、轮廓光缺失。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Medium close-up, side profile of adult inside tunnel, eye level, tunnel lights as side light, half face lit, hard urban style, dark clothing, no flash, background with bokeh lights, safe zone, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-09　大远景·桥洞出口与城市背景

- 文件名：`scene-underpass-light__09.png`　大远景 / 平视 / 35mm / f/8 / 横幅
- 机位：距主体约15米，站在安全区，机位高度约1.6米，平视。
- 动作：模特站在桥洞出口处，身体稍微侧向，回头看向镜头方向。
- 服装：待确认；深色服装，轮廓明显。
- 光线：自然光从洞口摄入，城市背景明亮，人物处于逆光，无补光。
- 道具：无
- 裁切／必见：取全身，包含大片城市背景和桥洞出口。　｜　人物剪影、桥洞出口结构、城市背景细节。
- 废片判据：人物过小、背景过曝、构图不平衡。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Extreme wide shot, adult standing at tunnel exit with city background, eye level, backlit silhouette, urban hard style, dark clothing, natural light, no flash, safe zone, no vehicles, cool mood, 35mm lens at f/8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S13-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

