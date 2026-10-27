# S15 · 书店书架间的人

用例 `scene-bookstore-aisle`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：日常休闲装，发型自然，淡妆
- **场地**：独立书店（书架与阅览桌现场已有）
- **光线**：利用店内射灯与窗光混合，射灯从上方打亮书架，窗光从左侧漫射；无闪光灯
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：35mm全程；书架纵深构图2镜；翻书手部特写1镜（距主体40厘米）；只利用店内射灯与窗光；禁用闪光灯；不影响其他顾客。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
A quiet independent bookstore interior, a person standing sideways in front of tall bookshelves, gently touching book spines, natural window light from left and warm spotlights from above, eye level, deep depth of field, calm and immersive atmosphere, no flash, cinematic, photorealistic, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
A quiet independent bookstore interior, a person standing sideways in front of tall bookshelves, gently touching book spines, natural window light from left and warm spotlights from above, eye level, deep depth of field, calm and immersive atmosphere, no flash, cinematic, photorealistic, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
A quiet independent bookstore interior, a person standing sideways in front of tall bookshelves, gently touching book spines, natural window light from left and warm spotlights from above, eye level, deep depth of field, calm and immersive atmosphere, no flash, cinematic, photorealistic, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`scene-bookstore-aisle__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，站于书店入口内侧，平视高度
- 动作：自然站立在书架前，侧身面向书架，右手轻触书脊
- 服装：日常休闲装，具体款式待确认；发型自然，淡妆
- 光线：利用店内射灯与窗光混合，射灯从上方打亮书架，窗光从左侧漫射；无闪光灯
- 道具：无
- 裁切／必见：完整包含人物全身及周围书架，顶部留出射灯，底部不裁脚　｜　人物全身、书架纵深、书店环境
- 废片判据：人物被遮挡、光线过暗或过曝、构图歪斜

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, A quiet independent bookstore interior, a person standing sideways in front of tall bookshelves, gently touching book spines, natural window light from left and warm spotlights from above, full body shot, eye level, deep depth of field, calm and immersive atmosphere, no flash, cinematic, photorealistic, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-02　书架纵深引导

- 文件名：`scene-bookstore-aisle__02.png`　中全 / 平视 / 35mm / f/3.5 / 竖幅
- 机位：距主体约3米，站在书架通道一端，镜头与视线平齐
- 动作：从书架一端向镜头方向走来，目光扫过书脊，步伐轻缓
- 服装：同上，可加一件简约外套，具体待确认
- 光线：利用通道尽头窗户的逆光与侧射灯，形成层次；避免闪光
- 道具：无
- 裁切／必见：从头部到膝盖以上，保留书架延伸线　｜　人物行走姿态、书架透视纵深
- 废片判据：背景杂乱、人物模糊、光线平淡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, A person walking slowly along a bookstore aisle between tall bookshelves, looking at books, backlit by window light at the end of the aisle, side spotlights creating depth, medium full shot, eye level, strong leading lines, quiet and literary mood, no flash, photorealistic, 35mm lens at f/3.5, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-03　沉浸选书侧影

- 文件名：`scene-bookstore-aisle__03.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，位于主体侧面45度，平视
- 动作：侧身站立，从书架抽出一本书，低头翻阅
- 服装：同上，袖口自然
- 光线：窗光从右侧照射面部，射灯补亮书架；避免闪光
- 道具：无（书本为现场书籍）
- 裁切／必见：腰部以上，包含手部动作　｜　抽书动作、专注表情
- 废片判据：表情出戏、手部僵硬、光线不均

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, A person standing sideways in a bookstore, pulling a book from a shelf and reading, window light from right illuminating the face, warm spotlights on shelves, medium shot, eye level, focused and immersive, no flash, natural colors, photorealistic, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-04　翻书手部特写

- 文件名：`scene-bookstore-aisle__04.png`　特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约40厘米，机位与手部同高，俯视15度
- 动作：双手捧书，右手拇指轻翻书页
- 服装：袖口整洁，无饰品
- 光线：窗光从侧面柔和照亮手部，射灯补光避免阴影；禁用闪光灯
- 道具：无（书本为现场书籍）
- 裁切／必见：仅手部与书本局部，不露脸　｜　手指翻页动作、书页纹理
- 废片判据：手部抖动模糊、光线过暗、背景杂乱

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Close-up of hands gently turning pages of a book in a bookstore, soft window light from side, no flash, shallow depth of field, detailed skin texture and paper, quiet and immersive, photorealistic, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-05　阅览桌沉浸阅读

- 文件名：`scene-bookstore-aisle__05.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，位于桌子斜前方，平视
- 动作：坐在阅览桌前，双手托腮，目光落在打开的书上
- 服装：同上，坐姿服装平整
- 光线：窗光从左侧照射，射灯从上方补光；无闪光
- 道具：无（桌、椅、书本为现场已有）
- 裁切／必见：从头顶到桌面以上，包含手部　｜　阅读姿态、桌面书本
- 废片判据：表情呆滞、光线平淡、构图失衡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, A person sitting at a reading table in a bookstore, deeply engrossed in a book, chin resting on hands, window light from left, warm spotlights above, medium shot, eye level, calm and quiet atmosphere, no flash, photorealistic, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-06　书架间靠架阅读

- 文件名：`scene-bookstore-aisle__06.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约3米，正面平视，稍偏左
- 动作：背靠书架站立，双手捧书阅读，一只脚微微曲起
- 服装：同上，可稍显随意
- 光线：射灯从上方打亮面部，窗光从右侧补充；避免闪光
- 道具：无
- 裁切／必见：全身或大半身，包含脚部动作　｜　靠架姿态、阅读表情
- 废片判据：姿势僵硬、背景杂乱、光线生硬

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, A person leaning against a bookshelf in a bookstore, reading a book, one foot slightly raised, warm spotlights from above, window light from right, full body shot, eye level, relaxed and immersed, no flash, photorealistic, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-07　高处取书

- 文件名：`scene-bookstore-aisle__07.png`　中景 / 低机位仰拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，稍低角度仰拍，机位在腰部高度
- 动作：踮脚伸手从高层书架取书，身体微微向上伸展
- 服装：同上，注意袖口和腰部
- 光线：射灯从上方打亮手部和面部，窗光从后方勾勒轮廓；无闪光
- 道具：无
- 裁切／必见：从头顶到腰部，包含手臂伸展　｜　伸手取书动作、专注神情
- 废片判据：动作不自然、面部阴影过重、构图歪斜

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, A person reaching up to take a book from a high shelf in a bookstore, standing on tiptoes, warm spotlights from above, window light from behind, medium shot, low angle, focused and immersive, no flash, photorealistic, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-08　窗边阅读

- 文件名：`scene-bookstore-aisle__08.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，侧面拍摄，平视
- 动作：坐在窗边，书本放在膝上，转头望向窗外
- 服装：同上，自然
- 光线：自然窗光作为主光，射灯补光；无闪光
- 道具：无（窗、椅为现场已有）
- 裁切／必见：从头部到膝盖，包含窗外景色　｜　人物侧脸、窗外光线
- 废片判据：窗外过曝、人物死黑、构图拥挤

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, A person sitting by a window in a bookstore, book on lap, looking out thoughtfully, natural window light, warm spotlights, medium shot, eye level, peaceful and contemplative, no flash, photorealistic, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S15-09　离开书店

- 文件名：`scene-bookstore-aisle__09.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约3米，位于人物后方，平视
- 动作：背对镜头走向书店门口，手中拿着一本书
- 服装：同上，背影整洁
- 光线：门口自然光与店内射灯混合，形成轮廓光；无闪光
- 道具：无
- 裁切／必见：全身背影，包含门框　｜　人物背影、书店门
- 废片判据：背影模糊、光线平淡、构图失衡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, A person walking towards the exit of a bookstore, seen from behind, holding a book, natural light from door, warm spotlights, full body shot, eye level, quiet departure, no flash, photorealistic, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S15-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

