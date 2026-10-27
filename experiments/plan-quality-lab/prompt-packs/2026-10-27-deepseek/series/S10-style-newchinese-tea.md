# S10 · 新中式茶室人像

用例 `style-newchinese-tea`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hair tied back in a low bun | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 建议素色宽松上衣与长裤，发型简洁低束，淡妆，不戴亮面饰品 | 换衣即断系列 |
| 场地 | 茶室（茶桌、茶具现场已有） | 同一处，背景元素不跑 |
| 光线 | 只开室内现有暖灯，主灯位于画面右上方，关闭闪光灯，用反光板在左侧墙面柔补暗部，不做正面补光 | 主光方向不变 |
| 调色 | low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, An adult standing sideways in front of a Chinese folding screen in a tea room, hands relaxed, gaze toward the tea table, warm indoor lamp lighting, calm expression, chest-level eye view, muted wardrobe, no flash, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, An adult standing sideways in front of a Chinese folding screen in a tea room, hands relaxed, gaze toward the tea table, warm indoor lamp lighting, calm expression, chest-level eye view, muted wardrobe, no flash, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, An adult standing sideways in front of a Chinese folding screen in a tea room, hands relaxed, gaze toward the tea table, warm indoor lamp lighting, calm expression, chest-level eye view, muted wardrobe, no flash, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-newchinese-tea__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 环境定场暖灯茶室全景 | 大远景 | 平视 | 50mm | f/8 | 距主体约4米，机位高度约1.5米，门口内侧平视 |
| 2 | 屏风前静立半身 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2米，机位高度约1.4米，与胸口平视 |
| 3 | 茶桌坐姿全身低机位 | 全身 | 平视 | 50mm | f/4 | 距主体约3米，机位高度约0.9米，略低于胸口，平视偏仰 |
| 4 | 屏风框景坐姿 | 全身 | 平视 | 50mm | f/4 | 距主体约3.5米，机位高度约1.3米，从屏风开口处取景 |
| 5 | 注水手部特写 | 大特写 | 平视 | 50mm | f/1.8 | 距茶桌约40厘米，机位高度约25厘米，接近桌面平视手部 |
| 6 | 递杯手部特写 | 特写 | 平视 | 50mm | f/1.8 | 距茶桌约40厘米，机位高度约30厘米，从侧面拍双手与杯 |
| 7 | 茶具与人物手部中景 | 近景 | 平视 | 50mm | f/2 | 距主体约1.5米，机位高度约1.1米，略低于胸口平视 |
| 8 | 低头看杯近景 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1米，机位高度约1.5米，与眼睛平视 |
| 9 | 茶桌俯拍人手中景 | 中景 | 正俯拍 | 50mm | f/2.8 | 距主体约1.2米，机位高度约1.8米，从上方俯拍桌面与人物上部 |
| 10 | 暖灯侧脸情绪近景 | 特写 | 平视 | 50mm | f/1.8 | 距主体约80厘米，机位高度约1.4米，侧前方平视 |

### S10-01　环境定场暖灯茶室全景

- 文件名：`style-newchinese-tea__01.png`
- 景别/角度/焦段/光圈：大远景 / 平视 / 50mm / f/8 / 竖幅
- 机位：距主体约4米，机位高度约1.5米，门口内侧平视
- 动作：背对镜头坐在茶桌前约三分之二侧位，双手自然放在膝上，不动，脸不朝镜头
- 道具：茶桌、茶具（现场已有）　｜　裁切：保留茶桌边缘、茶具、人物全身与屏风上缘，不裁掉人物脚部与头顶
- 必见：茶室空间关系、茶桌茶具、人物安静坐姿、屏风背景　｜　废片判据：人物被裁切、出现闪光灯硬影、茶具和人物被前景遮挡、画面偏冷色

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/10] 2:3 vertical, Chinese-style tea room interior, an adult sitting quietly at a tea table in the right third of the frame, back three-quarter to camera, hands resting on knees, warm indoor lamp light only, tea table and tea set in foreground, folding screen in background, calm zen mood, eye level, full scene, no flash, 50mm lens at f/8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: 茶桌、茶具（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-02　屏风前静立半身

- 文件名：`style-newchinese-tea__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高度约1.4米，与胸口平视
- 动作：侧身站在屏风前，肩放松，双手自然垂落，目光落在茶桌方向，不直视镜头
- 道具：屏风（现场已有）　｜　裁切：头顶留约一拳空间，裁至腰线以下，含双手
- 必见：人物安静侧脸、屏风纹理、暖灯氛围　｜　废片判据：闪光灯直射、屏风纹理糊掉、人物眼神紧张、背景出现杂物

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/10] 2:3 vertical, An adult standing sideways in front of a Chinese folding screen in a tea room, hands relaxed, gaze toward the tea table, warm indoor lamp lighting, calm expression, chest-level eye view, half body, muted wardrobe, no flash, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: 屏风（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-03　茶桌坐姿全身低机位

- 文件名：`style-newchinese-tea__03.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，机位高度约0.9米，略低于胸口，平视偏仰
- 动作：正坐在茶桌前，双腿并拢，一手轻放桌面，一手落于膝上，肩背自然挺直
- 道具：茶桌、茶具（现场已有）　｜　裁切：从头顶到脚部完整保留，茶桌不切掉主要茶具
- 必见：完整坐姿、茶桌比例、暖灯光下的安静状态　｜　废片判据：脚部被裁、坐姿含胸驼背、暖灯色温不一致、出现闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/10] 2:3 vertical, An adult seated upright at a tea table, legs together, one hand on table and one on knee, warm indoor lamp light, Chinese tea room, full body, camera at 0.9 meter eye level, calm zen atmosphere, no flash, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: 茶桌、茶具（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-04　屏风框景坐姿

- 文件名：`style-newchinese-tea__04.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约3.5米，机位高度约1.3米，从屏风开口处取景
- 动作：侧坐在屏风与茶桌之间，身体朝向茶桌，双手叠放在桌沿，目光低垂
- 道具：屏风、茶桌、茶具（现场已有）　｜　裁切：保留屏风开口作为画框，人物全身入框，茶桌底边入画
- 必见：屏风框景结构、人物坐姿、人物与茶桌的关系　｜　废片判据：屏风框线歪斜、人物被屏风切到脸部、前景过暗看不出材质

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/10] 2:3 vertical, An adult seated sideways framed by a Chinese folding screen opening, hands folded on tea table edge, eyes lowered, warm indoor lamp light, zen tea room, eye level from 3.5 meters, screen acting as natural frame, no flash, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: 屏风、茶桌、茶具（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-05　注水手部特写

- 文件名：`style-newchinese-tea__05.png`
- 景别/角度/焦段/光圈：大特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距茶桌约40厘米，机位高度约25厘米，接近桌面平视手部
- 动作：一手扶壶盖，一手持壶柄向茶杯缓慢注水，手腕稳定，动作停在注水过程
- 道具：茶壶、茶杯、茶盘（现场已有）　｜　裁切：只取手部、壶嘴、茶杯和茶盘局部，不收入人脸
- 必见：注水水流、手部动作、茶杯位置　｜　废片判据：手部失焦、水流模糊、闪光灯硬反光、背景杂乱入画

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/10] 2:3 vertical, Close-up of hands pouring water from a teapot into a cup on a tea tray, warm indoor lamp light, camera 40cm from tea table at surface height, calm precise motion, Chinese tea room, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: 茶壶、茶杯、茶盘（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-06　递杯手部特写

- 文件名：`style-newchinese-tea__06.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距茶桌约40厘米，机位高度约30厘米，从侧面拍双手与杯
- 动作：双手托杯沿，将茶杯递向画面左侧，肘部贴近身体，动作缓慢
- 道具：茶杯（现场已有）　｜　裁切：裁至手掌与杯身，不含手臂全段与人脸
- 必见：手指托杯姿势、杯口朝向、暖灯下的杯沿光　｜　废片判据：手指遮住杯口、画面抖动、背景出现茶具杂乱投影

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/10] 2:3 vertical, Close-up of two hands gently offering a tea cup, warm indoor lamp light, tea table surface, camera 40cm away at low table height, calm gesture, Chinese tea room, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: 茶杯（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-07　茶具与人物手部中景

- 文件名：`style-newchinese-tea__07.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度约1.1米，略低于胸口平视
- 动作：一手持杯停在胸前，另一手轻搭茶桌，目光看向茶具
- 道具：茶桌、茶具、茶杯（现场已有）　｜　裁切：从头顶保留到腰腹，茶具入前景但不挡手
- 必见：持杯手部、茶具细节、人物安静侧脸　｜　废片判据：茶具挡住脸、手部出焦、闪光灯破坏暖灯氛围

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/10] 2:3 vertical, An adult holding a tea cup near chest, other hand resting on tea table, tea set in foreground, warm indoor lamp light, calm gaze, medium shot, eye level 1.5 meters away, Chinese zen tea room, no flash, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 茶桌、茶具、茶杯（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-08　低头看杯近景

- 文件名：`style-newchinese-tea__08.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度约1.5米，与眼睛平视
- 动作：双手捧杯置于胸前下方，低头看杯中，肩颈放松，不笑
- 道具：茶杯（现场已有）　｜　裁切：裁至胸口中部，保留头顶空间，含双手与杯
- 必见：低垂眼神、捧杯双手、暖灯下的面部层次　｜　废片判据：眼神被头发完全遮挡、闪光灯造成油光、脸部被裁

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/10] 2:3 vertical, A close-up of an adult looking down at a tea cup held with both hands, warm indoor lamp side light, calm quiet expression, camera one meter away at eye level, Chinese tea room, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: 茶杯（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-09　茶桌俯拍人手中景

- 文件名：`style-newchinese-tea__09.png`
- 景别/角度/焦段/光圈：中景 / 正俯拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约1.2米，机位高度约1.8米，从上方俯拍桌面与人物上部
- 动作：端坐茶桌前，双手放在桌面上整理茶具位置，动作停在半途
- 道具：茶桌、茶具（现场已有）　｜　裁切：取人物头顶到桌面中部，不收入脚部和地面杂物
- 必见：桌面布局、手部整理动作、人物安静状态　｜　废片判据：俯拍造成人物变形、桌面过曝、手部被身体投影完全盖住

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/10] 2:3 vertical, Overhead view of an adult sitting at a Chinese tea table arranging tea set with both hands, warm indoor lamp light from upper side, calm atmosphere, camera 1.8 meters high, medium shot, no flash, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: 茶桌、茶具（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-10　暖灯侧脸情绪近景

- 文件名：`style-newchinese-tea__10.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约80厘米，机位高度约1.4米，侧前方平视
- 动作：身体微微转向茶桌，脸侧对镜头，目光落在远处茶具上，呼吸平缓
- 道具：无　｜　裁切：从头顶裁至锁骨下方，保留侧脸轮廓和肩线
- 必见：安静侧脸、眼神方向、暖灯轮廓光　｜　废片判据：正面补光导致平淡、脸部过曝、背景出现杂乱边缘线

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], low-saturation warm-neutral with jade and ivory tones, soft film rolloff, no digital oversharpening, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 10/10] 2:3 vertical, Close-up side profile of an adult in a warm-lit Chinese tea room, gaze toward distant tea set, quiet expression, rim light from indoor lamp behind, deep calm tones, camera 80cm away at eye level, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-newchinese-tea__REF-A.png. Change only camera position, framing and pose to match FRAME 10. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-newchinese-tea__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

