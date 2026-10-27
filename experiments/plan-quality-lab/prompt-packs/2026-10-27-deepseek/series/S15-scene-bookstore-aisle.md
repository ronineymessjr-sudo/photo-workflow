# S15 · 书店书架间的人

用例 `scene-bookstore-aisle`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 日常休闲装，发型自然，淡妆 | 换衣即断系列 |
| 场地 | 独立书店（书架与阅览桌现场已有） | 同一处，背景元素不跑 |
| 光线 | 利用店内射灯与窗光混合，射灯从上方打亮书架，窗光从左侧漫射；无闪光灯 | 主光方向不变 |
| 调色 | natural colour with a gentle film curve and consistent white balance | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A quiet independent bookstore interior, a person standing sideways in front of tall bookshelves, gently touching book spines, natural window light from left and warm spotlights from above, eye level, deep depth of field, calm and immersive atmosphere, no flash, cinematic, photorealistic, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A quiet independent bookstore interior, a person standing sideways in front of tall bookshelves, gently touching book spines, natural window light from left and warm spotlights from above, eye level, deep depth of field, calm and immersive atmosphere, no flash, cinematic, photorealistic, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A quiet independent bookstore interior, a person standing sideways in front of tall bookshelves, gently touching book spines, natural window light from left and warm spotlights from above, eye level, deep depth of field, calm and immersive atmosphere, no flash, cinematic, photorealistic, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-bookstore-aisle__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 书店全景交代 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，站于书店入口内侧，平视高度 |
| 2 | 书架纵深引导 | 中全 | 平视 | 35mm | f/3.5 | 距主体约3米，站在书架通道一端，镜头与视线平齐 |
| 3 | 沉浸选书侧影 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2米，位于主体侧面45度，平视 |
| 4 | 翻书手部特写 | 特写 | 高机位俯拍 | 35mm | f/1.8 | 距主体约40厘米，机位与手部同高，俯视15度 |
| 5 | 阅览桌沉浸阅读 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2.5米，位于桌子斜前方，平视 |
| 6 | 书架间靠架阅读 | 全身 | 平视 | 35mm | f/4 | 距主体约3米，正面平视，稍偏左 |
| 7 | 高处取书 | 中景 | 低机位仰拍 | 35mm | f/2.8 | 距主体约2米，稍低角度仰拍，机位在腰部高度 |
| 8 | 窗边阅读 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2米，侧面拍摄，平视 |
| 9 | 离开书店 | 全身 | 平视 | 35mm | f/4 | 距主体约3米，位于人物后方，平视 |

### S15-01　书店全景交代

- 文件名：`scene-bookstore-aisle__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，站于书店入口内侧，平视高度
- 动作：自然站立在书架前，侧身面向书架，右手轻触书脊
- 道具：无　｜　裁切：完整包含人物全身及周围书架，顶部留出射灯，底部不裁脚
- 必见：人物全身、书架纵深、书店环境　｜　废片判据：人物被遮挡、光线过暗或过曝、构图歪斜

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, A quiet independent bookstore interior, a person standing sideways in front of tall bookshelves, gently touching book spines, natural window light from left and warm spotlights from above, full body shot, eye level, deep depth of field, calm and immersive atmosphere, no flash, cinematic, photorealistic, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-02　书架纵深引导

- 文件名：`scene-bookstore-aisle__02.png`
- 景别/角度/焦段/光圈：中全 / 平视 / 35mm / f/3.5 / 竖幅
- 机位：距主体约3米，站在书架通道一端，镜头与视线平齐
- 动作：从书架一端向镜头方向走来，目光扫过书脊，步伐轻缓
- 道具：无　｜　裁切：从头部到膝盖以上，保留书架延伸线
- 必见：人物行走姿态、书架透视纵深　｜　废片判据：背景杂乱、人物模糊、光线平淡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, A person walking slowly along a bookstore aisle between tall bookshelves, looking at books, backlit by window light at the end of the aisle, side spotlights creating depth, medium full shot, eye level, strong leading lines, quiet and literary mood, no flash, photorealistic, 35mm lens at f/3.5, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-03　沉浸选书侧影

- 文件名：`scene-bookstore-aisle__03.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，位于主体侧面45度，平视
- 动作：侧身站立，从书架抽出一本书，低头翻阅
- 道具：无（书本为现场书籍）　｜　裁切：腰部以上，包含手部动作
- 必见：抽书动作、专注表情　｜　废片判据：表情出戏、手部僵硬、光线不均

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, A person standing sideways in a bookstore, pulling a book from a shelf and reading, window light from right illuminating the face, warm spotlights on shelves, medium shot, eye level, focused and immersive, no flash, natural colors, photorealistic, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-04　翻书手部特写

- 文件名：`scene-bookstore-aisle__04.png`
- 景别/角度/焦段/光圈：特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约40厘米，机位与手部同高，俯视15度
- 动作：双手捧书，右手拇指轻翻书页
- 道具：无（书本为现场书籍）　｜　裁切：仅手部与书本局部，不露脸
- 必见：手指翻页动作、书页纹理　｜　废片判据：手部抖动模糊、光线过暗、背景杂乱

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, Close-up of hands gently turning pages of a book in a bookstore, soft window light from side, no flash, shallow depth of field, detailed skin texture and paper, quiet and immersive, photorealistic, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-05　阅览桌沉浸阅读

- 文件名：`scene-bookstore-aisle__05.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，位于桌子斜前方，平视
- 动作：坐在阅览桌前，双手托腮，目光落在打开的书上
- 道具：无（桌、椅、书本为现场已有）　｜　裁切：从头顶到桌面以上，包含手部
- 必见：阅读姿态、桌面书本　｜　废片判据：表情呆滞、光线平淡、构图失衡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, A person sitting at a reading table in a bookstore, deeply engrossed in a book, chin resting on hands, window light from left, warm spotlights above, medium shot, eye level, calm and quiet atmosphere, no flash, photorealistic, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-06　书架间靠架阅读

- 文件名：`scene-bookstore-aisle__06.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约3米，正面平视，稍偏左
- 动作：背靠书架站立，双手捧书阅读，一只脚微微曲起
- 道具：无　｜　裁切：全身或大半身，包含脚部动作
- 必见：靠架姿态、阅读表情　｜　废片判据：姿势僵硬、背景杂乱、光线生硬

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, A person leaning against a bookshelf in a bookstore, reading a book, one foot slightly raised, warm spotlights from above, window light from right, full body shot, eye level, relaxed and immersed, no flash, photorealistic, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-07　高处取书

- 文件名：`scene-bookstore-aisle__07.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，稍低角度仰拍，机位在腰部高度
- 动作：踮脚伸手从高层书架取书，身体微微向上伸展
- 道具：无　｜　裁切：从头顶到腰部，包含手臂伸展
- 必见：伸手取书动作、专注神情　｜　废片判据：动作不自然、面部阴影过重、构图歪斜

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, A person reaching up to take a book from a high shelf in a bookstore, standing on tiptoes, warm spotlights from above, window light from behind, medium shot, low angle, focused and immersive, no flash, photorealistic, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-08　窗边阅读

- 文件名：`scene-bookstore-aisle__08.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，侧面拍摄，平视
- 动作：坐在窗边，书本放在膝上，转头望向窗外
- 道具：无（窗、椅为现场已有）　｜　裁切：从头部到膝盖，包含窗外景色
- 必见：人物侧脸、窗外光线　｜　废片判据：窗外过曝、人物死黑、构图拥挤

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, A person sitting by a window in a bookstore, book on lap, looking out thoughtfully, natural window light, warm spotlights, medium shot, eye level, peaceful and contemplative, no flash, photorealistic, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-09　离开书店

- 文件名：`scene-bookstore-aisle__09.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约3米，位于人物后方，平视
- 动作：背对镜头走向书店门口，手中拿着一本书
- 道具：无　｜　裁切：全身背影，包含门框
- 必见：人物背影、书店门　｜　废片判据：背影模糊、光线平淡、构图失衡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, A person walking towards the exit of a bookstore, seen from behind, holding a book, natural light from door, warm spotlights, full body shot, eye level, quiet departure, no flash, photorealistic, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-bookstore-aisle__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-bookstore-aisle__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

