# S04 · 日系胶片教室午后

用例 `style-film-classroom`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名学生打扮的成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：学生打扮：白色短袖衬衫与深色长裤，发型整齐低马尾；无浓妆，保持自然肤感
- **场地**：旧教室（课桌椅现场已有）
- **光线**：关闭室内灯，仅靠窗帘透入的午后侧逆光；让窗光从画面右侧照亮课桌与人物轮廓，不补人工光
- **调色**：low-contrast pastel, slightly green shadows, fine grain
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：仅用35mm；靠窗座位逆光与侧光各至少1镜；机位距离写清到课桌的米数；无闪光灯；窗帘透光为唯一造型光。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Japanese film photography, old classroom, adult student seated at window-side desk, body turned 30 degrees toward aisle, elbow on desk, fingers lightly touching cheek, eyes lowered, soft side light through sheer curtain from right window, white shirt and dark trousers, low ponytail, eye-level , natural grain, gentle shadows, no flash, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Japanese film photography, old classroom, adult student seated at window-side desk, body turned 30 degrees toward aisle, elbow on desk, fingers lightly touching cheek, eyes lowered, soft side light through sheer curtain from right window, white shirt and dark trousers, low ponytail, eye-level , natural grain, gentle shadows, no flash, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Japanese film photography, old classroom, adult student seated at window-side desk, body turned 30 degrees toward aisle, elbow on desk, fingers lightly touching cheek, eyes lowered, soft side light through sheer curtain from right window, white shirt and dark trousers, low ponytail, eye-level , natural grain, gentle shadows, no flash, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

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

- 文件名：`style-film-classroom__01.png`　全景 / 平视 / 35mm / f/5.6 / 横幅
- 机位：距主体约5米，站在教室后方门口内侧，机位约1.4米高平视
- 动作：坐在靠窗第三排课桌前，双手放在桌面，背微直，视线落向窗外
- 服装：学生打扮：白色短袖衬衫与深色长裤，发型整齐低马尾；具体品牌与款式待确认；无浓妆，保持自然肤感
- 光线：关闭室内灯，仅靠窗帘透入的午后侧逆光；让窗光从画面右侧照亮课桌与人物轮廓，不补人工光
- 道具：课桌椅现场已有，无其他道具
- 裁切／必见：保留整间教室纵深与窗框，课桌到天花板留余地，不裁人物脚部　｜　旧教室课桌椅排列、靠窗座位、窗帘透光的方向感
- 废片判据：出现闪光灯痕迹、室内顶灯亮起、画面过曝失去窗框细节、人物被课桌遮挡过多

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, Japanese film photography, old classroom afternoon, one adult student sitting at a desk by the window in the right third of frame, white short-sleeve shirt and dark trousers, low ponytail, soft curtain-diffused side-backlight from the right window, no indoor lights, no flash, wooden desks and chairs, quiet youthful mood, natural grain, muted colors, eye-level wide establishing shot, 35mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，无其他道具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S04-02　靠窗座位侧光中景

- 文件名：`style-film-classroom__02.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，站在过道侧，机位约1.3米高与坐姿视线平齐
- 动作：坐在靠窗第二排课桌，身体朝过道侧转约30度，右手肘撑桌，指尖轻碰脸颊，眼神低垂
- 服装：白色短袖衬衫领口自然，深色长裤；头发低马尾留几缕碎发；无闪光灯补妆，保持清淡学生感
- 光线：仅窗帘透光，窗光从右侧形成柔和侧光，脸左半部留浅阴影；不用反光板或任何人工补光
- 道具：课桌椅现场已有，无其他道具
- 裁切／必见：从头顶到腰际，保留右侧窗框一线与桌面　｜　侧光在脸颊和衬衫上的柔和过渡、青涩低垂眼神
- 废片判据：侧光变成硬直射、脸部完全平光、出现人工补光痕迹、桌面杂物未清理

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Japanese film photography, old classroom, adult student seated at window-side desk, body turned 30 degrees toward aisle, elbow on desk, fingers lightly touching cheek, eyes lowered, soft side light through sheer curtain from right window, white shirt and dark trousers, low ponytail, eye-level medium shot, natural grain, gentle shadows, no flash, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，无其他道具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S04-03　窗边逆光半身

- 文件名：`style-film-classroom__03.png`　中全 / 平视 / 35mm / f/3.5 / 竖幅
- 机位：距主体约3米，位于教室过道中段，机位约1.4米高平视
- 动作：面朝窗户站立在课桌旁，双手自然垂在身侧，头略低，侧脸轮廓朝向窗光
- 服装：白色短袖衬衫外搭待确认的薄开衫或校服外套，深色长裤；低马尾；保持自然妆发
- 光线：仅窗帘透光作为逆光，人物边缘形成柔和亮边，面部允许略暗；不设人工补光
- 道具：课桌椅现场已有，无其他道具
- 裁切／必见：从头顶到大腿中部，保留窗框上沿与课桌角　｜　逆光在发丝与肩线的轮廓光、旧教室窗框层次
- 废片判据：面部完全死黑无细节、窗光过曝成纯白、人物姿态僵硬如摆拍、出现闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Japanese film photography, old classroom afternoon, adult student standing by window facing the light, backlit by soft curtain-diffused sunlight, white shirt and dark trousers, low ponytail, hands at sides, head slightly lowered, gentle rim light on hair and shoulders, eye-level medium full shot, natural grain, no flash, 35mm lens at f/3.5, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，无其他道具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S04-04　课桌前伏案写读

- 文件名：`style-film-classroom__04.png`　近景 / 高机位俯拍 / 35mm / f/2 / 竖幅
- 机位：距主体约1.5米，站在课桌斜前方过道，机位约1.2米高略俯视桌面
- 动作：坐在靠过道课桌，身体前倾，前臂搭在桌面，双手虚握成写字状，头微低看向桌面
- 服装：白色短袖衬衫袖口自然，深色长裤；低马尾；不戴夸张饰品
- 光线：窗光从画面右后侧照到桌面与手背，脸侧保留柔和阴影；不用闪光灯与顶灯
- 道具：课桌椅现场已有，桌面自然光影，无其他道具
- 裁切／必见：从头顶到桌面下缘，保留人物手部与课桌边缘　｜　前倾的专注姿态、手部虚握与桌面光影
- 废片判据：手部姿势僵硬像空抓、桌面出现非现场物品、窗口光在脸上形成硬斑

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, Japanese film photography, old classroom, adult student leaning forward at desk, forearms on tabletop, hands softly posed as if writing, head slightly down, soft window light from back right through curtain, white shirt and dark trousers, low ponytail, slightly high angle close medium shot, natural grain, no flash, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，桌面自然光影，无其他道具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S04-05　侧光低机位过道视角

- 文件名：`style-film-classroom__05.png`　中全 / 地面低角度 / 35mm / f/3.5 / 竖幅
- 机位：距主体约2米，蹲在过道地面，机位约0.8米高
- 动作：坐在靠窗第一排课桌，双腿并拢侧放，双手叠在膝上，肩放松，视线看向过道前方
- 服装：白色短袖衬衫与深色长裤，衣摆自然放在裤腰外；低马尾；自然肤感
- 光线：窗帘透光从画面右侧照入，形成侧光；地面与课桌腿有柔和投影；无人工补光
- 道具：课桌椅现场已有，无其他道具
- 裁切／必见：从头部到膝盖，保留过道地面与课桌腿　｜　低机位过道纵深、侧光下的坐姿与课桌结构
- 废片判据：地面杂物入镜、裙裤走光风险、侧光变成顶光、人物被课桌腿切断

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Japanese film photography, old classroom, adult student seated at first window-side desk, legs together and angled, hands folded on lap, relaxed shoulders, looking toward aisle, soft side light from right curtain, white shirt and dark trousers, low ponytail, ground-level low angle medium full shot, wooden desk legs in foreground, natural grain, no flash, 35mm lens at f/3.5, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，无其他道具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S04-06　逆光背影环境交代

- 文件名：`style-film-classroom__06.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，站在教室后排过道中央，机位约1.5米高平视
- 动作：站在窗边课桌之间，背对镜头，双手轻搭在椅背上，头微仰看向窗帘透光的方向
- 服装：白色短袖衬衫与深色长裤；低马尾；背部衣料自然平整
- 光线：仅窗帘透光，人物呈半剪影，窗框与课桌保留层次；不补光
- 道具：课桌椅现场已有，无其他道具
- 裁切／必见：保留人物全身与前方窗框，上方留天花板线条　｜　逆光中的背影轮廓、课桌椅纵深与窗边空气感
- 废片判据：背景完全过曝成白块、人物比例过小失去主体、出现人工光源

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Japanese film photography, old classroom afternoon, adult student standing between window-side desks with back to camera, hands resting on chair back, head slightly tilted up toward curtain light, soft backlight, white shirt and dark trousers, low ponytail, eye-level full shot from back of room, natural grain, no flash, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，无其他道具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S04-07　手部与课桌细节特写

- 文件名：`style-film-classroom__07.png`　特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，站在课桌旁，机位约1米高俯向桌面
- 动作：坐在靠窗座位，一只手平放在桌面，指尖微微蜷曲，另一只手轻搭在桌沿
- 服装：白色短袖衬衫袖口露出手腕，袖口自然；低马尾不入镜
- 光线：窗帘透光从右上方照到桌面，手背有柔和亮面，桌面保留木纹阴影；不用闪光灯
- 道具：课桌椅现场已有，桌面木纹与自然光影
- 裁切／必见：仅保留桌面、双手与少量袖口，不露完整面部　｜　手部细节、课桌木纹与侧光形成的柔和明暗
- 废片判据：手指姿态扭曲、桌面出现非现场物品、光线过硬产生锐利阴影

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Japanese film photography, old classroom, close-up of adult student hands on wooden desk, one hand flat with softly curled fingertips, other hand resting on desk edge, white shirt cuff visible, soft curtain light from upper right, natural wood grain, high angle detail close-up, natural grain, no flash, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，桌面木纹与自然光影.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S04-08　课桌间蹲姿平视近景

- 文件名：`style-film-classroom__08.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1米，蹲在过道同一高度，机位约0.9米高
- 动作：蹲在两排课桌之间，背靠课桌侧板，双膝并拢，双手抱住小腿，下巴轻靠膝头，视线平视前方
- 服装：白色短袖衬衫下摆自然，深色长裤；低马尾；保持学生气，不添加未确认饰品
- 光线：窗帘透光从画面右侧掠过课桌边缘照到人物侧脸，形成柔和小侧光；不补人工光
- 道具：课桌椅现场已有，无其他道具
- 裁切／必见：从头顶到膝盖，保留两侧课桌边框　｜　蹲姿的青涩收缩感、课桌间的空间关系与侧脸光影
- 废片判据：蹲姿走光、画面被课桌完全遮挡、侧光不足导致面部死黑

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Japanese film photography, old classroom, adult student crouching between two rows of desks, knees together, arms around lower legs, chin resting on knees, looking straight ahead, soft side light through curtain from right, white shirt and dark trousers, low ponytail, eye-level close shot between desks, natural grain, no flash, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，无其他道具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S04-09　离场前窗边侧逆光回望

- 文件名：`style-film-classroom__09.png`　近景 / 平视 / 35mm / f/2 / 竖幅
- 机位：距主体约2.5米，站在教室前门内侧，机位约1.4米高平视
- 动作：站在靠窗座位旁，身体侧对窗户，一只手轻扶椅背，转头回望镜头方向，表情平静微青涩
- 服装：白色短袖衬衫与深色长裤，衣摆自然；低马尾；自然肤感，无浓妆
- 光线：仅窗帘透光作为侧逆光，人物右肩和发丝有亮边，面部靠窗侧略亮；不补光
- 道具：课桌椅现场已有，无其他道具
- 裁切／必见：从头顶到腰际偏下，保留窗框与椅背　｜　回望眼神、侧逆光轮廓与青涩克制的情绪
- 废片判据：眼神空洞无焦点、侧逆光过曝失去面部层次、人物姿势过度摆拍

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, Japanese film photography, old classroom afternoon, adult student standing by window-side desk, body angled to window, one hand on chair back, turning head to look back toward camera, calm youthful expression, soft side-backlight through curtain from right rear, white shirt and dark trousers, low ponytail, eye-level medium close shot, natural grain, no flash, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 课桌椅现场已有，无其他道具.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S04-01 ｜ 镜头名 ｜ 35mm f/5.6`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

