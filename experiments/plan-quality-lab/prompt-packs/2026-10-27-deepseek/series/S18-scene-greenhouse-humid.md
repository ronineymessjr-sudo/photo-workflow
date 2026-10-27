# S18 · 温室植物园人像

用例 `scene-greenhouse-humid`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 建议浅色亚麻类长袖上衣与长裤，避免绿色与背景粘连，妆发自然微湿感，不编造品牌 | 换衣即断系列 |
| 场地 | 植物园温室（已获许可，步道内拍摄） | 同一处，背景元素不跑 |
| 光线 | 仅用棚顶漫射日光，不补光，不开闪光灯；观察棚顶玻璃光斑落点，让模特站位选择光斑落在肩头的位置 | 主光方向不变 |
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
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, portrait of an adult standing on a walkway inside a humid botanical greenhouse, glass roof above, lush green tropical plants on both sides, soft diffused daylight, damp walkway, natural relaxed posture, eye level, realistic photography, no flash, no tripod, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, portrait of an adult standing on a walkway inside a humid botanical greenhouse, glass roof above, lush green tropical plants on both sides, soft diffused daylight, damp walkway, natural relaxed posture, eye level, realistic photography, no flash, no tripod, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, portrait of an adult standing on a walkway inside a humid botanical greenhouse, glass roof above, lush green tropical plants on both sides, soft diffused daylight, damp walkway, natural relaxed posture, eye level, realistic photography, no flash, no tripod, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-greenhouse-humid__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 温室入口全景定场镜 | 全身 | 平视 | 50mm | f/4 | 距主体约6米，站在步道入口端，机位高度约1.5米平视 |
| 2 | 光斑落肩半身镜 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2米，机位高度约1.4米，略低于模特视线 |
| 3 | 步道低机位生机前景镜 | 中景 | 低机位仰拍 | 50mm | f/2.8 | 距主体约2.5米，蹲至机位高度约0.8米，仍在步道内 |
| 4 | 棚顶光斑仰角特写 | 特写 | 低机位仰拍 | 50mm | f/1.8 | 距主体约1米，机位高度约1.2米，站在步道上略低仰拍 |
| 5 | 步道纵深行走跟拍镜 | 全身 | 平视 | 50mm | f/4 | 距主体约4米，站在步道中轴线上，机位高度约1.5米，边后退边拍 |
| 6 | 叶影侧脸中景镜 | 近景 | 平视 | 50mm | f/2 | 距主体约2米，机位高度约1.5米，与模特视线齐平 |
| 7 | 高位俯拍步道站位镜 | 全身 | 高机位俯拍 | 50mm | f/4 | 距主体约3米，站在步道旁较高处（仅限已许可且安全的步道台阶），机位高度约2.2米俯拍 |
| 8 | 湿润空气半身环境镜 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2.5米，机位高度约1.5米平视 |
| 9 | 手部细节特写镜 | 大特写 | 高机位俯拍 | 50mm | f/1.8 | 距主体约0.8米，机位高度约1.3米，略俯拍手部 |
| 10 | 离场回望收尾镜 | 全身 | 平视 | 50mm | f/4 | 距主体约5米，站在步道起点，机位高度约1.5米平视 |

### S18-01　温室入口全景定场镜

- 文件名：`scene-greenhouse-humid__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约6米，站在步道入口端，机位高度约1.5米平视
- 动作：模特站在步道中段，身体朝镜头侧转15度，双手自然垂放身侧，下巴微抬看向棚顶光斑
- 道具：无　｜　裁切：保留棚顶结构上沿与步道下沿，人物全身完整入画，脚底不裁切
- 必见：温室玻璃棚顶、湿润步道、绿色植物层次、人物全身与所处环境关系　｜　废片判据：人物与背景植物轮廓粘连、棚顶结构缺失、步道尽头过曝死白、画面出现三脚架或闪光灯痕迹

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/10] 2:3 vertical, full body portrait of an adult standing on a walkway inside a humid botanical greenhouse, glass roof above, lush green tropical plants on both sides, soft diffused daylight, damp walkway, natural relaxed posture, eye level, realistic photography, no flash, no tripod, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-02　光斑落肩半身镜

- 文件名：`scene-greenhouse-humid__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高度约1.4米，略低于模特视线
- 动作：模特侧身站定，右肩朝向棚顶光斑，头部缓慢转向镜头，眼睛先看地面再抬起
- 道具：无　｜　裁切：裁至大腿中部以上，头顶留少量空间，右侧保留光斑叶片
- 必见：肩头与侧脸的自然光斑、皮肤湿润质感、背景叶片虚化层次　｜　废片判据：光斑落在眼部造成眯眼、脸部大面积阴影、背景过曝无细节、人物触碰植物

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/10] 2:3 vertical, half body portrait of an adult in a greenhouse, soft dappled sunlight falling on shoulder and cheek, humid atmosphere, green foliage background softly blurred, natural skin texture, slightly low eye level, realistic, no flash, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-03　步道低机位生机前景镜

- 文件名：`scene-greenhouse-humid__03.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，蹲至机位高度约0.8米，仍在步道内
- 动作：模特站在步道边缘内侧，双脚不越界，身体微微前倾看向画面外的植物冠层，一只手自然搭在身侧衣摆处
- 道具：无　｜　裁切：裁至膝盖以上，保留前景叶片虚化与棚顶亮部，不裁断人物手臂
- 必见：前景叶片虚化、湿润步道边缘、人物看向植物的专注神情　｜　废片判据：人物脚部踩入种植区、前景叶片糊成死黑、身体比例因低机位变形过度

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/10] 2:3 vertical, medium shot from low angle of an adult standing on a greenhouse walkway, looking toward lush plants, blurred foreground leaves, humid soft daylight from glass roof, natural posture, realistic photography, no flash, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-04　棚顶光斑仰角特写

- 文件名：`scene-greenhouse-humid__04.png`
- 景别/角度/焦段/光圈：特写 / 低机位仰拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度约1.2米，站在步道上略低仰拍
- 动作：模特微微仰头，眼睛看向棚顶玻璃，嘴唇自然闭合，一只手轻触自己领口，不触碰植物
- 道具：无　｜　裁切：头部与肩部特写，头顶保留少量棚顶虚化亮斑，不裁掉下巴
- 必见：额头与鼻梁的光斑、睫毛与皮肤湿润质感、领口细节　｜　废片判据：光斑过曝成白块、脸部出现镜头雾化、仰角导致鼻孔过度暴露、手触碰到植物

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/10] 2:3 vertical, close up portrait of an adult looking up at a glass greenhouse roof, soft dappled light on forehead and nose bridge, natural skin texture, humid atmosphere, shallow depth, slightly low angle, realistic, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-05　步道纵深行走跟拍镜

- 文件名：`scene-greenhouse-humid__05.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，站在步道中轴线上，机位高度约1.5米，边后退边拍
- 动作：模特沿步道向镜头缓慢行走，步幅小，视线落在镜头侧方，双臂自然摆动
- 道具：无　｜　裁切：全身入画，脚底保留步道面，头顶留棚架高度
- 必见：步道透视纵深、行走中的自然摆臂、温室种植床两侧环境　｜　废片判据：人物走出步道边线、背景出现游客穿帮、对焦落在背景、脚部被裁切

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/10] 2:3 vertical, full body walking shot of an adult on a greenhouse walkway, walking slowly toward camera, green plants on both sides, glass roof diffused light, humid atmosphere, eye level, realistic photography, no flash, no tripod, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-06　叶影侧脸中景镜

- 文件名：`scene-greenhouse-humid__06.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约2米，机位高度约1.5米，与模特视线齐平
- 动作：模特侧对镜头站立，肩部放松，视线落在画面外同一高度的叶片上，嘴角微松
- 道具：无　｜　裁切：裁至胸口以上，保留侧脸轮廓与肩线，右侧留叶影空间
- 必见：侧脸轮廓、叶影在面部的斑驳层次、耳后细节与自然发丝　｜　废片判据：叶影完全覆盖眼睛、侧脸死黑、背景植物与头发粘连、人物触碰叶片

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/10] 2:3 vertical, medium close up side profile of an adult in a botanical greenhouse, dappled leaf shadows on face, soft natural light from glass roof, humid green background, eye level, realistic, no flash, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-07　高位俯拍步道站位镜

- 文件名：`scene-greenhouse-humid__07.png`
- 景别/角度/焦段/光圈：全身 / 高机位俯拍 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，站在步道旁较高处（仅限已许可且安全的步道台阶），机位高度约2.2米俯拍
- 动作：模特站在步道中央，抬头看向镜头，双臂自然下垂，脚尖朝前不越线
- 道具：无　｜　裁切：全身俯拍入画，保留步道两侧种植床边界，脚底不裁切
- 必见：俯视下的步道线条、人物全身比例、温室种植床的绿色肌理　｜　废片判据：模特站在种植床内、俯拍导致身体压缩过度、步道边界不清、出现未许可的高台

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/10] 2:3 vertical, high angle full body shot of an adult standing on a greenhouse walkway looking up at camera, glass roof diffused daylight, green planting beds on both sides, humid atmosphere, realistic photography, no flash, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-08　湿润空气半身环境镜

- 文件名：`scene-greenhouse-humid__08.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，机位高度约1.5米平视
- 动作：模特站在步道一侧，双手交叠放在身前，肩膀放松，视线平视镜头，呼吸平稳
- 道具：无　｜　裁切：裁至腰部以上，保留头部周围空气感与右侧环境雾气
- 必见：湿润空气感、人物平静神态、背景植物层次与棚顶柔光　｜　废片判据：镜头起雾导致整体发灰、人物面部无细节、背景完全糊成色块、衣物出现不自然湿痕

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/10] 2:3 vertical, medium shot of an adult standing on a greenhouse walkway, hands gently folded in front, humid soft atmosphere, lush plants softly blurred behind, diffused daylight, eye level, realistic photography, no flash, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-09　手部细节特写镜

- 文件名：`scene-greenhouse-humid__09.png`
- 景别/角度/焦段/光圈：大特写 / 高机位俯拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.8米，机位高度约1.3米，略俯拍手部
- 动作：模特侧身站立，一只手自然抬起至胸前高度，手指放松微曲，不触碰任何植物
- 道具：无　｜　裁切：仅手部与前臂入画，保留少量袖口与背景虚化，不裁断手指
- 必见：手背皮肤纹理、自然手指姿态、袖口与背景植物层次　｜　废片判据：手指被裁切、皮肤过曝无纹理、背景出现触摸植物的动作、画面出现镜头雾化

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/10] 2:3 vertical, close up detail of an adult's relaxed hand raised near chest, not touching plants, soft diffused greenhouse light, blurred green foliage background, natural skin texture, slightly high angle, realistic, no flash, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-10　离场回望收尾镜

- 文件名：`scene-greenhouse-humid__10.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约5米，站在步道起点，机位高度约1.5米平视
- 动作：模特沿步道向画面深处走出三步后停下回头，肩膀先转，视线越过肩头看向镜头
- 道具：无　｜　裁切：全身或七分身入画，保留步道前景与温室结构，头顶留空间
- 必见：回望的肩线与眼神、步道纵深、温室出口方向的环境层次　｜　废片判据：回头动作僵硬、面部处于剪影、人物走出步道边界、背景出现出口外无关人员

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 10/10] 2:3 vertical, full body shot of an adult walking away on a greenhouse walkway then looking back over shoulder at camera, humid botanical garden, diffused daylight from glass roof, green plants, eye level, realistic photography, no flash, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-greenhouse-humid__REF-A.png. Change only camera position, framing and pose to match FRAME 10. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-greenhouse-humid__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

