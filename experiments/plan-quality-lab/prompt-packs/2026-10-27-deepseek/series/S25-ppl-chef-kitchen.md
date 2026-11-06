# S25 · 厨师后厨的火焰

用例 `ppl-chef-kitchen`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | long hair worn loose | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 白色厨师服、深色围裙，袖口自然；厨师帽与 | 换衣即断系列 |
| 场地 | 餐厅后厨（已获许可，非高峰时段） | 同一处，背景元素不跑 |
| 光线 | 仅利用后厨顶部现有日光灯，不补光；检查地面湿滑区域，机位后方铺防滑垫或确认干燥 | 主光方向不变 |
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
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, candid documentary shot, adult chef leaning over stainless steel prep counter sorting ingredients in a crate, rolled sleeves, dark apron, existing ceiling light reflections on metal, no flash, slight low angle, warm gritty kitchen mood, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, candid documentary shot, adult chef leaning over stainless steel prep counter sorting ingredients in a crate, rolled sleeves, dark apron, existing ceiling light reflections on metal, no flash, slight low angle, warm gritty kitchen mood, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, candid documentary shot, adult chef leaning over stainless steel prep counter sorting ingredients in a crate, rolled sleeves, dark apron, existing ceiling light reflections on metal, no flash, slight low angle, warm gritty kitchen mood, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `ppl-chef-kitchen__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 后厨入口环境交代 | 全景 | 平视 | 35mm | f/5.6 | 距主体约4米，后厨入口门框内侧，机位高度约1.6米平视 |
| 2 | 厨师备料侧影 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2米，操作台侧前方45度，机位高度约1.4米略低平视 |
| 3 | 手部切配特写 | 大特写 | 高机位俯拍 | 35mm | f/1.8 | 距手部约40厘米，俯身于操作台侧，机位高度约1.2米略俯 |
| 4 | 灶前点火准备 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2.5米，灶台左后方，机位高度约1.5米平视 |
| 5 | 颠锅火光第一镜 | 中景 | 平视 | 35mm | f/2.8 | 距灶台约1.8米，灶台正前方偏右30度，机位高度约1.5米平视，确保不干扰操作 |
| 6 | 颠锅火光第二镜低机位 | 近景 | 低机位仰拍 | 35mm | f/2 | 距灶台约2米，灶台左前方低位，机位高度约1.1米，仰拍但不贴近地面 |
| 7 | 火焰熄灭后的喘息 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2.2米，灶台右前方，机位高度约1.5米平视 |
| 8 | 排烟罩下仰视 | 近景 | 低机位仰拍 | 35mm | f/2 | 距主体约1.5米，灶台正前方下蹲，机位高度约1米，相机上仰 |
| 9 | 厨师拭汗细节 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1.2米，灶台侧前方，机位高度约1.5米平视 |
| 10 | 灶台余温收尾空镜 | 特写 | 平视 | 35mm | f/1.8 | 距灶台约1.5米，灶台正前方，机位高度约1.4米平视 |

### S25-01　后厨入口环境交代

- 文件名：`ppl-chef-kitchen__01.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 35mm / f/5.6 / 竖幅
- 机位：距主体约4米，后厨入口门框内侧，机位高度约1.6米平视
- 动作：厨师背对镜头站于灶台前，双手自然垂放，先不动作，让观众看清空间关系
- 道具：现有灶台、排烟罩、不锈钢操作台（现场自然存在）　｜　裁切：保留门框上沿与地面，不裁掉排烟罩和湿滑地面提示
- 必见：后厨空间纵深、灶台与通道关系、地面水渍反光　｜　废片判据：闪光痕迹、画面过曝发白、排烟罩被裁掉、地面湿滑不可见

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 1/10] 2:3 vertical, documentary photo, adult chef in white uniform and dark apron standing back to camera in a restaurant kitchen, stainless steel counters, range hood, wet floor reflections, existing fluorescent ceiling lights, no flash, eye level, realistic, gritty atmosphere, 35mm lens at f/5.6, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: 现有灶台、排烟罩、不锈钢操作台（现场自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-02　厨师备料侧影

- 文件名：`ppl-chef-kitchen__02.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，操作台侧前方45度，机位高度约1.4米略低平视
- 动作：厨师低头整理操作台上的食材筐，双手伸入筐内翻拣，肩膀微沉
- 道具：现场食材筐、不锈钢操作台（自然存在）　｜　裁切：从头顶留一拳空间到腰腹，保留手部与筐沿
- 必见：双手翻拣食材的动作、厨师服褶皱、操作台金属反光　｜　废片判据：手部出画、筐内物品喧宾夺主、顶灯直射镜头产生眩光

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 2/10] 2:3 vertical, candid documentary shot, adult chef leaning over stainless steel prep counter sorting ingredients in a crate, rolled sleeves, dark apron, existing ceiling light reflections on metal, no flash, slight low angle, warm gritty kitchen mood, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: 现场食材筐、不锈钢操作台（自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-03　手部切配特写

- 文件名：`ppl-chef-kitchen__03.png`
- 景别/角度/焦段/光圈：大特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距手部约40厘米，俯身于操作台侧，机位高度约1.2米略俯
- 动作：左手按稳食材成爪形，右手持厨刀下切，刀锋接触砧板瞬间
- 道具：现场厨刀、砧板、待切食材（自然存在）　｜　裁切：裁到小臂中段，刀尖与砧板边缘完整入画
- 必见：刀锋切入食材的瞬间、指关节弯曲护指、砧板木纹　｜　废片判据：手指入镜遮挡刀锋、顶灯在刀面形成死白反光、画面抖动

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 3/10] 2:3 vertical, extreme close up documentary, adult chef hands chopping ingredients on wooden cutting board, claw grip protecting fingers, kitchen knife mid-cut, overhead ceiling light contrast, no flash, shallow but readable detail, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: 现场厨刀、砧板、待切食材（自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-04　灶前点火准备

- 文件名：`ppl-chef-kitchen__04.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，灶台左后方，机位高度约1.5米平视
- 动作：厨师侧身站立，右手旋动灶台旋钮，左手扶锅柄，目光落在炉头
- 道具：现场炒锅、灶台旋钮（自然存在）　｜　裁切：保留旋钮手部与炉头，不裁掉锅柄
- 必见：手指旋钮动作、炉头蓝色小火苗、锅柄握持　｜　废片判据：火焰完全被手遮挡、顶灯冷光压掉火色、背景排烟罩过曝

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 4/10] 2:3 vertical, documentary kitchen scene, adult chef side view turning stove knob, hand on wok handle, small blue flame igniting, existing ceiling light mixed with warm fire glow, no flash, eye level, authentic texture, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: 现场炒锅、灶台旋钮（自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-05　颠锅火光第一镜

- 文件名：`ppl-chef-kitchen__05.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距灶台约1.8米，灶台正前方偏右30度，机位高度约1.5米平视，确保不干扰操作
- 动作：厨师双手握锅柄向前送再回拉，锅中食材腾空，火焰随油雾窜起
- 道具：现场炒锅、灶台（自然存在）　｜　裁切：从厨师头顶到锅底，火焰顶端留出空间不裁
- 必见：锅中食材腾空、火焰窜起形状、厨师发力手臂线条　｜　废片判据：火焰糊成一片无层次、机位进入灶台1.5米内、画面出现闪光灯痕迹

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 5/10] 2:3 vertical, dynamic documentary, adult chef tossing wok, ingredients airborne, burst of flame from oil mist, stainless kitchen background, existing ceiling light, no flash, eye level, frozen motion, fiery gritty atmosphere, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: 现场炒锅、灶台（自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-06　颠锅火光第二镜低机位

- 文件名：`ppl-chef-kitchen__06.png`
- 景别/角度/焦段/光圈：近景 / 低机位仰拍 / 35mm / f/2 / 竖幅
- 机位：距灶台约2米，灶台左前方低位，机位高度约1.1米，仰拍但不贴近地面
- 动作：厨师同前重复颠锅动作，身体前倾，锅沿上扬
- 道具：现场炒锅、灶台（自然存在）　｜　裁切：裁到厨师膝盖以上，保留火焰上升空间与排烟罩下沿
- 必见：火焰从锅沿腾起的层次、厨师前倾发力、背景排烟罩轮廓　｜　废片判据：机位距灶台不足1.5米、火焰过曝无细节、地面湿滑未处理

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 6/10] 2:3 vertical, low angle documentary, adult chef leaning forward tossing wok, flame rising from pan edge, range hood silhouette, fire as key light, no flash, energetic fiery kitchen scene, realistic, 35mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: 现场炒锅、灶台（自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-07　火焰熄灭后的喘息

- 文件名：`ppl-chef-kitchen__07.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2.2米，灶台右前方，机位高度约1.5米平视
- 动作：厨师放锅回灶，双手撑住灶台边缘，微微低头呼气，肩背起伏
- 道具：现场灶台、炒锅（自然存在）　｜　裁切：从头顶到撑台的手部，保留锅沿入画
- 必见：双手撑台的支撑感、肩背起伏轮廓、额角汗水反光　｜　废片判据：表情表演痕迹过重、汗珠被补光打得发假、锅具位置与上一镜不连续

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 7/10] 2:3 vertical, intimate documentary portrait, adult chef resting hands on stove edge after cooking, slight sweat on temple, breathing, wok on stove, existing ceiling light, stainless steel reflections, no flash, eye level, smoky warmth, 35mm lens at f/2.8, subject and environment both clearly readable, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 现场灶台、炒锅（自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-08　排烟罩下仰视

- 文件名：`ppl-chef-kitchen__08.png`
- 景别/角度/焦段/光圈：近景 / 低机位仰拍 / 35mm / f/2 / 竖幅
- 机位：距主体约1.5米，灶台正前方下蹲，机位高度约1米，相机上仰
- 动作：厨师站在灶台前抬头看向排烟罩，单手扶锅柄，身体放松
- 道具：现场排烟罩、灶台、炒锅（自然存在）　｜　裁切：保留排烟罩金属滤网与厨师面部，裁到腰腹
- 必见：排烟罩金属结构、油烟在光中的层次、厨师仰视面部　｜　废片判据：仰拍导致人物变形过度、油烟被闪光打白、排烟罩裁切不完整

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 8/10] 2:3 vertical, low angle documentary, adult chef looking up at range hood in kitchen, smoke haze catching existing light, stainless steel hood, no flash, realistic gritty atmosphere, vertical depth, 35mm lens at f/2, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: 现场排烟罩、灶台、炒锅（自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-09　厨师拭汗细节

- 文件名：`ppl-chef-kitchen__09.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1.2米，灶台侧前方，机位高度约1.5米平视
- 动作：厨师抬起前臂横向擦过额头，随即放下手臂继续看向灶台
- 道具：无　｜　裁切：从头顶到胸口，前臂完整入画，不裁手腕
- 必见：前臂擦汗的接触瞬间、额头皮肤反光、眼神方向　｜　废片判据：手臂遮挡整张脸、汗光被处理成油光假面、动作僵硬摆拍

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 9/10] 2:3 vertical, candid close shot, adult chef wiping forehead with forearm, sweat sheen on skin, stainless kitchen blurred background, existing overhead light, no flash, eye level, honest documentary texture, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

### S25-10　灶台余温收尾空镜

- 文件名：`ppl-chef-kitchen__10.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距灶台约1.5米，灶台正前方，机位高度约1.4米平视
- 动作：厨师已退出画面，灶台上炒锅余温冒起细烟，锅柄朝右
- 道具：现场炒锅、灶台、排烟罩下沿（自然存在）　｜　裁切：保留锅体完整与灶台边缘，上方留排烟罩暗部
- 必见：锅面细烟、灶台余温质感、金属反光　｜　废片判据：画面出现人物残影、烟雾被闪光打散、锅具位置与前述镜头不连贯

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, long hair worn loose, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [REALISM LOCK], shot on a full-frame camera, RAW capture, ISO 400, subtle digital grain, skin shows visible pores, fine peach fuzz, mild redness on nose and knuckles, no retouching, no beauty filter, available light with true falloff, the unlit side drops into shadow, mixed colour temperature between window light and practicals, real venue with wear: scuffed stone, faint water stains, dust in the air, a few scattered real objects, natural optical bokeh with cat-eye vignetting, slight chromatic aberration, gentle lens vignette, documentary realism, not an advertisement, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, consistent white balance across every frame, [FRAME 10/10] 2:3 vertical, still life documentary, wok on kitchen stove with faint residual steam, stainless steel counter, range hood shadow above, existing ceiling light, no flash, eye level, quiet fiery aftermath mood, 35mm lens at f/1.8, shallow depth of field with creamy bokeh, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-chef-kitchen__REF-A.png. Change only camera position, framing and pose to match FRAME 10. Props allowed: 现场炒锅、灶台、排烟罩下沿（自然存在）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, plastic skin, airbrushed skin, HDR look, 3d render, CGI, digital painting, glowing skin, perfect symmetry, doll face, smooth gradient background, over-sharpened, beauty filter, bloom, clean studio backdrop, extra fingers, deformed hands, distorted face, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `ppl-chef-kitchen__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

