# S07 · 暗黑哥特废墟人像

用例 `style-gothic-ruin`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 深色长外套、黑色长裤、深色靴子；发型，妆容 | 换衣即断系列 |
| 场地 | 废弃厂房外部围栏内安全区（已获许可，不进入建筑本体） | 同一处，背景元素不跑 |
| 光线 | 自然光，阴天漫射光，无补光；避免闪光灯 | 主光方向不变 |
| 调色 | desaturated cool grey, crushed blacks, one warm accent light | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Wide environmental portrait, adult model in profile facing left, standing near a fence with derelict factory wall on right, dark gothic style, overcast side light, subtle fill from white board, no flash, eye level, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Wide environmental portrait, adult model in profile facing left, standing near a fence with derelict factory wall on right, dark gothic style, overcast side light, subtle fill from white board, no flash, eye level, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Wide environmental portrait, adult model in profile facing left, standing near a fence with derelict factory wall on right, dark gothic style, overcast side light, subtle fill from white board, no flash, eye level, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-gothic-ruin__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 废墟全景定场 | 全景 | 平视 | 24mm | f/5.6 | 距主体约8米，机位高度1.2米，平视 |
| 2 | 侧方环境引导 | 全身 | 平视 | 24mm | f/4 | 距主体约5米，机位高度1.5米，平视 |
| 3 | 破碎窗框逆光剪影 | 中景 | 平视 | 85mm | f/2.8 | 距主体约6米，机位高度1.6米，平视 |
| 4 | 窗框细节特写 | 特写 | 平视 | 85mm | f/1.8 | 距主体约1.5米，机位高度1.6米，平视 |
| 5 | 墙面纹理低角度 | 中景 | 地面低角度 | 24mm | f/2.8 | 距主体约2米，机位高度0.8米，低角度仰拍 |
| 6 | 手部细节特写 | 大特写 | 高机位俯拍 | 85mm | f/1.8 | 距主体约1米，机位高度1米，俯拍手部 |
| 7 | 全身剪影逆光 | 全身 | 平视 | 85mm | f/4 | 距主体约6米，机位高度1.5米，平视 |
| 8 | 面部情绪特写 | 特写 | 平视 | 85mm | f/1.8 | 距主体约1米，机位高度1.6米，平视 |
| 9 | 环境人像高角度 | 中景 | 高机位俯拍 | 24mm | f/2.8 | 距主体约4米，机位高度2.5米，高角度俯拍 |
| 10 | 离场背影尾声 | 全景 | 平视 | 24mm | f/5.6 | 距主体约5米，机位高度1.5米，平视 |

### S07-01　废墟全景定场

- 文件名：`style-gothic-ruin__01.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 24mm / f/5.6 / 竖幅
- 机位：距主体约8米，机位高度1.2米，平视
- 动作：模特背对镜头站立，双臂自然下垂，头部微仰望向厂房高处
- 道具：无　｜　裁切：下沿保留地面碎石，上沿保留厂房顶部残缺轮廓，左右保留围栏边缘
- 必见：模特全身、废弃厂房外立面、围栏内安全区标识　｜　废片判据：画面出现建筑内部、人物过小无法辨认、围栏外区域

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/10] 2:3 vertical, Wide shot of an adult model standing with back to camera, facing a derelict factory exterior, inside a fenced safe zone, dark gothic style, overcast diffuse light, no flash, eye level, desolate atmosphere, 24mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-02　侧方环境引导

- 文件名：`style-gothic-ruin__02.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距主体约5米，机位高度1.5米，平视
- 动作：模特侧身站立，面朝画面左侧，右手轻触围栏（或自然下垂），目光低垂
- 道具：无　｜　裁切：保留模特全身及右侧厂房墙面，下沿至靴子，上沿保留部分天空
- 必见：模特侧身轮廓、围栏结构、厂房外墙纹理　｜　废片判据：模特面部完全漆黑、围栏外区域入镜、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/10] 2:3 vertical, Wide environmental portrait, adult model in profile facing left, standing near a fence with derelict factory wall on right, dark gothic style, overcast side light, subtle fill from white board, no flash, eye level, 24mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-03　破碎窗框逆光剪影

- 文件名：`style-gothic-ruin__03.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约6米，机位高度1.6米，平视
- 动作：模特站在破碎窗框前，侧身45度，头部微低，双臂自然下垂
- 道具：无　｜　裁切：上沿保留完整窗框，下沿至人物腰部，左右保留窗框边缘
- 必见：人物剪影轮廓、破碎窗框结构、逆光光感　｜　废片判据：人物正面细节过亮失去剪影感、窗框不完整、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/10] 2:3 vertical, Medium shot of an adult model standing in front of a broken window frame, backlit silhouette, side profile, dark gothic atmosphere, natural backlight, subtle fill, no flash, eye level, 85mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-04　窗框细节特写

- 文件名：`style-gothic-ruin__04.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，机位高度1.6米，平视
- 动作：模特面部贴近破碎窗框边缘，闭眼，表情肃穆
- 道具：无　｜　裁切：头部和肩部特写，保留部分窗框纹理
- 必见：面部表情、皮肤质感、窗框边缘细节　｜　废片判据：面部过曝或全黑、窗框纹理模糊、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/10] 2:3 vertical, Close-up of an adult model's face near a broken window frame, closed eyes, solemn expression, dark gothic style, backlit rim light, subtle fill, no flash, eye level, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-05　墙面纹理低角度

- 文件名：`style-gothic-ruin__05.png`
- 景别/角度/焦段/光圈：中景 / 地面低角度 / 24mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高度0.8米，低角度仰拍
- 动作：模特背靠废墙站立，距离墙面约1米，双臂交叉抱胸，目光望向前方
- 道具：无　｜　裁切：下沿至膝盖，上沿保留墙面高处破碎结构，左右保留墙体
- 必见：人物上半身、墙面粗糙纹理、低角度透视感　｜　废片判据：人物与墙面距离少于3米（安全距离要求）、墙面过曝、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/10] 2:3 vertical, Low angle shot of an adult model leaning against a derelict wall, arms crossed, looking forward, dark gothic style, side light emphasizing wall texture, no flash, ground level, 24mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-06　手部细节特写

- 文件名：`style-gothic-ruin__06.png`
- 景别/角度/焦段/光圈：大特写 / 高机位俯拍 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度1米，俯拍手部
- 动作：模特一只手轻触废墙表面，手指微微张开
- 道具：无　｜　裁切：手部及部分前臂特写，背景为墙面纹理
- 必见：手部姿势、皮肤纹理、墙面质感　｜　废片判据：手部模糊、手指残缺、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/10] 2:3 vertical, Extreme close-up of a hand touching a rough derelict wall, fingers slightly spread, dark gothic style, side light, subtle fill, no flash, high angle, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-07　全身剪影逆光

- 文件名：`style-gothic-ruin__07.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约6米，机位高度1.5米，平视
- 动作：模特站在厂房前空地，背对强光方向，双腿微开，双臂自然下垂
- 道具：无　｜　裁切：保留全身及部分厂房轮廓，下沿至靴子
- 必见：人物全身剪影、厂房背景、逆光氛围　｜　废片判据：人物细节过亮、背景过曝、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/10] 2:3 vertical, Full body silhouette of an adult model standing in front of a derelict factory, backlit, dark gothic style, natural backlight, no flash, eye level, 85mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-08　面部情绪特写

- 文件名：`style-gothic-ruin__08.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度1.6米，平视
- 动作：模特正面站立，头部微低，眼睛看向镜头，嘴唇紧闭
- 道具：无　｜　裁切：头部和肩部特写，裁切至下巴以下
- 必见：面部表情、皮肤质感、眼神　｜　废片判据：面部过曝或过暗、表情不肃穆、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/10] 2:3 vertical, Close-up face portrait of an adult model, solemn expression, looking at camera, dark gothic style, side light, subtle fill, no flash, eye level, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-09　环境人像高角度

- 文件名：`style-gothic-ruin__09.png`
- 景别/角度/焦段/光圈：中景 / 高机位俯拍 / 24mm / f/2.8 / 竖幅
- 机位：距主体约4米，机位高度2.5米，高角度俯拍
- 动作：模特蹲在安全区地面，低头，双手抱膝
- 道具：无　｜　裁切：保留模特全身及周围地面，上沿至围栏顶部
- 必见：模特蹲姿、地面纹理、围栏结构　｜　废片判据：模特不完整、地面杂乱无章、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/10] 2:3 vertical, High angle shot of an adult model crouching on the ground in a fenced safe zone, holding knees, dark gothic style, overcast light, no flash, high angle, 24mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S07-10　离场背影尾声

- 文件名：`style-gothic-ruin__10.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 24mm / f/5.6 / 竖幅
- 机位：距主体约5米，机位高度1.5米，平视
- 动作：模特背对镜头向围栏出口方向行走，步伐缓慢，头部微低
- 道具：无　｜　裁切：保留模特全身、围栏出口、部分厂房背景
- 必见：模特背影、围栏出口、环境氛围　｜　废片判据：模特走出围栏外、背景过曝、使用闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], desaturated cool grey, crushed blacks, one warm accent light, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 10/10] 2:3 vertical, Wide shot of an adult model walking away towards a fence exit, back view, dark gothic style, natural backlight, no flash, eye level, 24mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-gothic-ruin__REF-A.png. Change only camera position, framing and pose to match FRAME 10. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-gothic-ruin__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

