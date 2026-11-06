# S11 · 美术馆看展的人

用例 `scene-museum-quiet`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | long hair worn loose | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 保持日常看展装束，避免反光面料与大面积亮色，发型整洁不被风扰动 | 换衣即断系列 |
| 场地 | 市美术馆展厅（已获拍摄许可） | 同一处，背景元素不跑 |
| 光线 | 仅用展厅现有顶灯与展墙基础照明，关闭闪光灯；不补光，必要时用反光板以外的现场白墙反射光，但本镜不额外加设备 | 主光方向不变 |
| 调色 | black and white with strong grain and high micro-contrast | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, documentary photograph, one adult visitor standing at the entrance of an art museum gallery seen from behind, hands relaxed at sides, looking into the exhibition hall,  with entrance frame and deep gallery space, existing ceiling lights only, no flash, natural quiet mood, eye level, candid reportage style, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, documentary photograph, one adult visitor standing at the entrance of an art museum gallery seen from behind, hands relaxed at sides, looking into the exhibition hall,  with entrance frame and deep gallery space, existing ceiling lights only, no flash, natural quiet mood, eye level, candid reportage style, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, documentary photograph, one adult visitor standing at the entrance of an art museum gallery seen from behind, hands relaxed at sides, looking into the exhibition hall,  with entrance frame and deep gallery space, existing ceiling lights only, no flash, natural quiet mood, eye level, candid reportage style, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `scene-museum-quiet__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 展厅入口环境交代镜 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，站立于入口门框内侧，机位高度约1.5米平视 |
| 2 | 展墙前静观中景 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2.5米，站立于人物侧前方约45度，机位高度约1.5米平视 |
| 3 | 越肩看画关系镜 | 近景 | 平视 | 50mm | f/2 | 距主体约1.2米，站在人物左后方，机位高度约1.55米略高于肩部平视 |
| 4 | 射灯光斑背景侧脸近景 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1米，位于人物侧前方约30度，机位高度约1.5米平视 |
| 5 | 移步换展品行走镜 | 全身 | 平视 | 35mm | f/4 | 距主体约3米，站立于展厅通道一侧，机位高度约1.2米略低平视 |
| 6 | 驻足停步低机位全身镜 | 全身 | 地面低角度 | 35mm | f/4 | 距主体约2.8米，蹲姿机位高度约0.9米，位于人物侧前方 |
| 7 | 画作细节与观看视线交替镜 | 近景 | 平视 | 50mm | f/2 | 距主体约1.5米，位于人物右后方，机位高度约1.5米，镜头略越过人物视线方向 |
| 8 | 展厅纵深引导线环境镜 | 全景 | 平视 | 35mm | f/5.6 | 距主体约5米，位于通道一端，机位高度约1.6米平视，利用展墙与地面形成引导线 |
| 9 | 离开展厅回望收尾镜 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2米，位于人物侧前方，机位高度约1.5米平视 |

### S11-01　展厅入口环境交代镜

- 文件名：`scene-museum-quiet__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，站立于入口门框内侧，机位高度约1.5米平视
- 动作：背对镜头站立于入口内侧，双脚与肩同宽，双手自然垂在身侧，头部微抬看向展厅纵深，保持静止约5秒
- 道具：无　｜　裁切：保留入口门框上沿与地面，头顶留约15%空间，不裁掉人物脚部
- 必见：人物完整背影、展厅纵深、展墙与地面关系、人与展品距离明显大于1米　｜　废片判据：出现闪光灯痕迹、人物贴墙过近破坏1米距离、画面倾斜、入口结构被裁断

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/9] 2:3 vertical, documentary photograph, one adult visitor standing at the entrance of an art museum gallery seen from behind, hands relaxed at sides, looking into the exhibition hall, full body with entrance frame and deep gallery space, existing ceiling lights only, no flash, natural quiet mood, eye level, candid reportage style, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S11-02　展墙前静观中景

- 文件名：`scene-museum-quiet__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，站立于人物侧前方约45度，机位高度约1.5米平视
- 动作：侧身站立面向展墙，身体放松，双手自然下垂，视线落在画作中心，保持静止呼吸，不摆拍
- 道具：无　｜　裁切：裁切至人物膝盖以上，保留画面右侧展品局部与射灯光斑，头顶留约10%空间
- 必见：人物侧脸静观神态、展墙画作局部、射灯在展墙形成的光斑、人与展品间距大于1米　｜　废片判据：人物与展品间距不足1米、光斑缺失、面部死黑、出现闪光灯硬阴影

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/9] 2:3 vertical, documentary art museum scene, one adult visitor in side profile quietly looking at a painting on the gallery wall, hands relaxed, natural expression, wall spotlight blossoms in background, no flash, existing ambient light, eye level, muted realistic tones, candid photography, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S11-03　越肩看画关系镜

- 文件名：`scene-museum-quiet__03.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.2米，站在人物左后方，机位高度约1.55米略高于肩部平视
- 动作：背对镜头站在画作前约1.2米处，双肩放松，头部微仰，视线对准画心上部，双手自然垂放
- 道具：无　｜　裁切：裁切人物头部至腰部，保留完整画心与画框上沿，右侧不裁断画框
- 必见：人物越肩轮廓、画作主体、观看视线方向、1米以上观看距离　｜　废片判据：画框被裁断、人物头部完全遮挡画心、画面因手持有明显抖动模糊

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/9] 2:3 vertical, over the shoulder documentary shot, adult visitor standing in front of a framed painting in an art gallery, head tilted slightly up, quiet observation, painting fully visible, soft gallery spotlight, no flash, handheld, eye level behind subject, realistic candid reportage, 50mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S11-04　射灯光斑背景侧脸近景

- 文件名：`scene-museum-quiet__04.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，位于人物侧前方约30度，机位高度约1.5米平视
- 动作：侧身面对展墙，下巴微收，视线平视画作中部，嘴唇自然闭合，保持静观表情约4秒
- 道具：无　｜　裁切：裁切至人物胸部以上，保留左后方射灯光斑完整，头顶留约8%空间
- 必见：人物静观侧脸、眼神方向、背景射灯光斑形状、画面无闪光灯痕迹　｜　废片判据：光斑过曝成死白、面部阴影过重、出现假笑或看镜头、背景光斑被裁掉

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/9] 2:3 vertical, close-up documentary portrait, adult visitor in side profile quietly observing art in a museum gallery, soft ambient light on face, warm wall spotlight bokeh in background, natural calm expression, no flash, eye level, muted realistic film look, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S11-05　移步换展品行走镜

- 文件名：`scene-museum-quiet__05.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约3米，站立于展厅通道一侧，机位高度约1.2米略低平视
- 动作：从画面左侧向右侧缓步走过展墙，步幅小、速度慢，头微转向画作，双手自然摆动，不看镜头
- 道具：无　｜　裁切：保留人物全身与脚下地面，画面上沿保留展墙挂画下缘，不裁掉脚部
- 必见：行走方向、身体与展墙的平行关系、人与展品1米以上距离、展厅地面反光　｜　废片判据：人物贴展墙过近、脚步被裁断、行走姿态僵硬或看镜头、出现闪光灯补光痕迹

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/9] 2:3 vertical, documentary photograph, adult visitor slowly walking along a museum gallery wall, small steps, head slightly turned toward artworks, hands naturally swinging, full body visible, polished floor reflection, existing gallery lighting, no flash, handheld, low eye level, candid motion, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S11-06　驻足停步低机位全身镜

- 文件名：`scene-museum-quiet__06.png`
- 景别/角度/焦段/光圈：全身 / 地面低角度 / 35mm / f/4 / 竖幅
- 机位：距主体约2.8米，蹲姿机位高度约0.9米，位于人物侧前方
- 动作：在画作前停下，双脚前后错开约半步，重心落在后脚，双手自然垂在身前，抬头看画
- 道具：无　｜　裁切：保留人物全身与脚下地面，顶部保留画作下缘，脚下留约10%地面空间
- 必见：人物停步姿态、全身轮廓、展墙画作、1米以上观看距离、低机位带来的空间感　｜　废片判据：人物脚部被裁、低机位导致人物变形过度、画作与人物重叠遮挡、地面过曝

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/9] 2:3 vertical, low angle full body documentary photo, adult visitor pausing in front of a painting in an art museum, feet staggered, hands relaxed in front, looking up at artwork, gallery wall and polished floor visible, existing spotlight, no flash, handheld, ground level perspective, quiet mood, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S11-07　画作细节与观看视线交替镜

- 文件名：`scene-museum-quiet__07.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，位于人物右后方，机位高度约1.5米，镜头略越过人物视线方向
- 动作：保持静止站立，视线固定在画作局部，右手自然垂放不抬起，头部轻微左右移动跟随画面细节
- 道具：无　｜　裁切：画作局部占画面约三分之二，人物肩部与后脑占左侧三分之一，不裁断画作主体细节
- 必见：画作笔触或局部细节、人物观看视线方向、人物与画作1米以上距离　｜　废片判据：画作局部过曝丢失细节、人物完全出画、视线与画作方向不一致

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/9] 2:3 vertical, documentary detail shot, over the shoulder of an adult visitor looking at a painting, painting texture and brushwork in focus, visitor shoulder and back of head as soft foreground, gallery spotlight on artwork, no flash, eye level, realistic museum atmosphere, 50mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S11-08　展厅纵深引导线环境镜

- 文件名：`scene-museum-quiet__08.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 35mm / f/5.6 / 竖幅
- 机位：距主体约5米，位于通道一端，机位高度约1.6米平视，利用展墙与地面形成引导线
- 动作：站在展厅通道中段，背对镜头，身体朝向纵深方向，双手自然垂放，静止看前方展墙
- 道具：无　｜　裁切：保留顶部灯具排列与地面透视线，人物全身完整，脚下保留约10%地面
- 必见：展厅纵深、人物全身背影、展墙排列、人与最近展品1米以上距离　｜　废片判据：透视线被人物完全遮挡、顶灯过曝、人物贴展墙、画面出现其他游客大面积干扰

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/9] 2:3 vertical, wide documentary shot of an art museum gallery corridor, one adult visitor standing in the middle facing the depth of the hall seen from behind, gallery walls and ceiling lights forming leading lines, full body, existing lighting only, no flash, handheld, eye level, quiet contemplative atmosphere, 35mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S11-09　离开展厅回望收尾镜

- 文件名：`scene-museum-quiet__09.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，位于人物侧前方，机位高度约1.5米平视
- 动作：走到展厅出口附近，侧身回头望向展墙方向，肩膀微转，双手自然垂放，表情平静
- 道具：无　｜　裁切：裁切至人物大腿以上，保留左侧展墙局部与出口结构边缘，不裁断回头视线方向
- 必见：人物回头动作、视线方向、展厅出口与展墙空间关系、静观情绪收束　｜　废片判据：人物回头过猛显得摆拍、出口结构完全缺失、面部曝光不足、出现闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/9] 2:3 vertical, documentary photograph, adult visitor pausing near the exit of a museum gallery, turning head back toward the exhibition wall, calm expression, side profile visible, gallery space and wall lights in background, existing lighting only, no flash, handheld, eye level, quiet ending mood, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to scene-museum-quiet__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, no tripod, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `scene-museum-quiet__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

