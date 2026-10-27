# S24 · 舞者练功房

用例 `ppl-dancer-studio`　镜头 9　画幅 竖幅 2:3（1024x1536）

## 系列圣经（每次生成前先读这一段，全系列不变）

- **人物**：一名成年舞者（全系列同一人，脸型、发型、肤色必须与参考帧完全一致）
- **服装**：舞者穿着深色紧身练功服（头发扎起，无饰品。
- **场地**：舞蹈教室（把杆与镜墙现场已有）
- **光线**：利用教室顶部现有荧光灯，关闭闪光灯，必要时用反光板从正面补光（如现场有）。
- **调色**：low-contrast pastel, slightly green shadows, fine grain
- **画幅**：竖幅 2:3
- **焦段序列**：50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm → 50mm
- **禁用项**：no in-image text or labels；no watermark；no extra people in frame；no objects that are not listed in this frame；no flash；no tripod visible
- **原始要求**：50mm全程；跳跃凝固2镜（写快门与预判口令）、慢门拖影1镜（依靠把杆稳定机身，三脚架未备）；镜面反射构图2镜但摄影师不入镜；机位写明距舞者距离；禁用闪光灯。

> 英文提示词里刻意**不重复描述**人物与服装，只用 "same person / same outfit as the reference image"。这样既避免中英混写拖累模型，也比再描述一遍更严格。

## 第一步：定妆参考帧（先出这 3 张，选一张作为全系列的身份锚点）

三张都用 hero 分镜的英文提示词作内容基底，只改机位与景别：

### 参考帧 A · 正面胸像

```text
A  of a dancer standing still with back to camera, facing a mirror wall in a dance studio. The mirror reflects her front view. She wears dark tight practice clothes, hair tied back. Natural fluorescent lighting, no flash. Composition places dancer on right third, mirror reflection on left., eye level, depth of field showing the studio space including barre. Artistic and powerful mood, head-and-shoulders front view, neutral expression, looking slightly off camera, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 B · 45° 侧脸

```text
A  of a dancer standing still with back to camera, facing a mirror wall in a dance studio. The mirror reflects her front view. She wears dark tight practice clothes, hair tied back. Natural fluorescent lighting, no flash. Composition places dancer on right third, mirror reflection on left., eye level, depth of field showing the studio space including barre. Artistic and powerful mood, head-and-shoulders three-quarter 45 degree view, soft side light, 85mm lens at f/2, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

### 参考帧 C · 全身定妆

```text
A  of a dancer standing still with back to camera, facing a mirror wall in a dance studio. The mirror reflects her front view. She wears dark tight practice clothes, hair tied back. Natural fluorescent lighting, no flash. Composition places dancer on right third, mirror reflection on left., eye level, depth of field showing the studio space including barre. Artistic and powerful mood, full body standing, relaxed natural stance, whole outfit visible head to toe, 50mm lens at f/4, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

> 出图后挑一张"脸最正常、衣服最还原"的作为 **REF**，后面每一帧都用它做参考图（图生图 / 编辑模式，`input_fidelity` 调高）。

## 第二步：分镜序列（按顺序出图，全部以 REF 为参考图）

| # | 镜头 | 景别 | 角度 | 焦段 | 光圈 | 机位与距离 |
|---|---|---|---|---|---|---|
| 1 | 镜墙空间交代 | 全身 | 平视 | 50mm | f/4 | 距主体约5米，相机高度1.5米，平视。 |
| 2 | 把杆压腿力量感 | 中景 | 低机位仰拍 | 50mm | f/2.8 | 距主体约3米，相机高度1.2米，略低于眼平线。 |
| 3 | 跳跃凝固一 | 全身 | 平视 | 50mm | f/4 | 距主体约5米，相机高度1米，平视。 |
| 4 | 跳跃凝固二 | 中景 | 平视 | 50mm | f/2.8 | 距主体约4米，相机高度1.5米，平视。 |
| 5 | 慢门拖影把杆旋转 | 中景 | 平视 | 50mm | f/2.8 | 距主体约2米，相机高度1米，平视。 |
| 6 | 镜面反射焦点 | 近景 | 平视 | 50mm | f/2 | 距主体约2.5米，相机高度1.2米，平视。 |
| 7 | 把杆细节手部特写 | 特写 | 平视 | 50mm | f/1.8 | 距主体约0.5米，相机高度1米，平视。 |
| 8 | 跳跃落地缓冲 | 全身 | 低机位仰拍 | 50mm | f/4 | 距主体约4米，相机高度1米，低角度。 |
| 9 | 结束姿态肖像 | 近景 | 平视 | 50mm | f/2 | 距主体约3米，相机高度1.5米，平视。 |

### S24-01　镜墙空间交代

- 文件名：`ppl-dancer-studio__01.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约5米，相机高度1.5米，平视。
- 动作：舞者背对镜头，面向镜墙，双手自然下垂，头部微低，呈现准备前的静止状态。
- 服装：舞者穿着深色紧身练功服（具体款式待确认），头发扎起，无饰品。
- 光线：利用教室顶部现有荧光灯，关闭闪光灯，必要时用反光板从正面补光（如现场有）。
- 道具：无
- 裁切／必见：从头顶到脚底完整纳入，保留镜中倒影的头顶空间。　｜　舞者背影、镜中正面倒影、把杆局部、教室空间深度。
- 废片判据：摄影师入镜、倒影不完整、闪光灯痕迹、镜面眩光过曝。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 1 of 9, A full-body shot of a dancer standing still with back to camera, facing a mirror wall in a dance studio. The mirror reflects her front view. She wears dark tight practice clothes, hair tied back. Natural fluorescent lighting, no flash. Composition places dancer on right third, mirror reflection on left., eye level, depth of field showing the studio space including barre. Artistic and powerful mood, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S24-02　把杆压腿力量感

- 文件名：`ppl-dancer-studio__02.png`　中景 / 低机位仰拍 / 50mm / f/2.8 / 竖幅
- 机位：距主体约3米，相机高度1.2米，略低于眼平线。
- 动作：舞者侧对把杆，一条腿放在把杆上，身体前倾压腿，手臂伸直，表情专注。
- 服装：紧身练功服（待确认），头发盘起，露出颈部线条。
- 光线：侧逆光，从窗户或侧灯方向来，勾勒身体轮廓，正面用反光板补光（如现场有）。
- 道具：把杆（现场已有）
- 裁切／必见：从头顶到脚踝，保留把杆完整。　｜　舞者身体拉伸的张力、肌肉线条、把杆与身体的接触点。
- 废片判据：姿势松散、光线平淡、把杆被裁切、背景杂乱。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 2 of 9, A side view of a dancer stretching at a barre, one leg on the barre, body leaning forward, arms extended. She wears a tight practice outfit, hair in a bun. Side-back lighting accentuates her silhouette and muscle tension., slightly low angle. The barre is visible. Artistic and powerful, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 把杆（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S24-03　跳跃凝固一

- 文件名：`ppl-dancer-studio__03.png`　全身 / 平视 / 50mm / f/4 / 竖幅
- 机位：距主体约5米，相机高度1米，平视。
- 动作：舞者从地面跃起，双腿在空中分开成180度，双臂向上伸展，头部抬起。
- 服装：紧身练功服（待确认），头发扎紧。
- 光线：顶部灯光为主，正面用反光板补光（如有），无闪光。
- 道具：无
- 裁切／必见：全身入镜，保留跳跃的顶点空间。　｜　空中的姿态、肌肉线条、面部表情。
- 废片判据：动作模糊、肢体裁切、背景过曝。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 3 of 9, A dancer frozen mid-air in a grand jeté, legs split 180 degrees, arms raised. Wearing a tight practice outfit. Shot with, eye level, fast shutter speed to freeze motion. High key lighting, no flash. Artistic and powerful, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S24-04　跳跃凝固二

- 文件名：`ppl-dancer-studio__04.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约4米，相机高度1.5米，平视。
- 动作：舞者从把杆旁跃起，空中转身，手臂展开，眼神看向镜头方向。
- 服装：练功服（待确认），发饰简洁。
- 光线：侧光强调肌肉，正面补光（如有反光板）。
- 道具：把杆（现场已有）
- 裁切／必见：膝盖以上至头顶，保留镜中反射。　｜　空中转身的动势、镜中倒影、面部表情。
- 废片判据：摄影师入镜、动作不清晰、光线混乱。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 4 of 9, A dancer jumping mid-air, turning, arms extended, looking towards camera. Shot with, eye level, fast shutter. Mirror reflection visible without photographer. Side lighting, no flash. Artistic and powerful, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 把杆（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S24-05　慢门拖影把杆旋转

- 文件名：`ppl-dancer-studio__05.png`　中景 / 平视 / 50mm / f/2.8 / 竖幅
- 机位：距主体约2米，相机高度1米，平视。
- 动作：舞者双手扶把杆，单腿支撑，另一腿向后延伸，缓慢旋转身体。
- 服装：紧身练功服（待确认），头发扎起。
- 光线：持续光源（现场灯），避免频闪，使用三脚架（未备）则依靠把杆稳定。
- 道具：把杆（现场已有）
- 裁切／必见：从头顶到脚踝，保留旋转轨迹。　｜　身体旋转的拖影、把杆的稳定感、面部表情。
- 废片判据：拖影过度或不足、把杆模糊、背景杂乱。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 5 of 9, A dancer holding a barre, one leg extended, slowly turning, creating a motion blur effect. Shot with, slow shutter speed, camera stabilized by resting on the barre. Natural lighting, no flash. Artistic and powerful, 50mm lens at f/2.8, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 把杆（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S24-06　镜面反射焦点

- 文件名：`ppl-dancer-studio__06.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约2.5米，相机高度1.2米，平视。
- 动作：舞者侧对镜子，单手扶把杆，另一手轻轻触碰镜面，眼神与镜中自己对视。
- 服装：紧身练功服（待确认），头发披散或扎起（待确认）。
- 光线：利用镜面反射补光，避免直射光造成眩光。
- 道具：无
- 裁切／必见：从头顶到腰部，重点突出镜中倒影和眼神。　｜　舞者与镜中倒影的眼神交流、手部动作、把杆局部。
- 废片判据：摄影师入镜、镜面反光过强、构图不平衡。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 6 of 9, A dancer touching a mirror wall, looking at her reflection, one hand on the barre. Shot with, eye level. Composition focuses on the reflection and eye contact. Soft lighting, no flash. Artistic and powerful, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S24-07　把杆细节手部特写

- 文件名：`ppl-dancer-studio__07.png`　特写 / 平视 / 50mm / f/1.8 / 竖幅
- 机位：距主体约0.5米，相机高度1米，平视。
- 动作：舞者双手紧握把杆，手指关节用力，青筋微显。
- 服装：练功服袖口或手腕部分（视服装而定）。
- 光线：侧光突出手部纹理。
- 道具：把杆（现场已有）
- 裁切／必见：仅手部与部分把杆，手腕以上裁切。　｜　手部肌肉张力、把杆质感。
- 废片判据：光线平淡、手部模糊、把杆不清晰。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 7 of 9, A close-up of a dancer's hands gripping a barre, knuckles white, veins visible. Shot with, eye level. Side lighting to emphasize texture. No flash. Artistic and powerful, 50mm lens at f/1.8, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: 把杆（现场已有）.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S24-08　跳跃落地缓冲

- 文件名：`ppl-dancer-studio__08.png`　全身 / 低机位仰拍 / 50mm / f/4 / 竖幅
- 机位：距主体约4米，相机高度1米，低角度。
- 动作：舞者从跳跃落地，膝盖弯曲缓冲，身体前倾，手臂向后伸展，保持平衡。
- 服装：练功服（待确认），头发因动作略显凌乱。
- 光线：顶部光，正面补光（如有）。
- 道具：无
- 裁切／必见：全身入镜，保留地面反射。　｜　落地瞬间的肌肉控制、面部表情、身体线条。
- 废片判据：动作模糊、地面过曝。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 8 of 9, A dancer landing from a jump, knees bent in a plié, arms back for balance, body leaning forward. Shot with, low angle. Fast shutter to freeze motion. No flash. Artistic and powerful, 50mm lens at f/4, subject and environment clearly readable, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

### S24-09　结束姿态肖像

- 文件名：`ppl-dancer-studio__09.png`　近景 / 平视 / 50mm / f/2 / 竖幅
- 机位：距主体约3米，相机高度1.5米，平视。
- 动作：舞者站立，微微喘息，汗水在皮肤上闪光，眼神坚定地看向镜头。
- 服装：练功服（待确认），头发微湿，无饰品。
- 光线：柔和的侧光，突出面部轮廓和汗水质感。
- 道具：无
- 裁切／必见：从头顶到胸部，保留面部表情。　｜　汗水、疲惫但坚定的表情、皮肤质感。
- 废片判据：表情僵硬、光线平淡。

```text
CONSISTENCY LOCK, the same person as the reference image, identical face, hairstyle, makeup and outfit, same location and same lighting direction, same colour grade: low-contrast pastel, slightly green shadows, fine grain, 2:3 vertical framing, no in-image text or labels, frame 9 of 9, A half-body portrait of a dancer after practice, slightly out of breath, sweat glistening on skin, looking at camera with determination. Shot with, eye level. Soft side lighting, no flash. Artistic and powerful, 50mm lens at f/2, shallow depth of field, background melting into bokeh, photorealistic editorial photograph, natural skin texture, clean unmarked frame.
```

编辑指令（用 REF 做图生图时）：`Keep the face, hairstyle and outfit exactly as the reference image; change only the camera position, framing and pose to match this frame. Do not add props beyond: none.`

负面：`no in-image text or labels, no watermark, no extra people in frame, no objects that are not listed in this frame, no flash, no tripod visible, extra fingers, deformed hands, distorted face, plastic skin, oversaturated, duplicate subject, tilted horizon`

## 第三步：系列接触印样（拼贴）

- 版式：3×3 网格，格间留 8px 白边，外边距一致
- **图内绝对不要生成文字**；序号与标题在排版阶段用固定字体叠加（避免模型乱写参数，上一轮 12 格里 5 格参数被写错）
- 统一标签格式：`S24-01 ｜ 镜头名 ｜ 50mm f/4`
- 全系列统一色温与对比，拼在一起要像"同一次拍摄"，不是"精选集"

## 一致性自检（每系列出完逐项过）

- [ ] 脸型/发型一致（同一人）
- [ ] 服装一致（颜色、材质、配饰）
- [ ] 场地一致（同一处，背景元素不跑）
- [ ] 光位一致（主光方向不跳）
- [ ] 色温一致（冷暖不跳）
- [ ] 画幅一致（竖就全竖）
- [ ] 画面无多余人/物，无文字水印

