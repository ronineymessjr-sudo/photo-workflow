# S11 · 美术馆看展的人

用例 `scene-museum-quiet`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年人（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：保持日常看展装束，避免反光面料与大面积亮色，发型整洁不被风扰动
- **场地**：市美术馆展厅（已获拍摄许可）
- **光线**：仅用展厅现有顶灯与展墙基础照明，关闭闪光灯；不补光，必要时用反光板以外的现场白墙反射光，但本镜不额外加设备
- **调色**：black and white, strong grain, high micro-contrast
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 50mm → 50mm → 35mm → 35mm → 50mm → 35mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash；no tripod visible
- **原始要求**：全程禁用闪光灯、不使用三脚架（未备）；35mm为主；人与展品保持1米以上距离；每镜写明机位与人的距离；射灯光斑作背景2镜。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
documentary photograph, one adult visitor standing at the entrance of an art museum gallery seen from behind, hands relaxed at sides, looking into the exhibition hall,  with entrance frame and deep gallery space, existing ceiling lights only, no flash, natural quiet mood, eye level, candid reportage style, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
documentary photograph, one adult visitor standing at the entrance of an art museum gallery seen from behind, hands relaxed at sides, looking into the exhibition hall,  with entrance frame and deep gallery space, existing ceiling lights only, no flash, natural quiet mood, eye level, candid reportage style, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
documentary photograph, one adult visitor standing at the entrance of an art museum gallery seen from behind, hands relaxed at sides, looking into the exhibition hall,  with entrance frame and deep gallery space, existing ceiling lights only, no flash, natural quiet mood, eye level, candid reportage style, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 展厅入口环境交代镜 | 全身 | 平视 | 35mm | f/4 | 距主体约4米，站立于入口门框内侧，机位高度约1.5米平视 |
| 2 | 展墙前静观中景 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2.5米，站立于人物侧前方约45度，机位高度约1.5米平视 |
| 3 | 越肩看画关系镜 | 近景 | 平视 | 50mm | f/2 | 距主体约1.2米，站在人物左后方，机位高度约1.55米略高于肩部平视 |
| 4 | 射灯光斑背景侧脸近景 | 特写 | 平视 | 50mm | f/1.8 | 距主体约1米，位于人物侧前方约30度，机位高度约1.5米平视 |
| 5 | 移步换展品行走镜 | 全身 | 平视 | 35mm | f/4 | 距主体约3米，站立于展厅通道一侧，机位高度约1.2米略低平视 |
| 6 | 驻足停步低机位全身镜 | 全身 | 地面低角度 | 35mm | f/4 | 距主体约2.8米，蹲姿机位高度约0.9米，位于人物侧前方 |
| 7 | 画作细节与观看视线交替镜 | 近景 | 平视 | 50mm | f/2 | 距主体约1.5米，位于人物右后方，机位高度约1.5米，镜头略越过人物视线方向 |
| 8 | 展厅纵深引导线环境镜 | 全景 | 平视 | 35mm | f/5.6 | 距主体约5米，位于通道一端，机位高度约1.6米平视，利用展墙与地面形成引导线 |
| 9 | 离开展厅回望收尾镜 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2米，位于人物侧前方，机位高度约1.5米平视 |

### S11-01　展厅入口环境交代镜

- 文件名：`scene-museum-quiet__01.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约4米，站立于入口门框内侧，机位高度约1.5米平视
- 动作：背对镜头站立于入口内侧，双脚与肩同宽，双手自然垂在身侧，头部微抬看向展厅纵深，保持静止约5秒
- 服装：服装与妆发待确认；保持日常看展装束，避免反光面料与大面积亮色，发型整洁不被风扰动
- 光线：仅用展厅现有顶灯与展墙基础照明，关闭闪光灯；不补光，必要时用反光板以外的现场白墙反射光，但本镜不额外加设备
- 道具：无
- 裁切／必见：保留入口门框上沿与地面，头顶留约15%空间，不裁掉人物脚部　｜　人物完整背影、展厅纵深、展墙与地面关系、人与展品距离明显大于1米
- 废片判据：出现闪光灯痕迹、人物贴墙过近破坏1米距离、画面倾斜、入口结构被裁断

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, documentary photograph, one adult visitor standing at the entrance of an art museum gallery seen from behind, hands relaxed at sides, looking into the exhibition hall, full body with entrance frame and deep gallery space, existing ceiling lights only, no flash, natural quiet mood, eye level, candid reportage style, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S11-02　展墙前静观中景

- 文件名：`scene-museum-quiet__02.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，站立于人物侧前方约45度，机位高度约1.5米平视
- 动作：侧身站立面向展墙，身体放松，双手自然下垂，视线落在画作中心，保持静止呼吸，不摆拍
- 服装：服装与妆发待确认；以素色日常外套为主，避免与展墙颜色完全融合，妆面保持自然
- 光线：展厅展墙射灯为主光，人物面部由漫反射环境光补足；不开闪光灯，不架灯架，靠现场光完成曝光
- 道具：无
- 裁切／必见：裁切至人物膝盖以上，保留画面右侧展品局部与射灯光斑，头顶留约10%空间　｜　人物侧脸静观神态、展墙画作局部、射灯在展墙形成的光斑、人与展品间距大于1米
- 废片判据：人物与展品间距不足1米、光斑缺失、面部死黑、出现闪光灯硬阴影

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, documentary art museum scene, one adult visitor in side profile quietly looking at a painting on the gallery wall, hands relaxed, natural expression, wall spotlight blossoms in background, no flash, existing ambient light, eye level, muted realistic tones, candid photography, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S11-03　越肩看画关系镜

- 文件名：`scene-museum-quiet__03.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.2米，站在人物左后方，机位高度约1.55米略高于肩部平视
- 动作：背对镜头站在画作前约1.2米处，双肩放松，头部微仰，视线对准画心上部，双手自然垂放
- 服装：服装与妆发待确认；肩部线条清晰，避免高领遮挡颈部，发型不遮挡侧脸轮廓
- 光线：以画面中画作射灯为环境主光，人物后背与肩部由展厅漫射光勾勒轮廓；不使用闪光灯与三脚架
- 道具：无
- 裁切／必见：裁切人物头部至腰部，保留完整画心与画框上沿，右侧不裁断画框　｜　人物越肩轮廓、画作主体、观看视线方向、1米以上观看距离
- 废片判据：画框被裁断、人物头部完全遮挡画心、画面因手持有明显抖动模糊

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, over the shoulder documentary shot, adult visitor standing in front of a framed painting in an art gallery, head tilted slightly up, quiet observation, painting fully visible, soft gallery spotlight, no flash, handheld, eye level behind subject, realistic candid reportage, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S11-04　射灯光斑背景侧脸近景

- 文件名：`scene-museum-quiet__04.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约1米，位于人物侧前方约30度，机位高度约1.5米平视
- 动作：侧身面对展墙，下巴微收，视线平视画作中部，嘴唇自然闭合，保持静观表情约4秒
- 服装：服装与妆发待确认；面部不被衣领遮挡，发丝自然不遮眼，妆面保持哑光避免反光
- 光线：展墙射灯形成背景光斑，人物面部由侧前方展厅环境光照明；必要时让人物微调朝向获得柔和侧光，不用闪光灯
- 道具：无
- 裁切／必见：裁切至人物胸部以上，保留左后方射灯光斑完整，头顶留约8%空间　｜　人物静观侧脸、眼神方向、背景射灯光斑形状、画面无闪光灯痕迹
- 废片判据：光斑过曝成死白、面部阴影过重、出现假笑或看镜头、背景光斑被裁掉

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, close-up documentary portrait, adult visitor in side profile quietly observing art in a museum gallery, soft ambient light on face, warm wall spotlight bokeh in background, natural calm expression, no flash, eye level, muted realistic film look, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S11-05　移步换展品行走镜

- 文件名：`scene-museum-quiet__05.png`　全身 / 平视 / 35mm / f/4 / 竖幅
- 机位：距主体约3米，站立于展厅通道一侧，机位高度约1.2米略低平视
- 动作：从画面左侧向右侧缓步走过展墙，步幅小、速度慢，头微转向画作，双手自然摆动，不看镜头
- 服装：服装与妆发待确认；下装便于行走，鞋底柔软不产生噪音，避免飘动过大的配饰
- 光线：展厅顶灯与展墙射灯混合照明，保持现场光原貌；不使用闪光灯与三脚架，靠提高感光度保证快门
- 道具：无
- 裁切／必见：保留人物全身与脚下地面，画面上沿保留展墙挂画下缘，不裁掉脚部　｜　行走方向、身体与展墙的平行关系、人与展品1米以上距离、展厅地面反光
- 废片判据：人物贴展墙过近、脚步被裁断、行走姿态僵硬或看镜头、出现闪光灯补光痕迹

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, documentary photograph, adult visitor slowly walking along a museum gallery wall, small steps, head slightly turned toward artworks, hands naturally swinging, full body visible, polished floor reflection, existing gallery lighting, no flash, handheld, low eye level, candid motion, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S11-06　驻足停步低机位全身镜

- 文件名：`scene-museum-quiet__06.png`　全身 / 地面低角度 / 35mm / f/4 / 竖幅
- 机位：距主体约2.8米，蹲姿机位高度约0.9米，位于人物侧前方
- 动作：在画作前停下，双脚前后错开约半步，重心落在后脚，双手自然垂在身前，抬头看画
- 服装：服装与妆发待确认；裤装或裙摆自然垂落，避免蹲拍时出现尴尬褶皱，鞋面干净
- 光线：现场展墙射灯照明画作，人物正面由展厅环境漫射光补足；地面反光可作自然补光，不启用闪光灯
- 道具：无
- 裁切／必见：保留人物全身与脚下地面，顶部保留画作下缘，脚下留约10%地面空间　｜　人物停步姿态、全身轮廓、展墙画作、1米以上观看距离、低机位带来的空间感
- 废片判据：人物脚部被裁、低机位导致人物变形过度、画作与人物重叠遮挡、地面过曝

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, low angle full body documentary photo, adult visitor pausing in front of a painting in an art museum, feet staggered, hands relaxed in front, looking up at artwork, gallery wall and polished floor visible, existing spotlight, no flash, handheld, ground level perspective, quiet mood, 35mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S11-07　画作细节与观看视线交替镜

- 文件名：`scene-museum-quiet__07.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约1.5米，位于人物右后方，机位高度约1.5米，镜头略越过人物视线方向
- 动作：保持静止站立，视线固定在画作局部，右手自然垂放不抬起，头部轻微左右移动跟随画面细节
- 服装：服装与妆发待确认；肩部与后脑轮廓整洁，避免帽檐遮挡视线方向
- 光线：画作由展墙射灯照亮，人物轮廓处于环境暗部；以画作曝光为准，人物保留剪影感，不用闪光灯
- 道具：无
- 裁切／必见：画作局部占画面约三分之二，人物肩部与后脑占左侧三分之一，不裁断画作主体细节　｜　画作笔触或局部细节、人物观看视线方向、人物与画作1米以上距离
- 废片判据：画作局部过曝丢失细节、人物完全出画、视线与画作方向不一致

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, documentary detail shot, over the shoulder of an adult visitor looking at a painting, painting texture and brushwork in focus, visitor shoulder and back of head as soft foreground, gallery spotlight on artwork, no flash, eye level, realistic museum atmosphere, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S11-08　展厅纵深引导线环境镜

- 文件名：`scene-museum-quiet__08.png`　全景 / 平视 / 35mm / f/5.6 / 横幅
- 机位：距主体约5米，位于通道一端，机位高度约1.6米平视，利用展墙与地面形成引导线
- 动作：站在展厅通道中段，背对镜头，身体朝向纵深方向，双手自然垂放，静止看前方展墙
- 服装：服装与妆发待确认；整体色调与展厅环境协调，避免大面积图案干扰纵深线条
- 光线：展厅顶部灯具与展墙射灯共同提供环境光，保持现场光；不补光、不闪光、不使用三脚架
- 道具：无
- 裁切／必见：保留顶部灯具排列与地面透视线，人物全身完整，脚下保留约10%地面　｜　展厅纵深、人物全身背影、展墙排列、人与最近展品1米以上距离
- 废片判据：透视线被人物完全遮挡、顶灯过曝、人物贴展墙、画面出现其他游客大面积干扰

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, wide documentary shot of an art museum gallery corridor, one adult visitor standing in the middle facing the depth of the hall seen from behind, gallery walls and ceiling lights forming leading lines, full body, existing lighting only, no flash, handheld, eye level, quiet contemplative atmosphere, 35mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S11-09　离开展厅回望收尾镜

- 文件名：`scene-museum-quiet__09.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，位于人物侧前方，机位高度约1.5米平视
- 动作：走到展厅出口附近，侧身回头望向展墙方向，肩膀微转，双手自然垂放，表情平静
- 服装：服装与妆发待确认；保持与前序镜头一致的装束，确保时间连续性
- 光线：出口区域环境光偏暗，展墙射灯作背景光源；以人物面部曝光为准，靠现场光完成，不用闪光灯
- 道具：无
- 裁切／必见：裁切至人物大腿以上，保留左侧展墙局部与出口结构边缘，不裁断回头视线方向　｜　人物回头动作、视线方向、展厅出口与展墙空间关系、静观情绪收束
- 废片判据：人物回头过猛显得摆拍、出口结构完全缺失、面部曝光不足、出现闪光灯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, documentary photograph, adult visitor pausing near the exit of a museum gallery, turning head back toward the exhibition wall, calm expression, side profile visible, gallery space and wall lights in background, existing lighting only, no flash, handheld, eye level, quiet ending mood, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S11-01 ｜ 镜头名 ｜ 35mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

