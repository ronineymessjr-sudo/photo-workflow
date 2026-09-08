# 摄影系统 Agent 接手入口

## 本次交接范围

用户要求你接手摄影系统登录，并继续方案生成的网页验收及后续生图接入。本文只提供本机接口和代码，不公开网络端口、不提供密钥、不绕过登录。不要将本机服务直接暴露到公网。

## 目录及版本

- 当前集成代码：`D:\AI项目\photo-workflow-director-integration`
- GitHub：`https://github.com/ronineymessjr-sudo/photo-workflow.git`
- 基于远端 master `2e4fabc`，本地分支 `integrate-director-agent`。
- 修改尚未提交、推送或部署；用 `git status --short` 核对，不要覆盖。
- Director 服务：`D:\AI项目\director-master-aesthetic-agent-v0.28.0`
- 旧摄影系统目录：`C:\Users\user\Documents\trae-soio\PhotoAtelier-V2.5-ToolDesk-Ready-2026-07-15`。它与 GitHub 当前 master 结构不同，本次未修改，不要混用旧 V5 接口。

## 地址与接口

| 用途 | 地址 | 当前情况 |
| --- | --- | --- |
| 摄影系统网页、登录 | http://127.0.0.1:8125/ | 本次 GET 验证 200；登录后的完整 UI 验收未完成 |
| 摄影系统方案桥接 | POST http://127.0.0.1:8125/api/director/plan | 已进行三组真实接口测试 |
| Director 自身页面 | http://127.0.0.1:8004/photoatelier/ | 本次 GET 验证 200；不是摄影系统 |
| OpenAPI 完整合同 | http://127.0.0.1:8004/openapi.json | 本次读取成功；以此为字段真源 |
| 拍摄方案 | POST http://127.0.0.1:8004/v1/photoatelier/shoot-plan | 摄影系统桥接实际调用此接口 |
| 生图条件 | POST http://127.0.0.1:8004/v1/photoatelier/generation-condition | 查 OpenAPI，不等于已接入摄影系统 |
| 外部供应商状态 | GET http://127.0.0.1:8004/v1/photoatelier/external-provider-status | 本次 credential_configured=true |
| 配置页面 | http://127.0.0.1:8004/photoatelier/provider-config.html | 用户输入密钥的地方；不要索要或输出 token |
| 配置 API | /v1/photoatelier/external-provider-config | 由配置页管理；不需要重新配置已有凭据 |
| 外部生图 | POST http://127.0.0.1:8004/v1/photoatelier/external-generate | Director 有此能力，摄影系统页面尚未接通 |
| 反馈 | POST http://127.0.0.1:8004/v1/feedback/events | 字段看 OpenAPI |

8004 的根路径 `/` 不保证返回 200，不能据此判断服务停机。OpenAPI 还列出 local-generate/comfyui-workflow，这不代表应该启用；用户已要求停止本地 SD1.5 路线。

## 启动方式

先确认相应端口是否可用，避免重复启动。PowerShell：

```powershell
Set-Location -LiteralPath 'D:\AI项目\photo-workflow-director-integration'
node tools/serve-director.mjs
```

该桥接固定监听 `127.0.0.1:8125`，默认后端 `127.0.0.1:8004`，无须安装依赖。

Director 如果停止，使用正常 Windows 用户上下文启动（在 Codex 中申请对应执行权限），不要使用离线沙箱身份运行需要联网和读取既有用户凭据的服务：

```powershell
Set-Location -LiteralPath 'D:\AI项目\director-master-aesthetic-agent-v0.28.0'
.\.venv\Scripts\python.exe -m uvicorn director_agent.app:app --host 127.0.0.1 --port 8004
```

如后台启动请用 `Start-Process -WindowStyle Hidden`。曾验证网络故障来自沙箱身份，不能再据此修改防火墙。既有凭据已在正常 Windows 用户上下文配置；只能检查 credential_configured，不输出凭据内容。

## 摄影网页真实调用

`handleSubmit` → `window.generateDirectorPlan(input)` → `/api/director/plan` → `/v1/photoatelier/shoot-plan`。

桥接输入（JSON，Content-Type application/json）：

```json
{"theme":"雨夜城市纪实","style":"纪实","modelDesc":"成年人物","scene":"斑马线","mood":"安静","duration":"2小时","people":"1","extra":"高机位俯拍，人物左下角，完整全身，不要居中半身像"}
```

输出为兼容原页面的 plan：`title/input/savedAt/style/images/sections/shotList/director`。
`director.requestId` 用于追踪，`director.submittedBrief` 用于核对原始需求；`shotList[].directorContract` 保留完整原始镜头合同。
桥接目前请求 3 个候选镜头；超过 2000 字符的编译需求拒绝而不静默截断。`duration=0` 表示镜头时长未估算，不是完整排期。

## 已改文件

- `index.html`：原方案按钮改用真实接口；分镜直接读取 Agent shotList；失败不回退旧模板；Agent 方案不调用旧九图生成；生成内容显示转义。
- `assets/director-client.js`：本机同源桥接，非本机使用已有 api 客户端及登录。
- `api/director-plan.mjs`：字段编译及 Director 返回合同转换。
- `api/index.js`：新增受原登录认证保护的云端方案路由；没有配置时返回 503。
- `tools/serve-director.mjs`：仅回环监听的本地桥接；限制 Host、Origin、请求大小、静态文件范围。
- `tests/director-integration.test.mjs`：4 项新增测试。
- `DIRECTOR-INTEGRATION.md`：英文接入说明。

## 测试与尚未完成项

```powershell
Set-Location -LiteralPath 'D:\AI项目\photo-workflow-director-integration'
node --test tests/director-integration.test.mjs
node --check api/index.js
node --check assets/director-client.js
git diff --check
```

上轮 4/4 测试通过；三次真实桥接测试分别返回 high_angle、eye_level、ground_level，均有 3 个镜头，输入和拒绝条件保留。此为接口与字段验收，不是图像美学验收。

下一步按顺序：
1. 打开 8125 的摄影系统登录页，使用原有登录方式；需要用户密码、验证码或新账号条款时交给用户，不绕过认证。
2. 在表单提交上述测试需求，确认页面出现请求 ID、真实分镜，保存和重新打开后不变成旧模板。测试数据明确标注为测试。
3. 接入外部生图时，必须以本次输入及选定镜头为依据，避免旧提示词污染。输出素材标记 synthetic=true。当前尚未连接，不要声称已有图片结果。
4. 若调用 external-generate，先查 OpenAPI。已有默认模型 FLUX.1-schnell；free-credit-first 不是强制零费用保证，不擅自启用 paid-approved，也不批量消耗额度。
5. 本地页面验收后再安排云端部署。Cloud Worker 不能访问用户电脑的 127.0.0.1；必须有受保护的 HTTPS Director 服务，并配置服务端 DIRECTOR_API_BASE。目前未完成这一步。

重要：现有 Director 方案服务属于检索/规则编排，不是新训练的图像基础模型；不能把接口连通或测试通过宣传成权重训练、审美提升、生产上线。
