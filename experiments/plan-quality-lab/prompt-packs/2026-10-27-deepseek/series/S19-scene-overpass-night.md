# S19 · 立交桥车流夜景

用例 `scene-overpass-night`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | long hair worn loose | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 深色外套，长发自然披散，妆面 | 换衣即断系列 |
| 场地 | 过街天桥（人行的） | 同一处，背景元素不跑 |
| 光线 | 现场路灯侧光，无闪光灯，利用车流灯光作轮廓光 | 主光方向不变 |
| 调色 | natural colour with a gentle film curve and consistent white balance | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, of an adult standing on a pedestrian overpass at night, back to camera, hands on railing, looking at traffic below, long exposure light trails of cars, city lights, no flash, realistic photography, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, of an adult standing on a pedestrian overpass at night, back to camera, hands on railing, looking at traffic below, long exposure light trails of cars, city lights, no flash, realistic photography, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, of an adult standing on a pedestrian overpass at night, back to camera, hands on railing, looking at traffic below, long exposure light trails of cars, city lights, no flash, realistic photography, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-overpass-night__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 天桥全景定场 | 全身 | 平视 | 35mm | f/4 | 距主体约5米，机位高度1.6米，距后方护栏约1.5米 |
| 2 | 中景侧影观流 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，机位高度1.5米，距侧护栏约2米 |
| 3 | 近景扶栏凝视 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1.5米，机位高度1.5米，距前方护栏约0.5米 |
| 4 | 特写手部光轨 | 大特写 | 高机位俯拍 | 35mm | f/1.8 | 距主体手部约0.5米，机位高度1.2米，距护栏约0.3米 |
| 5 | 低角度人物与光轨 | 全身 | 低机位仰拍 | 35mm | f/4 | 距主体约2米，机位高度0.5米，距护栏约1米 |
| 6 | 中近景倚栏远眺 | 近景 | 平视 | 35mm | f/2 | 距主体约2.5米，机位高度1.4米，距侧护栏约1.5米 |
| 7 | 全景行走穿梭 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，机位高度1.6米，距后方护栏约2米 |
| 8 | 中景边缘等待 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，机位高度1.5米，距护栏约1米 |
| 9 | 近景回眸一瞥 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1.5米，机位高度1.5米，距后方护栏约1米 |

### S19-01　天桥全景定场

- 文件名：`scene-overpass-night__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约5米，机位高度1.6米，距后方护栏约1.5米
- 动作：背对镜头，双手扶护栏，身体直立，目视前方车流
- 道具：无　｜　裁切：全身入画，保留天桥结构及车流光轨
- 必见：人物全身、天桥护栏、车流光轨　｜　废片判据：人物模糊、光轨断裂、构图倾斜

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, Full body shot of an adult standing on a pedestrian overpass at night, back to camera, hands on railing, looking at traffic below, long exposure light trails of cars, city lights, no flash, realistic photography, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-02　中景侧影观流

- 文件名：`scene-overpass-night__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度1.5米，距侧护栏约2米
- 动作：侧身站立，双手轻扶护栏，头部微转看向桥下车流
- 道具：无　｜　裁切：半身至大腿，保留部分护栏和光轨
- 必见：人物侧脸、护栏、车流光轨　｜　废片判据：面部死黑、光轨过曝

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, Medium shot of an adult standing sideways on a pedestrian overpass at night, hands on railing, looking at traffic below, long exposure light trails, side lighting from street lamps, no flash, realistic photography, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-03　近景扶栏凝视

- 文件名：`scene-overpass-night__03.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，机位高度1.5米，距前方护栏约0.5米
- 动作：正面站立，双手扶护栏，目光望向镜头方向
- 道具：无　｜　裁切：胸部以上，保留肩部与部分护栏
- 必见：人物面部表情、眼神、护栏　｜　废片判据：面部过暗或过曝、眼神呆滞

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, Close-up shot of an adult standing on a pedestrian overpass at night, hands on railing, looking towards camera, city lights background, no flash, realistic photography, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-04　特写手部光轨

- 文件名：`scene-overpass-night__04.png`
- 景别/角度/焦段/光圈：大特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体手部约0.5米，机位高度1.2米，距护栏约0.3米
- 动作：手部特写，手指轻抚护栏表面，背景车流光轨
- 道具：无　｜　裁切：手部与部分护栏，背景虚化光轨
- 必见：手部细节、护栏纹理、光轨　｜　废片判据：手部模糊、光轨过曝

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, Extreme close-up of a hand touching a metal railing on a pedestrian overpass at night, with blurred car light trails in background, no flash, realistic photography, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-05　低角度人物与光轨

- 文件名：`scene-overpass-night__05.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 35mm / f/4 / 竖幅
- 机位：距主体约2米，机位高度0.5米，距护栏约1米
- 动作：站立，身体微微前倾，望向桥下车流
- 道具：无　｜　裁切：全身，仰拍视角，包含天桥结构
- 必见：人物全身、天桥结构、车流光轨　｜　废片判据：人物变形、背景杂乱

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, Low angle shot of an adult standing on a pedestrian overpass at night, leaning slightly forward, looking down at traffic, long exposure light trails, no flash, realistic photography, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-06　中近景倚栏远眺

- 文件名：`scene-overpass-night__06.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约2.5米，机位高度1.4米，距侧护栏约1.5米
- 动作：背部倚靠护栏，双臂自然下垂，头部微仰望向远方
- 道具：无　｜　裁切：腰部以上，包含部分护栏和光轨
- 必见：人物姿态、护栏、车流光轨　｜　废片判据：背景过曝、人物模糊

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, Medium close-up of an adult leaning back against railing on a pedestrian overpass at night, looking into distance, car light trails background, no flash, realistic photography, 35mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-07　全景行走穿梭

- 文件名：`scene-overpass-night__07.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，机位高度1.6米，距后方护栏约2米
- 动作：行走姿态，双臂自然摆动，目视前方
- 道具：无　｜　裁切：全身，保留天桥通道及护栏
- 必见：人物全身、行走动态、天桥环境　｜　废片判据：人物模糊、构图失衡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, Full body shot of an adult walking on a pedestrian overpass at night, arms swinging naturally, looking ahead, city lights and car light trails in background, no flash, realistic photography, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-08　中景边缘等待

- 文件名：`scene-overpass-night__08.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，机位高度1.5米，距护栏约1米
- 动作：站立，单手轻扶护栏，头部转向车流方向
- 道具：无　｜　裁切：半身，包含护栏和背景光轨
- 必见：人物侧面、护栏、车流光轨　｜　废片判据：面部过暗、构图呆板

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, Medium shot of an adult standing at the edge of a pedestrian overpass at night, one hand on railing, looking towards traffic, car light trails background, no flash, realistic photography, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S19-09　近景回眸一瞥

- 文件名：`scene-overpass-night__09.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，机位高度1.5米，距后方护栏约1米
- 动作：背对镜头向前行走，突然回头看向镜头，表情自然
- 道具：无　｜　裁切：胸部以上，包含部分天桥背景
- 必见：人物面部表情、回眸动态、背景光轨　｜　废片判据：面部模糊、眼神不自然

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, Close-up shot of an adult walking on a pedestrian overpass at night, turning head back towards camera, natural expression, car light trails in background, no flash, realistic photography, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-overpass-night__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-overpass-night__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

