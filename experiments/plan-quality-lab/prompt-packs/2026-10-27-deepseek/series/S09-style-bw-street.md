# S09 · 黑白街头纪实

用例 `style-bw-street`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 深色棉麻长袖衬衫与直筒长裤，发型自然，妆面 | 换衣即断系列 |
| 场地 | 老城区骑楼街道 | 同一处，背景元素不跑 |
| 光线 | 现场自然光，利用骑楼柱列间透入的侧光，不使用补光设备 | 主光方向不变 |
| 调色 | black and white with strong grain and high micro-contrast | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Black and white street documentary, an adult walking away down an old arcade corridor, columns receding in perspective, natural side light, no flash, candid atmosphere, deep depth of field, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Black and white street documentary, an adult walking away down an old arcade corridor, columns receding in perspective, natural side light, no flash, candid atmosphere, deep depth of field, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Black and white street documentary, an adult walking away down an old arcade corridor, columns receding in perspective, natural side light, no flash, candid atmosphere, deep depth of field, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-bw-street__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 骑楼长廊纵深全景 | 全身 | 平视 | 28mm | f/4 | 距主体约3米，胸口高度平视，位于主体正后方 |
| 2 | 侧光柱影半身像 | 中景 | 平视 | 28mm | f/2.8 | 距主体约2米，胸口高度平视，位于主体斜前方45度 |
| 3 | 行人流动中的静立 | 全身 | 平视 | 28mm | f/4 | 距主体约2.5米，腰部高度平视，位于主体侧前方 |
| 4 | 地面纹理与脚步低角 | 特写 | 地面低角度 | 28mm | f/1.8 | 距主体约1.5米，地面高度低角度仰拍 |
| 5 | 市井环境全景交代 | 全景 | 平视 | 28mm | f/5.6 | 距主体约3米，胸口高度平视，位于街道对面 |
| 6 | 光影切割墙面构图 | 中景 | 平视 | 28mm | f/2.8 | 距主体约2米，胸口高度平视，位于主体侧面 |
| 7 | 骑楼柱间框架特写 | 特写 | 平视 | 28mm | f/1.8 | 距主体约1.5米，胸口高度平视，位于主体正前方 |
| 8 | 高位俯拍行走轨迹 | 全身 | 高机位俯拍 | 28mm | f/4 | 距主体约3米，高位俯拍，位于骑楼二层或高处 |
| 9 | 环境收尾空景带人 | 大远景 | 平视 | 28mm | f/8 | 距主体约3米，胸口高度平视，位于主体后方 |

### S09-01　骑楼长廊纵深全景

- 文件名：`style-bw-street__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 28mm / f/4 / 竖幅
- 机位：距主体约3米，胸口高度平视，位于主体正后方
- 动作：背对镜头向巷子深处走，步幅自然，右手轻触左侧骑楼柱面
- 道具：无　｜　裁切：保留顶部骑楼拱顶与地面引导线，裁切掉画面最边缘的杂乱招牌
- 必见：骑楼连续柱列、纵深透视、主体行走姿态、地面光影　｜　废片判据：主体过小失去辨识度，或背景出现完整可辨的陌生人正脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, Black and white street documentary, an adult walking away down an old arcade corridor, columns receding in perspective, natural side light, no flash, candid atmosphere, deep depth of field, 28mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-02　侧光柱影半身像

- 文件名：`style-bw-street__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 28mm / f/2.8 / 竖幅
- 机位：距主体约2米，胸口高度平视，位于主体斜前方45度
- 动作：侧身站立，头部微转向光来方向，手臂自然下垂
- 道具：无　｜　裁切：取腰部以上，保留头部上方少许空间，裁切掉脚部
- 必见：柱影光带切割画面，主体侧脸轮廓与眼神方向　｜　废片判据：光带未形成明显切割感，或主体面部被阴影完全吞没

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, Black and white documentary portrait, adult standing sideways in old arcade, strong light band cutting across frame from columns, natural side light, no flash, candid expression, 28mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-03　行人流动中的静立

- 文件名：`style-bw-street__03.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 28mm / f/4 / 竖幅
- 机位：距主体约2.5米，腰部高度平视，位于主体侧前方
- 动作：静止站立于骑楼柱旁，目光望向街道远端，双手自然插兜
- 道具：无　｜　裁切：保留主体全身至脚踝，右侧行人仅保留模糊身影不裁切
- 必见：主体静止与行人流动的对比，骑楼柱作为前景框架　｜　废片判据：行人面部清晰可辨且占据画面主体，或主体被行人完全遮挡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, Black and white street documentary, adult standing still beside arcade column, blurred pedestrians moving in background, natural light, no flash, candid city life, 28mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-04　地面纹理与脚步低角

- 文件名：`style-bw-street__04.png`
- 景别/角度/焦段/光圈：特写 / 地面低角度 / 28mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，地面高度低角度仰拍
- 动作：向前迈步，左脚落地，右脚抬起，自然行走
- 道具：无　｜　裁切：裁切至膝盖以上，突出脚步与地面纹理
- 必见：脚步动作、地面石板纹理、骑楼柱基　｜　废片判据：脚步模糊不清，或地面过曝失去纹理

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, Black and white documentary, low angle ground level shot of adult walking, focus on footstep and textured pavement, old arcade column base, natural light, no flash, 28mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-05　市井环境全景交代

- 文件名：`style-bw-street__05.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 28mm / f/5.6 / 竖幅
- 机位：距主体约3米，胸口高度平视，位于街道对面
- 动作：站立于骑楼街道中段，身体微侧，手臂自然下垂
- 道具：无　｜　裁切：保留街道两侧骑楼立面与地面，主体全身可见
- 必见：骑楼街道整体环境、市井氛围、主体与环境比例　｜　废片判据：环境杂乱无章，或主体与背景融合难以分辨

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, Black and white street documentary, adult standing in middle of old arcade street, showing both sides of shophouses, bustling market atmosphere, natural light, no flash, candid scene, 28mm lens at f/5.6, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-06　光影切割墙面构图

- 文件名：`style-bw-street__06.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 28mm / f/2.8 / 竖幅
- 机位：距主体约2米，胸口高度平视，位于主体侧面
- 动作：斜靠骑楼柱，一只脚微微抬起，手臂自然交叉
- 道具：无　｜　裁切：取半身至大腿，保留墙面光影完整
- 必见：光影对角线切割画面，主体与阴影的互动　｜　废片判据：光影切割线不明确，或主体完全处于阴影中

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, Black and white documentary, adult leaning against arcade column, diagonal shadow line cutting wall, strong contrast, natural light, no flash, candid, 28mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-07　骑楼柱间框架特写

- 文件名：`style-bw-street__07.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 28mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，胸口高度平视，位于主体正前方
- 动作：从柱后探出半个身子，目光看向镜头方向，表情自然
- 道具：无　｜　裁切：取胸部以上，保留两侧柱子作为框架
- 必见：面部表情、柱子框架、背景虚化　｜　废片判据：面部过暗或过曝，或柱子未形成框架感

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, Black and white documentary portrait, adult peeking from behind arcade column, framed by two columns, natural soft light, no flash, candid expression, shallow depth of field, 28mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-08　高位俯拍行走轨迹

- 文件名：`style-bw-street__08.png`
- 景别/角度/焦段/光圈：全身 / 高机位俯拍 / 28mm / f/4 / 竖幅
- 机位：距主体约3米，高位俯拍，位于骑楼二层或高处
- 动作：沿骑楼下方行走，步伐自然，手臂轻微摆动
- 道具：无　｜　裁切：保留主体全身及周围地面，裁切掉过多天空
- 必见：行走轨迹、地面影子、骑楼街道俯瞰结构　｜　废片判据：主体被遮挡，或俯拍角度导致主体变形

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, Black and white documentary, high angle shot of adult walking under arcade, diagonal path, shadow on ground, natural light, no flash, street life, 28mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-09　环境收尾空景带人

- 文件名：`style-bw-street__09.png`
- 景别/角度/焦段/光圈：大远景 / 平视 / 28mm / f/8 / 竖幅
- 机位：距主体约3米，胸口高度平视，位于主体后方
- 动作：背对镜头渐远，走入骑楼深处，手臂自然摆动
- 道具：无　｜　裁切：保留骑楼顶部与地面，主体占画面高度约五分之一
- 必见：骑楼街道环境、主体远去背影、光影氛围　｜　废片判据：主体完全淹没在阴影中，或环境过曝失去细节

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, Black and white documentary, adult walking away into old arcade, backlit silhouette, natural light, no flash, atmospheric street scene, 28mm lens at f/8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-bw-street__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-bw-street__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

