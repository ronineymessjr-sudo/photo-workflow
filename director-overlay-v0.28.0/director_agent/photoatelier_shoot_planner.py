"""Deterministic local PhotoAtelier shooting-plan planner.

This is the integration seam for the style-oriented XHS reference package. It
does not call an external image service; it returns an executable prompt and
shooting instructions that the PhotoAtelier UI or an image generator can use.
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from functools import lru_cache
import hashlib
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from director_agent.photoatelier_v033_visual_routes import VISUAL_ROUTES, get_visual_route
from director_agent.photoatelier_visual_conditions import build_visual_condition_plan


STYLE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "low-key-cinematic": ("电影", "cinematic", "低调", "暗调", "夜景", "dramatic"),
    "muted-minimal-editorial": ("低饱和", "灰调", "极简", "留白", "minimal", "muted"),
    "warm-documentary-lifestyle": ("纪实", "暖调", "生活方式", "日常", "documentary", "warm"),
    "vivid-sunlit-lifestyle": ("高饱和", "明亮", "旅行", "阳光", "vivid", "sunlit"),
    "cool-moody-editorial": ("冷调", "情绪", "编辑感", "moody", "cool", "editorial"),
    "detail-forward-commercial": ("产品", "细节", "商业", "质感", "detail", "commercial"),
    "natural-lifestyle-reference": ("自然", "纪实", "人像", "生活", "natural", "portrait"),
}

STYLE_LIBRARY: dict[str, dict[str, Any]] = {
    "low-key-cinematic": {
        "label": "低调电影感",
        "palette": "低饱和蓝灰与暖肤色，保留深阴影",
        "light": "侧后方大面积柔光，背景压暗，人物轮廓光",
        "lens": "50mm 或 85mm",
        "aperture": "f/1.8–f/2.8",
        "camera_position": "与模特视线齐平，向主体侧前方 20°",
        "model_position": "画面横向三分之一处，距背景 1.5–2 米",
        "pose": "身体微侧，重心落后脚，肩颈放松，视线越过镜头",
        "prompt": "low-key cinematic portrait, muted blue-gray shadows, warm skin tone, soft rim light, controlled negative space",
    },
    "muted-minimal-editorial": {
        "label": "低饱和极简编辑感",
        "palette": "灰白、米色、低饱和单色",
        "light": "窗光或大柔光箱 45°，阴影保持细节",
        "lens": "50mm 或 70mm",
        "aperture": "f/2.8–f/4",
        "camera_position": "正面略偏 10°，保持水平线稳定",
        "model_position": "画面中心或三分线，四周保留 25–35% 留白",
        "pose": "站立静止，手臂自然下垂或轻触衣摆，下巴微收",
        "prompt": "muted minimal editorial portrait, quiet negative space, soft window light, restrained palette, clean geometry",
    },
    "warm-documentary-lifestyle": {
        "label": "暖调生活纪实",
        "palette": "暖黄色、自然肤色、轻微颗粒",
        "light": "自然侧光或傍晚前光，不强行补平阴影",
        "lens": "35mm 或 50mm",
        "aperture": "f/2.8–f/4",
        "camera_position": "与模特保持 3–4 米，略低于眼睛 5°",
        "model_position": "置于环境动线一侧，前景留出行走空间",
        "pose": "慢走两步后回头，手部保持动作连续，不摆僵硬姿势",
        "prompt": "warm documentary lifestyle portrait, candid walking motion, natural side light, authentic expression, gentle film grain",
    },
    "vivid-sunlit-lifestyle": {
        "label": "明亮高饱和生活方式",
        "palette": "清晰高饱和色块、明亮肤色",
        "light": "顺光或侧顺光，使用反光板抬起眼下阴影",
        "lens": "24mm–35mm",
        "aperture": "f/2.8–f/5.6",
        "camera_position": "低机位 5–10°，与主体保持 2.5–3 米",
        "model_position": "站在色块背景前，主体占画面 45–60%",
        "pose": "一脚向前，肩部打开，手臂做轻微动态，面向光源微笑",
        "prompt": "vivid sunlit lifestyle portrait, saturated color blocks, bright clean skin, playful movement, crisp social-media campaign",
    },
    "cool-moody-editorial": {
        "label": "冷调情绪编辑感",
        "palette": "冷青灰、低亮度肤色、少量高光",
        "light": "单侧硬光或窄光束，背景比主体低 1–2 档",
        "lens": "85mm",
        "aperture": "f/1.8–f/2.2",
        "camera_position": "模特正前方 15°，压低机位 3°",
        "model_position": "贴近墙面或窗边，留出一侧空白",
        "pose": "肩膀轻靠，手指触碰下颌或衣领，视线偏离镜头",
        "prompt": "cool moody editorial portrait, cyan-gray palette, directional hard light, restrained expression, fashion magazine composition",
    },
    "detail-forward-commercial": {
        "label": "细节质感商业",
        "palette": "中性背景、清晰材质色、控制反光",
        "light": "主光加轮廓光，使用柔光布控制高光",
        "lens": "50mm 或 85mm",
        "aperture": "f/4–f/5.6",
        "camera_position": "与主体正面平行，保持产品/服装结构不变形",
        "model_position": "主体居中，距背景 1 米，动作幅度小",
        "pose": "手部展示材质或细节，身体保持稳定，头部微转",
        "prompt": "detail-forward commercial portrait, precise material texture, controlled reflections, clean studio geometry, premium campaign",
    },
    "natural-lifestyle-reference": {
        "label": "自然生活人像",
        "palette": "自然肤色、环境原色、轻微对比",
        "light": "环境光优先，必要时用白色反光板",
        "lens": "35mm 或 50mm",
        "aperture": "f/2.8–f/4",
        "camera_position": "与模特保持 2–3 米，视线齐平",
        "model_position": "融入环境，不强行居中，沿背景线站位",
        "pose": "自然站立或慢走，手部有明确生活动作，避免僵硬对称",
        "prompt": "natural lifestyle portrait, authentic environment, soft available light, relaxed body language, believable everyday moment",
    },
}

STYLE_DISPLAY_ZH: dict[str, dict[str, str]] = {
    "low-key-cinematic": {"label": "低调电影感", "palette": "低饱和蓝灰阴影与暖肤色", "light": "侧后方大面积柔光，压暗背景并保留轮廓光", "lens": "50mm 或 85mm", "aperture": "f/1.8–f/2.8", "camera": "与模特视线齐平，向主体侧前方约 20°", "model": "画面左侧三分之一，距背景约 1.5–2 米", "pose": "身体微侧，重心落后脚，肩颈放松，视线越过镜头"},
    "muted-minimal-editorial": {"label": "低饱和极简编辑感", "palette": "灰白、米色和低饱和单色", "light": "45°窗光或大面积柔光，保留细腻阴影", "lens": "50mm 或 70mm", "aperture": "f/2.8–f/4", "camera": "正面略偏 10°，保持水平线稳定", "model": "画面中心或三分线，四周保留 25–35% 留白", "pose": "静止站立，手臂自然下垂或轻触衣摆，下巴微收"},
    "warm-documentary-lifestyle": {"label": "暖调生活纪实", "palette": "暖黄色、自然肤色和轻微颗粒", "light": "自然侧光或傍晚前光，不过度补平阴影", "lens": "35mm 或 50mm", "aperture": "f/2.8–f/4", "camera": "距模特 3–4 米，略低于眼睛约 5°", "model": "融入环境动线一侧，前景留出行走空间", "pose": "慢走两步后回头，手部保持连续动作，不摆僵硬姿势"},
    "vivid-sunlit-lifestyle": {"label": "明亮高饱和生活方式", "palette": "清晰高饱和色块与明亮肤色", "light": "顺光或侧顺光，用反光板抬起眼下阴影", "lens": "24mm–35mm", "aperture": "f/2.8–f/5.6", "camera": "低机位约 5–10°，距主体 2.5–3 米", "model": "站在色块背景前，主体占画面 45–60%", "pose": "一脚向前，肩部打开，手臂轻微动态，面向光源微笑"},
    "cool-moody-editorial": {"label": "冷调情绪编辑感", "palette": "冷青灰、低亮度肤色和少量高光", "light": "单侧硬光或窄光束，背景比主体低 1–2 档", "lens": "85mm", "aperture": "f/1.8–f/2.2", "camera": "模特正前方偏 15°，压低机位约 3°", "model": "靠近墙面或窗边，留出一侧空白", "pose": "肩胛轻靠，手指触碰下颌或衣领，视线偏离镜头"},
    "detail-forward-commercial": {"label": "细节质感商业", "palette": "中性背景、清晰材质色和受控反光", "light": "主光加轮廓光，用柔光布控制高光", "lens": "50mm 或 85mm", "aperture": "f/4–f/5.6", "camera": "与主体正面平行，保持产品或服装结构不变形", "model": "主体居中，距背景约 1 米，动作幅度小", "pose": "手部展示材质或细节，身体稳定，头部微转"},
    "natural-lifestyle-reference": {"label": "自然生活人像", "palette": "自然肤色、环境原色和轻微对比", "light": "环境光优先，必要时使用白色反光板", "lens": "35mm 或 50mm", "aperture": "f/2.8–f/4", "camera": "距模特 2–3 米，视线齐平", "model": "融入环境，不强行居中，沿背景线站位", "pose": "自然站立或慢走，手部有明确生活动作，避免僵硬对称"},
}
SHOT_FRAMING_ZH = {
    "environmental-wide": "环境远景，全身人物只占画面约 20–28%",
    "high-angle-geometry": "高机位俯拍全身，利用地面几何组织画面",
    "foreground-layer": "隔着前景拍摄的环境全身，人物偏离中心",
    "ground-level-motion": "贴近地面的低机位动态全身",
    "reflection-frame": "镜面或玻璃反射中的框中框构图",
    "long-lens-profile": "长焦侧面远摄，压缩人物与环境层次",
    "overhead-seated": "正上方俯拍的坐姿几何构图",
    "extreme-detail": "手、衣料与环境关系的局部叙事特写",
    "eye-level-medium": "平视中景，交代人物表情和上半身动作",
    "close-expression": "近景表情，保留眼神与细微情绪变化",
    "over-shoulder-context": "越肩观察，建立人物与环境目标的关系",
    "backlit-silhouette": "逆光轮廓全身，强调人物姿态和空间边缘",
    "doorway-frame": "利用门窗形成框景，人物在第二层空间行动",
    "seated-profile": "侧面坐姿中全景，呈现身体线条与环境接触",
    "prop-interaction": "人物使用真实道具完成明确动作的中景",
    "environment-cutaway": "无人环境或物件过渡镜头，补足地点叙事",
}
SHOT_SIZE_FALLBACK = {
    "environmental-wide": "EWS", "high-angle-geometry": "FS", "foreground-layer": "WS",
    "ground-level-motion": "FS", "reflection-frame": "MFS", "long-lens-profile": "FS",
    "overhead-seated": "FS", "extreme-detail": "ECU",
}
CAMERA_ANGLE_FALLBACK = {
    "environmental-wide": "eye_level", "high-angle-geometry": "high_angle", "foreground-layer": "eye_level",
    "ground-level-motion": "ground_level", "reflection-frame": "eye_level", "long-lens-profile": "eye_level",
    "overhead-seated": "overhead", "extreme-detail": "eye_level",
}
SAFETY_CHECKLIST_ZH = [
    "开拍前确认模特同意动作、接触和服装调整边界",
    "动作从小幅度开始，避开快速转身、湿滑地面和不稳定道具",
    "每组拍摄前复核背景、曝光和人物身份一致性",
]


GENERATOR_SETUP: dict[str, str] = {
    "low-key-cinematic": "subject on the left third, eye-level camera, 50mm lens, shallow depth of field, soft rim light, dark background",
    "muted-minimal-editorial": "centered subject with generous negative space, eye-level camera, 50mm lens, soft window light, clean geometry",
    "warm-documentary-lifestyle": "environmental portrait with walking motion, 35mm lens, natural side light, candid framing, gentle film grain",
    "vivid-sunlit-lifestyle": "subject against vivid color blocks, low-angle camera, 35mm lens, bright side light, playful movement",
    "cool-moody-editorial": "subject near a wall with one-sided negative space, 85mm lens, directional hard light, fashion editorial framing",
    "detail-forward-commercial": "stable centered commercial portrait, 85mm lens, controlled reflections, precise material texture, premium campaign lighting",
    "natural-lifestyle-reference": "relaxed environmental portrait, 35mm lens, eye-level camera, available light, believable everyday moment",
}


SHOT_LANGUAGE: tuple[dict[str, str], ...] = (
    {
        "id": "environmental-wide",
        "framing": SHOT_FRAMING_ZH["environmental-wide"],
        "lens": "24mm 或 28mm",
        "aperture": "f/5.6–f/8",
        "photographer_position": "摄影师后退 6–10 米，机位低于腰部约 40 厘米，保持垂直线不倾倒",
        "model_position": "人物放在右下或左下三分点，占画面不超过 28%，为环境保留大面积叙事空间",
        "model_pose": "完整站姿或沿横向路径缓慢行走，不看镜头，动作与环境发生关系",
        "crop_boundary": "头顶保留 5–12% 呼吸空间，完整保留双手、双脚与脚下落点；任何肢体都不得贴边或被画框截断",
        "set_design": "先选一个主导空间结构（长廊、坡道、岸线或建筑立面），再安排前景锚点、人物所在的中景路径和能收住画面的背景；现场颜色控制在一个主色、一个辅色和肤色",
        "must_show": "人物占画面 20–28%，头手脚完整，行进方向有空间，前中后景至少三层，人物动作改变或使用了现场空间",
        "reject_if": "人物居中孤立、只剩大块空地或天空、背景是无功能的通用建筑、脚贴底边、看不出人物为什么在这里",
        "composition": "EXTREME WIDE ESTABLISHING SHOT, (tiny distant full-body figure:1.4) on lower third, subject below 25 percent of frame, expansive architecture, strong negative space",
        "avoid": "medium shot, close-up, waist-up portrait, centered portrait, cropped feet, subject fills frame",
    },
    {
        "id": "high-angle-geometry",
        "framing": SHOT_FRAMING_ZH["high-angle-geometry"],
        "lens": "28mm 或 35mm",
        "aperture": "f/4–f/5.6",
        "photographer_position": "摄影师位于楼梯、平台或安全高点，向下俯拍 35–50°，不与人物视线齐平",
        "model_position": "人物落在道路、台阶或光影几何的交点，完整身体可见，周围保留结构线",
        "model_pose": "向斜前方行走或坐于几何边缘，头部轻微转向光源，不正对镜头站军姿",
        "crop_boundary": "人物完整轮廓四周至少留 8% 安全边距，尤其不在膝、踝、肘、腕处截断；地面结构必须延伸到画框之外",
        "set_design": "只使用真实可拍的台阶、道路标线、地砖或光影边界，让两组以上斜线在人物附近相交；清除无意义墙面与空旷棚景",
        "must_show": "俯角至少 35°，地面占画面一半以上，完整身体与投影可辨，人物落在几何交点而非正中央",
        "reject_if": "接近平视、地面几何不主导、人物像贴在空房间、正面站军姿、几何线与人物没有关系",
        "composition": "pronounced high-angle overhead fashion photograph, full body, graphic ground geometry, diagonal composition, subject off-center",
        "avoid": "eye-level camera, low angle, waist-up portrait, centered symmetrical portrait, cropped legs",
    },
    {
        "id": "foreground-layer",
        "framing": SHOT_FRAMING_ZH["foreground-layer"],
        "lens": "35mm 或 50mm",
        "aperture": "f/2.8–f/4",
        "photographer_position": "摄影师退到门框、植物、窗帘或人群后方，让前景占画面一侧 20–35%",
        "model_position": "人物位于第二层空间的三分点，完整或四分之三身体可见，与前景形成深度关系",
        "model_pose": "正在整理包、看向窗外或经过光区，保持被观察而非摆拍的状态",
        "crop_boundary": "优先完整全身；若使用四分之三景别，只能在大腿中段或小腿中段裁切，不切膝、踝、肘、腕，前景不得遮脸和执行动作的手",
        "set_design": "前景必须是现场已有的门框、帘、植物或行人轮廓，中景给人物一个可执行动作，背景用光源或结构线收束；三层之间亮度或清晰度要有分离",
        "must_show": "前景占一侧 20–35%，人物位于第二空间层，背景仍可读，动作通过前景被观察，画面不是单平面",
        "reject_if": "把模糊叶子随便贴在镜头前、前景遮脸、背景空白、人物仍是正中半身、三层没有明暗或焦点差异",
        "composition": "WIDE environmental fashion shot through huge blurred foreground leaves covering 40 percent of frame, small off-center full body, deep layered space",
        "avoid": "clean empty studio backdrop, centered headshot, waist-up portrait, passport photo, flat single-plane composition",
    },
    {
        "id": "ground-level-motion",
        "framing": SHOT_FRAMING_ZH["ground-level-motion"],
        "lens": "24mm 或 28mm",
        "aperture": "f/4–f/8",
        "photographer_position": "摄影师蹲低到离地 20–30 厘米，镜头略向上 12–18°，距离人物 3–5 米",
        "model_position": "人物从画面侧边斜向穿过，脚步和地面引导线完整保留，不顶天立地",
        "model_pose": "跨步、转身或衣摆被风带起的瞬间，手臂自然参与动作，不停下看镜头",
        "crop_boundary": "头顶和前脚各留至少 6% 安全边距，双脚与地面接触点完整；不得因追求动感裁掉脚尖，也不得用失焦遮盖脸和手的错误",
        "set_design": "地面必须提供一条从画框进入的引导线，近景放一个低矮真实物件形成尺度，背景只保留一个清楚地点信息，避免花坛、电线、楼体同时争夺注意力",
        "must_show": "镜头距地 20–30 厘米、明显仰角、完整动态全身、落脚点和行进方向清楚、脸部仍可辨",
        "reject_if": "机位接近平视、人物顶天立地、动作只是模糊、前脚变形、背景元素杂乱、主体像从画框里冲出去",
        "composition": "WORM'S-EYE VIEW from 20 centimeters above ground, dramatic upward camera, dynamic full body, visible feet close to lens, diagonal walking motion",
        "avoid": "eye-level portrait, static standing pose, waist-up crop, centered vertical portrait, cropped feet",
    },
    {
        "id": "reflection-frame",
        "framing": SHOT_FRAMING_ZH["reflection-frame"],
        "lens": "50mm",
        "aperture": "f/2.8–f/4",
        "photographer_position": "摄影师位于玻璃或镜面侧前方约 30°，让真实空间与反射各占一部分画面",
        "model_position": "人物本体不必完整居中，反射中的脸或轮廓成为第二视觉锚点",
        "model_pose": "从镜面外看向环境、轻触玻璃或经过橱窗，避免同时直视镜头与镜中自己",
        "crop_boundary": "真实人物与反射至少各保留一个完整可识别锚点；镜框可切身体但不能切眼睛、下颌或执行动作的手，反射边界必须在画面内可见",
        "set_design": "先现场确认玻璃、镜面或水面真的产生第二层影像，再安排真实空间、反射层和框体三层；用侧光控制反光，不以普通窗洞代替反射",
        "must_show": "同一人物的本体与反射或清楚轮廓同时存在，反射方向合理，框体有边界，两个空间层发生视觉关系",
        "reject_if": "只有窗框没有反射、出现两个不一致人物、反射逻辑错误、正中全身证件式站姿、玻璃外景只是灰色杂乱背景",
        "composition": "cinematic fashion photograph using a window or mirror reflection, frame within frame, layered real space and reflection, asymmetric composition",
        "avoid": "plain centered portrait, empty background, passport photo, perfectly symmetrical mirror selfie, duplicate person",
    },
    {
        "id": "long-lens-profile",
        "framing": SHOT_FRAMING_ZH["long-lens-profile"],
        "lens": "85mm 或 105mm",
        "aperture": "f/2.8–f/4",
        "photographer_position": "摄影师在人物侧方 8–12 米远摄，镜头与人物行进方向近乎垂直",
        "model_position": "人物置于画面一侧，前后景压缩成色块，给视线或移动方向留出空间",
        "model_pose": "侧身经过、停下观察或回头一瞬，完整轮廓清楚但不要求正脸",
        "crop_boundary": "完整头脚优先，人物四周留移动与视线空间；若收紧景别只能在大腿中段裁切，禁止正好切膝、踝、腕或把后脑贴边",
        "set_design": "在同一视轴上安排近景遮挡、中景人物和远景色块三层，利用 85–105mm 压缩它们；背景必须是可识别地点的简化色块而非空棚弧墙",
        "must_show": "清楚侧面轮廓，摄影师与人物相距 8–12 米，前后景尺度被压缩，人物朝向一侧且该侧有空间",
        "reject_if": "正面直视镜头、广角透视、只有一个平面、通用影棚背景、人物居中静站、看不出长焦压缩",
        "composition": "telephoto side-profile environmental fashion photograph, full-body silhouette, compressed layered background, large directional negative space",
        "avoid": "front-facing centered portrait, wide-angle distortion, waist-up crop, direct eye contact, studio headshot",
    },
    {
        "id": "overhead-seated",
        "framing": SHOT_FRAMING_ZH["overhead-seated"],
        "lens": "28mm 或 35mm",
        "aperture": "f/4–f/5.6",
        "photographer_position": "摄影师在稳固高点垂直向下拍摄 70–90°，确保安全，不站在不稳定家具上",
        "model_position": "人物坐在地毯、台阶或光影块中，四肢形成非对称几何，身体完整落在画面内",
        "model_pose": "自然曲腿坐下，一只手支撑、一只手处理衣料或道具，视线离开镜头",
        "crop_boundary": "身体与全部四肢四周保留至少 7% 安全边距，不切手脚，不让头顶成为最高机位假象；画框应同时容纳人体几何与地面图案",
        "set_design": "地面只保留一种主纹理，并用地毯边、台阶、阳光块或散落道具形成可读几何；道具最多三件且必须被手、脚或视线使用",
        "must_show": "相机向下 70–90°，能看到头顶与肩背关系，人体和地面共同形成非对称图形，至少一只手正在执行动作",
        "reject_if": "只是略高机位、蜷缩在无意义灰墙、四肢纠缠、直接看镜头、地面没有构图作用、姿态像受困而非主动动作",
        "composition": "true top-down overhead fashion photograph, seated full body, graphic asymmetric limb geometry, surrounding floor texture and negative space",
        "avoid": "eye-level portrait, standing waist-up photo, centered passport composition, cropped limbs, direct frontal pose",
    },
    {
        "id": "extreme-detail",
        "framing": SHOT_FRAMING_ZH["extreme-detail"],
        "lens": "85mm 或微距镜头",
        "aperture": "f/4–f/8",
        "photographer_position": "摄影师靠近人物侧前方，镜头与手部或材质平行，避开无意义的大头照",
        "model_position": "只保留手、衣料、配饰和一小段环境线索，让局部动作讲清楚人物正在做什么",
        "model_pose": "扣纽扣、拎鞋、触碰墙面或收拢衣摆，手指自然弯曲并有明确受力关系",
        "crop_boundary": "裁切必须围绕动作闭环：手、被操作的物件和一段环境线索同时出现；禁止从脖颈正中横切，若不拍脸就从锁骨以下开始，关节不得成为画框边界",
        "set_design": "局部背景只保留一种材质和一个方向性光源，用手与衣料、配饰或墙面之间的接触形成叙事；无动作的衣服胸口不构成细节镜头",
        "must_show": "至少一只结构正确的手、明确受力或触碰、材质差异、一个能回答‘正在做什么’的现场线索",
        "reject_if": "无头躯干、切脖子、只有衣服目录照、手没有动作、物件悬空、材质和背景同灰同平、局部无法讲出事件",
        "composition": "editorial narrative detail photograph of realistic hands interacting with garment and environment, tactile material texture, unusual crop",
        "avoid": "face close-up, centered portrait, full body, malformed hands, extra fingers, floating objects, meaningless beauty shot",
    },
    {
        "id": "eye-level-medium", "framing": SHOT_FRAMING_ZH["eye-level-medium"],
        "lens": "50mm", "aperture": "f/2.8–f/4", "shot_size": "MS", "camera_angle": "eye_level",
        "photographer_position": "摄影师与人物视线齐平，保持 2–3 米距离，从人物侧前方约 20° 拍摄",
        "model_position": "人物位于三分线，腰部以上完整，视线方向留出空间",
        "model_pose": "停下动作后轻微转肩，一只手继续处理衣领、包带或环境物件，表情保持自然",
        "crop_boundary": "从腰部以下裁切，不切肘、腕和手指；头顶保留呼吸空间",
        "set_design": "背景只保留一处地点线索，人物与背景分离但不抹去环境信息",
        "must_show": "眼神、双肩和至少一只完整执行动作的手，人物表情与环境状态一致",
        "reject_if": "证件照式正面站立、双手消失、背景完全虚化、肩颈僵硬",
        "composition": "eye-level medium environmental portrait, off-center subject, visible hand action, readable location context",
        "avoid": "passport photo, centered headshot, cropped hands, empty studio background",
    },
    {
        "id": "close-expression", "framing": SHOT_FRAMING_ZH["close-expression"],
        "lens": "85mm", "aperture": "f/2–f/2.8", "shot_size": "CU", "camera_angle": "eye_level",
        "photographer_position": "摄影师在人物正前方偏 15°，镜头与眼睛同高，距离 1.5–2 米",
        "model_position": "面部落在上方三分区域，视线前方保留少量空间",
        "model_pose": "先闭眼呼吸再缓慢睁眼，或看向画外目标，嘴角和眉眼保持真实细微变化",
        "crop_boundary": "保留完整额头、下颌和一侧肩线；不在下巴、嘴唇或眼睛处切割",
        "set_design": "选择单一方向柔光，背景保持安静色块，用眼神而非复杂道具承担叙事",
        "must_show": "双眼清晰、皮肤质感自然、情绪可读、下颌和肩线裁切合理",
        "reject_if": "过度磨皮、双眼无焦点、面部变形、切掉下颌、夸张假笑",
        "composition": "intimate close expression portrait, natural skin texture, subtle emotion, clean directional gaze space",
        "avoid": "beauty filter, plastic skin, cropped chin, blank stare, exaggerated smile",
    },
    {
        "id": "over-shoulder-context", "framing": SHOT_FRAMING_ZH["over-shoulder-context"],
        "lens": "35mm 或 50mm", "aperture": "f/4", "shot_size": "MS", "camera_angle": "over_shoulder",
        "photographer_position": "摄影师位于人物肩后 1–2 米，让肩部成为近景并对准人物正在观察的目标",
        "model_position": "近景肩部占一侧 15–25%，人物视线目标位于另一侧中景",
        "model_pose": "人物背对部分镜头，正在查看橱窗、地图、作品或与同伴交流",
        "crop_boundary": "近景肩部可以裁切，但不得遮住视线目标；人物头部与动作手保持完整",
        "set_design": "明确一个可被观察的目标，组织肩部、人物动作和目标三层空间",
        "must_show": "肩后视角、清楚视线方向、可识别目标和人物正在进行的动作",
        "reject_if": "只有后脑勺、目标不清楚、肩部遮住主体、画面无法解释人物在看什么",
        "composition": "over-the-shoulder contextual portrait, visible gaze target, layered foreground shoulder and environment",
        "avoid": "rear head only, hidden target, blocked face, flat background",
    },
    {
        "id": "backlit-silhouette", "framing": SHOT_FRAMING_ZH["backlit-silhouette"],
        "lens": "35mm 或 50mm", "aperture": "f/5.6", "shot_size": "FS", "camera_angle": "eye_level",
        "photographer_position": "摄影师位于人物背光方向正前方 4–6 米，以亮面为背景控制轮廓",
        "model_position": "人物完整轮廓落在亮区边缘，不与树干、路灯或建筑线重叠",
        "model_pose": "侧身停步、抬手整理头发或转身的一瞬，让四肢轮廓彼此分离",
        "crop_boundary": "完整保留头手脚和地面接触点，手臂与身体之间必须留出负空间",
        "set_design": "只使用一个强背光源和干净亮背景，通过轮廓讲清动作，不用杂乱高光补数",
        "must_show": "清楚侧面轮廓、四肢分离、完整落脚点和可辨认的环境边界",
        "reject_if": "人物黑成无结构色块、手臂粘身、头部与背景重叠、脚被切掉",
        "composition": "full-body backlit silhouette, separated limbs, clean luminous background, readable profile action",
        "avoid": "featureless black blob, merged limbs, cropped feet, cluttered highlights",
    },
    {
        "id": "doorway-frame", "framing": SHOT_FRAMING_ZH["doorway-frame"],
        "lens": "35mm", "aperture": "f/4–f/5.6", "shot_size": "MFS", "camera_angle": "eye_level",
        "photographer_position": "摄影师在门框或窗框外侧后退 3–5 米，保持框体垂直并露出四边中的至少三边",
        "model_position": "人物位于框内第二层空间的一侧，周围保留可读环境",
        "model_pose": "正在推门、拉帘、迈入空间或回头确认身后，动作必须作用于框体",
        "crop_boundary": "保留人物膝部以上或完整身体，不切动作手；框体边缘不得切脸",
        "set_design": "选择真实可使用的门窗，让框体、人物动作和后方空间形成三层关系",
        "must_show": "至少三边框体、人物与框体的接触动作、框后空间和清楚的进入方向",
        "reject_if": "装饰性假框、人物只是站在洞口、框线切脸、背景无空间层次",
        "composition": "frame-within-frame doorway portrait, subject interacting with the frame, layered interior depth",
        "avoid": "static pose in doorway, frame cutting face, flat wall, decorative border only",
    },
    {
        "id": "seated-profile", "framing": SHOT_FRAMING_ZH["seated-profile"],
        "lens": "50mm 或 85mm", "aperture": "f/2.8–f/4", "shot_size": "MFS", "camera_angle": "eye_level",
        "photographer_position": "摄影师在人物侧面 4–6 米，镜头略低于肩部并与座位边缘平行",
        "model_position": "人物坐在画面一侧，腿部方向和视线方向均留出空间",
        "model_pose": "自然坐下，一只脚着地、一只腿轻微收回，手正在整理衣料或使用身边物件",
        "crop_boundary": "优先保留完整坐姿和双脚；若收紧，只能在小腿中段裁切，不切膝和踝",
        "set_design": "使用真实台阶、长椅或窗台，座位高度、脚下空间和背景线条相互呼应",
        "must_show": "清楚侧面轮廓、坐姿重心、至少一只动作手和脚与地面的关系",
        "reject_if": "双腿纠缠、无支撑悬坐、膝踝被切、正面僵坐看镜头",
        "composition": "seated side-profile environmental portrait, clear body line, grounded feet, directional negative space",
        "avoid": "front-facing stiff pose, tangled limbs, cropped knees, floating seated body",
    },
    {
        "id": "prop-interaction", "framing": SHOT_FRAMING_ZH["prop-interaction"],
        "lens": "35mm 或 50mm", "aperture": "f/4", "shot_size": "MS", "camera_angle": "eye_level",
        "photographer_position": "摄影师站在人物侧前方 2–4 米，同时看见人物表情、双手和道具作用面",
        "model_position": "人物偏离中心，道具位于动作侧，视线和身体方向共同指向道具",
        "model_pose": "打开书本、整理相机、系围巾、拿取饮品或操作现场物件，动作连续可重复",
        "crop_boundary": "双手和被操作道具完整，不切手腕；人物表情与动作必须同时进入画面",
        "set_design": "只选一个与主题有关的真实道具，清理无关物件，让道具确实改变人物动作",
        "must_show": "完整双手、明确操作关系、可识别道具和与动作一致的视线",
        "reject_if": "道具悬空、手被遮挡、只是拿着不使用、堆放多个无关道具",
        "composition": "medium portrait with purposeful prop interaction, both hands visible, clear action and gaze relationship",
        "avoid": "floating prop, hidden hands, passive holding, unrelated prop clutter",
    },
    {
        "id": "environment-cutaway", "framing": SHOT_FRAMING_ZH["environment-cutaway"],
        "lens": "35mm 或 50mm", "aperture": "f/5.6", "shot_size": "WS", "camera_angle": "eye_level",
        "photographer_position": "摄影师离开人物主机位，寻找能说明地点、时间或动作后果的环境细节",
        "model_position": "本镜头不要求人物出现；若出现，只作为远处比例参照，不成为主体",
        "model_pose": "无人物动作要求，记录被使用的椅子、门、路面反光、遗留物或空间变化",
        "crop_boundary": "画面必须包含一个主要地点线索和一个辅助线索，不做无目的空景",
        "set_design": "沿主拍摄动线寻找可连接前后镜头的环境状态，用光线或物件承接人物行为",
        "must_show": "明确地点信息、与方案主题有关的物件或光线变化，以及可用于转场的构图方向",
        "reject_if": "随手拍空墙、与人物故事无关、画面没有主次、无法连接前后分镜",
        "composition": "narrative environmental cutaway, location detail connected to the subject story, clear visual anchor",
        "avoid": "random empty wall, unrelated decoration, no focal point, generic stock detail",
    },
)


def _read_reference_rows(repo_root: Path) -> list[dict[str, Any]]:
    path = repo_root / "outputs" / "xhs-all-authorized-media-20260810-style-v3-training-reference" / "style_training_reference.jsonl"
    if not path.is_file():
        return []
    title_path = repo_root / "outputs" / "xhs-all-authorized-media-20260810-content-review" / "six_score_annotation_queue.jsonl"
    titles: dict[str, str] = {}
    if title_path.is_file():
        for line in title_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                title_row = json.loads(line)
            except json.JSONDecodeError:
                continue
            asset_id = str(title_row.get("asset_id") or "")
            if asset_id and title_row.get("title"):
                titles[asset_id] = str(title_row["title"])
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            row = json.loads(line)
            row["title"] = titles.get(str(row.get("asset_id") or ""), "")
            rows.append(row)
    return rows


@lru_cache(maxsize=2)
def _load_master_cinematography_taxonomy(repo_root_text: str) -> dict[str, dict[str, Any]]:
    """Load the local master shot contracts and index ids plus aliases."""
    path = Path(repo_root_text) / "config" / "photoatelier_master_cinematography_taxonomy_v1.json"
    if not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    indexed: dict[str, dict[str, Any]] = {}
    for row in payload.get("shot_languages", []):
        if not isinstance(row, dict):
            continue
        shot_id = str(row.get("id") or "")
        if shot_id:
            indexed[shot_id] = row
        for alias in row.get("aliases", []):
            indexed[str(alias)] = row
    return indexed


@lru_cache(maxsize=2)
def _aesthetic_head_metadata(repo_root_text: str) -> dict[str, Any]:
    """Expose the latest local six-head artifact at the integration seam.

    The head is an offline shadow scorer for candidate/reference analysis.  It
    is deliberately metadata-only in shoot planning: it never approves an
    image, replaces the external generator, or makes a production decision.
    Keeping this contract explicit lets the photography system verify exactly
    which trained artifact it is wired to without loading torch in the API
    request path.
    """
    repo_root = Path(repo_root_text)
    manifest_path = repo_root / "outputs" / "photoatelier-v073-six-head-aesthetic-shadow" / "run_manifest.json"
    if not manifest_path.is_file():
        return {
            "status": "aesthetic-head-unavailable",
            "version": "v0.73",
            "role": "local-shadow-candidate-scoring",
            "automatic_scoring": False,
            "automatic_aesthetic_approval": False,
            "human_validation_required": True,
            "production_release": False,
        }
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {
            "status": "aesthetic-head-manifest-invalid",
            "version": "v0.73",
            "role": "local-shadow-candidate-scoring",
            "automatic_scoring": False,
            "automatic_aesthetic_approval": False,
            "human_validation_required": True,
            "production_release": False,
        }
    model = manifest.get("model") if isinstance(manifest.get("model"), dict) else {}
    artifact_raw = str(model.get("artifact") or "")
    artifact_path = Path(artifact_raw)
    if not artifact_path.is_absolute():
        artifact_path = repo_root / artifact_path
    artifact_path = artifact_path.resolve()
    return {
        "status": "aesthetic-head-shadow-ready" if artifact_path.is_file() else "aesthetic-head-artifact-missing",
        "version": "v0.73",
        "artifact": str(artifact_path),
        "artifact_sha256": model.get("sha256"),
        "manifest": str(manifest_path.resolve()),
        "dimensions": model.get("dimensions", []),
        "metrics": manifest.get("metrics", {}),
        "device": (manifest.get("preflight") or {}).get("resolved_device"),
        "role": "local-shadow-candidate-scoring",
        "automatic_scoring": False,
        "automatic_aesthetic_approval": False,
        "human_validation_required": True,
        "production_release": False,
    }


def _selector_shadow_metadata(repo_root: Path, brief: str) -> dict[str, Any]:
    """Return optional selector metadata without making it a production gate."""
    model_candidates = (
        repo_root / "outputs" / "photoatelier-v073-agent-contract-selector" / "contract_selector.joblib",
        repo_root / "outputs" / "photoatelier-v072-agent-contract-selector" / "contract_selector.joblib",
        repo_root / "outputs" / "photoatelier-v071-agent-contract-selector" / "contract_selector.joblib",
        repo_root / "outputs" / "photoatelier-v070-agent-contract-selector" / "contract_selector.joblib",
        repo_root / "outputs" / "photoatelier-v069-agent-contract-selector" / "contract_selector.joblib",
        repo_root / "outputs" / "photoatelier-v031-agent-contract-selector" / "contract_selector.joblib",
    )
    model_path = next((path for path in model_candidates if path.is_file()), model_candidates[-1])
    taxonomy_path = repo_root / "config" / "photoatelier_master_cinematography_taxonomy_v1.json"
    if not model_path.is_file() or not taxonomy_path.is_file():
        return {"status": "selector-unavailable", "human_selection_required": True, "production_release": False}
    try:
        from scripts.run_photoatelier_v031_agent_selector import choose

        return choose(model_path, taxonomy_path, brief, top_k=3)
    except Exception as exc:  # pragma: no cover - optional runtime artifact
        return {"status": "selector-error", "error": str(exc), "human_selection_required": True, "production_release": False}


_V033_ROUTE_KEYWORDS: dict[str, tuple[str, ...]] = {
    "rain-high-angle-crossing": (
        "雨夜", "下雨", "雨", "湿地", "潮湿", "斑马线", "路口", "末班车", "高机位",
        "rain", "rainy", "wet", "crossing", "crosswalk", "high-angle",
    ),
    "golden-ground-motion": (
        "低机位", "贴地", "奔跑", "运动", "草地", "黄金时刻", "夕阳", "跳跃",
        "ground-level", "low-angle", "run", "running", "motion", "golden", "grass",
    ),
    "overhead-field-archive": (
        "顶拍", "正上方", "地图", "拍立得", "温室", "几何", "标本", "垂直俯拍",
        "overhead", "top-down", "top down", "map", "archive", "greenhouse",
    ),
    "candle-film-loading-detail": (
        "烛光", "胶卷", "装卷", "相机", "双手", "手部", "特写", "调机", "拨盘",
        "candle", "film", "camera", "hands", "macro", "detail", "loading",
    ),
}


def _fallback_v033_route_id(brief: str) -> str:
    """Choose a v0.33 route deterministically when the local ranker is absent."""
    text = brief.casefold()
    scores = {
        route_id: sum(1 for keyword in keywords if keyword.casefold() in text)
        for route_id, keywords in _V033_ROUTE_KEYWORDS.items()
    }
    if max(scores.values(), default=0) == 0:
        return "golden-ground-motion"
    return max(scores, key=scores.__getitem__)


def _strong_keyword_v033_route_id(brief: str) -> str | None:
    """Prefer explicit bilingual camera intent over the synthetic route model."""
    text = brief.casefold()
    scores = {
        route_id: sum(1 for keyword in keywords if keyword.casefold() in text)
        for route_id, keywords in _V033_ROUTE_KEYWORDS.items()
    }
    route_id = max(scores, key=scores.__getitem__)
    return route_id if scores[route_id] >= 2 else None


def _v033_visual_route_recommendation(repo_root: Path, brief: str) -> dict[str, Any]:
    """Return one additive, executable v0.33 route contract for the original brief."""
    model_candidates = (
        repo_root / "outputs" / "photoatelier-v069-visual-route-ranker" / "visual_route_ranker.joblib",
        repo_root / "outputs" / "photoatelier-v033-visual-route-ranker" / "visual_route_ranker.joblib",
    )
    model_path = next((path for path in model_candidates if path.is_file()), model_candidates[-1])
    route_id: str | None = None
    selection_source = "deterministic-keyword-fallback"
    selection_error: str | None = None
    keyword_route_id = _strong_keyword_v033_route_id(brief)
    if keyword_route_id is not None:
        route_id = keyword_route_id
        selection_source = "deterministic-keyword-override"
    elif model_path.is_file():
        try:
            predicted = str(joblib.load(model_path).predict([brief])[0])
            if predicted not in VISUAL_ROUTES:
                raise ValueError(f"ranker returned unknown route: {predicted}")
            route_id = predicted
            selection_source = "joblib-ranker"
        except Exception as exc:  # pragma: no cover - corrupt optional artifact
            selection_error = str(exc)
    if route_id is None:
        route_id = _fallback_v033_route_id(brief)

    route = get_visual_route(route_id)
    recommendation = {
        "route_id": route_id,
        "label": route["label_zh"],
        "shot_language": route["shot_language"],
        "camera": route["camera"],
        "blocking": route["blocking"],
        "set_layers": route["set_layers"],
        "lighting": route["lighting"],
        "must_show": route["must_show"],
        "reject_if": route["reject_if"],
        "selection_source": selection_source,
    }
    if selection_error:
        recommendation["selection_error"] = selection_error
    return recommendation


@lru_cache(maxsize=2)
def _load_xhs_reference_locks(repo_root_text: str) -> dict[str, Any]:
    """Load pointer-only locks built from the user's existing local XHS media."""
    path = Path(repo_root_text) / "outputs" / "photoatelier-v043-xhs-reference-locks" / "reference_lock_manifest.json"
    if not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return payload.get("routes", {}) if isinstance(payload.get("routes"), dict) else {}


@lru_cache(maxsize=2)
def _load_embedding_index(repo_root_text: str) -> dict[str, np.ndarray]:
    """Load one normalized vector per parent asset from the fused local index."""
    path = Path(repo_root_text) / "outputs" / "xhs-all-authorized-media-20260810-fused.jsonl"
    if not path.is_file():
        return {}
    grouped: dict[str, list[np.ndarray]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        features = row.get("features")
        if not isinstance(features, list) or len(features) != 1152:
            continue
        parent = str(row.get("parent_asset_id") or row.get("asset_id") or "")
        if "::tile::" in parent:
            parent = parent.split("::tile::", 1)[0]
        if parent:
            grouped.setdefault(parent, []).append(np.asarray(features, dtype=np.float32))
    index: dict[str, np.ndarray] = {}
    for parent, vectors in grouped.items():
        vector = np.mean(np.stack(vectors), axis=0)
        norm = float(np.linalg.norm(vector))
        if norm > 1e-8:
            index[parent] = vector / norm
    return index


def _choose_style(brief: str, requested: str | None) -> tuple[str, list[str]]:
    if requested in STYLE_LIBRARY:
        return requested, [requested]
    text = brief.lower()
    counts = Counter(
        direction
        for direction, keywords in STYLE_KEYWORDS.items()
        for keyword in keywords
        if keyword.lower() in text
    )
    style = counts.most_common(1)[0][0] if counts else "natural-lifestyle-reference"
    tags = [style]
    if any(word in text for word in ("海边", "户外", "beach", "outdoor")):
        tags.append("outdoor-location")
    if any(word in text for word in ("女生", "女性", "女模", "woman", "female")):
        tags.append("female-portrait")
    if any(word in text for word in ("夕阳", "日落", "golden hour", "sunset")):
        tags.append("golden-hour")
    return style, tags


_UNICODE_STYLE_KEYWORDS = {
    "low-key-cinematic": ("低调", "电影", "暗调", "夜景"),
    "muted-minimal-editorial": ("低饱和", "灰调", "极简", "留白"),
    "warm-documentary-lifestyle": ("纪实", "暖调", "生活方式", "日常"),
    "vivid-sunlit-lifestyle": ("高饱和", "明亮", "旅行", "阳光"),
    "cool-moody-editorial": ("冷调", "情绪", "编辑感"),
    "detail-forward-commercial": ("产品", "细节", "商业", "质感"),
    "natural-lifestyle-reference": ("自然", "人像", "生活"),
}


def _choose_style_for_brief(brief: str, requested: str | None) -> tuple[str, list[str]]:
    if requested in STYLE_LIBRARY:
        return requested, [requested]
    text = brief.lower()
    counts = Counter(
        direction
        for direction, keywords in _UNICODE_STYLE_KEYWORDS.items()
        for keyword in keywords
        if keyword in text
    )
    if not counts:
        return _choose_style(brief, requested)
    style = counts.most_common(1)[0][0]
    tags = [style]
    if any(term in text for term in ("海边", "海滩", "户外", "seaside", "beach", "outdoor")):
        tags.append("outdoor-location")
    if any(term in text for term in ("女生", "女性", "女模", "woman", "female")):
        tags.append("female-portrait")
    if any(term in text for term in ("夕阳", "日落", "golden hour", "sunset")):
        tags.append("golden-hour")
    return style, tags


def _brief_location_tokens(brief: str) -> list[str]:
    text = brief.lower()
    tokens: list[str] = []
    if any(term in brief for term in ("海边", "海滩", "海岸")) or any(term in text for term in ("seaside", "beach", "coast")):
        tokens.append("seaside beach")
    if any(term in brief for term in ("女生", "女性", "女模")) or any(term in text for term in ("woman", "female")):
        tokens.append("single fully clothed adult woman")
    if any(term in brief for term in ("夕阳", "日落")) or any(term in text for term in ("golden hour", "sunset")):
        tokens.append("golden hour sunset")
    return tokens


STYLE_TAG_HINTS: dict[str, tuple[str, ...]] = {
    "low-key-cinematic": ("low_saturation", "cool_tone", "dark_mood", "低饱和", "暗调"),
    "muted-minimal-editorial": ("low_saturation", "negative_space", "muted", "低饱和", "留白"),
    "warm-documentary-lifestyle": ("warm_tone", "available_light", "暖调", "纪实"),
    "vivid-sunlit-lifestyle": ("high_saturation", "high_key", "sunlit", "高饱和", "明亮"),
    "cool-moody-editorial": ("cool_tone", "dark_mood", "editorial", "冷调", "情绪"),
    "detail-forward-commercial": ("high_sharpness", "commercial", "detail", "商业", "细节"),
    "natural-lifestyle-reference": ("available_light", "natural", "纪实", "自然"),
}


def _select_reference_rows(rows: list[dict[str, Any]], style: str, limit: int = 6) -> list[dict[str, Any]]:
    hints = set(STYLE_TAG_HINTS.get(style, ()))
    matches = [
        row for row in rows
        if row.get("style_direction") == style
        or hints.intersection({str(tag) for tag in row.get("style_tags", [])})
    ]
    if len(matches) < limit:
        matches += [row for row in rows if row not in matches]
    return matches[:limit]


def _reference_payload(repo_root: Path, row: dict[str, Any], *, similarity: float | None = None) -> dict[str, Any]:
    """Expose a verified local finished-photo reference without rewriting it."""
    raw_path = str(row.get("image_path") or "")
    image_path = Path(raw_path) if raw_path else None
    verified_path: str | None = None
    if image_path is not None and image_path.is_file():
        resolved = image_path.resolve()
        if resolved.is_relative_to(repo_root.resolve()):
            verified_path = str(resolved)
    payload = {
        "asset_id": row.get("asset_id"),
        "style_direction": row.get("style_direction"),
        "style_tags": row.get("style_tags", []),
        "image_path": verified_path,
        "reference_role": "authorized-local-finished-photo",
        "subject_pixels_policy": "preserve-face-and-body-do-not-regenerate",
        "usable_finished_photo": bool(row.get("usable_finished_photo")),
        "human_validation_required": True,
    }
    if similarity is not None:
        payload["embedding_similarity"] = round(similarity, 6)
    return payload


_ROUTE_REFERENCE_HINTS: dict[str, tuple[str, ...]] = {
    "rain-high-angle-crossing": ("rain", "wet", "street", "crossing", "high-angle", "几何", "湿地"),
    "golden-ground-motion": ("motion", "running", "grass", "golden", "sunlit", "运动", "草地", "夕阳"),
    "overhead-field-archive": ("overhead", "top-down", "map", "archive", "greenhouse", "顶拍", "地图", "温室"),
    "candle-film-loading-detail": ("camera", "hands", "macro", "detail", "film", "candle", "相机", "手部", "特写"),
}


def _route_reference_hits(row: dict[str, Any], route_id: str | None) -> list[str]:
    if not route_id:
        return []
    searchable = " ".join(
        [str(row.get("style_direction") or ""), str(row.get("title") or ""), *(str(tag) for tag in row.get("style_tags", []))]
    ).casefold()
    return [hint for hint in _ROUTE_REFERENCE_HINTS.get(route_id, ()) if hint.casefold() in searchable]


def _references(repo_root: Path, rows: list[dict[str, Any]], style: str, limit: int = 6, route_id: str | None = None) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    selected = _select_reference_rows(rows, style, limit=limit)
    index = _load_embedding_index(str(repo_root.resolve()))
    vectors = [index[str(row.get("asset_id"))] for row in selected if str(row.get("asset_id")) in index]
    if not vectors:
        payloads = [_reference_payload(repo_root, row) for row in selected]
        for payload, row in zip(payloads, selected):
            hits = _route_reference_hits(row, route_id)
            payload["route_match_score"] = len(hits)
            payload["route_match_reason"] = "route-hint:" + ",".join(hits) if hits else "style-only-fallback"
        return payloads, {
            "status": "embedding-index-unavailable",
            "index_dimension": 1152,
            "matched_reference_count": 0,
        }
    prototype = np.mean(np.stack(vectors), axis=0)
    prototype_norm = float(np.linalg.norm(prototype))
    prototype = prototype / max(prototype_norm, 1e-8)
    ranked = []
    for row in rows:
        vector = index.get(str(row.get("asset_id")))
        if vector is None:
            continue
        similarity = float(np.dot(vector, prototype))
        hits = _route_reference_hits(row, route_id)
        ranked.append((similarity + min(len(hits), 3) * 0.01, similarity, row, hits))
    ranked.sort(key=lambda item: item[0], reverse=True)
    # A useful moodboard needs different shoots, not six adjacent frames from
    # one post. Prefer one asset per source post, then fill only if necessary.
    top: list[tuple[float, float, dict[str, Any], list[str]]] = []
    seen_sources: set[str] = set()
    for item in ranked:
        source_id = str(item[2].get("asset_id") or "").split("::", 1)[0]
        if source_id in seen_sources:
            continue
        top.append(item)
        seen_sources.add(source_id)
        if len(top) >= limit:
            break
    if len(top) < limit:
        top_ids = {str(item[2].get("asset_id")) for item in top}
        remaining = [item for item in ranked if str(item[2].get("asset_id")) not in top_ids]
        top.extend(remaining[: limit - len(top)])
    payloads = []
    for _, similarity, row, hits in top:
        payload = _reference_payload(repo_root, row, similarity=similarity)
        payload["route_match_score"] = len(hits)
        payload["route_match_reason"] = "route-hint:" + ",".join(hits) if hits else "style-only-fallback"
        payloads.append(payload)
    return payloads, {
        "status": "style-prototype-conditioned",
        "index_dimension": 1152,
        "encoder_strategy": "siglip-plus-dinov2-fused-parent-mean",
        "matched_reference_count": len(vectors),
        "ranked_reference_count": len(top),
        "prototype_norm": round(prototype_norm, 6),
    }


def _build_shoot_plan_raw(repo_root: Path, *, request_id: str, brief: str, requested_style: str | None = None, output_count: int = 3, available_lenses: list[str] | None = None) -> dict[str, Any]:
    style, tags = _choose_style_for_brief(brief, requested_style)
    recipe = STYLE_LIBRARY[style]
    display = STYLE_DISPLAY_ZH[style]
    visual_route_recommendation = _v033_visual_route_recommendation(repo_root, brief)
    route_id = str(visual_route_recommendation["route_id"])
    reference_lock = _load_xhs_reference_locks(str(repo_root.resolve())).get(route_id, {
        "route_id": route_id,
        "selection_source": "unavailable",
        "references": [],
        "production_release": False,
    })
    references, embedding_condition = _references(
        repo_root,
        _read_reference_rows(repo_root),
        style,
        route_id=str(visual_route_recommendation["route_id"]),
    )
    master_taxonomy = _load_master_cinematography_taxonomy(str(repo_root.resolve()))
    visual_condition_plan = build_visual_condition_plan(repo_root, brief)
    location_tokens = _brief_location_tokens(brief)
    if any(term in brief for term in ("海边", "海滩", "海岸")):
        location_tokens.append("seaside beach")
    if any(term in brief for term in ("女生", "女性", "女模")):
        location_tokens.append("single adult woman")
    if any(term in brief for term in ("夕阳", "日落")):
        location_tokens.append("golden hour sunset")
    location_hint = ", ".join(dict.fromkeys(location_tokens)) or "a believable real-world location"
    plans: list[dict[str, Any]] = []
    count = max(1, min(output_count, len(SHOT_LANGUAGE)))
    shot_pool = SHOT_LANGUAGE if count > 8 else SHOT_LANGUAGE[:8]
    # Rotate the vocabulary deterministically so repeated requests do not keep
    # returning the same safe eye-level portrait family.
    digest = hashlib.sha256(f"{request_id}|{brief}|{style}".encode("utf-8")).digest()
    start = digest[0] % len(shot_pool)
    step = 3 if len(shot_pool) % 3 else 5
    selected = [shot_pool[(start + index * step) % len(shot_pool)] for index in range(count)]
    # v0.70's contract selector is advisory, but when its preferred master
    # route is in the requested batch, put that route first so the default
    # external request (shot_index omitted) follows the user's camera intent.
    selector_shadow = _selector_shadow_metadata(repo_root, brief)
    aesthetic_head = _aesthetic_head_metadata(str(repo_root.resolve()))
    candidates = selector_shadow.get("candidates") if isinstance(selector_shadow, dict) else None
    preferred_master_route = str(candidates[0].get("shot_language")) if isinstance(candidates, list) and candidates and isinstance(candidates[0], dict) else ""
    if preferred_master_route:
        preferred_index = next(
            (
                index
                for index, shot in enumerate(shot_pool)
                if str(master_taxonomy.get(str(shot["id"]), {}).get("id") or "") == preferred_master_route
            ),
            None,
        )
        if preferred_index is not None:
            preferred_shot = shot_pool[preferred_index]
            selected = [preferred_shot] + [shot for shot in selected if shot["id"] != preferred_shot["id"]]
            selected = selected[:count]
    for shot_index, shot in enumerate(selected):
        master = master_taxonomy.get(str(shot["id"]), {})
        shot_lens = available_lenses[shot_index % len(available_lenses)] if available_lenses else shot["lens"]
        shot_prompt = (
            f"{master.get('prompt_tokens') or shot['composition']}. {location_hint}. "
            "One fully clothed adult woman in modest contemporary daywear. "
            "Photorealistic fashion editorial, natural anatomy, believable available light."
        )
        shot_negative = (
            "bikini, swimwear, lingerie, underwear, nudity, topless, revealing clothing, "
            f"{master.get('negative_tokens') or shot['avoid']}, deformed hands, extra fingers, duplicate person, warped limbs, "
            "bad face, plastic skin, watermark, text, logo"
        )
        plans.append(
            {
                "shot_id": f"{request_id}-{shot['id']}",
                "shot_language": shot["id"],
                "framing": shot["framing"],
                "model_pose": shot["model_pose"],
                "model_position": shot["model_position"],
                "photographer_position": shot["photographer_position"],
                "crop_boundary": shot["crop_boundary"],
                "set_design": shot["set_design"],
                "must_show": shot["must_show"],
                "reject_if": shot["reject_if"],
                "lens": shot_lens,
                "aperture": shot["aperture"],
                "lighting_setup": display["light"],
                "palette": display["palette"],
                "composition_intent": shot["composition"],
                "master_taxonomy_version": "v0.30.photoatelier-master-cinematography-taxonomy.1" if master else None,
                "master_shot_language": master.get("id"),
                "shot_size": master.get("shot_size") or shot.get("shot_size") or SHOT_SIZE_FALLBACK.get(shot["id"]),
                "camera_angle": master.get("camera_angle") or shot.get("camera_angle") or CAMERA_ANGLE_FALLBACK.get(shot["id"]),
                "camera_position": master.get("camera_position"),
                "composition_strategy": master.get("composition_strategy", []),
                "action_anchor": master.get("action_anchor"),
                "master_must_show": master.get("must_show", []),
                "master_crop_boundary": master.get("crop_boundary", []),
                "master_reject_if": master.get("reject_if", []),
                "generator_prompt": shot_prompt,
                "negative_prompt": shot_negative,
                "execution_note": "先锁定真实场景、画框边界和机位，再让模特执行动作；不得用退回平视居中半身像的方式补数。",
                "acceptance_gate": {
                    "crop": "pass only if crop_boundary is visibly satisfied",
                    "set": "pass only if foreground, subject action, and background form one spatial event",
                    "camera": "pass only if the requested camera language is recognizable without reading the label",
                    "decision": "human-select-before-production",
                },
            }
        )
    image_prompt = f"{recipe['prompt']}, {brief.strip() or 'portrait reference'}, professional photography, coherent anatomy, realistic hands, editorial grade"
    # Keep the SD 1.5 conditioning string compact.  The photographer-facing
    # prompt above remains descriptive; this one must stay below the model's
    # 77-token CLIP context window so style/location/setup are not truncated.
    generator_prompt = plans[0]["generator_prompt"]
    negative_prompt = plans[0]["negative_prompt"] + ", sheer clothing, unreadable text, random props, inconsistent lighting"
    return {
        "schema_version": "v0.28.photoatelier-shoot-plan.1",
        "status": "shoot-plan-ready-local-render-storyboard-only",
        "request_id": request_id,
        "brief": brief,
        "style_direction": style,
        "style_label": recipe["label"],
        "style_tags": tags,
        "image_generation_prompt": image_prompt,
        "generator_prompt": generator_prompt,
        "negative_prompt": negative_prompt,
        "shot_plans": plans,
        "references": references,
        "embedding_condition": embedding_condition,
        "agent_selector_shadow": selector_shadow,
        "aesthetic_head_metadata": aesthetic_head,
        "master_route_recommendation": {
            "route_id": preferred_master_route or None,
            "selection_source": "v073-contract-selector" if preferred_master_route else "selector-unavailable",
            "human_selection_required": True,
            "production_release": False,
        },
        "v033_visual_route_recommendation": visual_route_recommendation,
        "reference_lock": reference_lock,
        "require_offcenter_composition": str(visual_route_recommendation.get("route_id")) != "candle-film-loading-detail",
        "visual_condition_plan": visual_condition_plan,
        "safety_checklist": [
            "开拍前确认模特同意动作、触碰和服装调整边界",
            "动作从小幅度开始，避免快速转身、湿滑地面和不稳定道具",
            "每组拍摄前复核背景、曝光和人物身份一致性",
        ],
        "render_policy": {
            "local_diffusion_role": "composition-storyboard-only",
            "local_diffusion_is_final_photo": False,
            "real_person_output_mode": "authorized-reference-first",
            "subject_pixels_policy": "preserve-face-and-body-do-not-regenerate",
            "background_edit_requires_subject_mask": True,
            "automatic_aesthetic_approval": False,
            "required_before_display": ["crop-pass", "set-design-pass", "camera-language-pass", "human-aesthetic-selection"],
        },
        "reference_board": {
            "status": "ready-to-build-from-authorized-local-photos",
            "mode": "authorized-reference-first",
            "network_used": False,
            "diffusion_generation_used": False,
            "subject_pixels_regenerated": False,
            "builder": "scripts/build_photoatelier_real_person_reference_board.py",
            "next_action": "build a local shooting board and review the original pixels before any background edit",
        },
        "source": {
            "reference_package": "xhs-all-authorized-media-20260810-style-v3-training-reference",
            "automatic_online_ranking": False,
            "production_release": False,
        },
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def build_shoot_plan(repo_root: Path, *, request_id: str, brief: str, requested_style: str | None = None, output_count: int = 3, available_lenses: list[str] | None = None) -> dict[str, Any]:
    """Build a plan and normalize all photographer-facing display fields."""
    plan = _build_shoot_plan_raw(
        repo_root,
        request_id=request_id,
        brief=brief,
        requested_style=requested_style,
        output_count=output_count,
        available_lenses=available_lenses,
    )
    display = STYLE_DISPLAY_ZH[plan["style_direction"]]
    plan["style_label"] = display["label"]
    for shot in plan.get("shot_plans", []):
        shot["lighting_setup"] = display["light"]
        shot["palette"] = display["palette"]
    plan["safety_checklist"] = SAFETY_CHECKLIST_ZH
    return plan
