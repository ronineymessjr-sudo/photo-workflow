# S26 · 滑板少年的黄昏

用例 `ppl-skater-dusk`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 青年滑板者穿着；现场确认是否佩戴头盔与护具，发型自然随风 | 换衣即断系列 |
| 场地 | 滑板场（已获场地许可） | 同一处，背景元素不跑 |
| 光线 | 利用黄昏低角度现场自然光，拍摄机位背对落日方向，不补光、不使用闪光灯 | 主光方向不变 |
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
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, young adult skateboarder rolling into an outdoor skatepark at golden hour, low sunset backlighteye-level , loose natural stance on board, skatepark ramps and concrete in background, no flash, cinematic street photography, safe distance  composition, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, young adult skateboarder rolling into an outdoor skatepark at golden hour, low sunset backlighteye-level , loose natural stance on board, skatepark ramps and concrete in background, no flash, cinematic street photography, safe distance  composition, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, young adult skateboarder rolling into an outdoor skatepark at golden hour, low sunset backlighteye-level , loose natural stance on board, skatepark ramps and concrete in background, no flash, cinematic street photography, safe distance  composition, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `ppl-skater-dusk__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 黄昏入场全景 | 全身 | 平视 | 35mm | f/4 | 距主体约10米，站在滑行路线外侧安全区，机位高度约1.5米平视 |
| 2 | 24mm贴地跟滑 | 中景 | 低机位仰拍 | 24mm | f/2.8 | 距主体约1.2米，蹲在滑行路线外侧安全区，机位高约0.6米，镜头朝向滑手侧前方 |
| 3 | 24mm侧向低机位贴滑 | 中景 | 低机位仰拍 | 24mm | f/2.8 | 距主体约1.5米，站在滑行路线外侧，机位高约0.8米，身体侧对滑行方向 |
| 4 | 135mm远摄滑行侧影 | 近景 | 平视 | 135mm | f/2 | 距主体约9米，站在场地边缘安全区，机位高约1.5米平视 |
| 5 | 135mm远摄腾空剪影 | 全身 | 平视 | 135mm | f/4 | 距主体约10米，站在场地外侧安全区，机位高约2米，平视略仰 |
| 6 | 低机位跳跃凝固 | 全身 | 低机位仰拍 | 70mm | f/4 | 距主体约5米，位于落地外侧安全区，机位高约1米，仰拍朝向起跳点 |
| 7 | 侧向跳跃全动作凝固 | 全身 | 平视 | 50mm | f/4 | 距主体约6米，位于滑行路线外侧垂直侧机位，机位高约1.2米平视 |
| 8 | 逆光剪影站立 | 全身 | 平视 | 85mm | f/4 | 距主体约7米，站在落日前方安全区，机位高约1.2米平视，镜头对准太阳方向 |
| 9 | 黄昏细节手板近景 | 特写 | 平视 | 50mm | f/1.8 | 距主体约0.8米，蹲姿与滑手手部等高，机位略侧向 |

### S26-01　黄昏入场全景

- 文件名：`ppl-skater-dusk__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约10米，站在滑行路线外侧安全区，机位高度约1.5米平视
- 动作：滑手从滑板场入口方向自然滑入画面，重心略低，不踩板尾起跳，目视前方滑行路径
- 道具：无　｜　裁切：头顶留少量空间，保留滑板与地面接触点，底部不切轮子
- 必见：滑板场环境轮廓、滑手完整姿态、地面和板面接触关系　｜　废片判据：滑手被背景栏杆完全遮挡、地面反光过曝、画面无场地交代

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, young adult skateboarder rolling into an outdoor skatepark at golden hour, low sunset backlighteye-level wide shot, loose natural stance on board, skatepark ramps and concrete in background, no flash, cinematic street photography, safe distance full body composition, 35mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-02　24mm贴地跟滑

- 文件名：`ppl-skater-dusk__02.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 24mm / f/2.8 / 竖幅
- 机位：距主体约1.2米，蹲在滑行路线外侧安全区，机位高约0.6米，镜头朝向滑手侧前方
- 动作：滑手沿缓坡匀速滑行，膝盖微屈，前脚掌踩稳板面，双臂自然摆动保持平衡
- 道具：无　｜　裁切：从滑手腰部以上到板轮完整入画，头顶保留少量空间，左右不裁断伸展手臂
- 必见：滑板轮与地面接触、滑手低重心姿态、速度感带来的地面线条　｜　废片判据：轮子被裁掉、人物居中呆立无动态、画面因震动全糊且无法辨认姿态

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, dynamic low angletracking shot of a young skateboarder carving on a skatepark slope at dusk, camera 1.2 meters away on the safe side, knees bent, wheels on concrete, warm side backlight, no flash, motion feel, street style, 24mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-03　24mm侧向低机位贴滑

- 文件名：`ppl-skater-dusk__03.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 24mm / f/2.8 / 竖幅
- 机位：距主体约1.5米，站在滑行路线外侧，机位高约0.8米，身体侧对滑行方向
- 动作：滑手从画面左后方向右前方斜穿，做压弯滑行动作，肩部随转向转动，视线看向前进方向
- 道具：无　｜　裁切：完整保留滑板与双脚，手部可裁切但不切掉主手臂，顶部保留头部空间
- 必见：压弯时的身体倾斜、板面倾斜角度、地面纹理　｜　废片判据：主体居中无运动方向空间、滑手出画一半、逆光下人物完全黑死无细节

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, low side tracking shot of a young skateboarder leaning into a carve at an outdoor skatepark, golden hour rim light, camera on safe outside line 1.5 meters away, forward space in frame, no flash, street action photography, 24mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-04　135mm远摄滑行侧影

- 文件名：`ppl-skater-dusk__04.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 135mm / f/2 / 竖幅
- 机位：距主体约9米，站在场地边缘安全区，机位高约1.5米平视
- 动作：滑手沿场地远端直线滑行，身体直立略前倾，双臂放松，视线在前方
- 道具：无　｜　裁切：膝盖以上至头顶完整，保留滑板前轮，右侧留少量前进空间
- 必见：滑手侧影轮廓、滑板前轮、场地坡道压缩背景　｜　废片判据：背景行人或杂物与头部重叠、主体过小无细节、长焦抖动导致轮廓发虚

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, telephoto side profile of a young skateboarder rolling across a skatepark at sunset, camera 9 meters away on the safe perimeter, compressed ramp background, warm rim light, no flash, cinematic street photography, 135mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-05　135mm远摄腾空剪影

- 文件名：`ppl-skater-dusk__05.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 135mm / f/4 / 竖幅
- 机位：距主体约10米，站在场地外侧安全区，机位高约2米，平视略仰
- 动作：滑手在跳台上起跳，双膝收向胸口，双手自然展开保持平衡，板面贴近脚底
- 道具：无　｜　裁切：头顶与板底均保留空间，不裁手不裁脚，人物占画面高度约三分之二
- 必见：腾空瞬间、滑手与滑板完整轮廓、落日天空背景　｜　废片判据：剪影糊成黑块无肢体轮廓、板与脚分离不清、背景出现杂乱建筑破坏轮廓

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, telephoto silhouette of a young skateboarder mid-air above a skatepark ramp at sunset, knees tucked, board under feet, camera 10 meters away on safe perimeter, strong backlight, no flash, clean golden sky background, 135mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-06　低机位跳跃凝固

- 文件名：`ppl-skater-dusk__06.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 70mm / f/4 / 竖幅
- 机位：距主体约5米，位于落地外侧安全区，机位高约1米，仰拍朝向起跳点
- 动作：滑手从坡道边缘起跳，双腿收膝，前手向前伸指向落地方向，身体在空中保持紧凑
- 道具：无　｜　裁切：人物全身完整入画，板底不裁，起跳坡道边缘保留局部，头顶留少量空间
- 必见：腾空高度、收膝姿态、滑板与脚的位置关系　｜　废片判据：动作拖影、人物被裁切、板完全被脚遮挡无法辨认

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, low angle action freeze of a young skateboarder jumping off a skatepark ramp at dusk, knees tucked, one arm forward, board under feet, camera 5 meters away on safe ground, fast shutter, side warm light, no flash, 70mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-07　侧向跳跃全动作凝固

- 文件名：`ppl-skater-dusk__07.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约6米，位于滑行路线外侧垂直侧机位，机位高约1.2米平视
- 动作：滑手从画面左侧向右做跳过小坡动作，起跳后双腿并拢收膝，落地前身体前倾，滑板保持水平
- 道具：无　｜　裁切：完整保留起跳点到落地点，人物与板全身入画，上下留出腾空空间
- 必见：完整跳跃轨迹、滑板水平、身体前倾落地准备　｜　废片判据：动作被裁成两半、板倾斜异常、背景杂物与人物轮廓重叠

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, side view action freeze of a young skateboarder jumping over a small skatepark ramp at sunset, full body in frame, board level, takeoff ramp left and landing zone right, fast shutter, natural side light, no flash, street photography, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-08　逆光剪影站立

- 文件名：`ppl-skater-dusk__08.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约7米，站在落日前方安全区，机位高约1.2米平视，镜头对准太阳方向
- 动作：滑手单脚踩板停在场地上，另一只脚点地，身体放松面朝落日方向，板身斜靠脚边
- 道具：无　｜　裁切：人物全身与滑板完整入画，保留大面积金色天空，底部裁掉过多杂乱地面
- 必见：人板剪影轮廓、落日位置与暖色天空层次　｜　废片判据：剪影中有人造光斑、人物轮廓与背景杂物粘连、落日完全过曝没有细节

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, backlit silhouette of a young skateboarder standing relaxed beside a skateboard at a skatepark, facing the low sunset, camera 7 meters away, golden sky filling background, no flash, pure contour silhouette, cinematic dusk, 85mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-09　黄昏细节手板近景

- 文件名：`ppl-skater-dusk__09.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.8米，蹲姿与滑手手部等高，机位略侧向
- 动作：滑手坐或蹲在场边安全区，双手自然搭在膝上，滑板斜靠在腿边，头部低垂放松
- 道具：无　｜　裁切：裁取腰部以上与滑板局部，包含双手和板面边缘，不切手部关节
- 必见：手部细节、滑板板面局部、黄昏暖光质感　｜　废片判据：手部过曝无纹理、板面被完全裁出画面、背景强光喧宾夺主

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, close-up detail of a young skateboarder's hands resting near a skateboard at golden hour, seated at the safe edge of a skatepark, warm side backlight on skin and deck, no flash, shallow depth, cinematic detail shot, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-skater-dusk__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, stay out of the restricted area, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `ppl-skater-dusk__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

