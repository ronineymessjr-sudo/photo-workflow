# S10 · 新中式茶室人像

用例 `style-newchinese-tea`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：建议素色宽松上衣与长裤，发型简洁低束，淡妆，不戴亮面饰品
- **场地**：茶室（茶桌、茶具现场已有）
- **光线**：只开室内现有暖灯，主灯位于画面右上方，关闭闪光灯，用反光板在左侧墙面柔补暗部，不做正面补光
- **调色**：low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff
- **画幅**：竖幅 2:3
- **焦段序列**：50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：50mm全程；注水、递杯手部特写2镜（机位距茶桌40厘米）；全身坐姿与屏风框景2镜；只开室内现有暖灯，禁用闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
An adult standing sideways in front of a Chinese folding screen in a tea room, hands relaxed, gaze toward the tea table, warm indoor lamp lighting, calm expression, chest-level eye view, muted wardrobe, no flash, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
An adult standing sideways in front of a Chinese folding screen in a tea room, hands relaxed, gaze toward the tea table, warm indoor lamp lighting, calm expression, chest-level eye view, muted wardrobe, no flash, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
An adult standing sideways in front of a Chinese folding screen in a tea room, hands relaxed, gaze toward the tea table, warm indoor lamp lighting, calm expression, chest-level eye view, muted wardrobe, no flash, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`style-newchinese-tea__01.png`　大远景 / 平视 / 50mm / f/8 / 竖幅
- 机位：距主体约4米，机位高度约1.5米，门口内侧平视
- 动作：背对镜头坐在茶桌前约三分之二侧位，双手自然放在膝上，不动，脸不朝镜头
- 服装：服装待确认，建议素色宽松上衣与长裤，发型简洁低束，淡妆，不戴亮面饰品
- 光线：只开室内现有暖灯，主灯位于画面右上方，关闭闪光灯，用反光板在左侧墙面柔补暗部，不做正面补光
- 道具：茶桌、茶具（现场已有）
- 裁切／必见：保留茶桌边缘、茶具、人物全身与屏风上缘，不裁掉人物脚部与头顶　｜　茶室空间关系、茶桌茶具、人物安静坐姿、屏风背景
- 废片判据：人物被裁切、出现闪光灯硬影、茶具和人物被前景遮挡、画面偏冷色

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 1 of 10, Chinese-style tea room interior, an adult sitting quietly at a tea table in the right third of the frame, back three-quarter to camera, hands resting on knees, warm indoor lamp light only, tea table and tea set in foreground, folding screen in background, calm zen mood, eye level, full scene, no flash, 50mm lens at f/8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 茶桌、茶具（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-02　屏风前静立半身

- 文件名：`style-newchinese-tea__02.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高度约1.4米，与胸口平视
- 动作：侧身站在屏风前，肩放松，双手自然垂落，目光落在茶桌方向，不直视镜头
- 服装：服装待确认，素色上衣，袖口整洁，发丝收拢，妆面干净
- 光线：仅室内现有暖灯，灯位保持在画面右后方，利用屏风反光形成柔和侧光，关闭闪光灯
- 道具：屏风（现场已有）
- 裁切／必见：头顶留约一拳空间，裁至腰线以下，含双手　｜　人物安静侧脸、屏风纹理、暖灯氛围
- 废片判据：闪光灯直射、屏风纹理糊掉、人物眼神紧张、背景出现杂物

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 2 of 10, An adult standing sideways in front of a Chinese folding screen in a tea room, hands relaxed, gaze toward the tea table, warm indoor lamp lighting, calm expression, chest-level eye view, half body, muted wardrobe, no flash, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 屏风（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-03　茶桌坐姿全身低机位

- 文件名：`style-newchinese-tea__03.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，机位高度约0.9米，略低于胸口，平视偏仰
- 动作：正坐在茶桌前，双腿并拢，一手轻放桌面，一手落于膝上，肩背自然挺直
- 服装：服装待确认，宽松坐姿不勒身，鞋袜整洁，发型低束
- 光线：只开室内现有暖灯，主光在人物左上方，右侧用白色桌面自然反射补暗部，禁用闪光灯
- 道具：茶桌、茶具（现场已有）
- 裁切／必见：从头顶到脚部完整保留，茶桌不切掉主要茶具　｜　完整坐姿、茶桌比例、暖灯光下的安静状态
- 废片判据：脚部被裁、坐姿含胸驼背、暖灯色温不一致、出现闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 3 of 10, An adult seated upright at a tea table, legs together, one hand on table and one on knee, warm indoor lamp light, Chinese tea room, full body, camera at 0.9 meter eye level, calm zen atmosphere, no flash, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 茶桌、茶具（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-04　屏风框景坐姿

- 文件名：`style-newchinese-tea__04.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约3.5米，机位高度约1.3米，从屏风开口处取景
- 动作：侧坐在屏风与茶桌之间，身体朝向茶桌，双手叠放在桌沿，目光低垂
- 服装：服装待确认，衣摆收顺，避免与屏风图案颜色混在一起
- 光线：仅室内暖灯，让屏风形成前景暗框，人物面部靠侧暖灯照亮，禁用闪光灯
- 道具：屏风、茶桌、茶具（现场已有）
- 裁切／必见：保留屏风开口作为画框，人物全身入框，茶桌底边入画　｜　屏风框景结构、人物坐姿、人物与茶桌的关系
- 废片判据：屏风框线歪斜、人物被屏风切到脸部、前景过暗看不出材质

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 4 of 10, An adult seated sideways framed by a Chinese folding screen opening, hands folded on tea table edge, eyes lowered, warm indoor lamp light, zen tea room, eye level from 3.5 meters, screen acting as natural frame, no flash, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 屏风、茶桌、茶具（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-05　注水手部特写

- 文件名：`style-newchinese-tea__05.png`　大特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距茶桌约40厘米，机位高度约25厘米，接近桌面平视手部
- 动作：一手扶壶盖，一手持壶柄向茶杯缓慢注水，手腕稳定，动作停在注水过程
- 服装：袖口收窄或挽起，手指清洁，不佩戴反光饰品
- 光线：只开现有暖灯，让灯从手背侧上方落下，桌面用白纸轻度反光补暗部，禁用闪光灯
- 道具：茶壶、茶杯、茶盘（现场已有）
- 裁切／必见：只取手部、壶嘴、茶杯和茶盘局部，不收入人脸　｜　注水水流、手部动作、茶杯位置
- 废片判据：手部失焦、水流模糊、闪光灯硬反光、背景杂乱入画

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 5 of 10, Close-up of hands pouring water from a teapot into a cup on a tea tray, warm indoor lamp light, camera 40cm from tea table at surface height, calm precise motion, Chinese tea room, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 茶壶、茶杯、茶盘（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-06　递杯手部特写

- 文件名：`style-newchinese-tea__06.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距茶桌约40厘米，机位高度约30厘米，从侧面拍双手与杯
- 动作：双手托杯沿，将茶杯递向画面左侧，肘部贴近身体，动作缓慢
- 服装：袖口整齐，手腕露出，妆发不进入画面
- 光线：仅现有暖灯，灯位略偏人物后侧，在杯沿形成细高光，关闭闪光灯
- 道具：茶杯（现场已有）
- 裁切／必见：裁至手掌与杯身，不含手臂全段与人脸　｜　手指托杯姿势、杯口朝向、暖灯下的杯沿光
- 废片判据：手指遮住杯口、画面抖动、背景出现茶具杂乱投影

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 6 of 10, Close-up of two hands gently offering a tea cup, warm indoor lamp light, tea table surface, camera 40cm away at low table height, calm gesture, Chinese tea room, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 茶杯（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-07　茶具与人物手部中景

- 文件名：`style-newchinese-tea__07.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，机位高度约1.1米，略低于胸口平视
- 动作：一手持杯停在胸前，另一手轻搭茶桌，目光看向茶具
- 服装：服装待确认，袖口不遮杯，肩线平整，妆面干净
- 光线：只开室内暖灯，主光从画面右上方落在脸侧，桌面反光带亮茶具边缘，禁用闪光灯
- 道具：茶桌、茶具、茶杯（现场已有）
- 裁切／必见：从头顶保留到腰腹，茶具入前景但不挡手　｜　持杯手部、茶具细节、人物安静侧脸
- 废片判据：茶具挡住脸、手部出焦、闪光灯破坏暖灯氛围

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 7 of 10, An adult holding a tea cup near chest, other hand resting on tea table, tea set in foreground, warm indoor lamp light, calm gaze, medium shot, eye level 1.5 meters away, Chinese zen tea room, no flash, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 茶桌、茶具、茶杯（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-08　低头看杯近景

- 文件名：`style-newchinese-tea__08.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度约1.5米，与眼睛平视
- 动作：双手捧杯置于胸前下方，低头看杯中，肩颈放松，不笑
- 服装：服装待确认，领口简洁，头发不遮眼，淡妆
- 光线：仅现有暖灯，灯从侧上方照亮面部，鼻侧留柔和阴影，关闭闪光灯
- 道具：茶杯（现场已有）
- 裁切／必见：裁至胸口中部，保留头顶空间，含双手与杯　｜　低垂眼神、捧杯双手、暖灯下的面部层次
- 废片判据：眼神被头发完全遮挡、闪光灯造成油光、脸部被裁

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 8 of 10, A close-up of an adult looking down at a tea cup held with both hands, warm indoor lamp side light, calm quiet expression, camera one meter away at eye level, Chinese tea room, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 茶杯（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-09　茶桌俯拍人手中景

- 文件名：`style-newchinese-tea__09.png`　中景 / 正俯拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约1.2米，机位高度约1.8米，从上方俯拍桌面与人物上部
- 动作：端坐茶桌前，双手放在桌面上整理茶具位置，动作停在半途
- 服装：服装待确认，肩部平整，袖口收拢，发型整齐
- 光线：只开室内现有暖灯，从侧上方打亮桌面，利用桌面反光补手部，禁用闪光灯
- 道具：茶桌、茶具（现场已有）
- 裁切／必见：取人物头顶到桌面中部，不收入脚部和地面杂物　｜　桌面布局、手部整理动作、人物安静状态
- 废片判据：俯拍造成人物变形、桌面过曝、手部被身体投影完全盖住

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 9 of 10, Overhead view of an adult sitting at a Chinese tea table arranging tea set with both hands, warm indoor lamp light from upper side, calm atmosphere, camera 1.8 meters high, medium shot, no flash, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 茶桌、茶具（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S10-10　暖灯侧脸情绪近景

- 文件名：`style-newchinese-tea__10.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约80厘米，机位高度约1.4米，侧前方平视
- 动作：身体微微转向茶桌，脸侧对镜头，目光落在远处茶具上，呼吸平缓
- 服装：服装待确认，肩领干净，头发顺至耳后，淡妆，不戴高反光饰品
- 光线：只开现有暖灯，灯在人物后方形成轮廓光，正面不补光，保持暗调，关闭闪光灯
- 道具：无
- 裁切／必见：从头顶裁至锁骨下方，保留侧脸轮廓和肩线　｜　安静侧脸、眼神方向、暖灯轮廓光
- 废片判据：正面补光导致平淡、脸部过曝、背景出现杂乱边缘线

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-saturation warm-neutral, soft jade and ivory tones, film-like rolloff, 2:3 vertical framing, no in-image text or labels, frame 10 of 10, Close-up side profile of an adult in a warm-lit Chinese tea room, gaze toward distant tea set, quiet expression, rim light from indoor lamp behind, deep calm tones, camera 80cm away at eye level, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：4×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S10-01 ｜ 镜头名 ｜ 50mm f/8`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

