# S22 · 猫与主人的居家午后

用例 `ppl-cat-home`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 宠物主人（pet owner） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 主人穿浅色棉质家居服，头发松散，妆面清淡；猫自然毛发，无需装饰 | 换衣即断系列 |
| 场地 | 家中客厅（猫窝与窗边地毯现场已有） | 同一处，背景元素不跑 |
| 光线 | 仅用窗边自然光，窗户在画面左后方形成侧逆光，地面用白色泡沫板补暗部，禁止闪光灯 | 主光方向不变 |
| 调色 | natural colour with a gentle film curve and consistent white balance | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A cozy living room afternoon, an adult sitting cross-legged on a rug near a window, a cat stretching near a cat bed, low ground-level camera, natural window backlight, soft atmosphere, healing lifestyle photography, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A cozy living room afternoon, an adult sitting cross-legged on a rug near a window, a cat stretching near a cat bed, low ground-level camera, natural window backlight, soft atmosphere, healing lifestyle photography, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, A cozy living room afternoon, an adult sitting cross-legged on a rug near a window, a cat stretching near a cat bed, low ground-level camera, natural window backlight, soft atmosphere, healing lifestyle photography, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `ppl-cat-home__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

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

- 文件名：`ppl-cat-home__01.png`
- 景别/角度/焦段/光圈：全身 / 地面低角度 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，趴地机位，离地约20厘米，镜头朝窗方向
- 动作：主人盘腿坐在地毯上，身体微侧向窗，一手自然搭膝，目光低垂看猫，猫在猫窝旁伸懒腰
- 道具：猫窝、窗边地毯（现场已有）　｜　裁切：保留窗户上缘与地毯边缘，人物与猫全身入画，不裁切天顶与地面
- 必见：客厅空间关系、窗、地毯、猫窝、主人与猫的相对位置　｜　废片判据：出现闪光灯痕迹、人物或猫被裁切、猫处于紧张炸毛状态

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, A cozy living room afternoon, an adult sitting cross-legged on a rug near a window, a cat stretching near a cat bed, low ground-level camera, natural window backlight, soft atmosphere, healing lifestyle photography, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: 猫窝、窗边地毯（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-02　窗光逆光毛边中景

- 文件名：`ppl-cat-home__02.png`
- 景别/角度/焦段/光圈：中景 / 地面低角度 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，趴地机位，离地约30厘米，镜头正对窗户
- 动作：主人侧坐地毯上，手轻放膝上，转头温柔看猫，猫坐在窗边地毯上望窗外
- 道具：窗边地毯（现场已有）　｜　裁切：裁切至主人膝盖以上、猫全身，保留窗户光晕区域
- 必见：逆光下主人发丝与猫毛的金色边缘光，温柔对视或望窗神态　｜　废片判据：逆光导致面部全黑、边缘光不明显、猫躲避光线

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, Backlit scene by a window, an adult sitting on a rug with a cat, rim light on hair and cat fur, soft natural light, ground-level camera angle, warm and healing mood, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: 窗边地毯（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-03　趴地低角度猫特写

- 文件名：`ppl-cat-home__03.png`
- 景别/角度/焦段/光圈：特写 / 地面低角度 / 85mm / f/1.8 / 竖幅
- 机位：距猫约30厘米，趴地机位，镜头与猫眼平齐
- 动作：猫卧在猫窝里，前爪收拢，眼睛半眯，主人手指轻触猫窝边缘
- 道具：猫窝（现场已有）　｜　裁切：紧凑裁切猫头部与前爪，主人手指局部入画，不裁耳朵
- 必见：猫眼部细节、毛发质感、放松的卧姿　｜　废片判据：猫睁大眼紧张、胡须被裁断、画面模糊

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, Close-up of a relaxed cat lying in a cat bed, human fingers touching the bed edge, soft window light, rim light on fur, low angle at cat eye level, intimate and gentle, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: 猫窝（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-04　主人手抚猫背中景

- 文件名：`ppl-cat-home__04.png`
- 景别/角度/焦段/光圈：中景 / 地面低角度 / 50mm / f/2.8 / 竖幅
- 机位：距主体约1.5米，趴地机位，离地约40厘米，侧对窗
- 动作：主人坐在地毯上，一手轻抚猫背，猫站立伸背，尾巴自然下垂
- 道具：窗边地毯（现场已有）　｜　裁切：裁切至主人腰部以上、猫全身，包含手部动作
- 必见：主人手掌轻抚猫背的动作、猫享受的姿态　｜　废片判据：猫弓背躲避、手部动作生硬、光线过平

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, An adult gently stroking a cat's back on a rug, cat stretching, soft diffuse window light, low camera angle, tender and healing moment, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: 窗边地毯（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-05　逆光毛边猫特写

- 文件名：`ppl-cat-home__05.png`
- 景别/角度/焦段/光圈：特写 / 地面低角度 / 85mm / f/1.8 / 竖幅
- 机位：距猫约50厘米，趴地机位，镜头与猫鼻齐平，正对窗
- 动作：猫坐在窗边地毯上，侧脸望光，胡须微微颤动，主人手在远处虚化
- 道具：窗边地毯（现场已有）　｜　裁切：特写猫头部与肩部，保留逆光光晕，不裁胡须
- 必见：猫毛边缘光、胡须细节、眼神光　｜　废片判据：逆光过曝失去毛发细节、猫闭眼或转头

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, Backlit close-up of a cat by a window, rim light on fur, whiskers detail, soft glow, low angle at cat level, peaceful afternoon, 85mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: 窗边地毯（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-06　主人温柔注视特写

- 文件名：`ppl-cat-home__06.png`
- 景别/角度/焦段/光圈：特写 / 低机位仰拍 / 50mm / f/1.8 / 竖幅
- 机位：距主人约1米，低位机位，离地约60厘米，略仰拍
- 动作：主人低头看猫，嘴角微扬，眼神柔和，头发垂落肩头
- 道具：无　｜　裁切：特写主人面部与肩部，猫耳或猫头局部入画虚化
- 必见：主人温柔眼神、嘴角弧度、自然肤质　｜　废片判据：表情僵硬、光线不匀、猫局部干扰主体

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, Close-up of an adult looking down with a gentle smile, soft window light from side, shallow depth of field with cat blurred in corner, warm and caring expression, 50mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-07　猫窝旁俯拍互动

- 文件名：`ppl-cat-home__07.png`
- 景别/角度/焦段/光圈：中景 / 正俯拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约1.2米，高位俯拍，相机离地约1.5米
- 动作：主人侧卧地毯上，单手托腮看猫，猫在猫窝里抬头与主人对视
- 道具：猫窝、地毯（现场已有）　｜　裁切：包括主人上半身、猫窝全貌，裁切至地毯边缘
- 必见：主人侧卧姿态、猫抬头对视、猫窝与地毯的质感　｜　废片判据：俯拍导致人物变形、猫被猫窝遮挡过多

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, Overhead shot of an adult lying on a rug looking at a cat in a cat bed, soft ambient light, cozy living room, peaceful interaction, 50mm lens at f/2.8, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: 猫窝、地毯（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-08　主人轻抚猫头中特写

- 文件名：`ppl-cat-home__08.png`
- 景别/角度/焦段/光圈：近景 / 地面低角度 / 50mm / f/2 / 竖幅
- 机位：距猫约40厘米，趴地机位，镜头与猫下巴平齐
- 动作：主人手指轻挠猫下巴，猫闭眼抬头享受，喉咙微动
- 道具：无　｜　裁切：中特写猫头部与主人手指，保留猫耳与胡须完整
- 必见：猫闭眼享受表情、手指轻挠动作、毛发细节　｜　废片判据：猫躲闪、手指遮挡猫眼、对焦不实

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, Medium close-up of a cat getting chin scratches from a human hand, cat eyes closed in bliss, soft side backlight, intimate and healing, 50mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S22-09　窗边地毯宁静收尾

- 文件名：`ppl-cat-home__09.png`
- 景别/角度/焦段/光圈：全身 / 低机位仰拍 / 50mm / f/4 / 竖幅
- 机位：距主体约2.5米，低位机位，离地约30厘米，侧对窗
- 动作：主人靠坐地毯上闭目养神，猫蜷缩在主人腿边睡觉
- 道具：窗边地毯、猫窝（现场已有）　｜　裁切：全景包含主人全身与猫、窗边环境，不裁切头顶与脚
- 必见：主人放松姿态、猫熟睡状态、午后的宁静氛围　｜　废片判据：猫被惊扰醒来、光线突变、构图失衡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, pet owner, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], natural colour with a gentle film curve and consistent white balance, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, A serene afternoon scene, an adult resting with eyes closed on a rug, a cat sleeping beside their legs, soft window light, low camera angle, peaceful and cozy, 50mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-cat-home__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: 窗边地毯、猫窝（现场已有）.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `ppl-cat-home__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

