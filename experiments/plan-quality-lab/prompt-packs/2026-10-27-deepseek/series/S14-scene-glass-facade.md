# S14 · 玻璃幕墙反光街拍

用例 `scene-glass-facade`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | （建议都市现代风格，深色或中性色服装，避免图案），妆发干净利落 | 换衣即断系列 |
| 场地 | 商务楼玻璃幕墙前广场 | 同一处，背景元素不跑 |
| 光线 | 利用下午侧光，避免正午顶光。若阳光过强，在模特左前方45度放置白色反光板补光，降低反差 | 主光方向不变 |
| 调色 | neutral daylight, clean whites, restrained saturation | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Fashion street photography,  of an adult model standing confidently in front of a glass curtain wall office building, wearing modern urban outfit (unspecified), natural pose with one hand on hip, side lighting, sharp details, clear reflection on glass, modern city vibe, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Fashion street photography,  of an adult model standing confidently in front of a glass curtain wall office building, wearing modern urban outfit (unspecified), natural pose with one hand on hip, side lighting, sharp details, clear reflection on glass, modern city vibe, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Fashion street photography,  of an adult model standing confidently in front of a glass curtain wall office building, wearing modern urban outfit (unspecified), natural pose with one hand on hip, side lighting, sharp details, clear reflection on glass, modern city vibe, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-glass-facade__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 全景定场·幕墙前广场交代 | 全身 | 平视 | 24mm | f/4 | 距幕墙约8米，距主体约7米，机位高约1.5米，平视 |
| 2 | 低角仰拍·幕墙几何纵深 | 全身 | 低机位仰拍 | 24mm | f/4 | 距幕墙约2米，距主体约3米，机位高约0.5米，低角度仰拍 |
| 3 | 镜像构图·中景动态行走 | 近景 | 平视 | 85mm | f/2 | 距幕墙约3米，距主体约1.5米，机位高约1.2米，平视 |
| 4 | 镜像构图·近景倚靠幕墙 | 近景 | 平视 | 85mm | f/2 | 距幕墙约1.5米，距主体约1.2米，机位高约1.2米，平视 |
| 5 | 细节特写·幕墙纹理与手部 | 大特写 | 平视 | 85mm | f/1.8 | 距幕墙约0.5米，距主体约0.5米，机位高约1.2米，平视 |
| 6 | 中景·幕墙前景框架构图 | 中景 | 平视 | 24mm | f/2.8 | 距幕墙约4米，距主体约6米，机位高约1.5米，平视 |
| 7 | 中近景·侧身回眸 | 近景 | 平视 | 85mm | f/2 | 距幕墙约3米，距主体约2米，机位高约1.3米，平视 |
| 8 | 全景·幕墙倒影中的行走 | 全身 | 平视 | 24mm | f/4 | 距幕墙约10米，距主体约8米，机位高约1.6米，平视 |
| 9 | 近景·幕墙反射光斑下的面部 | 特写 | 平视 | 85mm | f/1.8 | 距幕墙约2米，距主体约1米，机位高约1.4米，平视 |

### S14-01　全景定场·幕墙前广场交代

- 文件名：`scene-glass-facade__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距幕墙约8米，距主体约7米，机位高约1.5米，平视
- 动作：模特背对幕墙，自然站立，重心放在右腿，左手轻搭在左侧腰际，头部微侧向镜头，目光平视前方，表情利落
- 道具：无　｜　裁切：头顶留空间约1/5，脚底留地面约1/6，左右保留幕墙和广场环境
- 必见：完整人物从头到脚，玻璃幕墙的反射与建筑线条，广场地面材质　｜　废片判据：人物过小不清晰、幕墙反光过曝完全掩盖细节、人物被切头或切脚

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, Fashion street photography, full body shot of an adult model standing confidently in front of a glass curtain wall office building, wearing modern urban outfit (unspecified), natural pose with one hand on hip, side lighting, sharp details, clear reflection on glass, modern city vibe, 24mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-02　低角仰拍·幕墙几何纵深

- 文件名：`scene-glass-facade__02.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 24mm / f/4 / 竖幅
- 机位：距幕墙约2米，距主体约3米，机位高约0.5米，低角度仰拍
- 动作：模特向前迈步，左脚着地，右臂自然摆动，头部微抬，眼神坚定看向远方
- 道具：无　｜　裁切：头顶留空间，脚下保留少许地面，突出幕墙的垂直线条
- 必见：人物动态、幕墙的反射与线条、低角度带来的冲击感　｜　废片判据：人物表情僵硬、反光板穿帮、幕墙线条倾斜过度

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, Urban street fashion, low angle full body shot of an adult model walking confidently in front of a glass curtain wall, modern outfit (unspecified), dynamic pose, strong lines of building reflectingwide angle, side backlight with reflector, clear details, 24mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-03　镜像构图·中景动态行走

- 文件名：`scene-glass-facade__03.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距幕墙约3米，距主体约1.5米，机位高约1.2米，平视
- 动作：模特侧身行走，左脚前迈，右臂前摆，头部转向镜头方向，目光锐利
- 道具：无　｜　裁切：头顶以上保留约1/6空间，脚底以下保留约1/6，左右保留倒影
- 必见：人物清晰的主体、幕墙倒影构图、动态行走姿态　｜　废片判据：人物面部模糊、倒影过强干扰主体、构图歪斜

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, Mirror reflection composition, medium shot of an adult model walking sideways in front of a glass curtain wall, modern outfit (unspecified), clear reflection on glass, side lighting with reflector, sharp focus on model, urban setting, 85mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-04　镜像构图·近景倚靠幕墙

- 文件名：`scene-glass-facade__04.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距幕墙约1.5米，距主体约1.2米，机位高约1.2米，平视
- 动作：模特侧身轻靠幕墙，右肩接触玻璃，左手插兜，头部微侧，眼神冷静
- 道具：无　｜　裁切：胸部以上至膝盖，保留幕墙纹理和倒影
- 必见：人物表情、倚靠动作、幕墙倒影清晰　｜　废片判据：面部阴影过重、倒影模糊、构图杂乱

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, Mirror reflection close-up, adult model leaning sideways against glass curtain wall, modern outfit (unspecified), clear reflection in glass, soft lighting with reflector, sharp facial details, urban fashion, 85mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-05　细节特写·幕墙纹理与手部

- 文件名：`scene-glass-facade__05.png`
- 景别/角度/焦段/光圈：大特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距幕墙约0.5米，距主体约0.5米，机位高约1.2米，平视
- 动作：模特右手手指轻触幕墙玻璃，手指自然张开，其他部位在画外
- 道具：无　｜　裁切：手部特写，保留部分前臂和幕墙反射
- 必见：手指触感、玻璃反射的细节、皮肤质感　｜　废片判据：手指模糊、反光过曝掩盖纹理、皮肤瑕疵明显

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, Extreme close-up of a hand touching glass curtain wall, reflection visible, sharp details, side lighting, urban texture, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-06　中景·幕墙前景框架构图

- 文件名：`scene-glass-facade__06.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 24mm / f/2.8 / 竖幅
- 机位：距幕墙约4米，距主体约6米，机位高约1.5米，平视
- 动作：模特站立，正面朝向镜头，双手自然下垂，下巴微收，目光直视镜头
- 道具：无　｜　裁切：半身像，头顶留空间，保留幕墙框架结构
- 必见：人物表情、幕墙框架构图、环境交代　｜　废片判据：框架切割人物不美观、人物面部光线平淡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, Medium shot of an adult model framed by glass curtain wall structures, modern outfit (unspecified), direct gaze, natural lighting with reflector, urban setting, sharp focus, 24mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-07　中近景·侧身回眸

- 文件名：`scene-glass-facade__07.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距幕墙约3米，距主体约2米，机位高约1.3米，平视
- 动作：模特侧身站立，头部转向镜头，眼神锐利，右手轻抬至胸前
- 道具：无　｜　裁切：胸部以上至腰部，保留背景幕墙虚化
- 必见：回眸表情、眼神光、幕墙反射光斑　｜　废片判据：眼神光缺失、表情不自然、背景过杂

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, Medium close-up of an adult model looking back over shoulder, modern outfit (unspecified), sharp gaze, side backlight with reflector, glass curtain wall background with bokeh, urban fashion, 85mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-08　全景·幕墙倒影中的行走

- 文件名：`scene-glass-facade__08.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距幕墙约10米，距主体约8米，机位高约1.6米，平视
- 动作：模特背对镜头向前行走，步幅自然，手臂摆动，头部微抬
- 道具：无　｜　裁切：全身，保留幕墙倒影的完整构图
- 必见：人物行走动态、倒影与实体呼应、环境氛围　｜　废片判据：人物过小不清晰、倒影杂乱、构图失衡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, Full body shot of an adult model walking away towards glass curtain wall, clear reflection of model in glass, modern outfit (unspecified), afternoon side light, urban street photography, sharp focus, 24mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S14-09　近景·幕墙反射光斑下的面部

- 文件名：`scene-glass-facade__09.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距幕墙约2米，距主体约1米，机位高约1.4米，平视
- 动作：模特正面，头部微仰，闭眼感受光线，表情放松但利落
- 道具：无　｜　裁切：头部和肩部，保留光斑背景
- 必见：面部细节、皮肤质感、背景光斑　｜　废片判据：光斑过曝、面部阴影不自然、表情僵硬

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], neutral daylight, clean whites, restrained saturation, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, Close-up of an adult model's face with eyes closed, glass curtain wall reflection creating bokeh light spots in background, modern outfit (unspecified), soft lighting, urban fashion, sharp facial details, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-glass-facade__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-glass-facade__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

