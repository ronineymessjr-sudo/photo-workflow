# PoseAtlas 白底底模 · 换脸稳定手册

实测对象：`github.com/HRuiCcc/RuiC-PoseAtlas`，项目里由 `api/ai-studio/poseatlas.mjs` 消费。

## 一、实测数据（2026-11-05，各 5 轮）

| 数据集 | 行数 | 体积 | 中位延迟 | 缓存头 | 5 轮 id 哈希 |
|---|---|---|---|---|---|
| pose | 288 | 186KB | 1.35s | `max-age=600` | `b7c7b35f` ✅ 一致 |
| costume | 1407 | 323KB | 1.33s | `max-age=600` | `b04df3ab` ✅ 一致 |
| portrait | 1499 | 550KB | 1.72s | `max-age=600` | `85aeb3e7` ✅ 一致 |

**图片端点**（`ai-portrait-gallery.pages.dev`）：

- 单张 2MB 左右 PNG，1122×1402
- **首次 6–12 秒，重复取 15–21 秒**
- `cache-control: public, max-age=0, must-revalidate` —— **CDN 不缓存**
- 但三次取同一张，sha1 完全一致（`48efccb1fe7f`）→ 数据稳，慢在传输

## 二、结论：能稳定，但不能直连

| 判断 | 依据 | 对策 |
|---|---|---|
| 元数据稳定 | 5/5 成功、id 哈希一致、10 分钟缓存 | 可以依赖，但**每次生产要记 idHash** |
| 图片稳定但极慢 | 6–21s、2MB、不可缓存 | **必须本地快照 + 内容寻址**，生成时不再回源 |
| 数据会变 | `max-age=600` 说明上游随时可更新 | 快照对齐到日，manifest 钉住哈希 |
| 尺寸统一 | 全部 1122×1402 | 融合前不用缩放，直接当底模 |

快照命令：

```bash
node tools/atlas-snapshot.mjs --images 4 --section face
# → runtime/atlas-snapshot/<日期>/{pose,costume,portrait}.json + images/ + manifest.json
```

产物里每张图带 `sha1`，融合记录引用它就能复现。

## 三、白底底模从哪来

`portrait` 有 1499 行，其中：

- `sec=face`：**893 张**，头像到肩，近白背景、影棚平光 —— 这是**主底模池**
- `sec=styling`：606 张，带造型变化
- 标签：`hair`（short / medium / semilong / long）、`style`（日文描述，如「くびれショート」）
- 实拍样张确认：背景接近纯白（浅灰渐变），无阴影，适合直接换脸

`pose` 的 288 条带角度变体：`front / side / diagonal / high / low`，用来约束"换脸后保持同一姿势"。

## 四、三条融合路线（按稳定性排序）

### 路线 A：参考图编辑（最省事，稳）

底模图 + 人脸图一起给图像模型，指令只改身份：

```text
Keep the pose, clothing, hairstyle volume and the plain white background exactly.
Replace only the facial identity with the person in the second reference image.
Keep the same lighting direction and the same skin tone family. No retouching look.
```

- 适用：GPT Image 编辑模式、Flux Kontext、nano-banana
- 稳定条件：**底模固定同一张 + 同一段指令 + 同一张人脸参考**
- 风险：模型容易顺手改发型/衣领

### 路线 B：FaceID 注入（最可控，需本地）

- 底模 `img2img`，`denoise 0.25–0.40`（只改身份，不改姿势）
- IP-Adapter FaceID 权重 `0.8–0.9`；超过 0.95 会"贴脸"
- 白底区域用 mask 保护，避免背景被重绘出灰边
- 显存 8GB：832×1024 以内单张

### 路线 C：后处理换脸（最稳，质量取决于融合）

1. 先用 PoseAtlas 底模生成身体/服装（甚至可以不改）
2. 用 inswapper/roop 类工具把人脸贴上
3. **必做**：mask 羽化 2–4px、LAB 肤色匹配、下颌线重打光

稳定但要注意：底模是影棚平光，若人脸原照是强侧光，会出现"贴上去"的割裂感。

## 五、稳定五件套（缺一不可）

1. **冻结底模**：记录底模 `id + sha1`，同一批次不允许换底
2. **冻结 seed**：能传 seed 的服务固定，不能传的就固定"底模 + 指令"组合
3. **冻结参数**：denoise / FaceID 权重写进配置，不临场调
4. **人脸质量门**：参考脸必须正脸、清晰、无遮挡；结果与参考脸用 ArcFace 比，**余弦 ≥0.55 才收**，0.40–0.55 重做，<0.40 废片
5. **快照 idHash**：`b7c7b35f / b04df3ab / 85aeb3e7` 记进每次任务，数据一变立刻能发现

## 六、白底专属的 6 项验收（普通照片不看这些）

| 项 | 判 A 的标准 | 常见失败 |
|---|---|---|
| 脸相似度 | ArcFace ≥0.55 | 换完像"亲戚" |
| 肤色匹配 | 脸与颈部色差 ΔE < 5 | 脸白脖子黄 |
| 颈线/发际线 | 过渡自然，无硬边 | 明显贴片感 |
| 发丝 | 边缘有碎发，不是切出来的一整块 | 头发像假发套 |
| 背景纯度 | 四角取样 RGB 方差 < 3，无灰影 | 换脸带进原图的暗角 |
| 光影方向 | 与底模同一主光 | 平光底模 + 侧光脸 |

## 七、合规（这条别跳）

- 仓库把素材标为 `rightsStatus: external_reference`、`allowedUses: ['agent-reference']` —— **可以当参考，不能转售或再分发原图**
- 这些人像是 **AI 合成脸**（域名 `ai-portrait-gallery`），不涉及真人肖像权，但**不要把它们当"真人模特"对外宣称**
- 商业发布前核对仓库 LICENSE；涉及真人客户照片时，必须有书面授权

## 八、接进现有面板怎么用

面板要三张参考图，白底换脸这样对应：

| 角色 | 放什么 |
|---|---|
| identity | 要融上去的那张脸（你自己的模特照或授权照） |
| scene | PoseAtlas 白底底模（那 893 张里选一张） |
| style | 同一张底模，或你想要的成片质感参考 |

然后照 `03-手动跑图单.md` 走：交接卡 → 出图 → 回传 → 质检。融合类结果额外过上面 6 项。
