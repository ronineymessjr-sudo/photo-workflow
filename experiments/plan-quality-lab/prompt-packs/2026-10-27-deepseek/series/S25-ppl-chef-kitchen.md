# S25 · 厨师后厨的火焰

用例 `ppl-chef-kitchen`　镜头 10　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年厨师（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：白色厨师服、深色围裙，袖口自然；厨师帽与
- **场地**：餐厅后厨（已获许可，非高峰时段）
- **光线**：仅利用后厨顶部现有日光灯，不补光；检查地面湿滑区域，机位后方铺防滑垫或确认干燥
- **调色**：black and white, strong grain, high micro-contrast
- **画幅**：竖幅 2:3
- **焦段序列**：35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm → 35mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash
- **原始要求**：35mm全程；颠锅火光2镜（机位距灶台1.5米以外不干扰操作）；手部切配特写1镜（距40厘米）；只利用后厨现有灯光；禁用闪光灯；地面湿滑写明站位安全。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
candid documentary shot, adult chef leaning over stainless steel prep counter sorting ingredients in a crate, rolled sleeves, dark apron, existing ceiling light reflections on metal, no flash, slight low angle, warm gritty kitchen mood, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
candid documentary shot, adult chef leaning over stainless steel prep counter sorting ingredients in a crate, rolled sleeves, dark apron, existing ceiling light reflections on metal, no flash, slight low angle, warm gritty kitchen mood, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
candid documentary shot, adult chef leaning over stainless steel prep counter sorting ingredients in a crate, rolled sleeves, dark apron, existing ceiling light reflections on metal, no flash, slight low angle, warm gritty kitchen mood, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 后厨入口环境交代 | 全景 | 平视 | 35mm | f/5.6 | 距主体约4米，后厨入口门框内侧，机位高度约1.6米平视 |
| 2 | 厨师备料侧影 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2米，操作台侧前方45度，机位高度约1.4米略低平视 |
| 3 | 手部切配特写 | 大特写 | 高机位俯拍 | 35mm | f/1.8 | 距手部约40厘米，俯身于操作台侧，机位高度约1.2米略俯 |
| 4 | 灶前点火准备 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2.5米，灶台左后方，机位高度约1.5米平视 |
| 5 | 颠锅火光第一镜 | 中景 | 平视 | 35mm | f/2.8 | 距灶台约1.8米，灶台正前方偏右30度，机位高度约1.5米平视，确保不干扰操作 |
| 6 | 颠锅火光第二镜低机位 | 近景 | 低机位仰拍 | 35mm | f/2 | 距灶台约2米，灶台左前方低位，机位高度约1.1米，仰拍但不贴近地面 |
| 7 | 火焰熄灭后的喘息 | 中景 | 平视 | 35mm | f/2.8 | 距主体约2.2米，灶台右前方，机位高度约1.5米平视 |
| 8 | 排烟罩下仰视 | 近景 | 低机位仰拍 | 35mm | f/2 | 距主体约1.5米，灶台正前方下蹲，机位高度约1米，相机上仰 |
| 9 | 厨师拭汗细节 | 特写 | 平视 | 35mm | f/1.8 | 距主体约1.2米，灶台侧前方，机位高度约1.5米平视 |
| 10 | 灶台余温收尾空镜 | 特写 | 平视 | 35mm | f/1.8 | 距灶台约1.5米，灶台正前方，机位高度约1.4米平视 |

### S25-01　后厨入口环境交代

- 文件名：`ppl-chef-kitchen__01.png`　全景 / 平视 / 35mm / f/5.6 / 横幅
- 机位：距主体约4米，后厨入口门框内侧，机位高度约1.6米平视
- 动作：厨师背对镜头站于灶台前，双手自然垂放，先不动作，让观众看清空间关系
- 服装：白色厨师服、深色围裙，袖口自然；厨师帽与具体款式待确认
- 光线：仅利用后厨顶部现有日光灯，不补光；检查地面湿滑区域，机位后方铺防滑垫或确认干燥
- 道具：现有灶台、排烟罩、不锈钢操作台（现场自然存在）
- 裁切／必见：保留门框上沿与地面，不裁掉排烟罩和湿滑地面提示　｜　后厨空间纵深、灶台与通道关系、地面水渍反光
- 废片判据：闪光痕迹、画面过曝发白、排烟罩被裁掉、地面湿滑不可见

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 1 of 10, documentary photo, adult chef in white uniform and dark apron standing back to camera in a restaurant kitchen, stainless steel counters, range hood, wet floor reflections, existing fluorescent ceiling lights, no flash, eye level, realistic, gritty atmosphere, 35mm lens at f/5.6, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现有灶台、排烟罩、不锈钢操作台（现场自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-02　厨师备料侧影

- 文件名：`ppl-chef-kitchen__02.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2米，操作台侧前方45度，机位高度约1.4米略低平视
- 动作：厨师低头整理操作台上的食材筐，双手伸入筐内翻拣，肩膀微沉
- 服装：白色厨师服袖口挽至小臂中段，围裙系带可见；发型与帽子细节待确认
- 光线：后厨现有顶灯为主光，利用不锈钢台面反光作侧向补亮，不额外加灯
- 道具：现场食材筐、不锈钢操作台（自然存在）
- 裁切／必见：从头顶留一拳空间到腰腹，保留手部与筐沿　｜　双手翻拣食材的动作、厨师服褶皱、操作台金属反光
- 废片判据：手部出画、筐内物品喧宾夺主、顶灯直射镜头产生眩光

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 2 of 10, candid documentary shot, adult chef leaning over stainless steel prep counter sorting ingredients in a crate, rolled sleeves, dark apron, existing ceiling light reflections on metal, no flash, slight low angle, warm gritty kitchen mood, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场食材筐、不锈钢操作台（自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-03　手部切配特写

- 文件名：`ppl-chef-kitchen__03.png`　大特写 / 高机位俯拍 / 35mm / f/1.8 / 竖幅
- 机位：距手部约40厘米，俯身于操作台侧，机位高度约1.2米略俯
- 动作：左手按稳食材成爪形，右手持厨刀下切，刀锋接触砧板瞬间
- 服装：厨师服袖口收紧，手腕裸露；指甲修剪干净，不戴戒指
- 光线：仅用操作台正上方现有顶灯，让刀面与砧板形成明暗对比，不加反光板
- 道具：现场厨刀、砧板、待切食材（自然存在）
- 裁切／必见：裁到小臂中段，刀尖与砧板边缘完整入画　｜　刀锋切入食材的瞬间、指关节弯曲护指、砧板木纹
- 废片判据：手指入镜遮挡刀锋、顶灯在刀面形成死白反光、画面抖动

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 3 of 10, extreme close up documentary, adult chef hands chopping ingredients on wooden cutting board, claw grip protecting fingers, kitchen knife mid-cut, overhead ceiling light contrast, no flash, shallow but readable detail, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场厨刀、砧板、待切食材（自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-04　灶前点火准备

- 文件名：`ppl-chef-kitchen__04.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2.5米，灶台左后方，机位高度约1.5米平视
- 动作：厨师侧身站立，右手旋动灶台旋钮，左手扶锅柄，目光落在炉头
- 服装：围裙下摆自然垂落，厨师服前襟可见油渍痕迹属纪实；具体污渍程度待确认
- 光线：利用炉火初起的暖光与顶灯混合，不补光，保留暗部
- 道具：现场炒锅、灶台旋钮（自然存在）
- 裁切／必见：保留旋钮手部与炉头，不裁掉锅柄　｜　手指旋钮动作、炉头蓝色小火苗、锅柄握持
- 废片判据：火焰完全被手遮挡、顶灯冷光压掉火色、背景排烟罩过曝

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 4 of 10, documentary kitchen scene, adult chef side view turning stove knob, hand on wok handle, small blue flame igniting, existing ceiling light mixed with warm fire glow, no flash, eye level, authentic texture, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场炒锅、灶台旋钮（自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-05　颠锅火光第一镜

- 文件名：`ppl-chef-kitchen__05.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距灶台约1.8米，灶台正前方偏右30度，机位高度约1.5米平视，确保不干扰操作
- 动作：厨师双手握锅柄向前送再回拉，锅中食材腾空，火焰随油雾窜起
- 服装：厨师服前襟与围裙正面，袖口扣紧防火焰；帽子固定牢靠
- 光线：完全依赖颠锅瞬间火焰与后厨顶灯，快门速度提高凝固火苗，禁用闪光灯
- 道具：现场炒锅、灶台（自然存在）
- 裁切／必见：从厨师头顶到锅底，火焰顶端留出空间不裁　｜　锅中食材腾空、火焰窜起形状、厨师发力手臂线条
- 废片判据：火焰糊成一片无层次、机位进入灶台1.5米内、画面出现闪光灯痕迹

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 5 of 10, dynamic documentary, adult chef tossing wok, ingredients airborne, burst of flame from oil mist, stainless kitchen background, existing ceiling light, no flash, eye level, frozen motion, fiery gritty atmosphere, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场炒锅、灶台（自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-06　颠锅火光第二镜低机位

- 文件名：`ppl-chef-kitchen__06.png`　近景 / 低机位仰拍 / 35mm / f/2 / 竖幅
- 机位：距灶台约2米，灶台左前方低位，机位高度约1.1米，仰拍但不贴近地面
- 动作：厨师同前重复颠锅动作，身体前倾，锅沿上扬
- 服装：围裙与厨师服下摆，动作中衣摆微扬；鞋部不入画不评价
- 光线：火焰作为主光源，顶灯作背景轮廓光，不补光不闪光
- 道具：现场炒锅、灶台（自然存在）
- 裁切／必见：裁到厨师膝盖以上，保留火焰上升空间与排烟罩下沿　｜　火焰从锅沿腾起的层次、厨师前倾发力、背景排烟罩轮廓
- 废片判据：机位距灶台不足1.5米、火焰过曝无细节、地面湿滑未处理

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 6 of 10, low angle documentary, adult chef leaning forward tossing wok, flame rising from pan edge, range hood silhouette, fire as key light, no flash, energetic fiery kitchen scene, realistic, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场炒锅、灶台（自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-07　火焰熄灭后的喘息

- 文件名：`ppl-chef-kitchen__07.png`　中景 / 平视 / 35mm / f/2.8 / 竖幅
- 机位：距主体约2.2米，灶台右前方，机位高度约1.5米平视
- 动作：厨师放锅回灶，双手撑住灶台边缘，微微低头呼气，肩背起伏
- 服装：厨师服领口微松，额角有汗，围裙保持原位；汗量按现场实际
- 光线：后厨现有顶灯从上方打下，利用侧面金属柜反光补暗部，不移动灯位
- 道具：现场灶台、炒锅（自然存在）
- 裁切／必见：从头顶到撑台的手部，保留锅沿入画　｜　双手撑台的支撑感、肩背起伏轮廓、额角汗水反光
- 废片判据：表情表演痕迹过重、汗珠被补光打得发假、锅具位置与上一镜不连续

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 7 of 10, intimate documentary portrait, adult chef resting hands on stove edge after cooking, slight sweat on temple, breathing, wok on stove, existing ceiling light, stainless steel reflections, no flash, eye level, smoky warmth, 35mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场灶台、炒锅（自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-08　排烟罩下仰视

- 文件名：`ppl-chef-kitchen__08.png`　近景 / 低机位仰拍 / 35mm / f/2 / 竖幅
- 机位：距主体约1.5米，灶台正前方下蹲，机位高度约1米，相机上仰
- 动作：厨师站在灶台前抬头看向排烟罩，单手扶锅柄，身体放松
- 服装：厨师服与围裙正面全貌，帽子在仰拍中完整可见
- 光线：仅用排烟罩下方现有照明与顶灯，油烟在光中可见，不补光
- 道具：现场排烟罩、灶台、炒锅（自然存在）
- 裁切／必见：保留排烟罩金属滤网与厨师面部，裁到腰腹　｜　排烟罩金属结构、油烟在光中的层次、厨师仰视面部
- 废片判据：仰拍导致人物变形过度、油烟被闪光打白、排烟罩裁切不完整

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 8 of 10, low angle documentary, adult chef looking up at range hood in kitchen, smoke haze catching existing light, stainless steel hood, no flash, realistic gritty atmosphere, vertical depth, 35mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场排烟罩、灶台、炒锅（自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-09　厨师拭汗细节

- 文件名：`ppl-chef-kitchen__09.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距主体约1.2米，灶台侧前方，机位高度约1.5米平视
- 动作：厨师抬起前臂横向擦过额头，随即放下手臂继续看向灶台
- 服装：厨师服袖口、前臂皮肤与额角汗光；袖口是否卷起待确认
- 光线：顶灯从斜上方照亮额头与前臂，保留面颊暗部，不补光
- 道具：无
- 裁切／必见：从头顶到胸口，前臂完整入画，不裁手腕　｜　前臂擦汗的接触瞬间、额头皮肤反光、眼神方向
- 废片判据：手臂遮挡整张脸、汗光被处理成油光假面、动作僵硬摆拍

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 9 of 10, candid close shot, adult chef wiping forehead with forearm, sweat sheen on skin, stainless kitchen blurred background, existing overhead light, no flash, eye level, honest documentary texture, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S25-10　灶台余温收尾空镜

- 文件名：`ppl-chef-kitchen__10.png`　特写 / 平视 / 35mm / f/1.8 / 竖幅
- 机位：距灶台约1.5米，灶台正前方，机位高度约1.4米平视
- 动作：厨师已退出画面，灶台上炒锅余温冒起细烟，锅柄朝右
- 服装：不适用，画面无人物
- 光线：仅保留后厨现有顶灯，利用锅面余温细烟与金属反光，不补光不闪光
- 道具：现场炒锅、灶台、排烟罩下沿（自然存在）
- 裁切／必见：保留锅体完整与灶台边缘，上方留排烟罩暗部　｜　锅面细烟、灶台余温质感、金属反光
- 废片判据：画面出现人物残影、烟雾被闪光打散、锅具位置与前述镜头不连贯

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: black and white, strong grain, high micro-contrast, 2:3 vertical framing, no in-image text or labels, frame 10 of 10, still life documentary, wok on kitchen stove with faint residual steam, stainless steel counter, range hood shadow above, existing ceiling light, no flash, eye level, quiet fiery aftermath mood, 35mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 现场炒锅、灶台、排烟罩下沿（自然存在）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：4×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S25-01 ｜ 镜头名 ｜ 35mm f/5.6`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

