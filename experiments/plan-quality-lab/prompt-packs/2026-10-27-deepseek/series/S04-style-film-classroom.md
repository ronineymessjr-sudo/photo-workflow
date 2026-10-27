# S04 · 日系胶片教室午后

用例 `style-film-classroom`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hair tied back in a low bun | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 学生打扮：白色短袖衬衫与深色长裤，发型整齐低马尾；无浓妆，保持自然肤感 | 换衣即断系列 |
| 场地 | 旧教室（课桌椅现场已有） | 同一处，背景元素不跑 |
| 光线 | 关闭室内灯，仅靠窗帘透入的午后侧逆光；让窗光从画面右侧照亮课桌与人物轮廓，不补人工光 | 主光方向不变 |
| 调色 | low-contrast pastel with faint green shadows and fine 400-speed grain | 一套 LUT 到底 |

## 二、三道锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame
```

```text
[REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement
```

> 这三段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。
> `[REALISM LOCK]` 是专门治"AI 味"的：不写它，模型默认给你磨皮+均匀受光+HDR 的广告片质感。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Japanese film photography, old classroom, adult student seated at window-side desk, body turned 30 degrees toward aisle, elbow on desk, fingers lightly touching cheek, eyes lowered, soft side light through sheer curtain from right window, white shirt and dark trousers, low ponytail, eye-level , natural grain, gentle shadows, no flash, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Japanese film photography, old classroom, adult student seated at window-side desk, body turned 30 degrees toward aisle, elbow on desk, fingers lightly touching cheek, eyes lowered, soft side light through sheer curtain from right window, white shirt and dark trousers, low ponytail, eye-level , natural grain, gentle shadows, no flash, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, Japanese film photography, old classroom, adult student seated at window-side desk, body turned 30 degrees toward aisle, elbow on desk, fingers lightly touching cheek, eyes lowered, soft side light through sheer curtain from right window, white shirt and dark trousers, low ponytail, eye-level , natural grain, gentle shadows, no flash, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `style-film-classroom__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 教室全景定场 | 全景 | 平视 | 35mm | f/5.6 | 距主体约5米，站在教室后方门口内侧，机位约1.4米高平视 |
| 2 | 靠窗座位侧光中景 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2米，站在过道侧，机位约1.3米高与坐姿视线平齐 |
| 3 | 窗边逆光半身 | 中全 | 平视 | 35mm | f/3.5 | 距主体约3米，位于教室过道中段，机位约1.4米高平视 |
| 4 | 课桌前伏案写读 | 近景 | 高机位俯拍 | 35mm | f/2 | 距主体约1.5米，站在课桌斜前方过道，机位约1.2米高略俯视桌面 |
| 5 | 侧光低机位过道视角 | 中全 | 地面低角度 | 35mm | f/3.5 | 距主体约2米，蹲在过道地面，机位约0.8米高 |
| 6 | 逆光背影环境交代 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，站在教室后排过道中央，机位约1.5米高平视 |
| 7 | 手部与课桌细节特写 | 特写 | 高机位俯拍 | 35mm | f/1.8 | 距主体约0.5米，站在课桌旁，机位约1米高俯向桌面 |
| 8 | 课桌间蹲姿平视近景 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1米，蹲在过道同一高度，机位约0.9米高 |
| 9 | 离场前窗边侧逆光回望 | 近景 | 平视 | 35mm | f/2 | 距主体约2.5米，站在教室前门内侧，机位约1.4米高平视 |

### S04-01　教室全景定场

- 文件名：`style-film-classroom__01.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 35mm / f/5.6 / 竖幅
- 机位：距主体约5米，站在教室后方门口内侧，机位约1.4米高平视
- 动作：坐在靠窗第三排课桌前，双手放在桌面，背微直，视线落向窗外
- 道具：课桌椅现场已有，无其他道具　｜　裁切：保留整间教室纵深与窗框，课桌到天花板留余地，不裁人物脚部
- 必见：旧教室课桌椅排列、靠窗座位、窗帘透光的方向感　｜　废片判据：出现闪光灯痕迹、室内顶灯亮起、画面过曝失去窗框细节、人物被课桌遮挡过多

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/9] 2:3 vertical, Japanese film photography, old classroom afternoon, one adult student sitting at a desk by the window in the right third of frame, white short-sleeve shirt and dark trousers, low ponytail, soft curtain-diffused side-backlight from the right window, no indoor lights, no flash, wooden desks and chairs, quiet youthful mood, natural grain, muted colors, eye-level wide establishing shot, 35mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: 课桌椅现场已有，无其他道具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S04-02　靠窗座位侧光中景

- 文件名：`style-film-classroom__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，站在过道侧，机位约1.3米高与坐姿视线平齐
- 动作：坐在靠窗第二排课桌，身体朝过道侧转约30度，右手肘撑桌，指尖轻碰脸颊，眼神低垂
- 道具：课桌椅现场已有，无其他道具　｜　裁切：从头顶到腰际，保留右侧窗框一线与桌面
- 必见：侧光在脸颊和衬衫上的柔和过渡、青涩低垂眼神　｜　废片判据：侧光变成硬直射、脸部完全平光、出现人工补光痕迹、桌面杂物未清理

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/9] 2:3 vertical, Japanese film photography, old classroom, adult student seated at window-side desk, body turned 30 degrees toward aisle, elbow on desk, fingers lightly touching cheek, eyes lowered, soft side light through sheer curtain from right window, white shirt and dark trousers, low ponytail, eye-level medium shot, natural grain, gentle shadows, no flash, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: 课桌椅现场已有，无其他道具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S04-03　窗边逆光半身

- 文件名：`style-film-classroom__03.png`
- 景别/角度/焦段/光圈：中全 / 平视 / 35mm / f/3.5 / 竖幅
- 机位：距主体约3米，位于教室过道中段，机位约1.4米高平视
- 动作：面朝窗户站立在课桌旁，双手自然垂在身侧，头略低，侧脸轮廓朝向窗光
- 道具：课桌椅现场已有，无其他道具　｜　裁切：从头顶到大腿中部，保留窗框上沿与课桌角
- 必见：逆光在发丝与肩线的轮廓光、旧教室窗框层次　｜　废片判据：面部完全死黑无细节、窗光过曝成纯白、人物姿态僵硬如摆拍、出现闪光灯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/9] 2:3 vertical, Japanese film photography, old classroom afternoon, adult student standing by window facing the light, backlit by soft curtain-diffused sunlight, white shirt and dark trousers, low ponytail, hands at sides, head slightly lowered, gentle rim light on hair and shoulders, eye-level medium full shot, natural grain, no flash, 35mm lens at f/3.5, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: 课桌椅现场已有，无其他道具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S04-04　课桌前伏案写读

- 文件名：`style-film-classroom__04.png`
- 景别/角度/焦段/光圈：近景 / 高机位俯拍 / 35mm / f/2 / 竖幅
- 机位：距主体约1.5米，站在课桌斜前方过道，机位约1.2米高略俯视桌面
- 动作：坐在靠过道课桌，身体前倾，前臂搭在桌面，双手虚握成写字状，头微低看向桌面
- 道具：课桌椅现场已有，桌面自然光影，无其他道具　｜　裁切：从头顶到桌面下缘，保留人物手部与课桌边缘
- 必见：前倾的专注姿态、手部虚握与桌面光影　｜　废片判据：手部姿势僵硬像空抓、桌面出现非现场物品、窗口光在脸上形成硬斑

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/9] 2:3 vertical, Japanese film photography, old classroom, adult student leaning forward at desk, forearms on tabletop, hands softly posed as if writing, head slightly down, soft window light from back right through curtain, white shirt and dark trousers, low ponytail, slightly high angle close medium shot, natural grain, no flash, 35mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: 课桌椅现场已有，桌面自然光影，无其他道具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S04-05　侧光低机位过道视角

- 文件名：`style-film-classroom__05.png`
- 景别/角度/焦段/光圈：中全 / 地面低角度 / 35mm / f/3.5 / 竖幅
- 机位：距主体约2米，蹲在过道地面，机位约0.8米高
- 动作：坐在靠窗第一排课桌，双腿并拢侧放，双手叠在膝上，肩放松，视线看向过道前方
- 道具：课桌椅现场已有，无其他道具　｜　裁切：从头部到膝盖，保留过道地面与课桌腿
- 必见：低机位过道纵深、侧光下的坐姿与课桌结构　｜　废片判据：地面杂物入镜、裙裤走光风险、侧光变成顶光、人物被课桌腿切断

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/9] 2:3 vertical, Japanese film photography, old classroom, adult student seated at first window-side desk, legs together and angled, hands folded on lap, relaxed shoulders, looking toward aisle, soft side light from right curtain, white shirt and dark trousers, low ponytail, ground-level low angle medium full shot, wooden desk legs in foreground, natural grain, no flash, 35mm lens at f/3.5, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: 课桌椅现场已有，无其他道具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S04-06　逆光背影环境交代

- 文件名：`style-film-classroom__06.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，站在教室后排过道中央，机位约1.5米高平视
- 动作：站在窗边课桌之间，背对镜头，双手轻搭在椅背上，头微仰看向窗帘透光的方向
- 道具：课桌椅现场已有，无其他道具　｜　裁切：保留人物全身与前方窗框，上方留天花板线条
- 必见：逆光中的背影轮廓、课桌椅纵深与窗边空气感　｜　废片判据：背景完全过曝成白块、人物比例过小失去主体、出现人工光源

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/9] 2:3 vertical, Japanese film photography, old classroom afternoon, adult student standing between window-side desks with back to camera, hands resting on chair back, head slightly tilted up toward curtain light, soft backlight, white shirt and dark trousers, low ponytail, eye-level full shot from back of room, natural grain, no flash, 35mm lens at f/4, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: 课桌椅现场已有，无其他道具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S04-07　手部与课桌细节特写

- 文件名：`style-film-classroom__07.png`
- 景别/角度/焦段/光圈：特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，站在课桌旁，机位约1米高俯向桌面
- 动作：坐在靠窗座位，一只手平放在桌面，指尖微微蜷曲，另一只手轻搭在桌沿
- 道具：课桌椅现场已有，桌面木纹与自然光影　｜　裁切：仅保留桌面、双手与少量袖口，不露完整面部
- 必见：手部细节、课桌木纹与侧光形成的柔和明暗　｜　废片判据：手指姿态扭曲、桌面出现非现场物品、光线过硬产生锐利阴影

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/9] 2:3 vertical, Japanese film photography, old classroom, close-up of adult student hands on wooden desk, one hand flat with softly curled fingertips, other hand resting on desk edge, white shirt cuff visible, soft curtain light from upper right, natural wood grain, high angle detail close-up, natural grain, no flash, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 课桌椅现场已有，桌面木纹与自然光影.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S04-08　课桌间蹲姿平视近景

- 文件名：`style-film-classroom__08.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1米，蹲在过道同一高度，机位约0.9米高
- 动作：蹲在两排课桌之间，背靠课桌侧板，双膝并拢，双手抱住小腿，下巴轻靠膝头，视线平视前方
- 道具：课桌椅现场已有，无其他道具　｜　裁切：从头顶到膝盖，保留两侧课桌边框
- 必见：蹲姿的青涩收缩感、课桌间的空间关系与侧脸光影　｜　废片判据：蹲姿走光、画面被课桌完全遮挡、侧光不足导致面部死黑

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/9] 2:3 vertical, Japanese film photography, old classroom, adult student crouching between two rows of desks, knees together, arms around lower legs, chin resting on knees, looking straight ahead, soft side light through curtain from right, white shirt and dark trousers, low ponytail, eye-level close shot between desks, natural grain, no flash, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: 课桌椅现场已有，无其他道具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S04-09　离场前窗边侧逆光回望

- 文件名：`style-film-classroom__09.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约2.5米，站在教室前门内侧，机位约1.4米高平视
- 动作：站在靠窗座位旁，身体侧对窗户，一只手轻扶椅背，转头回望镜头方向，表情平静微青涩
- 道具：课桌椅现场已有，无其他道具　｜　裁切：从头顶到腰际偏下，保留窗框与椅背
- 必见：回望眼神、侧逆光轮廓与青涩克制的情绪　｜　废片判据：眼神空洞无焦点、侧逆光过曝失去面部层次、人物姿势过度摆拍

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hair tied back in a low bun, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], low-contrast pastel with faint green shadows and fine 400-speed grain, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/9] 2:3 vertical, Japanese film photography, old classroom afternoon, adult student standing by window-side desk, body angled to window, one hand on chair back, turning head to look back toward camera, calm youthful expression, soft side-backlight through curtain from right rear, white shirt and dark trousers, low ponytail, eye-level medium close shot, natural grain, no flash, 35mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to style-film-classroom__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: 课桌椅现场已有，无其他道具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `style-film-classroom__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

