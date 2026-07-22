from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "assets" / "luts" / "open"
LICENSE_DIR = ROOT / "assets" / "luts" / "licenses"
CATALOG_PATH = ROOT / "assets" / "lut-library.json"
USER_AGENT = "PhotoAtelier-open-lut-builder/1.0"

T3_REPO = "https://github.com/t3mujinpack/t3mujinpack"
T3_RAW = "https://raw.githubusercontent.com/t3mujinpack/t3mujinpack/master/"
VLOG_REPO = "https://github.com/shenmintao/V-Log-Alchemy"
VLOG_RAW = "https://raw.githubusercontent.com/shenmintao/V-Log-Alchemy/main/"


T3_LUTS = [
    ("t3-portra-160", "Portrait 160 Film Emulation", "haldcluts/t3mujinpack - Color Negative - Kodak Portra 160.png", "portrait-film", ["portrait", "skin", "soft", "warm", "胶片", "人像"], "柔和肤色和低反差，适合自然光人像。", "高曝光肤色可能偏暖，建议 40%-75% 强度。"),
    ("t3-portra-400", "Portrait 400 Film Emulation", "haldcluts/t3mujinpack - Color Negative - Kodak Portra 400.png", "portrait-film", ["portrait", "skin", "film", "warm", "胶片", "客片"], "暖肤色和宽容度观感，适合客片与生活方式摄影。", "先校正白平衡，避免室内暖光叠加过黄。"),
    ("t3-pro-400h", "Pastel 400H Film Emulation", "haldcluts/t3mujinpack - Color Negative - Fuji Pro 400H.png", "pastel-portrait", ["pastel", "green", "soft", "wedding", "清新", "婚纱"], "柔和粉彩和偏冷绿色，适合清新人像与婚纱。", "绿色环境可能进一步偏青，注意肤色与植被分离。"),
    ("t3-superia-400", "Superia 400 Street Emulation", "haldcluts/t3mujinpack - Color Negative - Fuji Superia 400.png", "street-film", ["street", "urban", "contrast", "film", "街拍", "城市"], "中等对比和城市胶片气息，适合街拍。", "阴影可能偏冷，夜景应降低强度。"),
    ("t3-astia-100f", "Astia 100F Slide Emulation", "haldcluts/t3mujinpack - Color Slide - Fuji Astia 100F.png", "soft-slide", ["soft", "portrait", "fashion", "skin", "柔和", "时尚"], "相对柔和的反转片观感，适合时尚与人像。", "高饱和服装需检查红色通道。"),
    ("t3-velvia-50", "Velvia 50 Landscape Emulation", "haldcluts/t3mujinpack - Color Slide - Fuji Velvia 50.png", "landscape-vivid", ["landscape", "vivid", "nature", "travel", "风光", "旅行"], "高饱和风光方向，强化蓝天和植被。", "不建议直接用于近景肤色；人像请低于 35% 强度。"),
    ("t3-hp5-400", "HP5 400 Monochrome Emulation", "haldcluts/t3mujinpack - Black and White - Ilford HP5 Plus 400.png", "monochrome", ["black white", "documentary", "grain", "黑白", "纪实"], "经典中等反差黑白方向，适合纪实和情绪人像。", "LUT 不生成真实颗粒，颗粒需另行添加。"),
    ("t3-trix-400", "Tri-X 400 Monochrome Emulation", "haldcluts/t3mujinpack - Black and White - Kodak Tri-X 400.png", "monochrome-contrast", ["black white", "contrast", "street", "黑白", "街拍"], "更硬朗的黑白对比，适合街拍和舞台。", "暗部容易压实，先检查直方图。"),
]

VLOG_LUTS = [
    ("vlog-astia", "V-Log Astia Soft", "Luts/Fujifilm/FLog2C_to_ASTIA_VLog.cube", "vlog-portrait", ["v-log", "portrait", "soft", "人像", "柔和"], "Panasonic V-Log 人像与柔和肤色。"),
    ("vlog-classic-neg", "V-Log Classic Negative", "Luts/Fujifilm/FLog2C_to_CLASSIC-Neg_VLog.cube", "vlog-street", ["v-log", "street", "contrast", "街拍", "复古"], "Panasonic V-Log 街拍与高对比暖色。"),
    ("vlog-eterna", "V-Log Eterna Cinema", "Luts/Fujifilm/FLog2C_to_ETERNA_VLog.cube", "vlog-cinema", ["v-log", "cinematic", "soft highlight", "电影感", "视频"], "Panasonic V-Log 低对比电影基底。"),
    ("vlog-acros", "V-Log Acros Monochrome", "Luts/Fujifilm/FLog2C_to_ACROS_VLog.cube", "vlog-monochrome", ["v-log", "black white", "documentary", "黑白", "纪实"], "Panasonic V-Log 黑白纪实方向。"),
]

SOFTWARE_PROFILES = [
    {
        "id": "davinci-resolve", "name": "DaVinci Resolve", "directCubeImport": True,
        "formats": [".cube"], "supportedCubeSizes": [17, 33],
        "status": "officially-documented",
        "sourceUrl": "https://documents.blackmagicdesign.com/cn/UserManuals/DaVinci-Resolve-18-Colorist-Guide.pdf",
        "workflow": "在项目设置的色彩管理中打开 LUT 文件夹，放入 .cube 后刷新；Log 素材优先用色彩空间转换节点，再叠加创意 LUT。",
    },
    {
        "id": "photoshop", "name": "Adobe Photoshop", "directCubeImport": True,
        "formats": [".cube", ".3dl", ".csp"], "supportedCubeSizes": [33],
        "status": "officially-documented",
        "sourceUrl": "https://helpx.adobe.com/sg/photoshop/using/export-color-lookup-tables.html",
        "workflow": "使用“颜色查找”调整图层载入 .cube；相机 Log 应先正确转换到工作色彩空间，再应用创意 LUT。",
    },
    {
        "id": "pixelcake", "name": "像素蛋糕", "directCubeImport": False,
        "formats": [".xmp", "预设口令", "TIFF/JPEG"], "supportedCubeSizes": [],
        "status": "xmp-workflow-only",
        "sourceUrl": "https://www.pixcakes.com/guide",
        "workflow": "官方资料确认可导入 XMP 和预设口令，未确认直接导入 .cube。建议在 Photoshop/DaVinci 完成 LUT 调色后导出 16-bit TIFF，再进入像素蛋糕做人像精修。",
    },
    {
        "id": "blackmagic-camera", "name": "Blackmagic Camera", "directCubeImport": True,
        "formats": [".cube"], "supportedCubeSizes": [17, 33],
        "status": "officially-documented",
        "sourceUrl": "https://www.blackmagicdesign.com/cn/products/blackmagiccamera/techspecs/W-APP-02",
        "workflow": "在 LUT 选择中导入 17 或 33 点 .cube。优先只用于监看；确认输入空间无误后再决定是否将 LUT 烘焙进素材。支持设备可直接使用内置 Apple Log to Rec.709。",
    },
]

INPUT_TRANSFORMS = [
    {
        "id": "srgb-display", "label": "sRGB / Rec.709 成片", "inputColorSpace": "sRGB display-referred",
        "outputColorSpace": "sRGB display-referred", "distributionMode": "not-required",
        "modelRequired": False, "status": "ready", "sourceName": "PhotoAtelier workflow rule",
        "sourceUrl": "", "instructions": "不需要技术转换，可直接选择创意 LUT 并调整强度。",
    },
    {
        "id": "sony-slog3-sgamut3cine", "label": "Sony S-Log3 / S-Gamut3.Cine",
        "inputColorSpace": "Sony S-Log3 / S-Gamut3.Cine", "outputColorSpace": "Rec.709",
        "distributionMode": "external-official-download", "modelRequired": False, "status": "official-source-linked",
        "sourceName": "Sony Look Profile (3D LUT)",
        "sourceUrl": "https://www.sony.com/electronics/support/software/00263050",
        "instructions": "从 Sony 官方下载匹配 S-Gamut3.Cine/S-Log3 的 Look Profile。若素材是 S-Gamut3 而非 S-Gamut3.Cine，必须改选对应版本。",
    },
    {
        "id": "dji-dlogm", "label": "DJI D-Log M",
        "inputColorSpace": "DJI D-Log M (model-specific)", "outputColorSpace": "Rec.709",
        "distributionMode": "external-official-download", "modelRequired": True, "status": "official-source-linked",
        "sourceName": "DJI official model LUT directory",
        "sourceUrl": "https://repair.dji.com/help/content?customId=01700007105&lang=en&paperDocType=ARTICLE&re=US&spaceId=17",
        "instructions": "必须先选择具体机型，再下载该机型官方 D-Log M to Rec.709 LUT；Pocket、Action、Mini、Air、Mavic 的 LUT 不应混用。",
    },
    {
        "id": "apple-log", "label": "Apple Log",
        "inputColorSpace": "Apple Log", "outputColorSpace": "Rec.709",
        "distributionMode": "built-in-or-external-official-download", "modelRequired": True, "status": "official-source-linked",
        "sourceName": "Apple Log profile / Blackmagic Camera built-in transform",
        "sourceUrl": "https://developer.apple.com/download/all/?q=Apple%20Log%20profile",
        "instructions": "Blackmagic Camera 在受支持 iPhone 上可使用内置 Apple Log to Rec.709。后期也可从 Apple Developer 下载官方 profile；不要把普通 Rec.709 手机视频当作 Apple Log。",
    },
    {
        "id": "panasonic-vlog", "label": "Panasonic V-Log / V-Gamut",
        "inputColorSpace": "Panasonic V-Log / V-Gamut", "outputColorSpace": "Rec.709 creative output",
        "distributionMode": "bundled-open-source-looks", "modelRequired": False, "status": "ready",
        "sourceName": "V-Log-Alchemy (Apache-2.0)", "sourceUrl": VLOG_REPO,
        "instructions": "可直接使用库内 4 个 V-Log 专用 Look；不要用于 Sony、DJI、Apple Log 或普通 sRGB。",
    },
    {
        "id": "blackmagic-film-gen5", "label": "Blackmagic Film Gen 5",
        "inputColorSpace": "Blackmagic Design Film Gen 5", "outputColorSpace": "Rec.709",
        "distributionMode": "use-host-color-management", "modelRequired": True, "status": "host-transform-recommended",
        "sourceName": "DaVinci Resolve Color Space Transform",
        "sourceUrl": "https://www.blackmagicdesign.com/products/davinciresolve",
        "instructions": "优先在 DaVinci Resolve 使用色彩管理或 Color Space Transform 节点转换，再应用 sRGB/Rec.709 创意 LUT。",
    },
]


def download(url: str, target: Path) -> None:
    if target.exists() and target.stat().st_size > 100:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        target.write_bytes(response.read())


def slug_file(identifier: str) -> Path:
    return OUTPUT_DIR / f"{identifier}.cube"


def hald_to_cube(source: Path, target: Path, title: str, size: int = 33) -> None:
    image = Image.open(source).convert("RGB")
    pixel_count = image.width * image.height
    source_size = round(pixel_count ** (1 / 3))
    if source_size ** 3 != pixel_count:
        raise ValueError(f"Unsupported Hald CLUT dimensions: {image.size}")
    pixels = image.load()
    lines = [
        f'TITLE "{title}"',
        f"LUT_3D_SIZE {size}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
        "# Converted from an MIT-licensed t3mujinpack Hald CLUT by PhotoAtelier.",
    ]
    for blue in range(size):
        source_b = round(blue * (source_size - 1) / (size - 1))
        for green in range(size):
            source_g = round(green * (source_size - 1) / (size - 1))
            for red in range(size):
                source_r = round(red * (source_size - 1) / (size - 1))
                index = source_r + source_g * source_size + source_b * source_size * source_size
                rgb = pixels[index % image.width, index // image.width]
                lines.append("{:.8f} {:.8f} {:.8f}".format(*(channel / 255 for channel in rgb)))
    target.write_text("\n".join(lines) + "\n", encoding="ascii")


def cube_size(path: Path) -> int:
    match = re.search(r"^LUT_3D_SIZE\s+(\d+)", path.read_text(encoding="utf-8", errors="ignore"), re.MULTILINE)
    if not match:
        raise ValueError(f"Missing LUT_3D_SIZE in {path}")
    return int(match.group(1))


def source_url(repo: str, path: str) -> str:
    return f"{repo}/blob/{'master' if 't3mujinpack' in repo else 'main'}/{urllib.parse.quote(path, safe='/')}"


def build() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LICENSE_DIR.mkdir(parents=True, exist_ok=True)
    temporary = ROOT / ".cache" / "open-luts"
    temporary.mkdir(parents=True, exist_ok=True)
    catalog = []

    download(T3_RAW + "LICENSE.txt", LICENSE_DIR / "t3mujinpack-MIT.txt")
    download(VLOG_RAW + "LICENSE", LICENSE_DIR / "V-Log-Alchemy-Apache-2.0.txt")

    for identifier, title, path, category, tags, use_case, warning in T3_LUTS:
        source = temporary / Path(path).name
        target = slug_file(identifier)
        download(T3_RAW + urllib.parse.quote(path, safe="/"), source)
        hald_to_cube(source, target, title)
        catalog.append({
            "id": identifier, "title": title, "filename": target.name, "fileUrl": f"assets/luts/open/{target.name}",
            "size": cube_size(target), "category": category, "tags": tags, "useCase": use_case, "warning": warning,
            "inputColorSpace": "sRGB display-referred", "outputColorSpace": "sRGB display-referred", "cameraCompatibility": "All cameras after RAW development to sRGB",
            "skinTone": "review-required", "sourceName": "t3mujinpack Hald CLUT", "sourceRepo": T3_REPO,
            "sourceUrl": source_url(T3_REPO, path), "sourceLicense": "MIT", "licenseFile": "assets/luts/licenses/t3mujinpack-MIT.txt",
            "commercialUse": True, "attributionRequired": True, "validationStatus": "license-and-parser-verified",
            "trademarkNotice": "Unofficial film-stock emulation; product names identify the simulated reference only."
            ,"compatibility": {"davinci-resolve": "direct-cube", "photoshop": "direct-cube", "pixelcake": "processed-image-only", "blackmagic-camera": "direct-cube-33"}
        })

    for identifier, title, path, category, tags, use_case in VLOG_LUTS:
        target = slug_file(identifier)
        download(VLOG_RAW + urllib.parse.quote(path, safe="/"), target)
        catalog.append({
            "id": identifier, "title": title, "filename": target.name, "fileUrl": f"assets/luts/open/{target.name}",
            "size": cube_size(target), "category": category, "tags": tags, "useCase": use_case,
            "warning": "Only for Panasonic V-Log / V-Gamut input. Do not apply directly to normal sRGB photos.",
            "inputColorSpace": "Panasonic V-Log / V-Gamut", "outputColorSpace": "Rec.709 creative output", "cameraCompatibility": "Panasonic Lumix V-Log cameras",
            "skinTone": "profile-dependent", "sourceName": "V-Log-Alchemy", "sourceRepo": VLOG_REPO,
            "sourceUrl": source_url(VLOG_REPO, path), "sourceLicense": "Apache-2.0", "licenseFile": "assets/luts/licenses/V-Log-Alchemy-Apache-2.0.txt",
            "commercialUse": True, "attributionRequired": True, "validationStatus": "license-and-parser-verified",
            "trademarkNotice": "Unofficial camera/film-look transform; not affiliated with the named manufacturers."
            ,"compatibility": {"davinci-resolve": "direct-cube", "photoshop": "direct-cube-after-log-confirmation", "pixelcake": "processed-image-only", "blackmagic-camera": "direct-cube-33-vlog-input-only"}
        })

    payload = {
        "version": 2,
        "generatedAt": "2026-07-13T00:00:00Z",
        "itemCount": len(catalog),
        "policy": {
            "defaultRecommendationInput": "sRGB display-referred",
            "rules": [
                "Never recommend a camera-log LUT for a different input color space.",
                "For S-Log3, D-Log M, Apple Log and Blackmagic Film, perform the matching technical transform before an sRGB creative LUT.",
                "DJI D-Log M transforms are model-specific and require an exact camera model match.",
                "PixelCake is an XMP/preset and processed-image workflow until direct CUBE import is officially documented.",
                "Show source, license, input color space and warning before installation.",
                "LUT strength is a creative control; validate skin tone and clipping on the actual image.",
                "Film and camera names are descriptive references, not claims of official affiliation."
            ]
        },
        "sources": [
            {"id": "t3mujinpack", "repo": T3_REPO, "license": "MIT", "starsSnapshot": 992, "forksSnapshot": 56, "auditedAt": "2026-07-13", "adoption": "bundle-converted", "notes": "Active photography preset project; selected Hald CLUTs converted to 33-point cube and parser-tested."},
            {"id": "v-log-alchemy", "repo": VLOG_REPO, "license": "Apache-2.0", "starsSnapshot": 302, "forksSnapshot": 23, "auditedAt": "2026-07-13", "adoption": "bundle-input-gated", "notes": "Pre-generated 33-point cubes; strictly gated to Panasonic V-Log/V-Gamut input."},
            {"id": "ocio-aces", "repo": "https://github.com/AcademySoftwareFoundation/OpenColorIO-Config-ACES", "license": "BSD-3-Clause", "starsSnapshot": 419, "forksSnapshot": 45, "auditedAt": "2026-07-13", "adoption": "reference-only", "notes": "Professional ACES color-management reference, not bundled as a creative sRGB LUT pack."}
        ],
        "softwareProfiles": SOFTWARE_PROFILES,
        "inputTransforms": INPUT_TRANSFORMS,
        "items": catalog,
    }
    CATALOG_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(catalog)} LUTs in {OUTPUT_DIR}")


if __name__ == "__main__":
    build()
