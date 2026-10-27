# S20 · 天台泳池黄昏

用例 `scene-pool-dusk`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：度假风服装（建议浅色长裙或宽松衬衫），自然披发，淡妆
- **场地**：酒店天台泳池（已获许可，仅池畔拍摄）
- **光线**：黄昏自然光，太阳位于模特左后方低角度，形成暖色逆光轮廓；不使用闪光灯，必要时用白色反光板在模特正面3米处补光
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash；do not put the subject in the water
- **原始要求**：50mm全程；水面反光人像2镜；人物不入水、不下池；机位距池边至少1.5米并写明距主体距离；逆光剪影2镜；禁用闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
A  of an adult model standing sideways on a rooftop pool deck at dusk, relaxed posture, looking towards the sunset, warm backlight outlining her silhouette, calm water in the background, soft natural light, no flash, serene vacation mood, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
A  of an adult model standing sideways on a rooftop pool deck at dusk, relaxed posture, looking towards the sunset, warm backlight outlining her silhouette, calm water in the background, soft natural light, no flash, serene vacation mood, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
A  of an adult model standing sideways on a rooftop pool deck at dusk, relaxed posture, looking towards the sunset, warm backlight outlining her silhouette, calm water in the background, soft natural light, no flash, serene vacation mood, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 泳池全景定位镜头 | 全身 | 平视 | 50mm | f/4 | 距主体约4米，机位高度与模特视线平齐（约1.6米），距池边至少1.5米 |
| 2 | 池畔半身侧影 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2.5米，机位高度与模特胸口平齐（约1.2米），距池边至少1.5米 |
| 3 | 水面反光人像1：俯拍倒影 | 中景 | 高机位俯拍 | 50mm | f/2.8 | 距主体约3米，机位高度略高于模特头顶（约2米），距池边至少1.5米，镜头向下倾斜约30度 |
| 4 | 水面反光人像2：低角度倒影 | 特写 | 低机位仰拍 | 50mm | f/1.8 | 距主体约2米，机位高度贴近水面（约0.5米），距池边至少1.5米，镜头略微向上仰拍 |
| 5 | 逆光剪影1：池畔漫步 | 全身 | 平视 | 50mm | f/4 | 距主体约5米，机位高度与模特腰部平齐（约1米），距池边至少1.5米 |
| 6 | 逆光剪影2：倚栏远眺 | 特写 | 平视 | 50mm | f/1.8 | 距主体约4米，机位高度与模特眼睛平齐（约1.6米），距池边至少1.5米 |
| 7 | 凭栏特写 | 近景 | 平视 | 50mm | f/2 | 距主体约1.5米，机位高度与模特胸部平齐（约1.3米），距池边至少1.5米 |
| 8 | 享受微风的中景 | 中景 | 平视 | 50mm | f/2.8 | 距主体约3米，机位高度与模特胸部平齐（约1.2米），距池边至少1.5米 |
| 9 | 池畔坐姿俯拍 | 全身 | 高机位俯拍 | 50mm | f/4 | 距主体约2.5米，机位高度约1.8米，从斜上方俯拍，距池边至少1.5米 |
| 10 | 黄昏细节特写 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1米，机位高度与模特眼睛平齐（约1.6米），距池边至少1.5米 |

### S20-01　泳池全景定位镜头

- 文件名：`scene-pool-dusk__01.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度与模特视线平齐（约1.6米），距池边至少1.5米
- 动作：模特侧身站立，一脚微微向前，重心在后，肩膀放松，头部自然转向落日方向，视线望向远方
- 服装：待确认的度假风服装（建议浅色长裙或宽松衬衫），自然披发，淡妆
- 光线：黄昏自然光，太阳位于模特左后方低角度，形成暖色逆光轮廓；不使用闪光灯，必要时用白色反光板在模特正面3米处补光
- 道具：无
- 裁切／必见：全身入画，保留头顶上方约1/4天空和脚下池畔地面　｜　模特全身轮廓、泳池水面、黄昏天空色彩渐变
- 废片判据：人物被裁切不完整、池边线倾斜、逆光导致面部完全死黑无细节

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 10, A full-body shot of an adult model standing sideways on a rooftop pool deck at dusk, relaxed posture, looking towards the sunset, warm backlight outlining her silhouette, calm water in the background, soft natural light, no flash, serene vacation mood, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-02　池畔半身侧影

- 文件名：`scene-pool-dusk__02.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，机位高度与模特胸口平齐（约1.2米），距池边至少1.5米
- 动作：模特坐在池边（不入水），双腿自然垂向池面但不接触水，双手撑在身后地面，上身微微后仰，头部转向水面，表情惬意
- 服装：待确认的度假风服装（建议宽松连衣裙或短裤套装），头发自然盘起或披散，淡妆
- 光线：黄昏侧逆光，太阳在模特右后方；用银色反光板在左前方45度补光，距离模特2米，保持自然光感
- 道具：无
- 裁切／必见：从头顶到大腿中部，保留部分池水作为背景　｜　模特上半身姿态、面部惬意表情、水面反光
- 废片判据：水面反光过曝、人物面部阴影过重、肢体僵硬

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 10, A medium shot of an adult model sitting by a rooftop pool at dusk, legs dangling towards water but not touching, hands supporting behind, leaning back slightly, relaxed expression, warm side backlight, water reflections, no flash, lazy vacation atmosphere, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-03　水面反光人像1：俯拍倒影

- 文件名：`scene-pool-dusk__03.png`　中景 / 高机位俯拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度略高于模特头顶（约2米），距池边至少1.5米，镜头向下倾斜约30度
- 动作：模特站在池边，身体微微前倾，低头看向水面，双手自然下垂或轻扶池边栏杆（若现场有），表情宁静
- 服装：待确认的度假风服装（建议纯色长裙），头发自然垂落
- 光线：黄昏顺光，太阳在模特背后，利用水面反射模特面部；用白色反光板在模特正面2米处补光，确保倒影清晰
- 道具：无
- 裁切／必见：从模特头顶到水面倒影下半部，左右保留适当空间避免拥挤　｜　模特面部表情、水面倒影的清晰度、池水的纹理
- 废片判据：倒影模糊不清、水面波纹过多破坏倒影、模特面部过暗

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 10, A high-angle shot of an adult model standing by a rooftop pool at dusk, leaning slightly forward, looking down at the water, clear reflection on the water surface, natural warm light, no flash, tranquil vacation mood, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-04　水面反光人像2：低角度倒影

- 文件名：`scene-pool-dusk__04.png`　特写 / 低机位仰拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约2米，机位高度贴近水面（约0.5米），距池边至少1.5米，镜头略微向上仰拍
- 动作：模特蹲在池边（不入水），一只手轻轻触碰水面（仅手指接触），另一只手搭在膝盖上，侧脸看向水面，表情柔和
- 服装：待确认的度假风服装（建议短裤或短裙，方便蹲姿），头发扎起或披散
- 光线：黄昏逆光，太阳在模特左后方；用金色反光板在右前方补光，距离1.5米，增强水面反光
- 道具：无
- 裁切／必见：从模特头顶到水面倒影，保留部分池边地面　｜　手指触碰水面的细节、水面倒影、模特侧脸轮廓
- 废片判据：手指入水过多、倒影不完整、模特身体比例失调

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 10, A low-angle shot of an adult model crouching by a rooftop pool at dusk, one hand touching the water surface lightly, side profile, warm backlight, reflection on water, no flash, peaceful vacation vibe, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-05　逆光剪影1：池畔漫步

- 文件名：`scene-pool-dusk__05.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约5米，机位高度与模特腰部平齐（约1米），距池边至少1.5米
- 动作：模特在池边缓慢行走，步伐自然，手臂轻微摆动，头部微抬，面向落日方向，身体轮廓清晰
- 服装：待确认的度假风服装（建议飘逸长裙或宽松衣物），头发自然飘动
- 光线：纯逆光，太阳在模特正后方低角度，不补光，利用天空高光形成剪影；注意避免镜头眩光
- 道具：无
- 裁切／必见：全身入画，保留头顶上方较多天空以增强剪影效果　｜　模特全身剪影轮廓、落日位置、天空色彩
- 废片判据：剪影不清晰（轮廓模糊）、背景过曝、人物与背景融合

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 10, A full-body silhouette of an adult model walking slowly by a rooftop pool at dusk, backlit by the setting sun, clear outline, warm sky colors, no flash, serene vacation atmosphere, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-06　逆光剪影2：倚栏远眺

- 文件名：`scene-pool-dusk__06.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约4米，机位高度与模特眼睛平齐（约1.6米），距池边至少1.5米
- 动作：模特倚靠在池边矮墙或栏杆上（若现场有），双手轻搭，身体放松，头部微侧，望向远方
- 服装：待确认的度假风服装（建议修身长裙），头发自然垂落
- 光线：逆光，太阳在模特左后方；不补光，依靠天空亮度勾勒轮廓；注意测光以天空为准
- 道具：无
- 裁切／必见：半身剪影，从头顶到腰部，保留部分天空和池水　｜　模特上半身剪影轮廓、落日圆盘、天空渐变
- 废片判据：剪影不突出（背景太亮）、人物姿态僵硬、肢体重叠

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 10, A half-body silhouette of an adult model leaning on a poolside wall at dusk, relaxed posture, looking into the distance, backlit by the setting sun, clear outline, no flash, calm vacation mood, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-07　凭栏特写

- 文件名：`scene-pool-dusk__07.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度与模特胸部平齐（约1.3米），距池边至少1.5米
- 动作：模特侧身站立，一手轻扶池边栏杆（若现场有），另一手自然下垂，头部微低，视线落在远处水面，表情放松
- 服装：待确认的度假风服装（建议露肩或吊带款式），头发自然披散，淡妆
- 光线：黄昏侧光，太阳在模特右侧，用白色反光板在左侧补光，距离1米，柔和面部阴影
- 道具：无
- 裁切／必见：从头顶到腰部，保留手部动作　｜　模特面部表情、手部细节、水面反光
- 废片判据：面部阴影过重、手部被裁切、表情不自然

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 10, A medium close-up of an adult model standing by a rooftop pool at dusk, one hand resting on a railing, looking down at the water, warm side light, soft reflections, no flash, relaxed vacation vibe, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-08　享受微风的中景

- 文件名：`scene-pool-dusk__08.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度与模特胸部平齐（约1.2米），距池边至少1.5米
- 动作：模特站立，双臂微微张开，手掌朝前，闭眼仰头，感受微风，表情惬意
- 服装：待确认的度假风服装（建议宽松轻薄材质），头发随风飘动
- 光线：黄昏侧逆光，太阳在模特左后方；用反光板在右前方补光，保持面部细节
- 道具：无
- 裁切／必见：从头顶到大腿中部，保留手臂动作　｜　模特享受的表情、飘动的头发、泳池背景
- 废片判据：表情做作、头发遮挡面部过多、背景杂乱

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 10, A medium shot of an adult model standing by a rooftop pool at dusk, arms slightly open, eyes closed, head tilted back, enjoying the breeze, warm side backlight, no flash, lazy vacation mood, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-09　池畔坐姿俯拍

- 文件名：`scene-pool-dusk__09.png`　全身 / 高机位俯拍 / 50mm / f/4 / 竖幅
- 机位：距主体约2.5米，机位高度约1.8米，从斜上方俯拍，距池边至少1.5米
- 动作：模特坐在池边（不入水），双腿弯曲，膝盖并拢，双手环抱小腿，下巴轻靠膝盖，视线望向水面
- 服装：待确认的度假风服装（建议短裤或短裙），头发扎成低马尾或披散
- 光线：黄昏顺光，太阳在模特正面偏上，用反光板在下方补光，减少面部阴影
- 道具：无
- 裁切／必见：从头顶到脚部，保留池水作为背景　｜　模特蜷缩姿态、面部表情、水面倒影
- 废片判据：人物比例失调、水面反光过曝、肢体拥挤

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 10, A high-angle shot of an adult model sitting by a rooftop pool at dusk, hugging knees, chin on knees, looking at the water, warm frontal light, no flash, cozy vacation atmosphere, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-10　黄昏细节特写

- 文件名：`scene-pool-dusk__10.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度与模特眼睛平齐（约1.6米），距池边至少1.5米
- 动作：模特侧身站立，一只手轻轻搭在锁骨附近，另一只手自然下垂，头部微侧，眼神柔和
- 服装：待确认的度假风服装（建议V领或露肩款式），突出锁骨线条；淡妆，唇部略带光泽
- 光线：黄昏柔和侧光，太阳在模特左侧，用白色反光板在右侧补光，距离0.8米，营造柔和肤质
- 道具：无
- 裁切／必见：从头顶到胸部，保留手部动作　｜　模特面部细节、锁骨线条、手部姿势
- 废片判据：皮肤过曝或过暗、手部变形、眼神不自然

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 10 of 10, A close-up of an adult model standing by a rooftop pool at dusk, one hand gently touching collarbone, side profile, soft side light, warm tones, no flash, intimate vacation mood, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not put the subject in the water, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：4×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S20-01 ｜ 镜头名 ｜ 50mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

