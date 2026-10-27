# S23 · 商务人士办公室肖像

用例 `ppl-business-portrait`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名职场成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：商务正装（深色西装外套、浅色衬衫），妆发干净利落
- **场地**：办公室（落地窗、办公桌现场已有）
- **光线**：仅用落地窗自然侧光，不开启闪光灯；窗光从模特左前方45度入射，若反差过大可在暗部用白墙反光板补光，但不得直射
- **调色**：neutral daylight, clean whites, restrained saturation
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 85mm → 85mm → 85mm → 35mm → 85mm → 85mm → 85mm → 85mm → 85mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：85mm为主、35mm环境1镜；窗光侧位2镜、背对落地窗剪影1镜；机位写明距主体距离（特写1.2米左右）；不开闪光灯；桌面杂物入镜前先征得同意。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Business portrait of an adult professional standing beside an office desk, side to floor-to-ceiling window, hands relaxed, looking toward window light, dark suit and light shirt, clean grooming, natural window side light, no flash,  with window and desk in frame, trustworthy and capable mood, eye level, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Business portrait of an adult professional standing beside an office desk, side to floor-to-ceiling window, hands relaxed, looking toward window light, dark suit and light shirt, clean grooming, natural window side light, no flash,  with window and desk in frame, trustworthy and capable mood, eye level, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Business portrait of an adult professional standing beside an office desk, side to floor-to-ceiling window, hands relaxed, looking toward window light, dark suit and light shirt, clean grooming, natural window side light, no flash,  with window and desk in frame, trustworthy and capable mood, eye level, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 环境交代·窗光全景 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，相机高度约1.6米，与模特视线平齐 |
| 2 | 窗光侧位·中景半身 | 近景 | 平视 | 85mm | f/2 | 距主体约2米，相机高度约1.2米，略低于模特视线，形成轻微仰感 |
| 3 | 窗光侧位·近景特写 | 特写 | 平视 | 85mm | f/1.8 | 距主体约1.2米，相机高度与模特眼睛平齐 |
| 4 | 背对落地窗·剪影半身 | 中景 | 平视 | 85mm | f/2.8 | 距主体约3米，相机高度约1.5米，与模特胸部平齐 |
| 5 | 桌面工作·中景俯拍 | 中景 | 高机位俯拍 | 35mm | f/2.8 | 距主体约2米，相机高度约1.8米，从上向下俯拍 |
| 6 | 坐姿肖像·中近景平视 | 近景 | 平视 | 85mm | f/2 | 距主体约1.8米，相机高度约1.3米，与模特胸部平齐 |
| 7 | 站立远眺·中景侧影 | 中景 | 平视 | 85mm | f/2.8 | 距主体约2.5米，相机高度约1.5米，与模特胸部平齐 |
| 8 | 细节特写·手部与西装 | 大特写 | 平视 | 85mm | f/1.8 | 距手部约1.2米，相机高度约1米，从侧面平视 |
| 9 | 思考神态·近景侧脸 | 特写 | 平视 | 85mm | f/1.8 | 距主体约1.2米，相机高度约1.2米，与模特眼睛平齐 |
| 10 | 动态转身·中景抓拍 | 中景 | 平视 | 85mm | f/2.8 | 距主体约3米，相机高度约1.5米，与模特胸部平齐 |

### S23-01　环境交代·窗光全景

- 文件名：`ppl-business-portrait__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，相机高度约1.6米，与模特视线平齐
- 动作：站在办公桌旁，身体侧对落地窗，双手自然垂放，目光望向窗外光线方向
- 服装：商务正装（深色西装外套、浅色衬衫），妆发干净利落；具体品牌与款式待确认
- 光线：仅用落地窗自然侧光，不开启闪光灯；窗光从模特左前方45度入射，若反差过大可在暗部用白墙反光板补光，但不得直射
- 道具：无
- 裁切／必见：全身入画，保留落地窗顶部与地面，不裁切头部与脚部　｜　落地窗、办公桌一角、人物全身自然站姿与窗外光线方向
- 废片判据：人物剪影过暗无细节、窗框切割头部、桌面杂物未经同意入镜、闪光灯痕迹

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 1 of 10, Business portrait of an adult professional standing beside an office desk, side to floor-to-ceiling window, hands relaxed, looking toward window light, dark suit and light shirt, clean grooming, natural window side light, no flash, full body shot with window and desk in frame, trustworthy and capable mood, eye level, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-02　窗光侧位·中景半身

- 文件名：`ppl-business-portrait__02.png`　近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约2米，相机高度约1.2米，略低于模特视线，形成轻微仰感
- 动作：坐在办公桌后，身体微向左侧转，一手轻搭桌面，另一手自然放腿上，目光平视镜头
- 服装：深色西装外套、浅色衬衫，领口整洁；发型利落，淡妆；具体品牌待确认
- 光线：落地窗侧光作为主光，从模特左前方照射；右侧暗部用白色反光板补光，光比控制在1:3以内；禁用闪光灯
- 道具：无（桌面原有物品需提前征得同意方可入镜）
- 裁切／必见：裁切至胸部以上，保留完整头部与肩部，不裁切手部动作　｜　模特面部神态、西装领口层次、窗光在脸上的过渡
- 废片判据：面部阴影过重无细节、眼神呆滞、领口歪斜、背景杂物干扰、补光过硬产生第二阴影

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 2 of 10, Business portrait of an adult professional seated at an office desk, body slightly turned left, one hand on desk, looking at camera, dark suit and light shirt, clean hair, natural window side light from left, subtle fill from right, no flash, medium close-up, eye level, trustworthy mood, 85mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-03　窗光侧位·近景特写

- 文件名：`ppl-business-portrait__03.png`　特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1.2米，相机高度与模特眼睛平齐
- 动作：身体正对镜头，头部微向左侧窗光方向倾斜，眼神坚定看镜头，嘴角带一丝自信微笑
- 服装：深色西装外套、浅色衬衫，可解开一颗领扣显得干练；妆发整洁，皮肤质感自然；具体品牌待确认
- 光线：落地窗侧光作为主光，从模特左前方45度照射，在右脸形成柔和阴影；左侧用反光板补光，保持光比1:2；禁止闪光灯
- 道具：无
- 裁切／必见：裁切至肩部，保留完整头部与颈部，不裁切额头或下巴　｜　眼神光、皮肤纹理、西装面料质感、窗光在眼中的反射
- 废片判据：眼神光缺失、鼻影过重切断面部、领口不整、反光板穿帮、背景出现可识别人物或杂物

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 3 of 10, Close-up business portrait of an adult professional facing camera, head slightly tilted toward window light on left, confident slight smile, dark suit and light shirt with top button open, natural skin texture, window side light from left with soft fill, no flash, eye level, trustworthy and sharp mood, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-04　背对落地窗·剪影半身

- 文件名：`ppl-business-portrait__04.png`　中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约3米，相机高度约1.5米，与模特胸部平齐
- 动作：背对落地窗站立，身体正对镜头，双手自然交叠在身前，目光平视镜头
- 服装：深色西装外套、浅色衬衫，衬衫领口露出轮廓；发型轮廓清晰；具体品牌待确认
- 光线：落地窗作为背景强光，人物正面不补光，仅靠环境漫反射；如需保留面部细节，可在正面用白色反光板轻微补光，但保持剪影感；禁止闪光灯
- 道具：无
- 裁切／必见：裁切至腰部以上，保留完整头部与肩部轮廓，不裁切手臂动作　｜　人物剪影轮廓、窗框线条、面部若隐若现的细节
- 废片判据：面部完全死黑无细节、窗框与人物头部重叠、背景过曝丢失窗格、反光板穿帮

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 4 of 10, Half-body silhouette portrait of an adult professional standing with back to floor-to-ceiling window, facing camera, hands clasped in front, dark suit and light shirt, strong window backlight, minimal fill, no flash, eye level, capable and trustworthy mood, 85mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-05　桌面工作·中景俯拍

- 文件名：`ppl-business-portrait__05.png`　中景 / 高机位俯拍 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，相机高度约1.8米，从上向下俯拍
- 动作：坐在办公桌前，身体前倾，双手放在桌面上做书写状（无实物动作），目光看向桌面
- 服装：深色西装外套、浅色衬衫，袖口整洁；发型利落；具体品牌待确认
- 光线：落地窗侧光从模特左前方照射，桌面受光均匀；暗部用反光板补光；禁止闪光灯；桌面原有物品需征得同意方可入镜
- 道具：无（仅使用桌面原有物品，且需提前征得同意）
- 裁切／必见：裁切至人物膝盖以上，保留桌面动作区域与背景窗格　｜　模特专注表情、桌面工作姿态、窗光在桌面形成的光影
- 废片判据：桌面杂物未经同意入镜、人物头部被裁切、俯拍导致面部变形、光线过平无层次

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 5 of 10, Medium shot of an adult professional sitting at an office desk, leaning forward, hands on desk as if writing, looking down at desk, dark suit and light shirt, natural window side light, no flash, high angle view, focused and capable mood, background floor-to-ceiling window blurred, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-06　坐姿肖像·中近景平视

- 文件名：`ppl-business-portrait__06.png`　近景 / 平视 / 85mm / f/2 / 竖幅
- 机位：距主体约1.8米，相机高度约1.3米，与模特胸部平齐
- 动作：坐在办公椅上，背部挺直，双手轻握放在桌沿，目光平视镜头，表情从容
- 服装：深色西装外套、浅色衬衫，领带（若有）端正；妆发自然；具体品牌待确认
- 光线：落地窗侧光作为主光，从模特右侧照射（若窗在左则调换），面部受光均匀；左侧用反光板补光；禁止闪光灯
- 道具：无
- 裁切／必见：裁切至胸部以下、手部以上，保留完整头部与手部动作　｜　模特从容表情、手部自然姿态、西装剪裁线条
- 废片判据：手部动作僵硬、领口歪斜、背景出现杂物、光线过平无立体感

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 6 of 10, Medium close-up portrait of an adult professional sitting upright in an office chair, hands lightly gripping desk edge, looking at camera with calm expression, dark suit and light shirt, natural window side light, subtle fill, no flash, eye level, trustworthy mood, 85mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-07　站立远眺·中景侧影

- 文件名：`ppl-business-portrait__07.png`　中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，相机高度约1.5米，与模特胸部平齐
- 动作：站在落地窗前，侧身面向窗外，一只手轻搭在窗框或窗台上，目光远眺
- 服装：深色西装外套、浅色衬衫，外套可自然敞开；发型整洁；具体品牌待确认
- 光线：窗光从模特正面偏侧照射，面部与身体受光，背景窗外光线较强需控制曝光；暗部用反光板补光；禁止闪光灯
- 道具：无
- 裁切／必见：裁切至大腿中部，保留完整头部与手部动作，窗外景色不裁切过多　｜　模特侧脸轮廓、远眺神态、窗框与窗外光线
- 废片判据：窗外过曝失去细节、人物面部死黑、手部动作不自然、窗框切割头部

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 7 of 10, Medium shot of an adult professional standing by floor-to-ceiling window, side profile facing out, one hand resting on window frame, looking into distance, dark suit and light shirt, natural window light, subtle fill, no flash, eye level, contemplative and capable mood, 85mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-08　细节特写·手部与西装

- 文件名：`ppl-business-portrait__08.png`　大特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距手部约1.2米，相机高度约1米，从侧面平视
- 动作：只拍摄手部：双手在桌面自然交叠，手指微曲，手腕露出衬衫袖口
- 服装：深色西装外套、浅色衬衫，袖口露出约1厘米，手表（若有需征得同意）；具体品牌待确认
- 光线：窗光从侧面照射手部，突出质感与纹理；暗部用反光板轻微补光；禁止闪光灯
- 道具：无（若模特自带手表且同意入镜，可作为道具）
- 裁切／必见：裁切至小臂中部，保留双手完整与部分袖口　｜　手部皮肤纹理、西装面料细节、衬衫袖口层次
- 废片判据：手部动作僵硬不自然、光线过平缺乏质感、背景杂乱、手表未经同意入镜

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 8 of 10, Close-up detail shot of hands of an adult professional resting on office desk, fingers slightly curved, suit and shirt cuffs visible, natural window side light, no flash, eye level, shallow depth of field, focused and trustworthy mood, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-09　思考神态·近景侧脸

- 文件名：`ppl-business-portrait__09.png`　特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1.2米，相机高度约1.2米，与模特眼睛平齐
- 动作：坐在办公椅上，身体微向前倾，一手轻托下巴，目光看向窗外光线方向，若有所思
- 服装：深色西装外套、浅色衬衫，领口整洁；妆发自然；具体品牌待确认
- 光线：窗光从模特正面偏左照射，在侧脸形成轮廓光；暗部用反光板补光；禁止闪光灯
- 道具：无
- 裁切／必见：裁切至肩部以下、手部以上，保留完整头部与托下巴的手　｜　模特侧脸轮廓、思考神态、手部托下巴动作
- 废片判据：手部遮挡过多面部、光线过平无立体感、背景杂乱、眼神空洞

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 9 of 10, Close-up of an adult professional sitting at desk, body slightly leaning forward, one hand resting on chin, looking away toward window light, thoughtful expression, dark suit and light shirt, natural window side light, subtle fill, no flash, eye level, contemplative mood, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S23-10　动态转身·中景抓拍

- 文件名：`ppl-business-portrait__10.png`　中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约3米，相机高度约1.5米，与模特胸部平齐
- 动作：从背对镜头转身面向镜头，西装外套自然摆动，表情从严肃过渡到微笑
- 服装：深色西装外套、浅色衬衫，外套敞开显动感；发型自然；具体品牌待确认
- 光线：窗光作为主光，从模特左前方照射；暗部用反光板补光；禁止闪光灯
- 道具：无
- 裁切／必见：裁切至大腿中部，保留完整头部与转身动作　｜　转身动态、西装摆动衣角、面部表情变化
- 废片判据：动态模糊过度、面部失焦、表情不自然、背景线条切割人物

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: neutral daylight, clean whites, restrained saturation, 2:3 vertical framing, no in-image text or labels, frame 10 of 10, Medium shot of an adult professional turning from back to face camera, suit jacket swaying with motion, expression transitioning from serious to smile, dark suit and light shirt, natural window light, subtle fill, no flash, eye level, dynamic and trustworthy mood, 85mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：4×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S23-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

