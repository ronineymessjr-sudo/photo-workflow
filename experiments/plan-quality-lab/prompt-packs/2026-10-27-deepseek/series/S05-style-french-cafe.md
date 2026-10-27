# S05 · 法式复古咖啡馆

用例 `style-french-cafe`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：复古风格服装，妆容自然，发型蓬松微乱
- **场地**：临街咖啡馆（桌椅与杯具现场已有）
- **光线**：利用窗外自然光与店内暖黄吊灯，无闪光灯，必要时用反光板从模特正面补光
- **调色**：warm amber highlights, muted browns, soft contrast
- **画幅**：竖幅 2:3
- **焦段序列**：28mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 28mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：50mm为主、28mm收尾一镜；玻璃反光拍法2镜但不拍到摄影师倒影；只利用窗光与店内灯光；禁用闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Full shot of an adult model standing sideways in a French vintage cafe window, one hand resting on a chair back, gazing out, soft daylight and warm interior lighting, no flash, shot with, no photographer reflection, natural lazy mood, eye level, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Full shot of an adult model standing sideways in a French vintage cafe window, one hand resting on a chair back, gazing out, soft daylight and warm interior lighting, no flash, shot with, no photographer reflection, natural lazy mood, eye level, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Full shot of an adult model standing sideways in a French vintage cafe window, one hand resting on a chair back, gazing out, soft daylight and warm interior lighting, no flash, shot with, no photographer reflection, natural lazy mood, eye level, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 临街橱窗全景 | 全身 | 平视 | 28mm | f/4 | 距主体约6米，站在街边人行道，机位高度与胸口平齐 |
| 2 | 窗边入座侧影 | 近景 | 平视 | 50mm | f/2 | 距主体约3米，站在店内靠墙一侧，机位高度与眼睛平齐 |
| 3 | 手与杯的细节 | 大特写 | 平视 | 50mm | f/1.8 | 距主体约0.5米，机位高度与桌面平齐 |
| 4 | 慵懒趴桌近景 | 特写 | 高机位俯拍 | 50mm | f/1.8 | 距主体约2米，站在桌子对面，机位略高于模特头部 |
| 5 | 玻璃反光拍法一 | 近景 | 平视 | 50mm | f/2 | 距主体约1.5米，站在玻璃外侧偏左，机位与眼睛平齐，镜头与玻璃成30度角避开倒影 |
| 6 | 玻璃反光拍法二 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1.2米，站在玻璃外侧偏右，机位与眼睛平齐，镜头与玻璃成20度角 |
| 7 | 咖啡馆环境交代 | 全景 | 平视 | 50mm | f/5.6 | 距主体约5米，站在店门内侧，机位与胸口平齐 |
| 8 | 窗光下的侧颜特写 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1米，站在模特侧前方，机位与眼睛平齐 |
| 9 | 低角度慵懒收尾 | 全身 | 低机位仰拍 | 28mm | f/4 | 距主体约3.5米，蹲下，机位离地约50厘米 |

### S05-01　临街橱窗全景

- 文件名：`style-french-cafe__01.png`　全身 / 平视 / 28mm / f/4 / 竖幅
- 机位：距主体约6米，站在街边人行道，机位高度与胸口平齐
- 动作：侧身站立，右手轻搭椅背，目光望向窗外，身体重量落在后脚，呈放松站姿
- 服装：待确认的复古风格服装，妆容自然，发型蓬松微乱
- 光线：利用窗外自然光与店内暖黄吊灯，无闪光灯，必要时用反光板从模特正面补光
- 道具：临街咖啡馆现场已有的桌椅和杯具
- 裁切／必见：完整包含橱窗边框、模特全身、前景桌椅和咖啡杯，上方保留店招边缘　｜　橱窗玻璃反光、法式复古窗框、模特慵懒站姿
- 废片判据：画面中出现摄影师倒影、闪光灯痕迹或背景杂乱行人

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Full shot of an adult model standing sideways in a French vintage cafe window, one hand resting on a chair back, gazing out, soft daylight and warm interior lighting, no flash, shot with, no photographer reflection, natural lazy mood, eye level, 28mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 临街咖啡馆现场已有的桌椅和杯具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S05-02　窗边入座侧影

- 文件名：`style-french-cafe__02.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约3米，站在店内靠墙一侧，机位高度与眼睛平齐
- 动作：侧身坐在窗边椅上，一手托腮，肘部支在桌面，视线低垂
- 服装：待确认的复古衬衫或连衣裙，妆发自然松散
- 光线：窗光从模特左侧照射，店内暖灯从右后方补轮廓光，无闪光灯
- 道具：桌面已有咖啡杯和托盘
- 裁切／必见：半身至腰部，保留窗框、手臂和咖啡杯　｜　侧脸轮廓、托腮手势、咖啡杯与窗台
- 废片判据：脸部被窗框遮挡、杯子位置错乱或眼神僵硬

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Medium close-up of an adult model sitting sideways by a cafe window, resting chin on hand, soft window light from left, warm interior fill, vintage French cafe, lazy mood, no flash, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 桌面已有咖啡杯和托盘.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S05-03　手与杯的细节

- 文件名：`style-french-cafe__03.png`　大特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，机位高度与桌面平齐
- 动作：右手轻握咖啡杯柄，拇指自然搭在杯沿，手腕放松
- 服装：袖口可见，待确认服装的袖型
- 光线：窗光从侧后方打亮手部，店内灯光补阴影，无闪光灯
- 道具：现场已有的咖啡杯和杯碟
- 裁切／必见：特写手部与咖啡杯，裁切至手腕，保留杯碟边缘　｜　手指自然姿态、杯具细节、桌布纹理
- 废片判据：手指僵硬、杯具变形或光线过平

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Extreme close-up of a hand gently holding a coffee cup in a French vintage cafe, soft window light, natural skin texture, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场已有的咖啡杯和杯碟.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S05-04　慵懒趴桌近景

- 文件名：`style-french-cafe__04.png`　特写 / 高机位俯拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约2米，站在桌子对面，机位略高于模特头部
- 动作：双臂交叠趴在桌上，下巴搁在手臂上，眼睛半闭
- 服装：待确认服装，头发自然垂落
- 光线：窗光从右上方洒下，店内暖灯在背景形成光斑，无闪光灯
- 道具：桌面已有咖啡杯
- 裁切／必见：头部至手臂，裁切掉下半身，保留杯沿　｜　慵懒眼神、手臂线条、头发质感
- 废片判据：面部阴影过重、眼睛全闭或手臂遮挡过多

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Close-up of an adult model resting head on crossed arms at a cafe table, eyes half closed, soft window light from above right, vintage French style, lazy mood, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 桌面已有咖啡杯.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S05-05　玻璃反光拍法一

- 文件名：`style-french-cafe__05.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，站在玻璃外侧偏左，机位与眼睛平齐，镜头与玻璃成30度角避开倒影
- 动作：站在玻璃内侧，手指轻触玻璃，侧脸朝向镜头，眼神望向窗外
- 服装：待确认服装，避免大面积图案反光
- 光线：利用窗光与店内灯光，在玻璃上形成自然反光，无闪光灯
- 道具：无
- 裁切／必见：半身，包含玻璃反光和模特侧脸　｜　玻璃反光层次、模特侧脸、窗外模糊街景
- 废片判据：摄影师倒影入镜、反光过曝或模特面部模糊

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Medium close-up of an adult model standing behind a cafe window, touching glass, side profile, soft reflections on glass, French vintage cafe, no photographer reflection, no flash, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S05-06　玻璃反光拍法二

- 文件名：`style-french-cafe__06.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1.2米，站在玻璃外侧偏右，机位与眼睛平齐，镜头与玻璃成20度角
- 动作：坐在窗边，身体前倾，手肘撑桌，下巴轻放于交叠的手背，眼睛直视玻璃
- 服装：待确认服装，领口简洁
- 光线：窗光从模特正面照射，店内暖灯在玻璃上形成光晕，无闪光灯
- 道具：桌面已有咖啡杯
- 裁切／必见：胸部以上，保留玻璃反光与杯沿　｜　玻璃反光中的模特眼神、手部姿态、咖啡杯
- 废片判据：摄影师倒影出现、反光过强遮挡面部或眼神呆滞

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Close-up of an adult model sitting at a window, leaning forward, chin on hands, looking into glass, soft reflections, French vintage cafe, no photographer reflection, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 桌面已有咖啡杯.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S05-07　咖啡馆环境交代

- 文件名：`style-french-cafe__07.png`　全景 / 平视 / 50mm / f/5.6 / 竖幅
- 机位：距主体约5米，站在店门内侧，机位与胸口平齐
- 动作：坐在画面深处，身体侧向窗户，手持咖啡杯，自然放松
- 服装：待确认服装，颜色与复古环境协调
- 光线：混合窗光与室内暖灯，无闪光灯，保持环境光氛围
- 道具：现场已有的桌椅、杯具和窗边装饰
- 裁切／必见：全景，包含天花板吊灯、地面、多组桌椅　｜　咖啡馆空间布局、复古陈设、模特与环境关系
- 废片判据：画面杂乱、光线不均或模特被遮挡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Wide shot of a French vintage cafe interior, an adult model sitting in the background near window, foreground empty tables and chairs, warm ambient light, no flash, 50mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场已有的桌椅、杯具和窗边装饰.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S05-08　窗光下的侧颜特写

- 文件名：`style-french-cafe__08.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，站在模特侧前方，机位与眼睛平齐
- 动作：头部微仰，侧脸迎向窗光，眼睛微闭，嘴唇放松
- 服装：待确认服装，头发别在耳后露出颈部
- 光线：窗光作为主光从模特右侧照射，店内灯光在左侧补暗部，无闪光灯
- 道具：无
- 裁切／必见：特写头部至颈部，裁切至头顶上方　｜　睫毛、皮肤纹理、光影过渡
- 废片判据：皮肤过曝、阴影死黑或眼神造作

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Close-up side profile of an adult model in a cafe, face turned to window light, eyes gently closed, soft light and shadow, French vintage, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S05-09　低角度慵懒收尾

- 文件名：`style-french-cafe__09.png`　全身 / 低机位仰拍 / 28mm / f/4 / 竖幅
- 机位：距主体约3.5米，蹲下，机位离地约50厘米
- 动作：身体斜靠椅背，一条腿伸展，手臂垂落，眼神慵懒看向镜头
- 服装：待确认服装，裙摆或裤腿自然垂落
- 光线：窗光从模特后方照射形成轮廓光，店内灯光照亮面部，无闪光灯
- 道具：现场已有的桌椅和杯具
- 裁切／必见：全身，包含地面与天花板边缘，强调低角度透视　｜　慵懒姿态、腿部线条、咖啡馆空间感
- 废片判据：人物变形、背景杂乱或光线昏暗

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: warm amber highlights, muted browns, soft contrast, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Full shot from low angle of an adult model lounging on a chair in a French vintage cafe, lazy gaze, window light backlight, no flash, 28mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场已有的桌椅和杯具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S05-01 ｜ 镜头名 ｜ 28mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

