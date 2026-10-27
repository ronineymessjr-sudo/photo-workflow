# S09 · 黑白街头纪实

用例 `style-bw-street`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：深色棉麻长袖衬衫与直筒长裤，发型自然，妆面
- **场地**：老城区骑楼街道
- **光线**：现场自然光，利用骑楼柱列间透入的侧光，不使用补光设备
- **调色**：black and white, strong grain, high micro-contrast
- **画幅**：竖幅 2:3
- **焦段序列**：28mm → 28mm → 28mm → 28mm → 28mm → 28mm → 28mm → 28mm → 28mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：28mm全程、机位距主体1.5至3米；光影切割构图2镜；行人流动不回避但面部不特写陌生人；无闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Black and white street documentary, an adult walking away down an old arcade corridor, columns receding in perspective, natural side light, no flash, candid atmosphere, deep depth of field, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Black and white street documentary, an adult walking away down an old arcade corridor, columns receding in perspective, natural side light, no flash, candid atmosphere, deep depth of field, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Black and white street documentary, an adult walking away down an old arcade corridor, columns receding in perspective, natural side light, no flash, candid atmosphere, deep depth of field, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`style-bw-street__01.png`　全身 / 平视 / 28mm / f/4 / 竖幅
- 机位：距主体约3米，胸口高度平视，位于主体正后方
- 动作：背对镜头向巷子深处走，步幅自然，右手轻触左侧骑楼柱面
- 服装：深色棉麻长袖衬衫与直筒长裤，发型自然，妆面待确认
- 光线：现场自然光，利用骑楼柱列间透入的侧光，不使用补光设备
- 道具：无
- 裁切／必见：保留顶部骑楼拱顶与地面引导线，裁切掉画面最边缘的杂乱招牌　｜　骑楼连续柱列、纵深透视、主体行走姿态、地面光影
- 废片判据：主体过小失去辨识度，或背景出现完整可辨的陌生人正脸

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Black and white street documentary, an adult walking away down an old arcade corridor, columns receding in perspective, natural side light, no flash, candid atmosphere, deep depth of field, 28mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-02　侧光柱影半身像

- 文件名：`style-bw-street__02.png`　中景 / 平视 / 28mm / f/2.8 / 竖幅
- 机位：距主体约2米，胸口高度平视，位于主体斜前方45度
- 动作：侧身站立，头部微转向光来方向，手臂自然下垂
- 服装：深色棉麻长袖衬衫，袖口微卷，发型自然，妆面待确认
- 光线：现场自然侧光，利用骑楼柱间光带切割画面，不补光
- 道具：无
- 裁切／必见：取腰部以上，保留头部上方少许空间，裁切掉脚部　｜　柱影光带切割画面，主体侧脸轮廓与眼神方向
- 废片判据：光带未形成明显切割感，或主体面部被阴影完全吞没

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Black and white documentary portrait, adult standing sideways in old arcade, strong light band cutting across frame from columns, natural side light, no flash, candid expression, 28mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-03　行人流动中的静立

- 文件名：`style-bw-street__03.png`　全身 / 平视 / 28mm / f/4 / 竖幅
- 机位：距主体约2.5米，腰部高度平视，位于主体侧前方
- 动作：静止站立于骑楼柱旁，目光望向街道远端，双手自然插兜
- 服装：深色棉麻长袖衬衫与直筒长裤，发型自然，妆面待确认
- 光线：现场自然光，主体受柱间漫射光，行人区域保持动态模糊
- 道具：无
- 裁切／必见：保留主体全身至脚踝，右侧行人仅保留模糊身影不裁切　｜　主体静止与行人流动的对比，骑楼柱作为前景框架
- 废片判据：行人面部清晰可辨且占据画面主体，或主体被行人完全遮挡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Black and white street documentary, adult standing still beside arcade column, blurred pedestrians moving in background, natural light, no flash, candid city life, 28mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-04　地面纹理与脚步低角

- 文件名：`style-bw-street__04.png`　特写 / 地面低角度 / 28mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，地面高度低角度仰拍
- 动作：向前迈步，左脚落地，右脚抬起，自然行走
- 服装：直筒长裤，裤脚自然垂下，鞋子待确认
- 光线：现场自然光，利用地面反射光提亮脚部，不补光
- 道具：无
- 裁切／必见：裁切至膝盖以上，突出脚步与地面纹理　｜　脚步动作、地面石板纹理、骑楼柱基
- 废片判据：脚步模糊不清，或地面过曝失去纹理

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Black and white documentary, low angle ground level shot of adult walking, focus on footstep and textured pavement, old arcade column base, natural light, no flash, 28mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-05　市井环境全景交代

- 文件名：`style-bw-street__05.png`　全景 / 平视 / 28mm / f/5.6 / 横幅
- 机位：距主体约3米，胸口高度平视，位于街道对面
- 动作：站立于骑楼街道中段，身体微侧，手臂自然下垂
- 服装：深色棉麻长袖衬衫与直筒长裤，发型自然，妆面待确认
- 光线：现场自然光，整体环境光，骑楼阴影与街道亮部形成对比
- 道具：无
- 裁切／必见：保留街道两侧骑楼立面与地面，主体全身可见　｜　骑楼街道整体环境、市井氛围、主体与环境比例
- 废片判据：环境杂乱无章，或主体与背景融合难以分辨

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Black and white street documentary, adult standing in middle of old arcade street, showing both sides of shophouses, bustling market atmosphere, natural light, no flash, candid scene, 28mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-06　光影切割墙面构图

- 文件名：`style-bw-street__06.png`　中景 / 平视 / 28mm / f/2.8 / 竖幅
- 机位：距主体约2米，胸口高度平视，位于主体侧面
- 动作：斜靠骑楼柱，一只脚微微抬起，手臂自然交叉
- 服装：深色棉麻长袖衬衫与直筒长裤，发型自然，妆面待确认
- 光线：现场自然光，利用建筑墙面与柱影形成对角线光影切割，不补光
- 道具：无
- 裁切／必见：取半身至大腿，保留墙面光影完整　｜　光影对角线切割画面，主体与阴影的互动
- 废片判据：光影切割线不明确，或主体完全处于阴影中

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Black and white documentary, adult leaning against arcade column, diagonal shadow line cutting wall, strong contrast, natural light, no flash, candid, 28mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-07　骑楼柱间框架特写

- 文件名：`style-bw-street__07.png`　特写 / 平视 / 28mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，胸口高度平视，位于主体正前方
- 动作：从柱后探出半个身子，目光看向镜头方向，表情自然
- 服装：深色棉麻长袖衬衫，领口微敞，发型自然，妆面待确认
- 光线：现场自然光，主体面部受柱间反射光，柔和均匀
- 道具：无
- 裁切／必见：取胸部以上，保留两侧柱子作为框架　｜　面部表情、柱子框架、背景虚化
- 废片判据：面部过暗或过曝，或柱子未形成框架感

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Black and white documentary portrait, adult peeking from behind arcade column, framed by two columns, natural soft light, no flash, candid expression, shallow depth of field, 28mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-08　高位俯拍行走轨迹

- 文件名：`style-bw-street__08.png`　全身 / 高机位俯拍 / 28mm / f/4 / 竖幅
- 机位：距主体约3米，高位俯拍，位于骑楼二层或高处
- 动作：沿骑楼下方行走，步伐自然，手臂轻微摆动
- 服装：深色棉麻长袖衬衫与直筒长裤，发型自然，妆面待确认
- 光线：现场自然光，顶光与侧光结合，地面形成主体影子
- 道具：无
- 裁切／必见：保留主体全身及周围地面，裁切掉过多天空　｜　行走轨迹、地面影子、骑楼街道俯瞰结构
- 废片判据：主体被遮挡，或俯拍角度导致主体变形

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Black and white documentary, high angle shot of adult walking under arcade, diagonal path, shadow on ground, natural light, no flash, street life, 28mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S09-09　环境收尾空景带人

- 文件名：`style-bw-street__09.png`　大远景 / 平视 / 28mm / f/8 / 横幅
- 机位：距主体约3米，胸口高度平视，位于主体后方
- 动作：背对镜头渐远，走入骑楼深处，手臂自然摆动
- 服装：深色棉麻长袖衬衫与直筒长裤，发型自然，妆面待确认
- 光线：现场自然光，逆光剪影效果，主体轮廓清晰
- 道具：无
- 裁切／必见：保留骑楼顶部与地面，主体占画面高度约五分之一　｜　骑楼街道环境、主体远去背影、光影氛围
- 废片判据：主体完全淹没在阴影中，或环境过曝失去细节

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Black and white documentary, adult walking away into old arcade, backlit silhouette, natural light, no flash, atmospheric street scene, 28mm lens at f/8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S09-01 ｜ 镜头名 ｜ 28mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

