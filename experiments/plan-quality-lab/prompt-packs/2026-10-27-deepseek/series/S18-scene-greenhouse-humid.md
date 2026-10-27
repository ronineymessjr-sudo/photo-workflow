# S18 · 温室植物园人像

用例 `scene-greenhouse-humid`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：建议浅色亚麻类长袖上衣与长裤，避免绿色与背景粘连，妆发自然微湿感，不编造品牌
- **场地**：植物园温室（已获许可，步道内拍摄）
- **光线**：仅用棚顶漫射日光，不补光，不开闪光灯；观察棚顶玻璃光斑落点，让模特站位选择光斑落在肩头的位置
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash；no tripod visible
- **原始要求**：50mm全程；玻璃棚顶光斑2镜；镜头起雾应对写进执行注记；不触碰植物；机位全程在步道上并写明距主体距离；无闪光灯、无三脚架（未备）。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
portrait of an adult standing on a walkway inside a humid botanical greenhouse, glass roof above, lush green tropical plants on both sides, soft diffused daylight, damp walkway, natural relaxed posture, eye level, realistic photography, no flash, no tripod, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
portrait of an adult standing on a walkway inside a humid botanical greenhouse, glass roof above, lush green tropical plants on both sides, soft diffused daylight, damp walkway, natural relaxed posture, eye level, realistic photography, no flash, no tripod, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
portrait of an adult standing on a walkway inside a humid botanical greenhouse, glass roof above, lush green tropical plants on both sides, soft diffused daylight, damp walkway, natural relaxed posture, eye level, realistic photography, no flash, no tripod, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 温室入口全景定场镜 | 全身 | 平视 | 50mm | f/4 | 距主体约6米，站在步道入口端，机位高度约1.5米平视 |
| 2 | 光斑落肩半身镜 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2米，机位高度约1.4米，略低于模特视线 |
| 3 | 步道低机位生机前景镜 | 中景 | 低机位仰拍 | 50mm | f/2.8 | 距主体约2.5米，蹲至机位高度约0.8米，仍在步道内 |
| 4 | 棚顶光斑仰角特写 | 特写 | 低机位仰拍 | 50mm | f/1.8 | 距主体约1米，机位高度约1.2米，站在步道上略低仰拍 |
| 5 | 步道纵深行走跟拍镜 | 全身 | 平视 | 50mm | f/4 | 距主体约4米，站在步道中轴线上，机位高度约1.5米，边后退边拍 |
| 6 | 叶影侧脸中景镜 | 近景 | 平视 | 50mm | f/2 | 距主体约2米，机位高度约1.5米，与模特视线齐平 |
| 7 | 高位俯拍步道站位镜 | 全身 | 高机位俯拍 | 50mm | f/4 | 距主体约3米，站在步道旁较高处（仅限已许可且安全的步道台阶），机位高度约2.2米俯拍 |
| 8 | 湿润空气半身环境镜 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2.5米，机位高度约1.5米平视 |
| 9 | 手部细节特写镜 | 大特写 | 高机位俯拍 | 50mm | f/1.8 | 距主体约0.8米，机位高度约1.3米，略俯拍手部 |
| 10 | 离场回望收尾镜 | 全身 | 平视 | 50mm | f/4 | 距主体约5米，站在步道起点，机位高度约1.5米平视 |

### S18-01　温室入口全景定场镜

- 文件名：`scene-greenhouse-humid__01.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约6米，站在步道入口端，机位高度约1.5米平视
- 动作：模特站在步道中段，身体朝镜头侧转15度，双手自然垂放身侧，下巴微抬看向棚顶光斑
- 服装：待确认；建议浅色亚麻类长袖上衣与长裤，避免绿色与背景粘连，妆发自然微湿感，不编造品牌
- 光线：仅用棚顶漫射日光，不补光，不开闪光灯；观察棚顶玻璃光斑落点，让模特站位选择光斑落在肩头的位置
- 道具：无
- 裁切／必见：保留棚顶结构上沿与步道下沿，人物全身完整入画，脚底不裁切　｜　温室玻璃棚顶、湿润步道、绿色植物层次、人物全身与所处环境关系
- 废片判据：人物与背景植物轮廓粘连、棚顶结构缺失、步道尽头过曝死白、画面出现三脚架或闪光灯痕迹

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 10, full body portrait of an adult standing on a walkway inside a humid botanical greenhouse, glass roof above, lush green tropical plants on both sides, soft diffused daylight, damp walkway, natural relaxed posture, eye level, realistic photography, no flash, no tripod, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-02　光斑落肩半身镜

- 文件名：`scene-greenhouse-humid__02.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，机位高度约1.4米，略低于模特视线
- 动作：模特侧身站定，右肩朝向棚顶光斑，头部缓慢转向镜头，眼睛先看地面再抬起
- 服装：待确认；保持浅色上衣，袖口自然，发丝可带轻微湿润感，不做喷水造型
- 光线：依赖棚顶自然光斑，等待光斑移动到肩部与侧脸；不补光，不闪光；用身体挡住直射眼部的强光
- 道具：无
- 裁切／必见：裁至大腿中部以上，头顶留少量空间，右侧保留光斑叶片　｜　肩头与侧脸的自然光斑、皮肤湿润质感、背景叶片虚化层次
- 废片判据：光斑落在眼部造成眯眼、脸部大面积阴影、背景过曝无细节、人物触碰植物

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 10, half body portrait of an adult in a greenhouse, soft dappled sunlight falling on shoulder and cheek, humid atmosphere, green foliage background softly blurred, natural skin texture, slightly low eye level, realistic, no flash, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-03　步道低机位生机前景镜

- 文件名：`scene-greenhouse-humid__03.png`　中景 / 低机位仰拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，蹲至机位高度约0.8米，仍在步道内
- 动作：模特站在步道边缘内侧，双脚不越界，身体微微前倾看向画面外的植物冠层，一只手自然搭在身侧衣摆处
- 服装：待确认；裤脚与鞋面保持干净，避免拖地扫到植物，妆发自然
- 光线：棚顶漫射光从上方落下，不补光；利用低机位让前景叶片压暗形成层次，避免闪光灯
- 道具：无
- 裁切／必见：裁至膝盖以上，保留前景叶片虚化与棚顶亮部，不裁断人物手臂　｜　前景叶片虚化、湿润步道边缘、人物看向植物的专注神情
- 废片判据：人物脚部踩入种植区、前景叶片糊成死黑、身体比例因低机位变形过度

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 10, medium shot from low angle of an adult standing on a greenhouse walkway, looking toward lush plants, blurred foreground leaves, humid soft daylight from glass roof, natural posture, realistic photography, no flash, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-04　棚顶光斑仰角特写

- 文件名：`scene-greenhouse-humid__04.png`　特写 / 低机位仰拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，机位高度约1.2米，站在步道上略低仰拍
- 动作：模特微微仰头，眼睛看向棚顶玻璃，嘴唇自然闭合，一只手轻触自己领口，不触碰植物
- 服装：待确认；领口简洁，避免复杂图案抢光斑，面部保持自然保湿感
- 光线：等待棚顶光斑扫过额头与鼻梁时按快门；不补光，不闪光；可用手在镜头侧挡掉直射镜头的光
- 道具：无
- 裁切／必见：头部与肩部特写，头顶保留少量棚顶虚化亮斑，不裁掉下巴　｜　额头与鼻梁的光斑、睫毛与皮肤湿润质感、领口细节
- 废片判据：光斑过曝成白块、脸部出现镜头雾化、仰角导致鼻孔过度暴露、手触碰到植物

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 10, close up portrait of an adult looking up at a glass greenhouse roof, soft dappled light on forehead and nose bridge, natural skin texture, humid atmosphere, shallow depth, slightly low angle, realistic, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-05　步道纵深行走跟拍镜

- 文件名：`scene-greenhouse-humid__05.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，站在步道中轴线上，机位高度约1.5米，边后退边拍
- 动作：模特沿步道向镜头缓慢行走，步幅小，视线落在镜头侧方，双臂自然摆动
- 服装：待确认；衣摆与裤脚不拖地，鞋底干净，避免踩到步道外沿
- 光线：全程自然棚顶漫射光，不补光；注意行走中人物脸部避免落入棚架阴影
- 道具：无
- 裁切／必见：全身入画，脚底保留步道面，头顶留棚架高度　｜　步道透视纵深、行走中的自然摆臂、温室种植床两侧环境
- 废片判据：人物走出步道边线、背景出现游客穿帮、对焦落在背景、脚部被裁切

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 10, full body walking shot of an adult on a greenhouse walkway, walking slowly toward camera, green plants on both sides, glass roof diffused light, humid atmosphere, eye level, realistic photography, no flash, no tripod, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-06　叶影侧脸中景镜

- 文件名：`scene-greenhouse-humid__06.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约2米，机位高度约1.5米，与模特视线齐平
- 动作：模特侧对镜头站立，肩部放松，视线落在画面外同一高度的叶片上，嘴角微松
- 服装：待确认；侧脸一侧头发别至耳后，露出下颌线，妆面保持自然光泽
- 光线：棚顶光穿过叶片形成斑驳侧光，不补光；用反光不强的浅色衣物自然提亮下颌，不额外加设备
- 道具：无
- 裁切／必见：裁至胸口以上，保留侧脸轮廓与肩线，右侧留叶影空间　｜　侧脸轮廓、叶影在面部的斑驳层次、耳后细节与自然发丝
- 废片判据：叶影完全覆盖眼睛、侧脸死黑、背景植物与头发粘连、人物触碰叶片

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 10, medium close up side profile of an adult in a botanical greenhouse, dappled leaf shadows on face, soft natural light from glass roof, humid green background, eye level, realistic, no flash, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-07　高位俯拍步道站位镜

- 文件名：`scene-greenhouse-humid__07.png`　全身 / 高机位俯拍 / 50mm / f/4 / 竖幅
- 机位：距主体约3米，站在步道旁较高处（仅限已许可且安全的步道台阶），机位高度约2.2米俯拍
- 动作：模特站在步道中央，抬头看向镜头，双臂自然下垂，脚尖朝前不越线
- 服装：待确认；肩部与头顶干净，避免帽饰遮挡面部，鞋面清洁
- 光线：棚顶漫射光从上方照亮面部，不补光；俯拍时注意下巴阴影，让模特微收下巴
- 道具：无
- 裁切／必见：全身俯拍入画，保留步道两侧种植床边界，脚底不裁切　｜　俯视下的步道线条、人物全身比例、温室种植床的绿色肌理
- 废片判据：模特站在种植床内、俯拍导致身体压缩过度、步道边界不清、出现未许可的高台

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 10, high angle full body shot of an adult standing on a greenhouse walkway looking up at camera, glass roof diffused daylight, green planting beds on both sides, humid atmosphere, realistic photography, no flash, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-08　湿润空气半身环境镜

- 文件名：`scene-greenhouse-humid__08.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，机位高度约1.5米平视
- 动作：模特站在步道一侧，双手交叠放在身前，肩膀放松，视线平视镜头，呼吸平稳
- 服装：待确认；衣物保持干爽整洁，不刻意喷湿，发型自然，避免反光面料
- 光线：利用温室内自然湿度形成的柔和漫射光，不补光；避免逆光造成镜头起雾，拍摄前擦净前镜片
- 道具：无
- 裁切／必见：裁至腰部以上，保留头部周围空气感与右侧环境雾气　｜　湿润空气感、人物平静神态、背景植物层次与棚顶柔光
- 废片判据：镜头起雾导致整体发灰、人物面部无细节、背景完全糊成色块、衣物出现不自然湿痕

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 10, medium shot of an adult standing on a greenhouse walkway, hands gently folded in front, humid soft atmosphere, lush plants softly blurred behind, diffused daylight, eye level, realistic photography, no flash, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-09　手部细节特写镜

- 文件名：`scene-greenhouse-humid__09.png`　大特写 / 高机位俯拍 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.8米，机位高度约1.3米，略俯拍手部
- 动作：模特侧身站立，一只手自然抬起至胸前高度，手指放松微曲，不触碰任何植物
- 服装：待确认；袖口整洁，手腕无过多配饰，指甲干净自然
- 光线：棚顶漫射光落在手背，不补光；用身体侧挡避免强光在皮肤上形成高光死白
- 道具：无
- 裁切／必见：仅手部与前臂入画，保留少量袖口与背景虚化，不裁断手指　｜　手背皮肤纹理、自然手指姿态、袖口与背景植物层次
- 废片判据：手指被裁切、皮肤过曝无纹理、背景出现触摸植物的动作、画面出现镜头雾化

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 10, close up detail of an adult's relaxed hand raised near chest, not touching plants, soft diffused greenhouse light, blurred green foliage background, natural skin texture, slightly high angle, realistic, no flash, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S18-10　离场回望收尾镜

- 文件名：`scene-greenhouse-humid__10.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约5米，站在步道起点，机位高度约1.5米平视
- 动作：模特沿步道向画面深处走出三步后停下回头，肩膀先转，视线越过肩头看向镜头
- 服装：待确认；保持与前镜一致，衣摆自然，回头时头发不遮眼
- 光线：温室出口方向的自然漫射光，不补光；人物面部靠棚顶散射光提亮，避免逆光剪影
- 道具：无
- 裁切／必见：全身或七分身入画，保留步道前景与温室结构，头顶留空间　｜　回望的肩线与眼神、步道纵深、温室出口方向的环境层次
- 废片判据：回头动作僵硬、面部处于剪影、人物走出步道边界、背景出现出口外无关人员

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 10 of 10, full body shot of an adult walking away on a greenhouse walkway then looking back over shoulder at camera, humid botanical garden, diffused daylight from glass roof, green plants, eye level, realistic photography, no flash, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：4×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S18-01 ｜ 镜头名 ｜ 50mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

