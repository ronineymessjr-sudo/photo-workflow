# S28 · 游泳者出水瞬间

用例 `ppl-swimmer-poolside`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年游泳者（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：泳帽与泳镜按现场既有装备，款式颜色；无额外妆发
- **场地**：室内游泳馆（已获许可，池畔拍摄）
- **光线**：使用泳馆顶部既有照明，关掉所有闪光灯；ISO提高保证1/1000秒以上快门
- **调色**：bright airy pastel, golden backlight, gentle bloom
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 85mm → 135mm → 135mm → 135mm → 85mm → 85mm → 100mm → 50mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：防水壳未备：摄影师不下水、不探出池边，全部镜头在岸上完成；135mm远摄出水瞬间3镜（机位距池边2米、距泳者8米以上）；水珠凝固用高速快门；禁用闪光灯（游泳馆规定）；地面湿滑写明站位。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
side view , adult swimmer rising from water with one arm sweeping upward, water droplets chained in air, indoor pool ceiling light, reflector fill, no flash, muscular dynamic, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
side view , adult swimmer rising from water with one arm sweeping upward, water droplets chained in air, indoor pool ceiling light, reflector fill, no flash, muscular dynamic, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
side view , adult swimmer rising from water with one arm sweeping upward, water droplets chained in air, indoor pool ceiling light, reflector fill, no flash, muscular dynamic, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 池畔环境定场 | 全景 | 平视 | 35mm | f/5.6 | 距主体约8米，站在池畔防滑垫上，机位高约1.6米平视 |
| 2 | 蹬壁前蓄力 | 中景 | 低机位仰拍 | 85mm | f/2.8 | 距主体约7米，侧向站在池畔，机位高约0.8米低角度 |
| 3 | 破水前水面压缩 | 近景 | 低机位仰拍 | 135mm | f/2 | 距池边2米、距泳者约8米以上，站在湿滑区的防滑垫上，机位高约1.2米略低 |
| 4 | 出水瞬间水花爆发 | 近景 | 平视 | 135mm | f/2 | 距池边2米、距主体约8米，站在防滑垫上，机位高约1.5米平视 |
| 5 | 仰头吸气特写 | 特写 | 平视 | 135mm | f/1.8 | 距池边2米、距主体约8米，站在防滑垫上，机位高约1.6米平视 |
| 6 | 手臂拨水上举 | 中景 | 平视 | 85mm | f/2.8 | 距主体约6米，侧向站在池畔，机位高约1.4米平视 |
| 7 | 挺胸站起半身 | 中景 | 平视 | 85mm | f/2.8 | 距主体约7米，正面站在池畔防滑垫上，机位高约1.5米平视 |
| 8 | 水珠凝固细节 | 大特写 | 平视 | 100mm | f/1.8 | 距主体约5米，正面稍低站位，机位高约1.2米 |
| 9 | 踏上池岸出水上岸 | 全身 | 低机位仰拍 | 50mm | f/4 | 距主体约4米，侧后方向站在防滑垫上，机位高约1.0米低角度 |
| 10 | 站稳喘息收束 | 中全 | 平视 | 35mm | f/3.5 | 距主体约3米，正面站在防滑垫上，机位高约1.5米平视 |

### S28-01　池畔环境定场

- 文件名：`ppl-swimmer-poolside__01.png`　全景 / 平视 / 35mm / f/5.6 / 横幅
- 机位：距主体约8米，站在池畔防滑垫上，机位高约1.6米平视
- 动作：泳者在泳道中段踩水待命，双臂在水下轻划保持浮力，目视前方不朝镜头
- 服装：泳帽与泳镜按现场既有装备，款式颜色待确认；无额外妆发
- 光线：使用泳馆顶部既有照明，关掉所有闪光灯；ISO提高保证1/1000秒以上快门
- 道具：无
- 裁切／必见：保留池岸上缘与水面，不裁掉泳道线起点　｜　泳者待命姿态、泳道线与池畔湿滑地面
- 废片判据：闪光灯痕迹、泳者被裁切、构图明显倾斜

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 1 of 10, indoor swimming pool wide establishing shot, adult swimmer treading water mid-lane, lane ropes receding, wet pool deck in foreground, available ceiling light only, no flash, eye level, dynamic documentary photography, 35mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-02　蹬壁前蓄力

- 文件名：`ppl-swimmer-poolside__02.png`　中景 / 低机位仰拍 / 85mm / f/2.8 / 竖幅
- 机位：距主体约7米，侧向站在池畔，机位高约0.8米低角度
- 动作：泳者屈膝蹬住池壁，身体前倾收紧，双臂前伸准备出发，面部绷紧
- 服装：泳帽泳镜待确认；水珠附着面部与肩部
- 光线：现场顶光加池畔地面反射；右侧反光板补亮肩部轮廓，禁用闪光
- 道具：无
- 裁切／必见：从头部至腰部，保留蹬壁脚部的一部分　｜　屈膝蹬壁的发力姿态与水珠
- 废片判据：对焦落在水面而非人物、姿态松垮、反光板穿帮

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 2 of 10, low angle side view, adult swimmer crouched against pool wall ready to push off, tense powerful posture, water droplets, indoor pool light, reflector fill, no flash, dynamic sports photography, 85mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-03　破水前水面压缩

- 文件名：`ppl-swimmer-poolside__03.png`　近景 / 低机位仰拍 / 135mm / f/2 / 竖幅
- 机位：距池边2米、距泳者约8米以上，站在湿滑区的防滑垫上，机位高约1.2米略低
- 动作：泳者低头收颌，双臂并拢前伸，身体呈流线型入水前一刻
- 服装：泳帽泳镜待确认；肩背水珠清晰
- 光线：只用泳馆顶光，快门1/2000秒凝固水珠；白平衡待现场确认
- 道具：无
- 裁切／必见：头顶留少量空间，底部保留水面波纹　｜　流线型身体与水珠
- 废片判据：手抖虚焦、泳者出画、闪光灯补光

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 3 of 10, telephoto, adult swimmer in streamlined position just before breaking water surface, droplets frozen, indoor pool overhead light, no flash, high shutter speed, powerful silence before splash, 135mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-04　出水瞬间水花爆发

- 文件名：`ppl-swimmer-poolside__04.png`　近景 / 平视 / 135mm / f/2 / 竖幅
- 机位：距池边2米、距主体约8米，站在防滑垫上，机位高约1.5米平视
- 动作：泳者从水中向上冲起，头肩先破水面，双臂向上甩开，嘴微张呼气
- 服装：泳帽泳镜待确认，泳镜带勒痕自然；水珠附满肩颈
- 光线：顶光逆光方向略侧，水珠靠亮度对比发亮；不用闪光，快门1/2500秒
- 道具：无
- 裁切／必见：头顶上方留少量水花空间，裁到大腿附近　｜　破水瞬间的头肩与飞溅水珠
- 废片判据：水花糊成一片、面部全黑、对焦落在背景

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 4 of 10, telephoto, adult swimmer bursting up out of pool water, head and shoulders breaking surface, spray frozen in air, side backlight from ceiling, no flash, 1/2500s, powerful dynamic sports moment, 135mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-05　仰头吸气特写

- 文件名：`ppl-swimmer-poolside__05.png`　特写 / 平视 / 135mm / f/1.8 / 竖幅
- 机位：距池边2米、距主体约8米，站在防滑垫上，机位高约1.6米平视
- 动作：泳者出水后仰头吸气，下巴抬起，水珠沿面颊滑落
- 服装：泳帽泳镜待确认，泳镜推上额头；水珠挂在眉骨
- 光线：现场顶光加左侧反光板柔化面部阴影；禁用闪光，快门1/2000秒
- 道具：无
- 裁切／必见：头部至上胸，保留水珠滑落轨迹　｜　吸气表情、水珠与泳镜细节
- 废片判据：面部阴影过重、水珠被抹掉、镜头进水

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 5 of 10, telephoto close up, adult swimmer emerging, head tilted back inhaling, droplets sliding down face, goggles pushed up, reflector fill from left, no flash, indoor pool, 1/2000s, 135mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-06　手臂拨水上举

- 文件名：`ppl-swimmer-poolside__06.png`　中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约6米，侧向站在池畔，机位高约1.4米平视
- 动作：泳者单臂向上拨水，肘部抬高，手掌张开推水，身体侧转
- 服装：泳帽泳镜待确认，肩臂肌肉受光；水珠成链
- 光线：顶光从右上照下，左前方反光板补暗部；禁用闪光
- 道具：无
- 裁切／必见：从手部到腰线，保留手臂延伸空间　｜　上举手臂与水珠链条
- 废片判据：手臂被裁断、背景杂乱、水花遮挡面部

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 6 of 10, side view medium shot, adult swimmer rising from water with one arm sweeping upward, water droplets chained in air, indoor pool ceiling light, reflector fill, no flash, muscular dynamic, 85mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-07　挺胸站起半身

- 文件名：`ppl-swimmer-poolside__07.png`　中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约7米，正面站在池畔防滑垫上，机位高约1.5米平视
- 动作：泳者半个身体露出水面，挺胸立起，双臂自然下摆，目光坚定向前
- 服装：泳帽泳镜待确认，泳衣肩带自然；水滴从胸口滑落
- 光线：顶部现场光正面照射，右侧白墙反光补一点；禁用闪光
- 道具：无
- 裁切／必见：腰部以上，保留水面线　｜　挺胸站姿与坚定目光
- 废片判据：人物虚化、构图歪斜、水面线切脖子

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 7 of 10, frontal medium shot, adult swimmer emerging half body from pool, chest up, confident gaze, water line at waist, indoor pool overhead lighting, no flash, strong posture, 85mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-08　水珠凝固细节

- 文件名：`ppl-swimmer-poolside__08.png`　大特写 / 平视 / 100mm / f/1.8 / 竖幅
- 机位：距主体约5米，正面稍低站位，机位高约1.2米
- 动作：泳者保持头部不动，水珠从下颌滴落，肩部微耸
- 服装：泳帽泳镜待确认，颈肩皮肤湿润
- 光线：用现场侧逆光让水珠发亮，正面反光板补一点眼神光；禁用闪光
- 道具：无
- 裁切／必见：从嘴唇到锁骨，极紧裁切　｜　悬空水珠与皮肤纹理
- 废片判据：水珠拖影、噪点过多、对焦落到背景

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 8 of 10, macro close up, water droplets suspended from adult swimmer jaw and shoulder, side backlight making droplets glow, indoor pool, no flash, 1/2500s, crisp texture, 100mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-09　踏上池岸出水上岸

- 文件名：`ppl-swimmer-poolside__09.png`　全身 / 低机位仰拍 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，侧后方向站在防滑垫上，机位高约1.0米低角度
- 动作：泳者双手撑住池岸，用力把身体推上地面，单膝先触岸，身体前倾
- 服装：泳帽泳镜待确认，全身湿透，水滴沿腿落下
- 光线：现有顶光从侧后方形成轮廓光，正面靠地面反射；禁用闪光
- 道具：无
- 裁切／必见：全身入画，保留池岸边缘线与滴落水迹　｜　撑岸发力动作与湿滑地面
- 废片判据：地面水迹不自然、人物被栏杆遮挡、摄影师脚入画

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 9 of 10, low angle side view full body, adult swimmer pushing up onto pool deck, wet body, water dripping, side backlight from ceiling, wet slippery deck, no flash, powerful exit moment, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S28-10　站稳喘息收束

- 文件名：`ppl-swimmer-poolside__10.png`　中全 / 平视 / 35mm / f/3.5 / 竖幅
- 机位：距主体约3米，正面站在防滑垫上，机位高约1.5米平视
- 动作：泳者站直在池岸边，双手撑膝略低头喘息，然后抬头直视前方
- 服装：泳帽泳镜待确认，全身水珠，呼吸起伏明显
- 光线：现场顶光均匀铺光，降低反差；禁用闪光
- 道具：无
- 裁切／必见：从头顶到脚踝，底部保留湿脚印　｜　喘息姿态、湿脚印与泳池背景
- 废片判据：人物站在无防滑垫的湿滑处、背景过曝、构图拥挤

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: bright airy pastel, golden backlight, gentle bloom, 2:3 vertical framing, no in-image text or labels, frame 10 of 10, frontal medium full shot, adult swimmer standing on wet pool deck catching breath, hands on knees then looking up, water dripping, wet footprints, indoor pool background, no flash, resilient mood, 35mm lens at f/3.5, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：4×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S28-01 ｜ 镜头名 ｜ 35mm f/5.6`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

