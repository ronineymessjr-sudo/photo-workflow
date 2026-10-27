# S22 · 猫与主人的居家午后

用例 `ppl-cat-home`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人与其宠物猫（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：主人穿浅色棉质家居服，头发松散，妆面清淡；猫自然毛发，无需装饰
- **场地**：家中客厅（猫窝与窗边地毯现场已有）
- **光线**：仅用窗边自然光，窗户在画面左后方形成侧逆光，地面用白色泡沫板补暗部，禁止闪光灯
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：50mm → 50mm → 85mm → 50mm → 85mm → 50mm → 50mm → 50mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：50mm为主、85mm特写2镜；逗猫棒未备不得使用；窗光逆光毛边2镜；机位多为趴地低角度并写明与猫的距离（最近30厘米）；禁用闪光灯；不打扰猫的休息。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
A cozy living room afternoon, an adult sitting cross-legged on a rug near a window, a cat stretching near a cat bed, low ground-level camera, natural window backlight, soft atmosphere, healing lifestyle photography, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
A cozy living room afternoon, an adult sitting cross-legged on a rug near a window, a cat stretching near a cat bed, low ground-level camera, natural window backlight, soft atmosphere, healing lifestyle photography, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
A cozy living room afternoon, an adult sitting cross-legged on a rug near a window, a cat stretching near a cat bed, low ground-level camera, natural window backlight, soft atmosphere, healing lifestyle photography, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 客厅定场低角度 | 全身 | 地面低角度 | 50mm | f/4 | 距主体约3米，趴地机位，离地约20厘米，镜头朝窗方向 |
| 2 | 窗光逆光毛边中景 | 中景 | 地面低角度 | 50mm | f/2.8 | 距主体约2米，趴地机位，离地约30厘米，镜头正对窗户 |
| 3 | 趴地低角度猫特写 | 特写 | 地面低角度 | 85mm | f/1.8 | 距猫约30厘米，趴地机位，镜头与猫眼平齐 |
| 4 | 主人手抚猫背中景 | 中景 | 地面低角度 | 50mm | f/2.8 | 距主体约1.5米，趴地机位，离地约40厘米，侧对窗 |
| 5 | 逆光毛边猫特写 | 特写 | 地面低角度 | 85mm | f/1.8 | 距猫约50厘米，趴地机位，镜头与猫鼻齐平，正对窗 |
| 6 | 主人温柔注视特写 | 特写 | 低机位仰拍 | 50mm | f/1.8 | 距主人约1米，低位机位，离地约60厘米，略仰拍 |
| 7 | 猫窝旁俯拍互动 | 中景 | 正俯拍 | 50mm | f/2.8 | 距主体约1.2米，高位俯拍，相机离地约1.5米 |
| 8 | 主人轻抚猫头中特写 | 近景 | 地面低角度 | 50mm | f/2 | 距猫约40厘米，趴地机位，镜头与猫下巴平齐 |
| 9 | 窗边地毯宁静收尾 | 全身 | 低机位仰拍 | 50mm | f/4 | 距主体约2.5米，低位机位，离地约30厘米，侧对窗 |

### S22-01　客厅定场低角度

- 文件名：`ppl-cat-home__01.png`　全身 / 地面低角度 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，趴地机位，离地约20厘米，镜头朝窗方向
- 动作：主人盘腿坐在地毯上，身体微侧向窗，一手自然搭膝，目光低垂看猫，猫在猫窝旁伸懒腰
- 服装：主人穿浅色棉质家居服，头发松散，妆面清淡；猫自然毛发，无需装饰
- 光线：仅用窗边自然光，窗户在画面左后方形成侧逆光，地面用白色泡沫板补暗部，禁止闪光灯
- 道具：猫窝、窗边地毯（现场已有）
- 裁切／必见：保留窗户上缘与地毯边缘，人物与猫全身入画，不裁切天顶与地面　｜　客厅空间关系、窗、地毯、猫窝、主人与猫的相对位置
- 废片判据：出现闪光灯痕迹、人物或猫被裁切、猫处于紧张炸毛状态

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, A cozy living room afternoon, an adult sitting cross-legged on a rug near a window, a cat stretching near a cat bed, low ground-level camera, natural window backlight, soft atmosphere, healing lifestyle photography, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 猫窝、窗边地毯（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-02　窗光逆光毛边中景

- 文件名：`ppl-cat-home__02.png`　中景 / 地面低角度 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，趴地机位，离地约30厘米，镜头正对窗户
- 动作：主人侧坐地毯上，手轻放膝上，转头温柔看猫，猫坐在窗边地毯上望窗外
- 服装：同上，主人服装保持浅色棉质，猫毛自然蓬松
- 光线：窗光从人物与猫后方逆射，发丝与猫毛边缘产生光晕，正面用反光板补柔光，禁止闪光灯
- 道具：窗边地毯（现场已有）
- 裁切／必见：裁切至主人膝盖以上、猫全身，保留窗户光晕区域　｜　逆光下主人发丝与猫毛的金色边缘光，温柔对视或望窗神态
- 废片判据：逆光导致面部全黑、边缘光不明显、猫躲避光线

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, Backlit scene by a window, an adult sitting on a rug with a cat, rim light on hair and cat fur, soft natural light, ground-level camera angle, warm and healing mood, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 窗边地毯（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-03　趴地低角度猫特写

- 文件名：`ppl-cat-home__03.png`　特写 / 地面低角度 / 85mm / f/1.8 / 竖幅
- 机位：距猫约30厘米，趴地机位，镜头与猫眼平齐
- 动作：猫卧在猫窝里，前爪收拢，眼睛半眯，主人手指轻触猫窝边缘
- 服装：猫自然状态，主人手部干净无饰品
- 光线：窗光从猫侧后方来，形成柔和轮廓光，正面用白纸反光补眼亮，禁止闪光灯
- 道具：猫窝（现场已有）
- 裁切／必见：紧凑裁切猫头部与前爪，主人手指局部入画，不裁耳朵　｜　猫眼部细节、毛发质感、放松的卧姿
- 废片判据：猫睁大眼紧张、胡须被裁断、画面模糊

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, Close-up of a relaxed cat lying in a cat bed, human fingers touching the bed edge, soft window light, rim light on fur, low angle at cat eye level, intimate and gentle, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 猫窝（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-04　主人手抚猫背中景

- 文件名：`ppl-cat-home__04.png`　中景 / 地面低角度 / 50mm / f/2.8 / 竖幅
- 机位：距主体约1.5米，趴地机位，离地约40厘米，侧对窗
- 动作：主人坐在地毯上，一手轻抚猫背，猫站立伸背，尾巴自然下垂
- 服装：主人穿宽松棉麻上衣，袖口卷起，猫毛顺滑
- 光线：窗光从左侧漫射，无强烈阴影，用反光板降低对比，禁止闪光灯
- 道具：窗边地毯（现场已有）
- 裁切／必见：裁切至主人腰部以上、猫全身，包含手部动作　｜　主人手掌轻抚猫背的动作、猫享受的姿态
- 废片判据：猫弓背躲避、手部动作生硬、光线过平

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, An adult gently stroking a cat's back on a rug, cat stretching, soft diffuse window light, low camera angle, tender and healing moment, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 窗边地毯（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-05　逆光毛边猫特写

- 文件名：`ppl-cat-home__05.png`　特写 / 地面低角度 / 85mm / f/1.8 / 竖幅
- 机位：距猫约50厘米，趴地机位，镜头与猫鼻齐平，正对窗
- 动作：猫坐在窗边地毯上，侧脸望光，胡须微微颤动，主人手在远处虚化
- 服装：猫自然毛发，无需装饰
- 光线：窗光逆光，猫毛边缘产生金色光晕，正面用小型反光板补暗部，禁止闪光灯
- 道具：窗边地毯（现场已有）
- 裁切／必见：特写猫头部与肩部，保留逆光光晕，不裁胡须　｜　猫毛边缘光、胡须细节、眼神光
- 废片判据：逆光过曝失去毛发细节、猫闭眼或转头

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, Backlit close-up of a cat by a window, rim light on fur, whiskers detail, soft glow, low angle at cat level, peaceful afternoon, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 窗边地毯（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-06　主人温柔注视特写

- 文件名：`ppl-cat-home__06.png`　特写 / 低机位仰拍 / 50mm / f/1.8 / 竖幅
- 机位：距主人约1米，低位机位，离地约60厘米，略仰拍
- 动作：主人低头看猫，嘴角微扬，眼神柔和，头发垂落肩头
- 服装：主人家居服领口自然，妆容淡雅，发丝自然
- 光线：窗光从侧前方45度照射，用反光板补眼神光，背景自然暗，禁止闪光灯
- 道具：无
- 裁切／必见：特写主人面部与肩部，猫耳或猫头局部入画虚化　｜　主人温柔眼神、嘴角弧度、自然肤质
- 废片判据：表情僵硬、光线不匀、猫局部干扰主体

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, Close-up of an adult looking down with a gentle smile, soft window light from side, shallow depth of field with cat blurred in corner, warm and caring expression, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-07　猫窝旁俯拍互动

- 文件名：`ppl-cat-home__07.png`　中景 / 正俯拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约1.2米，高位俯拍，相机离地约1.5米
- 动作：主人侧卧地毯上，单手托腮看猫，猫在猫窝里抬头与主人对视
- 服装：主人衣服宽松柔软，猫在窝里舒适
- 光线：顶光通过白色天花板反射，形成均匀柔光，禁止闪光灯
- 道具：猫窝、地毯（现场已有）
- 裁切／必见：包括主人上半身、猫窝全貌，裁切至地毯边缘　｜　主人侧卧姿态、猫抬头对视、猫窝与地毯的质感
- 废片判据：俯拍导致人物变形、猫被猫窝遮挡过多

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, Overhead shot of an adult lying on a rug looking at a cat in a cat bed, soft ambient light, cozy living room, peaceful interaction, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 猫窝、地毯（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-08　主人轻抚猫头中特写

- 文件名：`ppl-cat-home__08.png`　近景 / 地面低角度 / 50mm / f/2 / 竖幅
- 机位：距猫约40厘米，趴地机位，镜头与猫下巴平齐
- 动作：主人手指轻挠猫下巴，猫闭眼抬头享受，喉咙微动
- 服装：主人手部干净，猫毛发蓬松
- 光线：窗光从侧后方来，猫脸正面用反光板补光，眼神光柔和，禁止闪光灯
- 道具：无
- 裁切／必见：中特写猫头部与主人手指，保留猫耳与胡须完整　｜　猫闭眼享受表情、手指轻挠动作、毛发细节
- 废片判据：猫躲闪、手指遮挡猫眼、对焦不实

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, Medium close-up of a cat getting chin scratches from a human hand, cat eyes closed in bliss, soft side backlight, intimate and healing, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-09　窗边地毯宁静收尾

- 文件名：`ppl-cat-home__09.png`　全身 / 低机位仰拍 / 50mm / f/4 / 竖幅
- 机位：距主体约2.5米，低位机位，离地约30厘米，侧对窗
- 动作：主人靠坐地毯上闭目养神，猫蜷缩在主人腿边睡觉
- 服装：主人家居服自然褶皱，猫毛放松
- 光线：窗光柔和漫射，整体低对比，用反光板微微补光，禁止闪光灯
- 道具：窗边地毯、猫窝（现场已有）
- 裁切／必见：全景包含主人全身与猫、窗边环境，不裁切头顶与脚　｜　主人放松姿态、猫熟睡状态、午后的宁静氛围
- 废片判据：猫被惊扰醒来、光线突变、构图失衡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, A serene afternoon scene, an adult resting with eyes closed on a rug, a cat sleeping beside their legs, soft window light, low camera angle, peaceful and cozy, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 窗边地毯、猫窝（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S22-01 ｜ 镜头名 ｜ 50mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

