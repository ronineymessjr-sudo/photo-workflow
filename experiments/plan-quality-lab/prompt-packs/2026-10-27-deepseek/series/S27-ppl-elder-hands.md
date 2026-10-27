# S27 · 老人的手作时光

用例 `ppl-elder-hands`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名老年手艺人（动作轻缓）（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：素色棉质长袖上衣，袖口自然放下，妆发，保持整洁朴素
- **场地**：老街工作台（工作台与工具现场已有）
- **光线**：仅用门窗自然光作为主光，门窗位于画面左侧形成侧光，关闭台灯避免色温混合，禁用闪光灯
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：50mm → 50mm → 85mm → 85mm → 85mm → 50mm → 50mm → 50mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：85mm手部特写3镜（机位距工作台50厘米）；50mm环境2镜；不要求老人做大幅度动作；只利用门窗自然光与台灯；禁用闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
warm documentary photograph, elderly craftsman sitting sideways behind a worn street-side workbench, hands resting on table edge, calm gaze, soft natural window light from left, no flash, quiet old street workshop atmosphere, eye level, medium full shot, muted warm tones, realistic, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
warm documentary photograph, elderly craftsman sitting sideways behind a worn street-side workbench, hands resting on table edge, calm gaze, soft natural window light from left, no flash, quiet old street workshop atmosphere, eye level, medium full shot, muted warm tones, realistic, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
warm documentary photograph, elderly craftsman sitting sideways behind a worn street-side workbench, hands resting on table edge, calm gaze, soft natural window light from left, no flash, quiet old street workshop atmosphere, eye level, medium full shot, muted warm tones, realistic, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`ppl-elder-hands__01.png`　中全 / 平视 / 50mm / f/3.5 / 竖幅
- 机位：距主体约3.5米，站立机位约胸口高度平视，从工作台斜前方45度取景
- 动作：老人侧坐在工作台后，双手自然搭在工作台边缘，身体微向前倾，视线落向台面工具方向，不做大幅度动作
- 服装：素色棉质长袖上衣，袖口自然放下，妆发待确认，保持整洁朴素
- 光线：仅用门窗自然光作为主光，门窗位于画面左侧形成侧光，关闭台灯避免色温混合，禁用闪光灯
- 道具：工作台与现场已有工具（无其他道具）
- 裁切／必见：纳入整张工作台、老人上半身与所处环境背景，不裁掉头顶与工作台前沿　｜　老街工作台环境、门窗自然光方向、老人安静坐姿
- 废片判据：背景杂物遮挡主体、门窗光造成大面积过曝、人物出现大幅动作或模糊

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, warm documentary photograph, elderly craftsman sitting sideways behind a worn street-side workbench, hands resting on table edge, calm gaze, soft natural window light from left, no flash, quiet old street workshop atmosphere, eye level, medium full shot, muted warm tones, realistic, 50mm lens at f/3.5, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具（无其他道具）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-02　门窗光下老人半身

- 文件名：`ppl-elder-hands__02.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.6米，机位约眼睛高度平视，位于门窗光来的侧面
- 动作：老人低头看向工作台，一手轻按台面工具，另一手停在其旁，肩膀放松，动作轻缓停顿
- 服装：素色棉质上衣，袖口平整，妆发待确认，避免反光配饰
- 光线：门窗自然光从侧前方照脸与手背，另一侧用现场浅色墙面自然反光减淡阴影，禁用闪光灯，台灯保持关闭
- 道具：工作台与现场已有工具
- 裁切／必见：裁到腰部以上，保留手部与工具，头部上方留少量空间　｜　老人温厚专注的神情、手与工具的接触关系、门窗侧光质感
- 废片判据：面部落入生硬阴影、手部被裁切、表情紧张或动作过大

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, warm documentary portrait, elderly artisan in plain cotton shirt, head slightly bowed toward workbench, one hand resting lightly on a tool, soft side light from window and door, no flash, gentle focused expression, eye level, medium close shot, film-like warm tones, realistic, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-03　手部起势特写

- 文件名：`ppl-elder-hands__03.png`　特写 / 高机位俯拍 / 85mm / f/1.8 / 竖幅
- 机位：机位距工作台约50厘米，降到台面略高位置俯向手部
- 动作：双手置于工作台工具旁，手指缓慢张开又轻轻合拢，指尖贴近台面，不做大幅动作
- 服装：袖口挽起至前臂中段，衣物素色无明显图案，手部保持自然状态不额外修饰，妆发待确认
- 光线：门窗自然光从画面左上方照向手背，台灯在画面右侧低亮度补轮廓光，禁用闪光灯
- 道具：工作台与现场已有工具
- 裁切／必见：裁切只保留双手、前臂与相邻工具局部，不露脸　｜　手部皮肤纹理、指节动作、工具与台面的接触面
- 废片判据：手部失焦、台灯直射造成高光溢出、闪光灯补光痕迹、手指被裁出画面

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, intimate close-up of elderly craftsman's hands resting beside worn tools on a wooden workbench, fingers slowly opening and closing, soft natural light from upper left, small warm desk lamp fill from right, no flash, realistic skin texture, warm documentary mood, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-04　手部操作细节特写

- 文件名：`ppl-elder-hands__04.png`　大特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：机位距工作台约50厘米，从手部正面略低角度平视
- 动作：一只手轻扶工作台上的工具，另一只手指尖沿工具边缘缓慢移动，节奏缓，不需要用力
- 服装：袖口固定不垂落遮挡手部，素色棉质衣物，妆发待确认
- 光线：门窗自然光形成侧逆光勾出手指轮廓，正面用现场白色台面反光轻微补亮，禁用闪光灯
- 道具：工作台与现场已有工具
- 裁切／必见：紧裁双手与工具，手肘以外不入画，工具保留足够形状可辨认　｜　指尖与工具的细小接触、工具表面使用痕迹、手背筋络
- 废片判据：工具形状不可辨认、逆光导致手部全黑、机位移动造成虚焦

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, macro-style documentary shot of elderly hands gently guiding a worn craft tool on a wooden bench, soft backlight rim from window, subtle bounce fill from pale tabletop, no flash, ground-level eye view of hands, intimate warm tones, realistic, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-05　指尖停顿特写

- 文件名：`ppl-elder-hands__05.png`　特写 / 正俯拍 / 85mm / f/1.8 / 竖幅
- 机位：机位距工作台约50厘米，位于手部斜后方俯拍，略见手臂线条
- 动作：双手在工具上方短暂停顿，一只手的指尖轻触工具，另一只手半握成松拳，静置数秒
- 服装：袖口挽起，露出前臂，衣物素色，妆发待确认
- 光线：门窗自然光从后方斜照手背形成柔和高光，台灯关闭避免双色温，禁用闪光灯
- 道具：工作台与现场已有工具
- 裁切／必见：只保留双手、工具与一小段台面，脸与身体不入画　｜　老人手部的停顿感、指甲边缘、台面木纹的岁月质感
- 废片判据：手部高光过曝、背景杂乱、画面中出现未提供的道具

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, quiet close-up of elderly artisan's hands pausing above a craft tool on an old wooden workbench, fingertips lightly touching the tool, one hand loosely relaxed, soft daylight from behind, no flash, slightly overhead view of hands, warm nostalgic documentary style, realistic textures, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-06　侧身专注中景

- 文件名：`ppl-elder-hands__06.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2.2米，机位约肩部高度，从侧面接近90度取景
- 动作：老人侧对镜头坐着，低头看向台面，一只手稳住工具，另一只手缓慢动作，上半身保持不动
- 服装：素色棉质上衣，袖口挽起，妆发待确认，衣物平整无强反光
- 光线：门窗自然光从人物正面偏侧照入，人物背后保留环境暗部层次，台灯不使用，禁用闪光灯
- 道具：工作台与现场已有工具
- 裁切／必见：裁到膝盖以上，保留侧脸、双手与工作台面，不切掉手部　｜　侧脸专注神态、手部动作轨迹、老街工作台的空间纵深
- 废片判据：侧脸完全背光、手部被工作台挡住、背景出现无关杂物

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, warm side-profile documentary shot, elderly craftsman seated at a workbench in an old street, head lowered, one hand steadying a tool while the other moves slowly, soft window daylight from front side, natural shadow background, no flash, shoulder height, medium shot, realistic film tones, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-07　低机位台面视线

- 文件名：`ppl-elder-hands__07.png`　中景 / 低机位仰拍 / 50mm / f/2.8 / 竖幅
- 机位：机位距主体约2.8米，降到台面高度贴近工作台边缘低机位，视线与台面齐平
- 动作：老人双手在工作台上缓慢整理工具，身体保持坐姿，头部微低，动作幅度极小
- 服装：素色棉质上衣，袖口挽起，妆发待确认，不添加未提供的配饰
- 光线：门窗自然光从画面右上方照向台面与老人手部，台灯不开，禁用闪光灯
- 道具：工作台与现场已有工具
- 裁切／必见：保留工作台前沿到老人肩部，低机位仰视空气感，头顶不裁切过多　｜　台面木纹与工具排列、老人俯身双手、门窗光在桌面的落点
- 废片判据：低机位造成面部变形、台面反光刺眼、画面出现未提供道具

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, low-angle documentary view from workbench level, elderly craftsman arranging tools slowly with both hands, wooden tabletop texture in foreground, soft daylight from upper right across the bench, no flash, medium shot, warm quiet old-street workshop atmosphere, realistic, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-08　门边自然光全身工作照

- 文件名：`ppl-elder-hands__08.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，机位约胸口高度平视，位于门窗光束的轴线附近
- 动作：老人端坐在工作台前，双手轻放台面工具两侧，背挺直但放松，视线落在手上，保持静止
- 服装：素色棉质上衣与长裤，袖口挽起，妆发待确认，鞋子待确认
- 光线：门窗自然光作为唯一主光源，人物处于光斑边缘，台面保留柔和反射，禁用闪光灯，台灯关闭
- 道具：工作台与现场已有工具
- 裁切／必见：全身入画，头顶与脚底保留少量空间，工作台完整进入画面下三分之一　｜　老人全身坐姿与工作台的比例关系、门窗光环境、手与工具的静置状态
- 废片判据：全身被截断、门窗光直射造成面部过曝、出现未提供的道具

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, warm environmental portrait, elderly craftsman seated upright at a street-side workbench, hands resting beside tools, soft window and door daylight entering from left, no flash, eye level, full body shot, old street workshop, natural warm tones, documentary realism, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S27-09　门前环境收尾

- 文件名：`ppl-elder-hands__09.png`　全景 / 平视 / 50mm / f/5.6 / 竖幅
- 机位：距主体约5米，机位约胸口高度平视，纳入门窗与工作台整体
- 动作：老人坐在工作台前，双手交叠放在台面上，肩膀放松，头部微侧望向门窗方向，静止数秒
- 服装：素色棉质上衣，袖口自然，妆发待确认，保持与前面镜头一致
- 光线：只依赖门窗自然光，从画面左侧照亮老人侧身与台面，其余区域保留自然暗部，禁用闪光灯
- 道具：工作台与现场已有工具
- 裁切／必见：宽幅纳入门窗、工作台与老人全身，人物不靠画面边缘裁切　｜　老街门窗与工作台的空间关系、老人安静收束的姿态、自然光的环境氛围
- 废片判据：人物过小不可辨、门窗高光过曝、环境中出现未提供的道具

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, wide environmental documentary shot, elderly craftsman seated at a workbench near an old street doorway, hands folded on the table, head slightly turned toward the window light, soft natural daylight only, no flash, eye level, wide shot, warm nostalgic atmosphere, realistic, 50mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 工作台与现场已有工具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S27-01 ｜ 镜头名 ｜ 50mm f/3.5`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

