# S20 · 天台泳池黄昏

用例 `scene-pool-dusk`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hair tied back in a low bun | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 度假风服装（建议浅色长裙或宽松衬衫），自然披发，淡妆 | 换衣即断系列 |
| 场地 | 酒店天台泳池（已获许可，仅池畔拍摄） | 同一处，背景元素不跑 |
| 光线 | 黄昏自然光，太阳位于模特左后方低角度，形成暖色逆光轮廓；不使用闪光灯，必要时用白色反光板在模特正面3米处补光 | 主光方向不变 |
| 调色 | natural colour with a gentle film curve and consistent white balance | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A  of an adult model standing sideways on a rooftop pool deck at dusk, relaxed posture, looking towards the sunset, warm backlight outlining her silhouette, calm water in the background, soft natural light, no flash, serene vacation mood, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A  of an adult model standing sideways on a rooftop pool deck at dusk, relaxed posture, looking towards the sunset, warm backlight outlining her silhouette, calm water in the background, soft natural light, no flash, serene vacation mood, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A  of an adult model standing sideways on a rooftop pool deck at dusk, relaxed posture, looking towards the sunset, warm backlight outlining her silhouette, calm water in the background, soft natural light, no flash, serene vacation mood, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-pool-dusk__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

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

- 文件名：`scene-pool-dusk__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度与模特视线平齐（约1.6米），距池边至少1.5米
- 动作：模特侧身站立，一脚微微向前，重心在后，肩膀放松，头部自然转向落日方向，视线望向远方
- 道具：无　｜　裁切：全身入画，保留头顶上方约1/4天空和脚下池畔地面
- 必见：模特全身轮廓、泳池水面、黄昏天空色彩渐变　｜　废片判据：人物被裁切不完整、池边线倾斜、逆光导致面部完全死黑无细节

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/10] 2:3 vertical, A full-body shot of an adult model standing sideways on a rooftop pool deck at dusk, relaxed posture, looking towards the sunset, warm backlight outlining her silhouette, calm water in the background, soft natural light, no flash, serene vacation mood, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-02　池畔半身侧影

- 文件名：`scene-pool-dusk__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，机位高度与模特胸口平齐（约1.2米），距池边至少1.5米
- 动作：模特坐在池边（不入水），双腿自然垂向池面但不接触水，双手撑在身后地面，上身微微后仰，头部转向水面，表情惬意
- 道具：无　｜　裁切：从头顶到大腿中部，保留部分池水作为背景
- 必见：模特上半身姿态、面部惬意表情、水面反光　｜　废片判据：水面反光过曝、人物面部阴影过重、肢体僵硬

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/10] 2:3 vertical, A medium shot of an adult model sitting by a rooftop pool at dusk, legs dangling towards water but not touching, hands supporting behind, leaning back slightly, relaxed expression, warm side backlight, water reflections, no flash, lazy vacation atmosphere, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-03　水面反光人像1：俯拍倒影

- 文件名：`scene-pool-dusk__03.png`
- 景别/角度/焦段/光圈：中景 / 高机位俯拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度略高于模特头顶（约2米），距池边至少1.5米，镜头向下倾斜约30度
- 动作：模特站在池边，身体微微前倾，低头看向水面，双手自然下垂或轻扶池边栏杆（若现场有），表情宁静
- 道具：无　｜　裁切：从模特头顶到水面倒影下半部，左右保留适当空间避免拥挤
- 必见：模特面部表情、水面倒影的清晰度、池水的纹理　｜　废片判据：倒影模糊不清、水面波纹过多破坏倒影、模特面部过暗

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/10] 2:3 vertical, A high-angle shot of an adult model standing by a rooftop pool at dusk, leaning slightly forward, looking down at the water, clear reflection on the water surface, natural warm light, no flash, tranquil vacation mood, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-04　水面反光人像2：低角度倒影

- 文件名：`scene-pool-dusk__04.png`
- 景别/角度/焦段/光圈：特写 / 低机位仰拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约2米，机位高度贴近水面（约0.5米），距池边至少1.5米，镜头略微向上仰拍
- 动作：模特蹲在池边（不入水），一只手轻轻触碰水面（仅手指接触），另一只手搭在膝盖上，侧脸看向水面，表情柔和
- 道具：无　｜　裁切：从模特头顶到水面倒影，保留部分池边地面
- 必见：手指触碰水面的细节、水面倒影、模特侧脸轮廓　｜　废片判据：手指入水过多、倒影不完整、模特身体比例失调

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/10] 2:3 vertical, A low-angle shot of an adult model crouching by a rooftop pool at dusk, one hand touching the water surface lightly, side profile, warm backlight, reflection on water, no flash, peaceful vacation vibe, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-05　逆光剪影1：池畔漫步

- 文件名：`scene-pool-dusk__05.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约5米，机位高度与模特腰部平齐（约1米），距池边至少1.5米
- 动作：模特在池边缓慢行走，步伐自然，手臂轻微摆动，头部微抬，面向落日方向，身体轮廓清晰
- 道具：无　｜　裁切：全身入画，保留头顶上方较多天空以增强剪影效果
- 必见：模特全身剪影轮廓、落日位置、天空色彩　｜　废片判据：剪影不清晰（轮廓模糊）、背景过曝、人物与背景融合

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/10] 2:3 vertical, A full-body silhouette of an adult model walking slowly by a rooftop pool at dusk, backlit by the setting sun, clear outline, warm sky colors, no flash, serene vacation atmosphere, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-06　逆光剪影2：倚栏远眺

- 文件名：`scene-pool-dusk__06.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约4米，机位高度与模特眼睛平齐（约1.6米），距池边至少1.5米
- 动作：模特倚靠在池边矮墙或栏杆上（若现场有），双手轻搭，身体放松，头部微侧，望向远方
- 道具：无　｜　裁切：半身剪影，从头顶到腰部，保留部分天空和池水
- 必见：模特上半身剪影轮廓、落日圆盘、天空渐变　｜　废片判据：剪影不突出（背景太亮）、人物姿态僵硬、肢体重叠

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/10] 2:3 vertical, A half-body silhouette of an adult model leaning on a poolside wall at dusk, relaxed posture, looking into the distance, backlit by the setting sun, clear outline, no flash, calm vacation mood, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-07　凭栏特写

- 文件名：`scene-pool-dusk__07.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度与模特胸部平齐（约1.3米），距池边至少1.5米
- 动作：模特侧身站立，一手轻扶池边栏杆（若现场有），另一手自然下垂，头部微低，视线落在远处水面，表情放松
- 道具：无　｜　裁切：从头顶到腰部，保留手部动作
- 必见：模特面部表情、手部细节、水面反光　｜　废片判据：面部阴影过重、手部被裁切、表情不自然

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/10] 2:3 vertical, A medium close-up of an adult model standing by a rooftop pool at dusk, one hand resting on a railing, looking down at the water, warm side light, soft reflections, no flash, relaxed vacation vibe, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-08　享受微风的中景

- 文件名：`scene-pool-dusk__08.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度与模特胸部平齐（约1.2米），距池边至少1.5米
- 动作：模特站立，双臂微微张开，手掌朝前，闭眼仰头，感受微风，表情惬意
- 道具：无　｜　裁切：从头顶到大腿中部，保留手臂动作
- 必见：模特享受的表情、飘动的头发、泳池背景　｜　废片判据：表情做作、头发遮挡面部过多、背景杂乱

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/10] 2:3 vertical, A medium shot of an adult model standing by a rooftop pool at dusk, arms slightly open, eyes closed, head tilted back, enjoying the breeze, warm side backlight, no flash, lazy vacation mood, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-09　池畔坐姿俯拍

- 文件名：`scene-pool-dusk__09.png`
- 景别/角度/焦段/光圈：全身 / 高机位俯拍 / 50mm / f/4 / 竖幅
- 机位：距主体约2.5米，机位高度约1.8米，从斜上方俯拍，距池边至少1.5米
- 动作：模特坐在池边（不入水），双腿弯曲，膝盖并拢，双手环抱小腿，下巴轻靠膝盖，视线望向水面
- 道具：无　｜　裁切：从头顶到脚部，保留池水作为背景
- 必见：模特蜷缩姿态、面部表情、水面倒影　｜　废片判据：人物比例失调、水面反光过曝、肢体拥挤

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/10] 2:3 vertical, A high-angle shot of an adult model sitting by a rooftop pool at dusk, hugging knees, chin on knees, looking at the water, warm frontal light, no flash, cozy vacation atmosphere, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S20-10　黄昏细节特写

- 文件名：`scene-pool-dusk__10.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度与模特眼睛平齐（约1.6米），距池边至少1.5米
- 动作：模特侧身站立，一只手轻轻搭在锁骨附近，另一只手自然下垂，头部微侧，眼神柔和
- 道具：无　｜　裁切：从头顶到胸部，保留手部动作
- 必见：模特面部细节、锁骨线条、手部姿势　｜　废片判据：皮肤过曝或过暗、手部变形、眼神不自然

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 10/10] 2:3 vertical, A close-up of an adult model standing by a rooftop pool at dusk, one hand gently touching collarbone, side profile, soft side light, warm tones, no flash, intimate vacation mood, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-pool-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 10. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, keep the subject out of the water, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-pool-dusk__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
| Flux Kontext / nano-banana | 参考图 + "same person as input image" | 多图参考时 REF 放第一位 |
| SDXL + IP-Adapter FaceID / InstantID / PuLID | 参考图作 face embedding，权重 0.7–0.9 | 没有这些插件，纯文生图必漂 |
| SD1.5 + Roop/Reactor 后处理 | 先出图再统一换脸，最后统一调色 | 保底方案，适合批量 |
| 任意模型 + 固定种子 | 同种子同提示词只改机位句 | 仅对同构图有效，换景别仍会漂 |

## 六、一致性自检（出完逐项过，不过就重出该帧）

- [ ] 脸型/五官一致（不是"长得像"，是同一个人）
- [ ] 发型/发色一致
- [ ] 服装一致（版型、颜色、配饰都在）
- [ ] 场地一致（背景建筑、家具、标识不跑）
- [ ] 主光方向一致（阴影落点不跳边）
- [ ] 色温/对比一致（拼在一起不像两张片子）
- [ ] 画幅一致（竖就全竖，不混排）
- [ ] 无文字/水印/多余人

**"同一个人"的量化口径**（不靠肉眼）：用 InsightFace/ArcFace 提取每帧人脸 embedding，与 REF 帧比对余弦相似度——

| 相似度 | 判定 | 处理 |
|---|---|---|
| ≥ 0.55 | 同一人 | 收 |
| 0.40–0.55 | 疑似换脸 | 优先重出；必须用时只保留侧脸/背影帧 |
| < 0.40 | 换人了 | 直接废片，重出

批量脚本可以一次跑完整个系列，把低于阈值的帧号直接列出来。

