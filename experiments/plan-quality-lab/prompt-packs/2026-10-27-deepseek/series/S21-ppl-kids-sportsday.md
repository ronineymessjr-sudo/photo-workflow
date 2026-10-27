# S21 · 儿童运动会抓拍

用例 `ppl-kids-sportsday`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：6至10岁儿童（监护人全程在场并已签授权）（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：运动短袖与运动短裤、运动鞋，发型清爽，无夸张配饰
- **场地**：小学操场（已获校方许可）
- **光线**：自然日光，顺侧光，不加闪光；靠操场开阔天空光与地面反射补足面部
- **调色**：black and white, strong grain, high micro-contrast
- **画幅**：竖幅 2:3
- **焦段序列**：150mm → 200mm → 200mm → 200mm → 180mm → 200mm → 200mm → 135mm → 200mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：70-200mm全程远距抓拍，机位距儿童10米以外不干扰比赛；蹲下平视儿童视角2镜；快门凝固奔跑2镜；禁用闪光灯；不单独带离儿童拍摄。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
documentary photo, 8 year old child standing behind starting line on a primary school running track, waiting quietly, natural daylight, shallow depth of field, blurred playground background, vivid energetic mood, no flash, telephoto compression, realistic look, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
documentary photo, 8 year old child standing behind starting line on a primary school running track, waiting quietly, natural daylight, shallow depth of field, blurred playground background, vivid energetic mood, no flash, telephoto compression, realistic look, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
documentary photo, 8 year old child standing behind starting line on a primary school running track, waiting quietly, natural daylight, shallow depth of field, blurred playground background, vivid energetic mood, no flash, telephoto compression, realistic look, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 操场全景环境交代 | 全身 | 平视 | 150mm | f/4 | 距主体约12米，站在操场边线外成人腰部高度平视 |
| 2 | 赛前专注半身 | 近景 | 低机位仰拍 | 200mm | f/2 | 距主体约10米，蹲下至儿童胸口高度平视 |
| 3 | 蹲姿平视起跑表情 | 近景 | 平视 | 200mm | f/2 | 距主体约10米，摄影师蹲下至与儿童眼睛同高平视 |
| 4 | 奔跑腾空凝固 | 全身 | 平视 | 200mm | f/4 | 距主体约12米，站在跑道外侧成人胸口高度，镜头随主体平移 |
| 5 | 奔跑侧向抓拍半身 | 近景 | 平视 | 180mm | f/2 | 距主体约10米，站在跑道侧方，机位与儿童肩部同高 |
| 6 | 冲线瞬间全身 | 全身 | 平视 | 200mm | f/4 | 距主体约12米，站在终点线侧前方，成人胸口高度平视 |
| 7 | 完赛喘息近景 | 特写 | 平视 | 200mm | f/1.8 | 距主体约10米，蹲下至儿童面部高度平视 |
| 8 | 终点后同伴区全身 | 全身 | 平视 | 135mm | f/4 | 距主体约11米，站在同伴区外侧成人腰部高度平视 |
| 9 | 操场边离场背影环境 | 全景 | 平视 | 200mm | f/5.6 | 距主体约12米，站在儿童后方侧位，成人胸口高度平视 |

### S21-01　操场全景环境交代

- 文件名：`ppl-kids-sportsday__01.png`　全身 / 平视 / 150mm / f/4 / 竖幅
- 机位：距主体约12米，站在操场边线外成人腰部高度平视
- 动作：儿童站在跑道起点线后自然等待，双手垂放身侧，眼睛望向远处赛道
- 服装：运动短袖与运动短裤、运动鞋，具体款式颜色待确认；发型清爽，无夸张配饰
- 光线：自然日光，顺侧光，不加闪光；靠操场开阔天空光与地面反射补足面部
- 道具：无
- 裁切／必见：保留头顶上方空间与跑道地面，不裁脚部　｜　儿童全身、起点线、操场跑道环境、远处活动人群虚化背景
- 废片判据：儿童被裁掉脚部、背景出现可识别的校名横幅、有其他儿童遮挡主体、过曝丢失天空细节

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, documentary photo, 8 year old child standing behind starting line on a primary school running track, waiting quietly, full body, natural daylight, shallow depth of field, blurred playground background, vivid energetic mood, no flash, telephoto compression, realistic look, 150mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-02　赛前专注半身

- 文件名：`ppl-kids-sportsday__02.png`　近景 / 低机位仰拍 / 200mm / f/2 / 竖幅
- 机位：距主体约10米，蹲下至儿童胸口高度平视
- 动作：儿童双脚前后开立微屈膝，双手轻握空拳置于身侧，目光专注看前方
- 服装：运动短袖、运动短裤、运动鞋，颜色款式待确认；额前碎发自然
- 光线：自然侧光，面光柔和；不补闪光，必要时用白色反光板在机位侧低位补面部阴影但需监护人同意且不进入赛道
- 道具：无
- 裁切／必见：从头顶上方至腰腹部，裁去腿部　｜　儿童眼神方向、抿嘴专注表情、肩颈姿态、运动服领口
- 废片判据：眼神未看向比赛方向、面部被头发遮挡、背景出现教师正脸、虚焦

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, documentary sports photo, focused 8 year old child in athletic wear before a race, knees slightly bent, fists loose at sides, looking forward, upper body portrait, soft natural side light, blurred school playground, no flashtelephoto, candid energetic mood, 200mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-03　蹲姿平视起跑表情

- 文件名：`ppl-kids-sportsday__03.png`　近景 / 平视 / 200mm / f/2 / 竖幅
- 机位：距主体约10米，摄影师蹲下至与儿童眼睛同高平视
- 动作：儿童蹲在起跑线后，一手撑地一手自然抬起，身体前倾，眼睛盯住前方
- 服装：运动短袖、运动短裤、运动鞋，具体颜色待确认；鞋带需系紧
- 光线：自然光顺光偏侧，面部受光均匀；禁用闪光，用现场天空光作主光
- 道具：无
- 裁切／必见：保留头顶空间至膝盖上方，前景裁去跑道地面杂物　｜　儿童眼睛、起跑蹲姿、手撑地动作、前方跑道方向
- 废片判据：儿童眼睛被刘海遮挡、面部曝光不足、构图裁掉撑地手部、背景杂乱抢眼

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, candid documentary photo, child in crouch start position on school track, one hand on ground, leaning forward, determined eyes, low eye-level angle, natural daylight, no flash, blurred running track backgroundtelephoto, energetic realistic style, 200mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-04　奔跑腾空凝固

- 文件名：`ppl-kids-sportsday__04.png`　全身 / 平视 / 200mm / f/4 / 竖幅
- 机位：距主体约12米，站在跑道外侧成人胸口高度，镜头随主体平移
- 动作：儿童在跑道上全力奔跑，前脚离地后脚蹬伸，双臂前后摆动
- 服装：运动短袖、运动短裤、运动鞋，款式颜色待确认；衣摆自然飘动
- 光线：户外自然光，高速快门凝固动作；不开闪光，靠提高感光度保证曝光
- 道具：无
- 裁切／必见：保留全身或膝上，前方留白，不裁掉前脚　｜　腾空双脚、摆臂动作、面部用力表情、跑道地面颗粒
- 废片判据：手脚被裁切、动作糊、快门不足导致拖影、面部被手臂完全遮挡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, frozen action documentary photo, child sprinting on school track, both feet off ground, arms pumping, intense expression, fast shutter freeze, natural daylight, no flash, blurred track background, telephoto, dynamic and energetic, 200mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-05　奔跑侧向抓拍半身

- 文件名：`ppl-kids-sportsday__05.png`　近景 / 平视 / 180mm / f/2 / 竖幅
- 机位：距主体约10米，站在跑道侧方，机位与儿童肩部同高
- 动作：儿童从画面左向右奔跑，身体前倾，右臂向前摆动，头发被风带起
- 服装：运动短袖、运动短裤、运动鞋，颜色待确认；头发自然飞扬
- 光线：侧逆光勾勒轮廓，面部用现场地面反射补光；禁用闪光
- 道具：无
- 裁切／必见：从头顶至腰部，保留摆臂完整　｜　侧脸用力表情、摆臂手部、肩背线条、奔跑方向
- 废片判据：面部死黑、手臂裁断、背景出现无关成人正脸、主体模糊

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, documentary sports action, child running left to right on track, leaning forward, arm swinging, hair flying, side profile, rim light from sun, natural fill, no flash, blurred playgroundtelephoto, vivid energetic mood, 180mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-06　冲线瞬间全身

- 文件名：`ppl-kids-sportsday__06.png`　全身 / 平视 / 200mm / f/4 / 竖幅
- 机位：距主体约12米，站在终点线侧前方，成人胸口高度平视
- 动作：儿童身体前倾冲过终点线区域，双臂后摆，脚步跨大
- 服装：运动短袖、运动短裤、运动鞋，颜色待确认；衣物贴身不松散
- 光线：自然顶光偏侧，用高速快门凝固；不开闪光，避免干扰比赛
- 道具：无
- 裁切／必见：保留全身与脚下方地面，不裁脚　｜　前倾冲线姿态、奔跑脚步、面部投入表情、操场地面
- 废片判据：脚部被裁、身体被他人遮挡、冲线动作不明确、快门拖影

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, documentary finish line photo, child leaning forward sprinting through finish area, arms back, large stride, full body, natural daylight, fast shutter, no flash, blurred school tracktelephoto, energetic candid, 200mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-07　完赛喘息近景

- 文件名：`ppl-kids-sportsday__07.png`　特写 / 平视 / 200mm / f/1.8 / 竖幅
- 机位：距主体约10米，蹲下至儿童面部高度平视
- 动作：儿童双手扶膝微微弯腰，抬头喘气，嘴角带笑，汗珠在额头
- 服装：运动短袖、运动短裤，颜色款式待确认；额前汗湿碎发
- 光线：自然柔光，面部受光均匀；禁用闪光，靠环境光与浅色地面反射
- 道具：无
- 裁切／必见：从头顶至胸口，保留完整面部与肩线　｜　喘气表情、额头汗珠、笑眼、扶膝的手部上缘
- 废片判据：面部被手遮挡、汗珠不自然、背景出现清晰成人面孔、曝光过度

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, candid close portrait, child catching breath after race, hands on knees, looking up smiling, sweat on forehead, natural soft daylight, no flash, blurred playground backgroundtelephoto, documentary sports mood, 200mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-08　终点后同伴区全身

- 文件名：`ppl-kids-sportsday__08.png`　全身 / 平视 / 135mm / f/4 / 竖幅
- 机位：距主体约11米，站在同伴区外侧成人腰部高度平视
- 动作：儿童站在终点线外的同伴等候区，单手叉腰，另一手自然下垂，身体放松
- 服装：运动短袖、运动短裤、运动鞋，颜色待确认；衣物略有汗湿
- 光线：自然日光顺光，脸部明亮；禁用闪光；靠环境光保持肤色
- 道具：无
- 裁切／必见：保留头顶至脚底，左右留适度空间　｜　儿童全身、放松神态、终点区域环境、操场地面
- 废片判据：儿童被其他同伴遮挡、脚部被裁、背景出现清晰校名、姿态僵硬

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, documentary full body photo, child standing relaxed in school playground after race, one hand on hip, natural expression, athletic wear, natural daylight, no flash, blurred grandstand backgroundtelephoto, lively candid style, 135mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-09　操场边离场背影环境

- 文件名：`ppl-kids-sportsday__09.png`　全景 / 平视 / 200mm / f/5.6 / 竖幅
- 机位：距主体约12米，站在儿童后方侧位，成人胸口高度平视
- 动作：儿童背对镜头沿跑道边慢慢走，双肩放松，一手轻摆，走向监护人方向
- 服装：运动短袖、运动短裤、运动鞋，颜色待确认；后背衣料有汗迹
- 光线：自然逆光勾勒轮廓，画面整体明亮；禁用闪光
- 道具：无
- 裁切／必见：保留儿童全身及上方操场空间，不裁脚　｜　儿童背影、操场跑道线条、远处看台与活动人群虚化
- 废片判据：儿童背影被裁切、逆光导致主体死黑、背景出现清晰可识别人员、画面失衡

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, documentary environmental back view, child walking along school track away from camera toward guardian, relaxed shoulders, athletic wear, natural backlight rim, no flash, blurred playground and grandstandtelephoto, quiet energetic ending mood, 200mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S21-01 ｜ 镜头名 ｜ 150mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

