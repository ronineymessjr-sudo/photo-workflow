# S27 · 老人的手作时光

用例 `ppl-elder-hands`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 成年人（adult） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 素色棉质长袖上衣，袖口自然放下，妆发，保持整洁朴素 | 换衣即断系列 |
| 场地 | 老街工作台（工作台与工具现场已有） | 同一处，背景元素不跑 |
| 光线 | 仅用门窗自然光作为主光，门窗位于画面左侧形成侧光，关闭台灯避免色温混合，禁用闪光灯 | 主光方向不变 |
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
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, warm documentary photograph, elderly craftsman sitting sideways behind a worn street-side workbench, hands resting on table edge, calm gaze, soft natural window light from left, no flash, quiet old street workshop atmosphere, eye level, medium full shot, muted warm tones, realistic, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, warm documentary photograph, elderly craftsman sitting sideways behind a worn street-side workbench, hands resting on table edge, calm gaze, soft natural window light from left, no flash, quiet old street workshop atmosphere, eye level, medium full shot, muted warm tones, realistic, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, warm documentary photograph, elderly craftsman sitting sideways behind a worn street-side workbench, hands resting on table edge, calm gaze, soft natural window light from left, no flash, quiet old street workshop atmosphere, eye level, medium full shot, muted warm tones, realistic, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `ppl-elder-hands__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 老街环境交代镜头 | 中全 | 平视 | 50mm | f/3.5 | 距主体约3.5米，站立机位约胸口高度平视，从工作台斜前方45度取景 |
| 2 | 门窗光下老人半身 | 近景 | 平视 | 50mm | f/2 | 距主体约1.6米，机位约眼睛高度平视，位于门窗光来的侧面 |
| 3 | 手部起势特写 | 特写 | 高机位俯拍 | 85mm | f/1.8 | 机位距工作台约50厘米，降到台面略高位置俯向手部 |
| 4 | 手部操作细节特写 | 大特写 | 平视 | 85mm | f/1.8 | 机位距工作台约50厘米，从手部正面略低角度平视 |
| 5 | 指尖停顿特写 | 特写 | 正俯拍 | 85mm | f/1.8 | 机位距工作台约50厘米，位于手部斜后方俯拍，略见手臂线条 |
| 6 | 侧身专注中景 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2.2米，机位约肩部高度，从侧面接近90度取景 |
| 7 | 低机位台面视线 | 中景 | 低机位仰拍 | 50mm | f/2.8 | 机位距主体约2.8米，降到台面高度贴近工作台边缘低机位，视线与台面齐平 |
| 8 | 门边自然光全身工作照 | 全身 | 平视 | 50mm | f/4 | 距主体约4米，机位约胸口高度平视，位于门窗光束的轴线附近 |
| 9 | 门前环境收尾 | 全景 | 平视 | 50mm | f/5.6 | 距主体约5米，机位约胸口高度平视，纳入门窗与工作台整体 |

### S27-01　老街环境交代镜头

- 文件名：`ppl-elder-hands__01.png`
- 景别/角度/焦段/光圈：中全 / 平视 / 50mm / f/3.5 / 竖幅
- 机位：距主体约3.5米，站立机位约胸口高度平视，从工作台斜前方45度取景
- 动作：老人侧坐在工作台后，双手自然搭在工作台边缘，身体微向前倾，视线落向台面工具方向，不做大幅度动作
- 道具：工作台与现场已有工具（无其他道具）　｜　裁切：纳入整张工作台、老人上半身与所处环境背景，不裁掉头顶与工作台前沿
- 必见：老街工作台环境、门窗自然光方向、老人安静坐姿　｜　废片判据：背景杂物遮挡主体、门窗光造成大面积过曝、人物出现大幅动作或模糊

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, warm documentary photograph, elderly craftsman sitting sideways behind a worn street-side workbench, hands resting on table edge, calm gaze, soft natural window light from left, no flash, quiet old street workshop atmosphere, eye level, medium full shot, muted warm tones, realistic, 50mm lens at f/3.5, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: 工作台与现场已有工具（无其他道具）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-02　门窗光下老人半身

- 文件名：`ppl-elder-hands__02.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.6米，机位约眼睛高度平视，位于门窗光来的侧面
- 动作：老人低头看向工作台，一手轻按台面工具，另一手停在其旁，肩膀放松，动作轻缓停顿
- 道具：工作台与现场已有工具　｜　裁切：裁到腰部以上，保留手部与工具，头部上方留少量空间
- 必见：老人温厚专注的神情、手与工具的接触关系、门窗侧光质感　｜　废片判据：面部落入生硬阴影、手部被裁切、表情紧张或动作过大

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, warm documentary portrait, elderly artisan in plain cotton shirt, head slightly bowed toward workbench, one hand resting lightly on a tool, soft side light from window and door, no flash, gentle focused expression, eye level, medium close shot, film-like warm tones, realistic, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: 工作台与现场已有工具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-03　手部起势特写

- 文件名：`ppl-elder-hands__03.png`
- 景别/角度/焦段/光圈：特写 / 高机位俯拍 / 85mm / f/1.8 / 竖幅
- 机位：机位距工作台约50厘米，降到台面略高位置俯向手部
- 动作：双手置于工作台工具旁，手指缓慢张开又轻轻合拢，指尖贴近台面，不做大幅动作
- 道具：工作台与现场已有工具　｜　裁切：裁切只保留双手、前臂与相邻工具局部，不露脸
- 必见：手部皮肤纹理、指节动作、工具与台面的接触面　｜　废片判据：手部失焦、台灯直射造成高光溢出、闪光灯补光痕迹、手指被裁出画面

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, intimate close-up of elderly craftsman's hands resting beside worn tools on a wooden workbench, fingers slowly opening and closing, soft natural light from upper left, small warm desk lamp fill from right, no flash, realistic skin texture, warm documentary mood, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: 工作台与现场已有工具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-04　手部操作细节特写

- 文件名：`ppl-elder-hands__04.png`
- 景别/角度/焦段/光圈：大特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：机位距工作台约50厘米，从手部正面略低角度平视
- 动作：一只手轻扶工作台上的工具，另一只手指尖沿工具边缘缓慢移动，节奏缓，不需要用力
- 道具：工作台与现场已有工具　｜　裁切：紧裁双手与工具，手肘以外不入画，工具保留足够形状可辨认
- 必见：指尖与工具的细小接触、工具表面使用痕迹、手背筋络　｜　废片判据：工具形状不可辨认、逆光导致手部全黑、机位移动造成虚焦

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, macro-style documentary shot of elderly hands gently guiding a worn craft tool on a wooden bench, soft backlight rim from window, subtle bounce fill from pale tabletop, no flash, ground-level eye view of hands, intimate warm tones, realistic, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: 工作台与现场已有工具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-05　指尖停顿特写

- 文件名：`ppl-elder-hands__05.png`
- 景别/角度/焦段/光圈：特写 / 正俯拍 / 85mm / f/1.8 / 竖幅
- 机位：机位距工作台约50厘米，位于手部斜后方俯拍，略见手臂线条
- 动作：双手在工具上方短暂停顿，一只手的指尖轻触工具，另一只手半握成松拳，静置数秒
- 道具：工作台与现场已有工具　｜　裁切：只保留双手、工具与一小段台面，脸与身体不入画
- 必见：老人手部的停顿感、指甲边缘、台面木纹的岁月质感　｜　废片判据：手部高光过曝、背景杂乱、画面中出现未提供的道具

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, quiet close-up of elderly artisan's hands pausing above a craft tool on an old wooden workbench, fingertips lightly touching the tool, one hand loosely relaxed, soft daylight from behind, no flash, slightly overhead view of hands, warm nostalgic documentary style, realistic textures, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: 工作台与现场已有工具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-06　侧身专注中景

- 文件名：`ppl-elder-hands__06.png`
- 景别/角度/焦段/光圈：中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2.2米，机位约肩部高度，从侧面接近90度取景
- 动作：老人侧对镜头坐着，低头看向台面，一只手稳住工具，另一只手缓慢动作，上半身保持不动
- 道具：工作台与现场已有工具　｜　裁切：裁到膝盖以上，保留侧脸、双手与工作台面，不切掉手部
- 必见：侧脸专注神态、手部动作轨迹、老街工作台的空间纵深　｜　废片判据：侧脸完全背光、手部被工作台挡住、背景出现无关杂物

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, warm side-profile documentary shot, elderly craftsman seated at a workbench in an old street, head lowered, one hand steadying a tool while the other moves slowly, soft window daylight from front side, natural shadow background, no flash, shoulder height, medium shot, realistic film tones, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: 工作台与现场已有工具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-07　低机位台面视线

- 文件名：`ppl-elder-hands__07.png`
- 景别/角度/焦段/光圈：中景 / 低机位仰拍 / 50mm / f/2.8 / 竖幅
- 机位：机位距主体约2.8米，降到台面高度贴近工作台边缘低机位，视线与台面齐平
- 动作：老人双手在工作台上缓慢整理工具，身体保持坐姿，头部微低，动作幅度极小
- 道具：工作台与现场已有工具　｜　裁切：保留工作台前沿到老人肩部，低机位仰视空气感，头顶不裁切过多
- 必见：台面木纹与工具排列、老人俯身双手、门窗光在桌面的落点　｜　废片判据：低机位造成面部变形、台面反光刺眼、画面出现未提供道具

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, low-angle documentary view from workbench level, elderly craftsman arranging tools slowly with both hands, wooden tabletop texture in foreground, soft daylight from upper right across the bench, no flash, medium shot, warm quiet old-street workshop atmosphere, realistic, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 工作台与现场已有工具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-08　门边自然光全身工作照

- 文件名：`ppl-elder-hands__08.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，机位约胸口高度平视，位于门窗光束的轴线附近
- 动作：老人端坐在工作台前，双手轻放台面工具两侧，背挺直但放松，视线落在手上，保持静止
- 道具：工作台与现场已有工具　｜　裁切：全身入画，头顶与脚底保留少量空间，工作台完整进入画面下三分之一
- 必见：老人全身坐姿与工作台的比例关系、门窗光环境、手与工具的静置状态　｜　废片判据：全身被截断、门窗光直射造成面部过曝、出现未提供的道具

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, warm environmental portrait, elderly craftsman seated upright at a street-side workbench, hands resting beside tools, soft window and door daylight entering from left, no flash, eye level, full body shot, old street workshop, natural warm tones, documentary realism, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: 工作台与现场已有工具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-09　门前环境收尾

- 文件名：`ppl-elder-hands__09.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 50mm / f/5.6 / 竖幅
- 机位：距主体约5米，机位约胸口高度平视，纳入门窗与工作台整体
- 动作：老人坐在工作台前，双手交叠放在台面上，肩膀放松，头部微侧望向门窗方向，静止数秒
- 道具：工作台与现场已有工具　｜　裁切：宽幅纳入门窗、工作台与老人全身，人物不靠画面边缘裁切
- 必见：老街门窗与工作台的空间关系、老人安静收束的姿态、自然光的环境氛围　｜　废片判据：人物过小不可辨、门窗高光过曝、环境中出现未提供的道具

```text
[IDENTITY LOCK], one single person, the same person as the reference image, adult, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, wide environmental documentary shot, elderly craftsman seated at a workbench near an old street doorway, hands folded on the table, head slightly turned toward the window light, soft natural daylight only, no flash, eye level, wide shot, warm nostalgic atmosphere, realistic, 50mm lens at f/5.6, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-elder-hands__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: 工作台与现场已有工具.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `ppl-elder-hands__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

