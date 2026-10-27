# S21 · 儿童运动会抓拍

用例 `ppl-kids-sportsday`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 一、身份卡（Identity Card）— 全系列不许变

| 项目 | 锁定值 | 说明 |
|---|---|---|
| 性别/年龄段 | 儿童（child） | 由需求推断，不符请先改这里 |
| 发型 | hairstyle fixed at the reference frame | 必须由参考帧定死 |
| 脸型/五官 | 以参考帧为准，逐帧一致 | 换脸即废片 |
| 肤色/妆容 | 以参考帧为准，不中途换妆 | 避免帧间色差 |
| 服装 | 运动短袖与运动短裤、运动鞋，发型清爽，无夸张配饰 | 换衣即断系列 |
| 场地 | 小学操场（已获校方许可） | 同一处，背景元素不跑 |
| 光线 | 自然日光，顺侧光，不加闪光；靠操场开阔天空光与地面反射补足面部 | 主光方向不变 |
| 调色 | black and white with strong grain and high micro-contrast | 一套 LUT 到底 |

## 二、两条锁（每帧提示词开头，必须逐字相同）

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames
```

```text
[STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look
```

> 这两段是**字符串级复制**：改一个词就破坏一致性，`check-series-consistency.mjs` 会报错。

## 三、第一步：定妆参考帧（出 3 张，挑 1 张作 REF）

### 参考帧 A · 正面胸像

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, documentary photo, 8 year old child standing behind starting line on a primary school running track, waiting quietly, natural daylight, shallow depth of field, blurred playground background, vivid energetic mood, no flash, telephoto compression, realistic look, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, documentary photo, 8 year old child standing behind starting line on a primary school running track, waiting quietly, natural daylight, shallow depth of field, blurred playground background, vivid energetic mood, no flash, telephoto compression, realistic look, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, documentary photo, 8 year old child standing behind starting line on a primary school running track, waiting quietly, natural daylight, shallow depth of field, blurred playground background, vivid energetic mood, no flash, telephoto compression, realistic look, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, clean unmarked frame.
```

> 三张里挑**脸最稳、衣服最还原**的一张，命名为 `ppl-kids-sportsday__REF-A.png`，后面所有帧都从它出发。

## 四、分镜序列（全部以 REF 为参考图，逐帧只改机位与姿势）

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

- 文件名：`ppl-kids-sportsday__01.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 150mm / f/4 / 竖幅
- 机位：距主体约12米，站在操场边线外成人腰部高度平视
- 动作：儿童站在跑道起点线后自然等待，双手垂放身侧，眼睛望向远处赛道
- 道具：无　｜　裁切：保留头顶上方空间与跑道地面，不裁脚部
- 必见：儿童全身、起点线、操场跑道环境、远处活动人群虚化背景　｜　废片判据：儿童被裁掉脚部、背景出现可识别的校名横幅、有其他儿童遮挡主体、过曝丢失天空细节

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 1/9] 2:3 vertical, documentary photo, 8 year old child standing behind starting line on a primary school running track, waiting quietly, full body, natural daylight, shallow depth of field, blurred playground background, vivid energetic mood, no flash, telephoto compression, realistic look, 150mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 1. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-02　赛前专注半身

- 文件名：`ppl-kids-sportsday__02.png`
- 景别/角度/焦段/光圈：近景 / 低机位仰拍 / 200mm / f/2 / 竖幅
- 机位：距主体约10米，蹲下至儿童胸口高度平视
- 动作：儿童双脚前后开立微屈膝，双手轻握空拳置于身侧，目光专注看前方
- 道具：无　｜　裁切：从头顶上方至腰腹部，裁去腿部
- 必见：儿童眼神方向、抿嘴专注表情、肩颈姿态、运动服领口　｜　废片判据：眼神未看向比赛方向、面部被头发遮挡、背景出现教师正脸、虚焦

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 2/9] 2:3 vertical, documentary sports photo, focused 8 year old child in athletic wear before a race, knees slightly bent, fists loose at sides, looking forward, upper body portrait, soft natural side light, blurred school playground, no flashtelephoto, candid energetic mood, 200mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 2. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-03　蹲姿平视起跑表情

- 文件名：`ppl-kids-sportsday__03.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 200mm / f/2 / 竖幅
- 机位：距主体约10米，摄影师蹲下至与儿童眼睛同高平视
- 动作：儿童蹲在起跑线后，一手撑地一手自然抬起，身体前倾，眼睛盯住前方
- 道具：无　｜　裁切：保留头顶空间至膝盖上方，前景裁去跑道地面杂物
- 必见：儿童眼睛、起跑蹲姿、手撑地动作、前方跑道方向　｜　废片判据：儿童眼睛被刘海遮挡、面部曝光不足、构图裁掉撑地手部、背景杂乱抢眼

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 3/9] 2:3 vertical, candid documentary photo, child in crouch start position on school track, one hand on ground, leaning forward, determined eyes, low eye-level angle, natural daylight, no flash, blurred running track backgroundtelephoto, energetic realistic style, 200mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 3. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-04　奔跑腾空凝固

- 文件名：`ppl-kids-sportsday__04.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 200mm / f/4 / 竖幅
- 机位：距主体约12米，站在跑道外侧成人胸口高度，镜头随主体平移
- 动作：儿童在跑道上全力奔跑，前脚离地后脚蹬伸，双臂前后摆动
- 道具：无　｜　裁切：保留全身或膝上，前方留白，不裁掉前脚
- 必见：腾空双脚、摆臂动作、面部用力表情、跑道地面颗粒　｜　废片判据：手脚被裁切、动作糊、快门不足导致拖影、面部被手臂完全遮挡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 4/9] 2:3 vertical, frozen action documentary photo, child sprinting on school track, both feet off ground, arms pumping, intense expression, fast shutter freeze, natural daylight, no flash, blurred track background, telephoto, dynamic and energetic, 200mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 4. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-05　奔跑侧向抓拍半身

- 文件名：`ppl-kids-sportsday__05.png`
- 景别/角度/焦段/光圈：近景 / 平视 / 180mm / f/2 / 竖幅
- 机位：距主体约10米，站在跑道侧方，机位与儿童肩部同高
- 动作：儿童从画面左向右奔跑，身体前倾，右臂向前摆动，头发被风带起
- 道具：无　｜　裁切：从头顶至腰部，保留摆臂完整
- 必见：侧脸用力表情、摆臂手部、肩背线条、奔跑方向　｜　废片判据：面部死黑、手臂裁断、背景出现无关成人正脸、主体模糊

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 5/9] 2:3 vertical, documentary sports action, child running left to right on track, leaning forward, arm swinging, hair flying, side profile, rim light from sun, natural fill, no flash, blurred playgroundtelephoto, vivid energetic mood, 180mm lens at f/2, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 5. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-06　冲线瞬间全身

- 文件名：`ppl-kids-sportsday__06.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 200mm / f/4 / 竖幅
- 机位：距主体约12米，站在终点线侧前方，成人胸口高度平视
- 动作：儿童身体前倾冲过终点线区域，双臂后摆，脚步跨大
- 道具：无　｜　裁切：保留全身与脚下方地面，不裁脚
- 必见：前倾冲线姿态、奔跑脚步、面部投入表情、操场地面　｜　废片判据：脚部被裁、身体被他人遮挡、冲线动作不明确、快门拖影

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 6/9] 2:3 vertical, documentary finish line photo, child leaning forward sprinting through finish area, arms back, large stride, full body, natural daylight, fast shutter, no flash, blurred school tracktelephoto, energetic candid, 200mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 6. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-07　完赛喘息近景

- 文件名：`ppl-kids-sportsday__07.png`
- 景别/角度/焦段/光圈：特写 / 平视 / 200mm / f/1.8 / 竖幅
- 机位：距主体约10米，蹲下至儿童面部高度平视
- 动作：儿童双手扶膝微微弯腰，抬头喘气，嘴角带笑，汗珠在额头
- 道具：无　｜　裁切：从头顶至胸口，保留完整面部与肩线
- 必见：喘气表情、额头汗珠、笑眼、扶膝的手部上缘　｜　废片判据：面部被手遮挡、汗珠不自然、背景出现清晰成人面孔、曝光过度

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 7/9] 2:3 vertical, candid close portrait, child catching breath after race, hands on knees, looking up smiling, sweat on forehead, natural soft daylight, no flash, blurred playground backgroundtelephoto, documentary sports mood, 200mm lens at f/1.8, shallow depth of field with creamy bokeh, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 7. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-08　终点后同伴区全身

- 文件名：`ppl-kids-sportsday__08.png`
- 景别/角度/焦段/光圈：全身 / 平视 / 135mm / f/4 / 竖幅
- 机位：距主体约11米，站在同伴区外侧成人腰部高度平视
- 动作：儿童站在终点线外的同伴等候区，单手叉腰，另一手自然下垂，身体放松
- 道具：无　｜　裁切：保留头顶至脚底，左右留适度空间
- 必见：儿童全身、放松神态、终点区域环境、操场地面　｜　废片判据：儿童被其他同伴遮挡、脚部被裁、背景出现清晰校名、姿态僵硬

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 8/9] 2:3 vertical, documentary full body photo, child standing relaxed in school playground after race, one hand on hip, natural expression, athletic wear, natural daylight, no flash, blurred grandstand backgroundtelephoto, lively candid style, 135mm lens at f/4, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 8. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S21-09　操场边离场背影环境

- 文件名：`ppl-kids-sportsday__09.png`
- 景别/角度/焦段/光圈：全景 / 平视 / 200mm / f/5.6 / 竖幅
- 机位：距主体约12米，站在儿童后方侧位，成人胸口高度平视
- 动作：儿童背对镜头沿跑道边慢慢走，双肩放松，一手轻摆，走向监护人方向
- 道具：无　｜　裁切：保留儿童全身及上方操场空间，不裁脚
- 必见：儿童背影、操场跑道线条、远处看台与活动人群虚化　｜　废片判据：儿童背影被裁切、逆光导致主体死黑、背景出现清晰可识别人员、画面失衡

```text
[IDENTITY LOCK], one single person, the same person as the reference image, child, hairstyle fixed at the reference frame, identical face shape, nose, eye spacing, mouth and jawline in every frame, identical skin tone and identical makeup in every frame, never swap in another face or another model between frames, [STYLE LOCK], black and white with strong grain and high micro-contrast, one single lighting direction for the whole series, 2:3 vertical framing, natural skin texture, no beauty-filter plastic look, [FRAME 9/9] 2:3 vertical, documentary environmental back view, child walking along school track away from camera toward guardian, relaxed shoulders, athletic wear, natural backlight rim, no flash, blurred playground and grandstandtelephoto, quiet energetic ending mood, 200mm lens at f/5.6, subject and environment both clearly readable, photorealistic editorial photograph, clean unmarked frame.
```

编辑指令（用 REF 图生图）：`Keep the face, hairstyle and outfit identical to ppl-kids-sportsday__REF-A.png. Change only camera position, framing and pose to match FRAME 9. Props allowed: none.`

负面：`no text or labels inside the image, no watermark, no extra people, no props beyond the listed ones, no flash, different person, changed hairstyle, changed outfit, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 五、参考图模式（不同模型怎么保证不换脸）

| 模型/工具 | 保证同一人的手段 | 备注 |
|---|---|---|
| GPT Image 2 / 2.5 | 用 `ppl-kids-sportsday__REF-A.png` 走编辑模式，`input_fidelity` 调高；提示词原样带上 [IDENTITY LOCK] | 同一对话内连续编辑，别新开 |
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

