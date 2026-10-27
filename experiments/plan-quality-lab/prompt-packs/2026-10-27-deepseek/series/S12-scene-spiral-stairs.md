# S12 · 旋转楼梯俯瞰

用例 `scene-spiral-stairs`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：拍摄前确认鞋底防滑、衣摆不拖地、无松散饰品垂到扶手外侧
- **场地**：美术馆旋转楼梯（已获许可）
- **光线**：使用现场美术馆顶光与楼梯间侧窗自然光，禁用闪光灯；若内圈偏暗，由助手在顶层内侧安全位置以常亮灯加柔光箱低功率补内圈，不直射镜头
- **调色**：natural colour, gentle film curve, consistent white balance across the series
- **画幅**：竖幅 2:3
- **焦段序列**：16mm → 16mm → 50mm → 16mm → 50mm → 16mm → 50mm → 50mm → 16mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：16mm超广角2镜、50mm1镜；顶层俯拍机位写明扶手内侧站立与楼梯中轴的水平距离；人物始终靠内侧行走；禁用闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
, adult walking down the inner side of a museum spiral staircase, hand sliding on the inner handrail, camera 3 meters ahead at chest height, natural side window light, no flash, clean architectural curve, shallow depth, gray concrete and white walls, no props, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
, adult walking down the inner side of a museum spiral staircase, hand sliding on the inner handrail, camera 3 meters ahead at chest height, natural side window light, no flash, clean architectural curve, shallow depth, gray concrete and white walls, no props, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
, adult walking down the inner side of a museum spiral staircase, hand sliding on the inner handrail, camera 3 meters ahead at chest height, natural side window light, no flash, clean architectural curve, shallow depth, gray concrete and white walls, no props, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 顶层中轴俯瞰螺旋全貌 | 大远景 | 正俯拍 | 16mm | f/8 | 位于顶层楼梯口内侧安全区，站在扶手内侧，身体距楼梯中轴水平距离约1.2米，机位高度约1.6米，靠近内侧栏板站稳后俯拍 |
| 2 | 螺旋中轴垂直俯视几何 | 全身 | 正俯拍 | 16mm | f/4 | 站在顶层扶手内侧，身体贴近内侧栏板，距楼梯中轴水平距离约0.8米，机位高度约1.7米，镜头垂直向下俯拍 |
| 3 | 内侧扶手弧线中景跟拍 | 中景 | 平视 | 50mm | f/2.8 | 站在人物前下方约3米处的同一段楼梯内侧，机位高度约1.4米，与人物胸口平视，镜头顺扶手弧线方向 |
| 4 | 扶手内侧低机位仰拍 | 近景 | 低机位仰拍 | 16mm | f/2 | 位于人物下方两级踏步的内侧，距主体约1.5米，机位高度约0.8米贴近踏步低角度仰拍 |
| 5 | 上层栏板框景中景 | 中景 | 平视 | 50mm | f/2.8 | 位于人物同层对面内侧平台，距主体约4米，机位高度约1.2米，利用上层栏板弧线做前景框 |
| 6 | 螺旋顶部俯拍背影 | 全身 | 高机位俯拍 | 16mm | f/4 | 位于顶层扶手内侧，距楼梯中轴水平距离约1米，机位高度约1.7米，俯拍人物背部与下行方向 |
| 7 | 中段平视几何对称 | 全身 | 平视 | 50mm | f/4 | 位于人物正前方同层楼梯平台内侧，距主体约5米，机位高度约1.5米，与人物胸口平视，镜头对准螺旋中轴 |
| 8 | 扶手细节手部特写 | 特写 | 平视 | 50mm | f/1.8 | 位于人物右侧下方一级踏步内侧，距手部约40厘米，机位高度约1.1米，平视扶手弧面 |
| 9 | 顶层俯瞰人物小全 | 全景 | 高机位俯拍 | 16mm | f/5.6 | 位于顶层扶手内侧，距楼梯中轴水平距离约1.1米，机位高度约1.65米，越过栏板俯拍下方人物 |

### S12-01　顶层中轴俯瞰螺旋全貌

- 文件名：`scene-spiral-stairs__01.png`　大远景 / 正俯拍 / 16mm / f/8 / 横幅
- 机位：位于顶层楼梯口内侧安全区，站在扶手内侧，身体距楼梯中轴水平距离约1.2米，机位高度约1.6米，靠近内侧栏板站稳后俯拍
- 动作：人物沿内侧扶手一侧慢步下行，右手轻扶内侧扶手，身体微向楼梯中轴倾斜约10度，步幅半步，视线顺楼梯曲线向下方看
- 服装：服装与妆发待确认；拍摄前确认鞋底防滑、衣摆不拖地、无松散饰品垂到扶手外侧
- 光线：使用现场美术馆顶光与楼梯间侧窗自然光，禁用闪光灯；若内圈偏暗，由助手在顶层内侧安全位置以常亮灯加柔光箱低功率补内圈，不直射镜头
- 道具：无
- 裁切／必见：保留完整螺旋内圈与至少三层踏步弧线，人物全身入画，不裁掉头顶与足部　｜　螺旋楼梯的几何弧线、扶手连续曲线、人物靠内侧行走、楼梯中轴空间
- 废片判据：扶手外圈明显广角畸变拉伸、人物不在内侧、画面出现闪光灯硬阴影、人物足部被裁

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, ultra wide angle architectural photo, spiral staircase interior of an art museum, adult walking down along the inner handrail, top floor overhead vantage, camera about 1.2 meters horizontally from the staircase central axis, standing inside the railing, no flash, soft natural skylight, geometric flowing curves, white and gray concrete, deep spiral center, full body visible, no props, 16mm lens at f/8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S12-02　螺旋中轴垂直俯视几何

- 文件名：`scene-spiral-stairs__02.png`　全身 / 正俯拍 / 16mm / f/4 / 竖幅
- 机位：站在顶层扶手内侧，身体贴近内侧栏板，距楼梯中轴水平距离约0.8米，机位高度约1.7米，镜头垂直向下俯拍
- 动作：人物停在下一层内侧踏步，双肩正对楼梯中轴，右手搭在内侧扶手，头微仰看向镜头方向，双脚并拢踩稳同一踏步
- 服装：服装与妆发待确认；确认深色或纯色上装与浅色楼梯形成对比，发型收紧避免遮挡面部
- 光线：以楼梯间天光为主光，禁用闪光灯；在顶层内侧用白色反光板把天光反射到人物面部，反光板不进入画面
- 道具：无
- 裁切／必见：以楼梯中轴为中心，保留约四分之三螺旋弧线，人物从头顶到膝盖以上入画，不切掉扶手中段　｜　垂直俯视的螺旋几何、扶手同心弧线、人物仰视面部、内侧行走位置
- 废片判据：人物站在外侧踏步、画面出现闪光灯、螺旋中轴偏离画面中心超过三分之一、面部完全在阴影中

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, vertical top down view of a spiral staircase in an art museum, adult standing on an inner step looking up at camera, hand on inner handrail, camera inside the railing about 0.8 meters from the central axis, concentric curved handrails, no flash, soft reflected skylight on face, geometric abstract architecture, no props, 16mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S12-03　内侧扶手弧线中景跟拍

- 文件名：`scene-spiral-stairs__03.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：站在人物前下方约3米处的同一段楼梯内侧，机位高度约1.4米，与人物胸口平视，镜头顺扶手弧线方向
- 动作：人物继续沿内侧扶手向下走，左手滑扶内侧扶手，右臂自然摆动，身体随楼梯弧度微转，视线看向下一段踏步
- 服装：服装与妆发待确认；确保衣摆与袖口不卷入扶手，鞋跟稳定
- 光线：现场侧窗自然光从人物右后方进入，禁用闪光灯；用一块白板在机位左侧低角度补面部阴影，保持墙面明暗层次
- 道具：无
- 裁切／必见：人物从头顶到大腿中部入画，保留内侧扶手连续弧线与至少两级踏步，不裁断扶手线条　｜　人物靠内侧行走、手与内侧扶手接触、50mm下的楼梯弧线层次、自然光方向
- 废片判据：人物走到扶手外侧、扶手线条在画面中断、出现闪光灯、背景墙面过曝失去几何线条

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, medium shot, adult walking down the inner side of a museum spiral staircase, hand sliding on the inner handrail, camera 3 meters ahead at chest height, natural side window light, no flash, clean architectural curve, shallow depth, gray concrete and white walls, no props, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S12-04　扶手内侧低机位仰拍

- 文件名：`scene-spiral-stairs__04.png`　近景 / 低机位仰拍 / 16mm / f/2 / 竖幅
- 机位：位于人物下方两级踏步的内侧，距主体约1.5米，机位高度约0.8米贴近踏步低角度仰拍
- 动作：人物单脚踩在下一级踏步边缘，另一脚在后，右手扶内侧扶手，身体微侧向镜头，下巴略收，视线越过扶手向下
- 服装：服装与妆发待确认；注意低机位下衣摆与裤脚整洁，避免走光
- 光线：现场天光从上方螺旋口落下形成顶光轮廓，禁用闪光灯；在人物下方内侧用银色反光板补下巴与眼窝，反光板控制在楼梯内侧
- 道具：无
- 裁切／必见：人物从头顶到膝盖入画，前景保留内侧扶手局部，上方保留两层楼梯弧线　｜　低机位仰视的螺旋结构、人物扶内侧扶手、上半身姿态、顶光轮廓
- 废片判据：仰拍造成面部严重变形、人物靠外侧、闪光灯补光、上方结构完全被裁掉

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, low angle shot from lower inner step of a museum spiral staircase, adult standing on inner step with hand on inner railing, camera 1.5 meters away at 0.8 meter height, skylight rim light, no flash, upward view of spiral architecture, clean geometric lines, no props, 16mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S12-05　上层栏板框景中景

- 文件名：`scene-spiral-stairs__05.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：位于人物同层对面内侧平台，距主体约4米，机位高度约1.2米，利用上层栏板弧线做前景框
- 动作：人物从上层栏板弧线后经过，身体沿内侧行走，头部微低，右手扶内侧扶手，面部从栏板缺口露出
- 服装：服装与妆发待确认；选择与栏板明度有区分的上装，发型保持利落
- 光线：现场自然光，禁用闪光灯；人物面部处于栏板阴影时，由助手在机位左侧约2米内侧用白板反射顶光补脸，不改变背景曝光
- 道具：无
- 裁切／必见：保留前景栏板完整弧线与人物上半身，人物下半身可被栏板遮挡，不裁断栏板曲线　｜　前景栏板弧线框景、人物内侧行走、面部可见、楼梯几何层次
- 废片判据：人物被栏板完全挡住、面部死黑、栏板线条被裁断、出现闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, medium shot through curved balcony opening of a museum spiral staircase, adult walking along the inner side, hand on inner handrail, face visible through the gap, camera 4 meters away at 1.2 meter height, natural light only no flash, architectural framing, gray concrete and white walls, no props, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S12-06　螺旋顶部俯拍背影

- 文件名：`scene-spiral-stairs__06.png`　全身 / 高机位俯拍 / 16mm / f/4 / 竖幅
- 机位：位于顶层扶手内侧，距楼梯中轴水平距离约1米，机位高度约1.7米，俯拍人物背部与下行方向
- 动作：人物背对镜头上行后转身下行，右手扶内侧扶手，肩线随楼梯弧度微转，后颈与背部朝向镜头
- 服装：服装与妆发待确认；背面需整洁，避免大面积图案干扰几何画面
- 光线：现场顶光勾勒肩线，禁用闪光灯；在顶层内侧后方用黑色旗板压暗画面边缘，增强螺旋纵深
- 道具：无
- 裁切／必见：人物从头顶到小腿入画，保留至少两层楼梯弧线与中轴空白，不裁掉头顶　｜　人物背部与内侧扶手接触、下行方向、螺旋顶部纵深、几何对称感
- 废片判据：人物回头看镜头破坏背影情绪、靠外侧扶手、闪光灯、螺旋中轴被人物完全堵住

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, high angle back view of an adult walking down the inner side of a museum spiral staircase, hand on inner handrail, camera on top floor inside the railing about 1 meter from the central axis, no flash, top skylight rim light, deep spiral geometry, flowing curves, no props, 16mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S12-07　中段平视几何对称

- 文件名：`scene-spiral-stairs__07.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：位于人物正前方同层楼梯平台内侧，距主体约5米，机位高度约1.5米，与人物胸口平视，镜头对准螺旋中轴
- 动作：人物站在楼梯中段内侧踏步，正面朝向镜头，双手自然下垂，右手手背轻贴内侧扶手，双脚与肩同宽踩稳
- 服装：服装与妆发待确认；优先纯色简洁服装，避免与楼梯背景同色导致轮廓消失
- 光线：现场自然光均匀照亮人物正面，禁用闪光灯；用柔光白板在机位右侧补暗部，保持背景墙面几何线条清晰
- 道具：无
- 裁切／必见：人物从头顶到脚踝入画，保留背后三层以上楼梯弧线，不裁掉人物肩部两侧扶手　｜　人物正面站姿、手贴内侧扶手、背后螺旋对称几何、50mm自然透视
- 废片判据：人物未靠内侧、背景弧线歪斜、闪光灯硬光、人物轮廓与背景粘连

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, symmetrical eye level portrait of an adult standing on an inner step of a museum spiral staircase, hands relaxed with back of hand touching inner handrail, camera 5 meters away at chest height, natural soft light, no flash, geometric symmetric curves behind, clean minimal wardrobe, no props, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S12-08　扶手细节手部特写

- 文件名：`scene-spiral-stairs__08.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：位于人物右侧下方一级踏步内侧，距手部约40厘米，机位高度约1.1米，平视扶手弧面
- 动作：人物右手沿内侧扶手缓慢下滑，手指依次轻触扶手弧面，手腕放松，身体仅露出右侧前臂
- 服装：服装与妆发待确认；袖口需收窄或卷起，避免遮挡手部动作，指甲保持干净
- 光线：现场侧窗自然光从扶手左上方擦过，禁用闪光灯；在机位下方内侧用白卡反射弱光补手指阴影，突出扶手材质
- 道具：无
- 裁切／必见：只保留手部、前臂与扶手局部弧线，不出现完整面部，裁掉多余背景　｜　手指与内侧扶手的接触、扶手弧线材质、手部放松状态
- 废片判据：手部失焦、闪光灯造成金属或漆面反光斑、袖口遮挡手指、背景出现杂乱行人

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, close up of an adult hand sliding along the inner handrail of a museum spiral staircase, camera 40 centimeters away at 1.1 meter height, natural grazing side light, no flash, smooth curved handrail texture, blurred body at frame edge, no props, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S12-09　顶层俯瞰人物小全

- 文件名：`scene-spiral-stairs__09.png`　全景 / 高机位俯拍 / 16mm / f/5.6 / 横幅
- 机位：位于顶层扶手内侧，距楼梯中轴水平距离约1.1米，机位高度约1.65米，越过栏板俯拍下方人物
- 动作：人物走完一段后停在下方内侧平台，抬头看向顶层镜头，右手仍搭在内侧扶手上，双脚并拢站立
- 服装：服装与妆发待确认；确认仰视时面部无遮挡，衣领整洁
- 光线：现场天光从顶部螺旋口照亮人物面部，禁用闪光灯；在顶层内侧用黑旗挡住镜头边缘杂光，保持画面对比
- 道具：无
- 裁切／必见：保留完整一层螺旋弧线与人物全身，人物头顶上方留出两层楼梯空间，不裁掉脚部　｜　顶层俯瞰视角、人物在内侧平台、完整螺旋几何、人物与空间比例
- 废片判据：人物靠外侧、脚部被栏板裁掉、闪光灯、螺旋弧线因广角严重变形失真

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: natural colour, gentle film curve, consistent white balance across the series, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, wide high angle shot from top floor inside the railing of a museum spiral staircase, adult standing on lower inner landing looking up, hand on inner handrail, camera about 1.1 meters from the central axis, no flash, skylight illumination, full spiral geometry, small figure in large architectural space, no props, 16mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S12-01 ｜ 镜头名 ｜ 16mm f/8`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

