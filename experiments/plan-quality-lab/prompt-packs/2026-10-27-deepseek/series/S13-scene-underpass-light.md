# S13 · 桥洞隧道光

用例 `scene-underpass-light`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 建议深色硬挺外套与长裤，避免反光材质，妆发自然冷峻。 | 换衣即断系列 |
| 场地 | 人行桥洞（非机动车道外安全区） | 同一处，背景元素不跑 |
| 光线 | 自然光，洞口逆光形成剪影，无补光，利用洞内暗部与外部亮部对比。 | 主光方向不变 |
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
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Urban hard-edged style, a lone adult standing at the entrance of a pedestrian underpass, back to camera, silhouetted against bright tunnel exit, eye level, natural backlight, no flash, dark clothing, cool mood, architectural arch framing, safe zone beside non-motorized lane, no vehicles in frame, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Urban hard-edged style, a lone adult standing at the entrance of a pedestrian underpass, back to camera, silhouetted against bright tunnel exit, eye level, natural backlight, no flash, dark clothing, cool mood, architectural arch framing, safe zone beside non-motorized lane, no vehicles in frame, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, Urban hard-edged style, a lone adult standing at the entrance of a pedestrian underpass, back to camera, silhouetted against bright tunnel exit, eye level, natural backlight, no flash, dark clothing, cool mood, architectural arch framing, safe zone beside non-motorized lane, no vehicles in frame, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-underpass-light__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 远景定场·桥洞全貌 | 全身 | 平视 | 35mm | f/4 | 距主体约8米，站在非机动车道外侧安全区，机位高度约1.5米，平视。 |
| 2 | 中景逆光·洞口半身剪影 | 中景 | 平视 | 35mm | f/2.8 | 距主体约3米，站在安全区，机位高度约1.2米，平视。 |
| 3 | 中全景·洞内灯光层次与人物 | 中全 | 平视 | 35mm | f/3.5 | 距主体约5米，站在安全区，机位高度约1.5米，平视。 |
| 4 | 近景·洞内灯光细节与冷峻表情 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1.5米，站在安全区，机位高度约1.6米，平视。 |
| 5 | 低角度·桥洞结构与人 | 中景 | 低机位仰拍 | 35mm | f/2.8 | 距主体约2米，站在安全区，机位高度约0.8米，低角度仰拍。 |
| 6 | 全景·人物与桥洞纵深 | 全身 | 平视 | 35mm | f/4 | 距主体约6米，站在安全区，机位高度约1.5米，平视。 |
| 7 | 特写·脚步与地面光影 | 大特写 | 地面低角度 | 35mm | f/1.8 | 距主体约1米，蹲下，机位高度约0.3米，低角度。 |
| 8 | 中近景·侧面轮廓与隧道光 | 近景 | 平视 | 35mm | f/2 | 距主体约2.5米，站在安全区，机位高度约1.5米，平视。 |
| 9 | 大远景·桥洞出口与城市背景 | 大远景 | 平视 | 35mm | f/8 | 距主体约15米，站在安全区，机位高度约1.6米，平视。 |

### S13-01　远景定场·桥洞全貌

- 文件名：`scene-underpass-light__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约8米，站在非机动车道外侧安全区，机位高度约1.5米，平视。
- 动作：模特背对镜头，站在人行桥洞入口处，双脚与肩同宽，双手自然下垂，面朝洞内深处，保持静止。
- 道具：无　｜　裁切：头顶保留桥洞上沿，脚下保留地面，左右包含洞壁。
- 必见：桥洞整体拱形结构、人物剪影、非机动车道与安全区边界。　｜　废片判据：人物细节过曝或欠曝、构图不完整、背景有杂乱车辆干扰。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, Urban hard-edged style, a lone adult standing at the entrance of a pedestrian underpass, back to camera, silhouetted against bright tunnel exit, wide shot, eye level, natural backlight, no flash, dark clothing, cool mood, architectural arch framing, safe zone beside non-motorized lane, no vehicles in frame, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-02　中景逆光·洞口半身剪影

- 文件名：`scene-underpass-light__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约3米，站在安全区，机位高度约1.2米，平视。
- 动作：模特侧身站立，头部转向洞外，下巴微抬，手臂自然下垂，呈现冷峻侧脸轮廓。
- 道具：无　｜　裁切：取半身，头顶留空，裁至腰部。
- 必见：人物侧脸轮廓、逆光边缘光、桥洞出口亮部。　｜　废片判据：面部死黑无细节、轮廓光缺失、背景过曝溢出。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, Medium shot, side profile of an adult standing at tunnel exit, backlit silhouette with rim light, eye level, cool urban style, no flash, natural light, dark clothing, hard outline, bright exit background, safe zone, no vehicles, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-03　中全景·洞内灯光层次与人物

- 文件名：`scene-underpass-light__03.png`
- 景别/角度/焦段/光圈：中全 / 平视 / 35mm / f/3.5 / 竖幅
- 机位：距主体约5米，站在安全区，机位高度约1.5米，平视。
- 动作：模特正面朝向镜头，缓慢向前走，双手自然摆动，目光直视前方。
- 道具：无　｜　裁切：取全身，保留头顶灯带和脚下地面。
- 必见：人物行走动态、洞内灯光在墙面和地面的光斑、纵深层次。　｜　废片判据：人物运动模糊、灯光层次平淡、背景杂乱。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, Medium full shot, adult walking towards camera inside pedestrian underpass, eye level, overhead tunnel lights creating light pools and depth, hard urban style, dark clothing, cool mood, no flash, safe zone, no vehicles, 35mm lens at f/3.5, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-04　近景·洞内灯光细节与冷峻表情

- 文件名：`scene-underpass-light__04.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，站在安全区，机位高度约1.6米，平视。
- 动作：模特停下脚步，头部微侧，目光看向画面左侧，嘴唇微闭，表情冷峻。
- 道具：无　｜　裁切：胸部以上，头顶保留少量空间。
- 必见：面部表情、眼神光、灯光在皮肤上的质感。　｜　废片判据：面部过暗或过曝、眼神光缺失、背景杂乱。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, Close-up shot, adult with cold expression inside pedestrian underpass, eye level, overhead tunnel light casting subtle shadows, hard urban style, dark clothing, no flash, detailed skin texture, background wall with light patterns, safe zone, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-05　低角度·桥洞结构与人

- 文件名：`scene-underpass-light__05.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，站在安全区，机位高度约0.8米，低角度仰拍。
- 动作：模特站立，双脚分开与肩同宽，双手插兜，抬头看向洞顶。
- 道具：无　｜　裁切：取大半身，保留头顶拱顶和脚下地面。
- 必见：桥洞拱形结构、人物仰头姿态、空间压迫感。　｜　废片判据：人物变形、拱顶不完整、光线平淡。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, Low angle shot, adult standing inside underpass looking up, ground level, arch structure converging above, urban hard style, dark clothing, mixed natural and tunnel light, no flash, safe zone, no vehicles, 35mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-06　全景·人物与桥洞纵深

- 文件名：`scene-underpass-light__06.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约6米，站在安全区，机位高度约1.5米，平视。
- 动作：模特背对镜头向洞内深处走去，步伐自然，双手下垂。
- 道具：无　｜　裁切：取全身，包含洞顶和地面。
- 必见：人物行走动态、隧道光影层次、纵深透视。　｜　废片判据：人物模糊、光影平淡、构图松散。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, Full shot, adult walking away into pedestrian underpass, eye level, tunnel lights creating depth, urban hard style, dark clothing, backlit, no flash, safe zone, no vehicles, cool mood, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-07　特写·脚步与地面光影

- 文件名：`scene-underpass-light__07.png`
- 景别/角度/焦段/光圈：大特写 / 地面低角度 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1米，蹲下，机位高度约0.3米，低角度。
- 动作：模特站立，一只脚微微向前，重心在后脚。
- 道具：无　｜　裁切：取脚部至膝盖，保留地面纹理。
- 必见：鞋部细节、地面光影、脚步姿态。　｜　废片判据：鞋部过曝或欠曝、地面杂乱、构图不紧凑。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, Close-up shot of feet and lower legs standing on tunnel floor, ground level, light patterns on concrete floor, hard urban style, dark pants and shoes, no flash, cool mood, safe zone, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-08　中近景·侧面轮廓与隧道光

- 文件名：`scene-underpass-light__08.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约2.5米，站在安全区，机位高度约1.5米，平视。
- 动作：模特侧身站立，手臂自然下垂，头部保持中立，目光平视前方。
- 道具：无　｜　裁切：取半身，裁至腰部。
- 必见：侧脸轮廓、肩部线条、隧道背景光点。　｜　废片判据：面部全黑或全亮、背景光点杂乱、轮廓光缺失。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, Medium close-up, side profile of adult inside tunnel, eye level, tunnel lights as side light, half face lit, hard urban style, dark clothing, no flash, background with bokeh lights, safe zone, 35mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S13-09　大远景·桥洞出口与城市背景

- 文件名：`scene-underpass-light__09.png`
- 景别/角度/焦段/光圈：大远景 / 平视 / 35mm / f/8 / 竖幅
- 机位：距主体约15米，站在安全区，机位高度约1.6米，平视。
- 动作：模特站在桥洞出口处，身体稍微侧向，回头看向镜头方向。
- 道具：无　｜　裁切：取全身，包含大片城市背景和桥洞出口。
- 必见：人物剪影、桥洞出口结构、城市背景细节。　｜　废片判据：人物过小、背景过曝、构图不平衡。

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, Extreme wide shot, adult standing at tunnel exit with city background, eye level, backlit silhouette, urban hard style, dark clothing, natural light, no flash, safe zone, no vehicles, cool mood, 35mm lens at f/8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-underpass-light__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-underpass-light__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

