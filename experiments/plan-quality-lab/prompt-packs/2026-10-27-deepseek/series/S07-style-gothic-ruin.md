# S07 · 暗黑哥特废墟人像

用例 `style-gothic-ruin`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：深色长外套、黑色长裤、深色靴子；发型，妆容
- **场地**：废弃厂房外部围栏内安全区（已获许可，不进入建筑本体）
- **光线**：自然光，阴天漫射光，无补光；避免闪光灯
- **调色**：desaturated cool grey, crushed blacks, single warm accent
- **画幅**：竖幅 2:3
- **焦段序列**：24mm → 24mm → 85mm → 85mm → 24mm → 85mm → 85mm → 85mm → 24mm → 24mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：24mm环境2镜、85mm特写2镜；破碎窗框逆光剪影2镜；所有机位写明与废墙的安全距离（不少于3米）；禁用闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
Wide environmental portrait, adult model in profile facing left, standing near a fence with derelict factory wall on right, dark gothic style, overcast side light, subtle fill from white board, no flash, eye level, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
Wide environmental portrait, adult model in profile facing left, standing near a fence with derelict factory wall on right, dark gothic style, overcast side light, subtle fill from white board, no flash, eye level, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
Wide environmental portrait, adult model in profile facing left, standing near a fence with derelict factory wall on right, dark gothic style, overcast side light, subtle fill from white board, no flash, eye level, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 废墟全景定场 | 全景 | 平视 | 24mm | f/5.6 | 距主体约8米，机位高度1.2米，平视 |
| 2 | 侧方环境引导 | 全身 | 平视 | 24mm | f/4 | 距主体约5米，机位高度1.5米，平视 |
| 3 | 破碎窗框逆光剪影 | 中景 | 平视 | 85mm | f/2.8 | 距主体约6米，机位高度1.6米，平视 |
| 4 | 窗框细节特写 | 特写 | 平视 | 85mm | f/1.8 | 距主体约1.5米，机位高度1.6米，平视 |
| 5 | 墙面纹理低角度 | 中景 | 地面低角度 | 24mm | f/2.8 | 距主体约2米，机位高度0.8米，低角度仰拍 |
| 6 | 手部细节特写 | 大特写 | 高机位俯拍 | 85mm | f/1.8 | 距主体约1米，机位高度1米，俯拍手部 |
| 7 | 全身剪影逆光 | 全身 | 平视 | 85mm | f/4 | 距主体约6米，机位高度1.5米，平视 |
| 8 | 面部情绪特写 | 特写 | 平视 | 85mm | f/1.8 | 距主体约1米，机位高度1.6米，平视 |
| 9 | 环境人像高角度 | 中景 | 高机位俯拍 | 24mm | f/2.8 | 距主体约4米，机位高度2.5米，高角度俯拍 |
| 10 | 离场背影尾声 | 全景 | 平视 | 24mm | f/5.6 | 距主体约5米，机位高度1.5米，平视 |

### S07-01　废墟全景定场

- 文件名：`style-gothic-ruin__01.png`　全景 / 平视 / 24mm / f/5.6 / 横幅
- 机位：距主体约8米，机位高度1.2米，平视
- 动作：模特背对镜头站立，双臂自然下垂，头部微仰望向厂房高处
- 服装：深色长外套、黑色长裤、深色靴子；发型待确认，妆容待确认
- 光线：自然光，阴天漫射光，无补光；避免闪光灯
- 道具：无
- 裁切／必见：下沿保留地面碎石，上沿保留厂房顶部残缺轮廓，左右保留围栏边缘　｜　模特全身、废弃厂房外立面、围栏内安全区标识
- 废片判据：画面出现建筑内部、人物过小无法辨认、围栏外区域

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 1 of 10, Wide shot of an adult model standing with back to camera, facing a derelict factory exterior, inside a fenced safe zone, dark gothic style, overcast diffuse light, no flash, eye level, desolate atmosphere, 24mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-02　侧方环境引导

- 文件名：`style-gothic-ruin__02.png`　全身 / 平视 / 24mm / f/4 / 竖幅
- 机位：距主体约5米，机位高度1.5米，平视
- 动作：模特侧身站立，面朝画面左侧，右手轻触围栏（或自然下垂），目光低垂
- 服装：深色长外套、黑色长裤、深色靴子；发型待确认，妆容待确认
- 光线：自然光，侧逆光，面部略暗，用白色反光板在模特正面2米处补光（若无反光板则用浅色墙面反光）
- 道具：无
- 裁切／必见：保留模特全身及右侧厂房墙面，下沿至靴子，上沿保留部分天空　｜　模特侧身轮廓、围栏结构、厂房外墙纹理
- 废片判据：模特面部完全漆黑、围栏外区域入镜、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 2 of 10, Wide environmental portrait, adult model in profile facing left, standing near a fence with derelict factory wall on right, dark gothic style, overcast side light, subtle fill from white board, no flash, eye level, 24mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-03　破碎窗框逆光剪影

- 文件名：`style-gothic-ruin__03.png`　中景 / 平视 / 85mm / f/2.8 / 竖幅
- 机位：距主体约6米，机位高度1.6米，平视
- 动作：模特站在破碎窗框前，侧身45度，头部微低，双臂自然下垂
- 服装：深色长外套、黑色长裤；发型待确认，妆容待确认
- 光线：自然逆光，窗框后方有天空光，人物正面用反光板微弱补光（保留剪影效果）
- 道具：无
- 裁切／必见：上沿保留完整窗框，下沿至人物腰部，左右保留窗框边缘　｜　人物剪影轮廓、破碎窗框结构、逆光光感
- 废片判据：人物正面细节过亮失去剪影感、窗框不完整、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 3 of 10, Medium shot of an adult model standing in front of a broken window frame, backlit silhouette, side profile, dark gothic atmosphere, natural backlight, subtle fill, no flash, eye level, 85mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-04　窗框细节特写

- 文件名：`style-gothic-ruin__04.png`　特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1.5米，机位高度1.6米，平视
- 动作：模特面部贴近破碎窗框边缘，闭眼，表情肃穆
- 服装：深色外套领口微立；发型待确认，妆容待确认
- 光线：自然光，窗框透过的逆光在面部形成轮廓光，正面用反光板补光至面部可见细节
- 道具：无
- 裁切／必见：头部和肩部特写，保留部分窗框纹理　｜　面部表情、皮肤质感、窗框边缘细节
- 废片判据：面部过曝或全黑、窗框纹理模糊、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 4 of 10, Close-up of an adult model's face near a broken window frame, closed eyes, solemn expression, dark gothic style, backlit rim light, subtle fill, no flash, eye level, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-05　墙面纹理低角度

- 文件名：`style-gothic-ruin__05.png`　中景 / 地面低角度 / 24mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高度0.8米，低角度仰拍
- 动作：模特背靠废墙站立，距离墙面约1米，双臂交叉抱胸，目光望向前方
- 服装：深色长外套、黑色长裤；发型待确认，妆容待确认
- 光线：自然光，侧光强调墙面纹理，无补光
- 道具：无
- 裁切／必见：下沿至膝盖，上沿保留墙面高处破碎结构，左右保留墙体　｜　人物上半身、墙面粗糙纹理、低角度透视感
- 废片判据：人物与墙面距离少于3米（安全距离要求）、墙面过曝、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 5 of 10, Low angle shot of an adult model leaning against a derelict wall, arms crossed, looking forward, dark gothic style, side light emphasizing wall texture, no flash, ground level, 24mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-06　手部细节特写

- 文件名：`style-gothic-ruin__06.png`　大特写 / 高机位俯拍 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度1米，俯拍手部
- 动作：模特一只手轻触废墙表面，手指微微张开
- 服装：深色外套袖口露出，手部无饰品（待确认）
- 光线：自然光，侧光凸显手部与墙面质感，正面用反光板轻微补光
- 道具：无
- 裁切／必见：手部及部分前臂特写，背景为墙面纹理　｜　手部姿势、皮肤纹理、墙面质感
- 废片判据：手部模糊、手指残缺、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 6 of 10, Extreme close-up of a hand touching a rough derelict wall, fingers slightly spread, dark gothic style, side light, subtle fill, no flash, high angle, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-07　全身剪影逆光

- 文件名：`style-gothic-ruin__07.png`　全身 / 平视 / 85mm / f/4 / 竖幅
- 机位：距主体约6米，机位高度1.5米，平视
- 动作：模特站在厂房前空地，背对强光方向，双腿微开，双臂自然下垂
- 服装：深色长外套、黑色长裤、深色靴子，形成整体剪影；发型待确认，妆容待确认
- 光线：自然逆光，太阳在模特后方（若阴天则利用天空光），人物正面不补光或极弱补光
- 道具：无
- 裁切／必见：保留全身及部分厂房轮廓，下沿至靴子　｜　人物全身剪影、厂房背景、逆光氛围
- 废片判据：人物细节过亮、背景过曝、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 7 of 10, Full body silhouette of an adult model standing in front of a derelict factory, backlit, dark gothic style, natural backlight, no flash, eye level, 85mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-08　面部情绪特写

- 文件名：`style-gothic-ruin__08.png`　特写 / 平视 / 85mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度1.6米，平视
- 动作：模特正面站立，头部微低，眼睛看向镜头，嘴唇紧闭
- 服装：深色外套领口细节；发型待确认，妆容待确认（建议苍白底妆）
- 光线：自然光，侧光照明，正面用反光板补光，形成柔和对比
- 道具：无
- 裁切／必见：头部和肩部特写，裁切至下巴以下　｜　面部表情、皮肤质感、眼神
- 废片判据：面部过曝或过暗、表情不肃穆、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 8 of 10, Close-up face portrait of an adult model, solemn expression, looking at camera, dark gothic style, side light, subtle fill, no flash, eye level, 85mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-09　环境人像高角度

- 文件名：`style-gothic-ruin__09.png`　中景 / 高机位俯拍 / 24mm / f/2.8 / 竖幅
- 机位：距主体约4米，机位高度2.5米，高角度俯拍
- 动作：模特蹲在安全区地面，低头，双手抱膝
- 服装：深色长外套、黑色长裤；发型待确认，妆容待确认
- 光线：自然漫射光，无补光
- 道具：无
- 裁切／必见：保留模特全身及周围地面，上沿至围栏顶部　｜　模特蹲姿、地面纹理、围栏结构
- 废片判据：模特不完整、地面杂乱无章、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 9 of 10, High angle shot of an adult model crouching on the ground in a fenced safe zone, holding knees, dark gothic style, overcast light, no flash, high angle, 24mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S07-10　离场背影尾声

- 文件名：`style-gothic-ruin__10.png`　全景 / 平视 / 24mm / f/5.6 / 横幅
- 机位：距主体约5米，机位高度1.5米，平视
- 动作：模特背对镜头向围栏出口方向行走，步伐缓慢，头部微低
- 服装：深色长外套、黑色长裤、深色靴子；发型待确认，妆容待确认
- 光线：自然光，逆光或侧逆光，无补光
- 道具：无
- 裁切／必见：保留模特全身、围栏出口、部分厂房背景　｜　模特背影、围栏出口、环境氛围
- 废片判据：模特走出围栏外、背景过曝、使用闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: desaturated cool grey, crushed blacks, single warm accent, 2:3 vertical framing, no in-image text or labels, frame 10 of 10, Wide shot of an adult model walking away towards a fence exit, back view, dark gothic style, natural backlight, no flash, eye level, 24mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：4×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S07-01 ｜ 镜头名 ｜ 24mm f/5.6`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

