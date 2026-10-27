# S08 · 花田少女感

用例 `style-flower-field`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | long hair worn loose | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 浅色棉麻连衣裙，草帽，自然披发，淡妆 | 换衣即断系列 |
| 场地 | 油菜花田田埂 | 同一处，背景元素不跑 |
| 光线 | 自然光，顺光拍摄，利用现场光，无补光 | 主光方向不变 |
| 调色 | bright airy pastel, golden backlight bloom, clean highlights | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A young woman in a light cotton dress and straw hat walking naturally along a dirt path between blooming rapeseed fields, bright and fresh atmosphere, rural pastoral style, soft sunlight, eye level, environment context, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A young woman in a light cotton dress and straw hat walking naturally along a dirt path between blooming rapeseed fields, bright and fresh atmosphere, rural pastoral style, soft sunlight, eye level, environment context, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A young woman in a light cotton dress and straw hat walking naturally along a dirt path between blooming rapeseed fields, bright and fresh atmosphere, rural pastoral style, soft sunlight, eye level, environment context, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-flower-field__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

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

- 文件名：`style-flower-field__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约8米，站立于田埂上，机位高度约1.6米，平视
- 动作：沿田埂自然行走，双臂自然摆动，目视前方
- 道具：无　｜　裁切：全身入画，保留脚部与头顶空间，画面下沿裁切至脚踝以下
- 必见：模特全身、田埂线条、两侧油菜花田　｜　废片判据：模特走出田埂、花田被踩踏、画面倾斜过度

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, A young woman in a light cotton dress and straw hat walking naturally along a dirt path between blooming rapeseed fields, wide shot, bright and fresh atmosphere, rural pastoral style, soft sunlight, eye level, full body, environment context, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-02　中景回眸浅笑

- 文件名：`style-flower-field__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，站立于田埂上，机位高度约1.5米，平视
- 动作：站立田埂，侧身回头看向镜头，嘴角上扬，眼神明亮
- 道具：无　｜　裁切：裁切至大腿中部，保留头部与手部动作空间
- 必见：模特回眸表情、眼神、油菜花背景虚化　｜　废片判据：表情僵硬、反光板穿帮、花田被踩踏

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, Medium shot of a young woman standing on a field path, turning head back to camera with a bright smile, wearing a light cotton dress and straw hat, rapeseed flowers around, soft side backlight, reflector fill, fresh and pastoral mood, eye level, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-03　长焦压缩花海人像

- 文件名：`style-flower-field__03.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 135mm / f/2.8 / 竖幅
- 机位：距主体约8米，站立于田埂上，机位高度约1.7米，平视
- 动作：侧身站立于田埂，面朝花海，微微仰头闭眼感受微风
- 道具：无　｜　裁切：裁切至膝盖以上，顶部保留少量花海
- 必见：花海密集背景、人物轮廓、发丝高光　｜　废片判据：背景杂乱、主体不突出、花田被踩踏

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, Telephoto portrait of a young woman standing on a dirt path, side view, eyes closed, feeling the breeze, surrounded by blurred rapeseed flowers, compressed background, backlight rim light on hair, light cotton dress and straw hat, eye level, medium shot, 135mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-04　长焦花海回头抓拍

- 文件名：`style-flower-field__04.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 135mm / f/2 / 竖幅
- 机位：距主体约8米，站立于田埂上，机位高度约1.6米，平视
- 动作：沿田埂向前走，突然回头看向镜头，头发自然飘动
- 道具：无　｜　裁切：裁切至腰部以上，保留头部运动空间
- 必见：回头瞬间的动态、发丝飘动、面部表情　｜　废片判据：面部模糊、表情不自然、背景虚化不足

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, Telephoto shot of a young woman walking on a field path and turning back to camera, hair flowing, bright expression, compressed rapeseed flower background, backlight rim light, light cotton dress and straw hat, eye level, medium shot, 135mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-05　逆光花瓣轮廓特写

- 文件名：`style-flower-field__05.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约2米，站立于田埂上，机位高度约1.4米，平视
- 动作：站立于田埂，手轻抚油菜花花瓣，侧脸朝向光线
- 道具：无　｜　裁切：裁切至手部以上，保留花瓣与侧脸
- 必见：花瓣半透明轮廓光、发丝边缘光、手部细节　｜　废片判据：花瓣过曝无细节、手部阴影过重、逆光轮廓不清晰

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, Close-up of a young woman's hand gently touching rapeseed flowers, side face partially visible, backlit petals showing translucent outlines, hair rim light, light cotton dress, eye level, fresh pastoral style, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-06　逆光发丝与花穗特写

- 文件名：`style-flower-field__06.png`
- 景别/角度/焦段/光圈：大特写 / 平视 / 100mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，站立于田埂上，机位高度约1.3米，平视
- 动作：低头轻嗅花穗，眼睛微闭，表情陶醉
- 道具：无　｜　裁切：裁切至额头以上，下巴以下，保留花穗与发丝
- 必见：发丝金色轮廓光、花穗细节、面部陶醉表情　｜　废片判据：面部补光不足、发丝轮廓光不明显、花穗模糊

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, Extreme close-up of a young woman's face smelling rapeseed flowers, eyes closed, blissful expression, backlight creating golden rim light on hair, flower details, light cotton dress, eye level, soft and fresh, 100mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-07　田埂低角度仰拍

- 文件名：`style-flower-field__07.png`
- 景别/角度/焦段/光圈：中景 / 地面低角度 / 35mm / f/2.8 / 竖幅
- 机位：距主体约4米，蹲在田埂上，机位高度约0.5米，低角度仰拍
- 动作：站在田埂上，双手自然下垂，微微仰头，迎接阳光
- 道具：无　｜　裁切：裁切至腰部以上，保留天空与花田
- 必见：人物与天空、花田的层次，低角度带来的视觉冲击　｜　废片判据：人物变形、背景过曝、花田被踩踏

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, Low angle shot of a young woman standing on a field path, looking up slightly, arms relaxed, surrounded by rapeseed flowers and open sky, light cotton dress and straw hat, fresh and bright, ground level, medium shot, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-08　花丛走道中景

- 文件名：`style-flower-field__08.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，站立于走道中，机位高度约1.5米，平视
- 动作：在已踩出的走道中缓慢行走，手指轻触两侧花朵，眼神温柔
- 道具：无　｜　裁切：裁切至腰部以上，保留走道与两侧花丛
- 必见：人物与走道的关系、两侧花丛、自然步态　｜　废片判据：踩踏花田、走道不清晰、人物比例失调

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, Medium shot of a young woman walking slowly in a narrow path through rapeseed flowers, gently touching flowers on both sides, gentle expression, side light, light cotton dress and straw hat, fresh pastoral atmosphere, eye level, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S08-09　蹲姿花田细节

- 文件名：`style-flower-field__09.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约2米，站立于田埂上，机位高度约1.2米，平视
- 动作：蹲在田埂上，双手托腮，对着镜头微笑
- 道具：无　｜　裁切：裁切至膝盖以上，保留手部与面部
- 必见：蹲姿自然、手部动作、微笑表情、花田背景　｜　废片判据：姿势僵硬、表情不自然、花田被压到

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], bright airy pastel, golden backlight bloom, clean highlights, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, Close-up of a young woman squatting on a dirt path, hands on cheeks, smiling at camera, surrounded by rapeseed flowers, backlight with reflector fill, light cotton dress and straw hat, eye level, fresh and bright, 85mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-flower-field__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-flower-field__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

