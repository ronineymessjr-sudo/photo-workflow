# S26 · 滑板少年的黄昏

用例 `ppl-skater-dusk`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名青年滑板者（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：青年滑板者穿着；现场确认是否佩戴头盔与护具，发型自然随风
- **场地**：滑板场（已获场地许可）
- **光线**：利用黄昏低角度现场自然光，拍摄机位背对落日方向，不补光、不使用闪光灯
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 24mm → 24mm → 135mm → 135mm → 70mm → 50mm → 85mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash；do not enter restricted area
- **原始要求**：24mm贴近跟拍2镜（距滑手1米外安全距离）、135mm远摄2镜（机位距滑手8米以外）；跳跃动作凝固2镜；逆光剪影1镜；禁用闪光灯（影响滑手判断）；摄影师不进入滑行路线。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
young adult skateboarder rolling into an outdoor skatepark at golden hour, low sunset backlighteye-level , loose natural stance on board, skatepark ramps and concrete in background, no flash, cinematic street photography, safe distance  composition, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
young adult skateboarder rolling into an outdoor skatepark at golden hour, low sunset backlighteye-level , loose natural stance on board, skatepark ramps and concrete in background, no flash, cinematic street photography, safe distance  composition, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
young adult skateboarder rolling into an outdoor skatepark at golden hour, low sunset backlighteye-level , loose natural stance on board, skatepark ramps and concrete in background, no flash, cinematic street photography, safe distance  composition, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`ppl-skater-dusk__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约10米，站在滑行路线外侧安全区，机位高度约1.5米平视
- 动作：滑手从滑板场入口方向自然滑入画面，重心略低，不踩板尾起跳，目视前方滑行路径
- 服装：青年滑板者穿着待确认；现场确认是否佩戴头盔与护具，发型自然随风
- 光线：利用黄昏低角度现场自然光，拍摄机位背对落日方向，不补光、不使用闪光灯
- 道具：无
- 裁切／必见：头顶留少量空间，保留滑板与地面接触点，底部不切轮子　｜　滑板场环境轮廓、滑手完整姿态、地面和板面接触关系
- 废片判据：滑手被背景栏杆完全遮挡、地面反光过曝、画面无场地交代

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, young adult skateboarder rolling into an outdoor skatepark at golden hour, low sunset backlighteye-level wide shot, loose natural stance on board, skatepark ramps and concrete in background, no flash, cinematic street photography, safe distance full body composition, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-02　24mm贴地跟滑

- 文件名：`ppl-skater-dusk__02.png`　中景 / 低机位仰拍 / 24mm / f/2.8 / 竖幅
- 机位：距主体约1.2米，蹲在滑行路线外侧安全区，机位高约0.6米，镜头朝向滑手侧前方
- 动作：滑手沿缓坡匀速滑行，膝盖微屈，前脚掌踩稳板面，双臂自然摆动保持平衡
- 服装：青年滑板者穿着待确认；确认鞋带收好、裤脚不卷入轮组
- 光线：黄昏侧逆现场自然光勾边，拍摄机位不补光、禁用闪光灯，必要时用白色反光板补面部阴影但需与滑手保持安全距离并获同意
- 道具：无
- 裁切／必见：从滑手腰部以上到板轮完整入画，头顶保留少量空间，左右不裁断伸展手臂　｜　滑板轮与地面接触、滑手低重心姿态、速度感带来的地面线条
- 废片判据：轮子被裁掉、人物居中呆立无动态、画面因震动全糊且无法辨认姿态

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, dynamic low angletracking shot of a young skateboarder carving on a skatepark slope at dusk, camera 1.2 meters away on the safe side, knees bent, wheels on concrete, warm side backlight, no flash, motion feel, street style, 24mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-03　24mm侧向低机位贴滑

- 文件名：`ppl-skater-dusk__03.png`　中景 / 低机位仰拍 / 24mm / f/2.8 / 竖幅
- 机位：距主体约1.5米，站在滑行路线外侧，机位高约0.8米，身体侧对滑行方向
- 动作：滑手从画面左后方向右前方斜穿，做压弯滑行动作，肩部随转向转动，视线看向前进方向
- 服装：青年滑板者穿着待确认；确认外层衣物不拖地、不影响转向
- 光线：黄昏太阳位于滑手前方偏侧，形成暖色轮廓光，现场自然光为主，不开启机顶闪光
- 道具：无
- 裁切／必见：完整保留滑板与双脚，手部可裁切但不切掉主手臂，顶部保留头部空间　｜　压弯时的身体倾斜、板面倾斜角度、地面纹理
- 废片判据：主体居中无运动方向空间、滑手出画一半、逆光下人物完全黑死无细节

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, low side tracking shot of a young skateboarder leaning into a carve at an outdoor skatepark, golden hour rim light, camera on safe outside line 1.5 meters away, forward space in frame, no flash, street action photography, 24mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-04　135mm远摄滑行侧影

- 文件名：`ppl-skater-dusk__04.png`　近景 / 平视 / 135mm / f/2 / 竖幅
- 机位：距主体约9米，站在场地边缘安全区，机位高约1.5米平视
- 动作：滑手沿场地远端直线滑行，身体直立略前倾，双臂放松，视线在前方
- 服装：青年滑板者穿着待确认；远处镜头重点确认轮廓清晰、无飘带干扰
- 光线：利用黄昏低角度自然光形成侧逆轮廓，长焦压缩背景，不补光、禁用闪光灯
- 道具：无
- 裁切／必见：膝盖以上至头顶完整，保留滑板前轮，右侧留少量前进空间　｜　滑手侧影轮廓、滑板前轮、场地坡道压缩背景
- 废片判据：背景行人或杂物与头部重叠、主体过小无细节、长焦抖动导致轮廓发虚

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, telephoto side profile of a young skateboarder rolling across a skatepark at sunset, camera 9 meters away on the safe perimeter, compressed ramp background, warm rim light, no flash, cinematic street photography, 135mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-05　135mm远摄腾空剪影

- 文件名：`ppl-skater-dusk__05.png`　全身 / 平视 / 135mm / f/4 / 竖幅
- 机位：距主体约10米，站在场地外侧安全区，机位高约2米，平视略仰
- 动作：滑手在跳台上起跳，双膝收向胸口，双手自然展开保持平衡，板面贴近脚底
- 服装：青年滑板者穿着待确认；确认衣物贴身、不影响腾空动作
- 光线：强逆光形成剪影，现场自然光，不补光、不使用闪光灯，测光以天空为准保留轮廓
- 道具：无
- 裁切／必见：头顶与板底均保留空间，不裁手不裁脚，人物占画面高度约三分之二　｜　腾空瞬间、滑手与滑板完整轮廓、落日天空背景
- 废片判据：剪影糊成黑块无肢体轮廓、板与脚分离不清、背景出现杂乱建筑破坏轮廓

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, telephoto silhouette of a young skateboarder mid-air above a skatepark ramp at sunset, knees tucked, board under feet, camera 10 meters away on safe perimeter, strong backlight, no flash, clean golden sky background, 135mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-06　低机位跳跃凝固

- 文件名：`ppl-skater-dusk__06.png`　全身 / 低机位仰拍 / 70mm / f/4 / 竖幅
- 机位：距主体约5米，位于落地外侧安全区，机位高约1米，仰拍朝向起跳点
- 动作：滑手从坡道边缘起跳，双腿收膝，前手向前伸指向落地方向，身体在空中保持紧凑
- 服装：青年滑板者穿着待确认；确认裤脚收紧、鞋底干净可见
- 光线：黄昏侧光照明身体一侧，快门高速凝固动作，不补光、禁用闪光灯
- 道具：无
- 裁切／必见：人物全身完整入画，板底不裁，起跳坡道边缘保留局部，头顶留少量空间　｜　腾空高度、收膝姿态、滑板与脚的位置关系
- 废片判据：动作拖影、人物被裁切、板完全被脚遮挡无法辨认

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, low angle action freeze of a young skateboarder jumping off a skatepark ramp at dusk, knees tucked, one arm forward, board under feet, camera 5 meters away on safe ground, fast shutter, side warm light, no flash, 70mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-07　侧向跳跃全动作凝固

- 文件名：`ppl-skater-dusk__07.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约6米，位于滑行路线外侧垂直侧机位，机位高约1.2米平视
- 动作：滑手从画面左侧向右做跳过小坡动作，起跳后双腿并拢收膝，落地前身体前倾，滑板保持水平
- 服装：青年滑板者穿着待确认；确认衣物飘动自然、无长带缠绕风险
- 光线：黄昏侧光与少量反光补面部，快门高速凝固，不补光可用反光板但不使用闪光灯
- 道具：无
- 裁切／必见：完整保留起跳点到落地点，人物与板全身入画，上下留出腾空空间　｜　完整跳跃轨迹、滑板水平、身体前倾落地准备
- 废片判据：动作被裁成两半、板倾斜异常、背景杂物与人物轮廓重叠

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, side view action freeze of a young skateboarder jumping over a small skatepark ramp at sunset, full body in frame, board level, takeoff ramp left and landing zone right, fast shutter, natural side light, no flash, street photography, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-08　逆光剪影站立

- 文件名：`ppl-skater-dusk__08.png`　全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约7米，站在落日前方安全区，机位高约1.2米平视，镜头对准太阳方向
- 动作：滑手单脚踩板停在场地上，另一只脚点地，身体放松面朝落日方向，板身斜靠脚边
- 服装：青年滑板者穿着待确认；剪影重点确认发型与衣物外轮廓清晰
- 光线：纯逆光剪影，测光以天空为准压暗人物，不补光、禁用闪光灯
- 道具：无
- 裁切／必见：人物全身与滑板完整入画，保留大面积金色天空，底部裁掉过多杂乱地面　｜　人板剪影轮廓、落日位置与暖色天空层次
- 废片判据：剪影中有人造光斑、人物轮廓与背景杂物粘连、落日完全过曝没有细节

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, backlit silhouette of a young skateboarder standing relaxed beside a skateboard at a skatepark, facing the low sunset, camera 7 meters away, golden sky filling background, no flash, pure contour silhouette, cinematic dusk, 85mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S26-09　黄昏细节手板近景

- 文件名：`ppl-skater-dusk__09.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.8米，蹲姿与滑手手部等高，机位略侧向
- 动作：滑手坐或蹲在场边安全区，双手自然搭在膝上，滑板斜靠在腿边，头部低垂放松
- 服装：青年滑板者穿着待确认；近景重点确认手部干净、袖口自然
- 光线：黄昏侧逆自然光掠过手背与板面，必要时用白色反光板轻补暗部，不开启闪光灯
- 道具：无
- 裁切／必见：裁取腰部以上与滑板局部，包含双手和板面边缘，不切手部关节　｜　手部细节、滑板板面局部、黄昏暖光质感
- 废片判据：手部过曝无纹理、板面被完全裁出画面、背景强光喧宾夺主

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, close-up detail of a young skateboarder's hands resting near a skateboard at golden hour, seated at the safe edge of a skatepark, warm side backlight on skin and deck, no flash, shallow depth, cinematic detail shot, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, do not enter restricted area, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S26-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

