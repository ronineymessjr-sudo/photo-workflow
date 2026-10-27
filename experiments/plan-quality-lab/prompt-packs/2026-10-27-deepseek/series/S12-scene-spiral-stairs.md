# S12 · 旋转楼梯俯瞰

用例 `scene-spiral-stairs`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 拍摄前确认鞋底防滑、衣摆不拖地、无松散饰品垂到扶手外侧 | 换衣即断系列 |
| 场地 | 美术馆旋转楼梯（已获许可） | 同一处，背景元素不跑 |
| 光线 | 使用现场美术馆顶光与楼梯间侧窗自然光，禁用闪光灯；若内圈偏暗，由助手在顶层内侧安全位置以常亮灯加柔光箱低功率补内圈，不直射镜头 | 主光方向不变 |
| 调色 | natural colour with a gentle film curve and consistent white balance | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, , adult walking down the inner side of a museum spiral staircase, hand sliding on the inner handrail, camera 3 meters ahead at chest height, natural side window light, no flash, clean architectural curve, shallow depth, gray concrete and white walls, no props, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, , adult walking down the inner side of a museum spiral staircase, hand sliding on the inner handrail, camera 3 meters ahead at chest height, natural side window light, no flash, clean architectural curve, shallow depth, gray concrete and white walls, no props, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, , adult walking down the inner side of a museum spiral staircase, hand sliding on the inner handrail, camera 3 meters ahead at chest height, natural side window light, no flash, clean architectural curve, shallow depth, gray concrete and white walls, no props, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-spiral-stairs__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 顶层中轴俯瞰螺旋全貌 | 大远景 | 正俯拍 | 16mm | f/8 | 位于顶层楼梯口内侧安全区，站在扶手内侧，身体距楼梯中轴水平距离约1.2米，机位高度约1.6米，靠近内侧栏板站稳后俯拍 |
| 2 | 螺旋中轴垂直俯视几何 | 全身 | 正俯拍 | 16mm | f/4 | 站在顶层扶手内侧，身体贴近内侧栏板，距楼梯中轴水平距离约0.8米，机位高度约1.7米，镜头垂直向下俯拍 |
| 3 | 内侧扶手弧线中景跟拍 | 中景 | 平视 | 50mm | f/2.8 | 站在人物前下方约3米处的同一段楼梯内侧，机位高度约1.4米，与人物胸口平视，镜头顺扶手弧线方向 |
| 4 | 扶手内侧低机位仰拍 | 近景 | 低机位仰拍 | 16mm | f/2 | 位于人物下方两级踏步的内侧，距主体约1.5米，机位高度约0.8米贴近踏步低角度仰拍 |
| 5 | 上层栏板框景中景 | 中景 | 平视 | 50mm | f/2.8 | 位于人物同层对面内侧平台，距主体约4米，机位高度约1.2米，利用上层栏板弧线做前景框 |
| 6 | 螺旋顶部俯拍背影 | 全身 | 高机位俯拍 | 16mm | f/4 | 位于顶层扶手内侧，距楼梯中轴水平距离约1米，机位高度约1.7米，俯拍人物背部与下行方向 |
| 7 | 中段平视几何对称 | 全身 | 平视 | 50mm | f/4 | 位于人物正前方同层楼梯平台内侧，距主体约5米，机位高度约1.5米，与人物胸口平视，镜头对准螺旋中轴 |
| 8 | 扶手细节手部特写 | 特写 | 平视 | 50mm | f/1.8 | 位于人物右侧下方一级踏步内侧，距手部约40厘米，机位高度约1.1米，平视扶手弧面 |
| 9 | 顶层俯瞰人物小全 | 全景 | 高机位俯拍 | 16mm | f/5.6 | 位于顶层扶手内侧，距楼梯中轴水平距离约1.1米，机位高度约1.65米，越过栏板俯拍下方人物 |

### S12-01　顶层中轴俯瞰螺旋全貌

- 文件名：`scene-spiral-stairs__01.png`
- 景别/角度/焦段/光圈：大远景 / 正俯拍 / 16mm / f/8 / 竖幅
- 机位：位于顶层楼梯口内侧安全区，站在扶手内侧，身体距楼梯中轴水平距离约1.2米，机位高度约1.6米，靠近内侧栏板站稳后俯拍
- 动作：人物沿内侧扶手一侧慢步下行，右手轻扶内侧扶手，身体微向楼梯中轴倾斜约10度，步幅半步，视线顺楼梯曲线向下方看
- 道具：无　｜　裁切：保留完整螺旋内圈与至少三层踏步弧线，人物全身入画，不裁掉头顶与足部
- 必见：螺旋楼梯的几何弧线、扶手连续曲线、人物靠内侧行走、楼梯中轴空间　｜　废片判据：扶手外圈明显广角畸变拉伸、人物不在内侧、画面出现闪光灯硬阴影、人物足部被裁

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/9] 2:3 vertical, ultra wide angle architectural photo, spiral staircase interior of an art museum, adult walking down along the inner handrail, top floor overhead vantage, camera about 1.2 meters horizontally from the staircase central axis, standing inside the railing, no flash, soft natural skylight, geometric flowing curves, white and gray concrete, deep spiral center, full body visible, no props, 16mm lens at f/8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S12-02　螺旋中轴垂直俯视几何

- 文件名：`scene-spiral-stairs__02.png`
- 景别/角度/焦段/光圈：全身 / 正俯拍 / 16mm / f/4 / 竖幅
- 机位：站在顶层扶手内侧，身体贴近内侧栏板，距楼梯中轴水平距离约0.8米，机位高度约1.7米，镜头垂直向下俯拍
- 动作：人物停在下一层内侧踏步，双肩正对楼梯中轴，右手搭在内侧扶手，头微仰看向镜头方向，双脚并拢踩稳同一踏步
- 道具：无　｜　裁切：以楼梯中轴为中心，保留约四分之三螺旋弧线，人物从头顶到膝盖以上入画，不切掉扶手中段
- 必见：垂直俯视的螺旋几何、扶手同心弧线、人物仰视面部、内侧行走位置　｜　废片判据：人物站在外侧踏步、画面出现闪光灯、螺旋中轴偏离画面中心超过三分之一、面部完全在阴影中

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/9] 2:3 vertical, vertical top down view of a spiral staircase in an art museum, adult standing on an inner step looking up at camera, hand on inner handrail, camera inside the railing about 0.8 meters from the central axis, concentric curved handrails, no flash, soft reflected skylight on face, geometric abstract architecture, no props, 16mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S12-03　内侧扶手弧线中景跟拍

- 文件名：`scene-spiral-stairs__03.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：站在人物前下方约3米处的同一段楼梯内侧，机位高度约1.4米，与人物胸口平视，镜头顺扶手弧线方向
- 动作：人物继续沿内侧扶手向下走，左手滑扶内侧扶手，右臂自然摆动，身体随楼梯弧度微转，视线看向下一段踏步
- 道具：无　｜　裁切：人物从头顶到大腿中部入画，保留内侧扶手连续弧线与至少两级踏步，不裁断扶手线条
- 必见：人物靠内侧行走、手与内侧扶手接触、50mm下的楼梯弧线层次、自然光方向　｜　废片判据：人物走到扶手外侧、扶手线条在画面中断、出现闪光灯、背景墙面过曝失去几何线条

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/9] 2:3 vertical, medium shot, adult walking down the inner side of a museum spiral staircase, hand sliding on the inner handrail, camera 3 meters ahead at chest height, natural side window light, no flash, clean architectural curve, shallow depth, gray concrete and white walls, no props, 50mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S12-04　扶手内侧低机位仰拍

- 文件名：`scene-spiral-stairs__04.png`
- 景别/角度/焦段/光圈：近景 / 低机位仰拍 / 16mm / f/2 / 竖幅
- 机位：位于人物下方两级踏步的内侧，距主体约1.5米，机位高度约0.8米贴近踏步低角度仰拍
- 动作：人物单脚踩在下一级踏步边缘，另一脚在后，右手扶内侧扶手，身体微侧向镜头，下巴略收，视线越过扶手向下
- 道具：无　｜　裁切：人物从头顶到膝盖入画，前景保留内侧扶手局部，上方保留两层楼梯弧线
- 必见：低机位仰视的螺旋结构、人物扶内侧扶手、上半身姿态、顶光轮廓　｜　废片判据：仰拍造成面部严重变形、人物靠外侧、闪光灯补光、上方结构完全被裁掉

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/9] 2:3 vertical, low angle shot from lower inner step of a museum spiral staircase, adult standing on inner step with hand on inner railing, camera 1.5 meters away at 0.8 meter height, skylight rim light, no flash, upward view of spiral architecture, clean geometric lines, no props, 16mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S12-05　上层栏板框景中景

- 文件名：`scene-spiral-stairs__05.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：位于人物同层对面内侧平台，距主体约4米，机位高度约1.2米，利用上层栏板弧线做前景框
- 动作：人物从上层栏板弧线后经过，身体沿内侧行走，头部微低，右手扶内侧扶手，面部从栏板缺口露出
- 道具：无　｜　裁切：保留前景栏板完整弧线与人物上半身，人物下半身可被栏板遮挡，不裁断栏板曲线
- 必见：前景栏板弧线框景、人物内侧行走、面部可见、楼梯几何层次　｜　废片判据：人物被栏板完全挡住、面部死黑、栏板线条被裁断、出现闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/9] 2:3 vertical, medium shot through curved balcony opening of a museum spiral staircase, adult walking along the inner side, hand on inner handrail, face visible through the gap, camera 4 meters away at 1.2 meter height, natural light only no flash, architectural framing, gray concrete and white walls, no props, 50mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S12-06　螺旋顶部俯拍背影

- 文件名：`scene-spiral-stairs__06.png`
- 景别/角度/焦段/光圈：全身 / 高机位俯拍 / 16mm / f/4 / 竖幅
- 机位：位于顶层扶手内侧，距楼梯中轴水平距离约1米，机位高度约1.7米，俯拍人物背部与下行方向
- 动作：人物背对镜头上行后转身下行，右手扶内侧扶手，肩线随楼梯弧度微转，后颈与背部朝向镜头
- 道具：无　｜　裁切：人物从头顶到小腿入画，保留至少两层楼梯弧线与中轴空白，不裁掉头顶
- 必见：人物背部与内侧扶手接触、下行方向、螺旋顶部纵深、几何对称感　｜　废片判据：人物回头看镜头破坏背影情绪、靠外侧扶手、闪光灯、螺旋中轴被人物完全堵住

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/9] 2:3 vertical, high angle back view of an adult walking down the inner side of a museum spiral staircase, hand on inner handrail, camera on top floor inside the railing about 1 meter from the central axis, no flash, top skylight rim light, deep spiral geometry, flowing curves, no props, 16mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S12-07　中段平视几何对称

- 文件名：`scene-spiral-stairs__07.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：位于人物正前方同层楼梯平台内侧，距主体约5米，机位高度约1.5米，与人物胸口平视，镜头对准螺旋中轴
- 动作：人物站在楼梯中段内侧踏步，正面朝向镜头，双手自然下垂，右手手背轻贴内侧扶手，双脚与肩同宽踩稳
- 道具：无　｜　裁切：人物从头顶到脚踝入画，保留背后三层以上楼梯弧线，不裁掉人物肩部两侧扶手
- 必见：人物正面站姿、手贴内侧扶手、背后螺旋对称几何、50mm自然透视　｜　废片判据：人物未靠内侧、背景弧线歪斜、闪光灯硬光、人物轮廓与背景粘连

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/9] 2:3 vertical, symmetrical eye level portrait of an adult standing on an inner step of a museum spiral staircase, hands relaxed with back of hand touching inner handrail, camera 5 meters away at chest height, natural soft light, no flash, geometric symmetric curves behind, clean minimal wardrobe, no props, 50mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S12-08　扶手细节手部特写

- 文件名：`scene-spiral-stairs__08.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：位于人物右侧下方一级踏步内侧，距手部约40厘米，机位高度约1.1米，平视扶手弧面
- 动作：人物右手沿内侧扶手缓慢下滑，手指依次轻触扶手弧面，手腕放松，身体仅露出右侧前臂
- 道具：无　｜　裁切：只保留手部、前臂与扶手局部弧线，不出现完整面部，裁掉多余背景
- 必见：手指与内侧扶手的接触、扶手弧线材质、手部放松状态　｜　废片判据：手部失焦、闪光灯造成金属或漆面反光斑、袖口遮挡手指、背景出现杂乱行人

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/9] 2:3 vertical, close up of an adult hand sliding along the inner handrail of a museum spiral staircase, camera 40 centimeters away at 1.1 meter height, natural grazing side light, no flash, smooth curved handrail texture, blurred body at frame edge, no props, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S12-09　顶层俯瞰人物小全

- 文件名：`scene-spiral-stairs__09.png`
- 景别/角度/焦段/光圈：全景 / 高机位俯拍 / 16mm / f/5.6 / 竖幅
- 机位：位于顶层扶手内侧，距楼梯中轴水平距离约1.1米，机位高度约1.65米，越过栏板俯拍下方人物
- 动作：人物走完一段后停在下方内侧平台，抬头看向顶层镜头，右手仍搭在内侧扶手上，双脚并拢站立
- 道具：无　｜　裁切：保留完整一层螺旋弧线与人物全身，人物头顶上方留出两层楼梯空间，不裁掉脚部
- 必见：顶层俯瞰视角、人物在内侧平台、完整螺旋几何、人物与空间比例　｜　废片判据：人物靠外侧、脚部被栏板裁掉、闪光灯、螺旋弧线因广角严重变形失真

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/9] 2:3 vertical, wide high angle shot from top floor inside the railing of a museum spiral staircase, adult standing on lower inner landing looking up, hand on inner handrail, camera about 1.1 meters from the central axis, no flash, skylight illumination, full spiral geometry, small figure in large architectural space, no props, 16mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-spiral-stairs__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-spiral-stairs__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

