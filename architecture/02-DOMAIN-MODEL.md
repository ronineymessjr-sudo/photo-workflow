# 02｜领域模型

## 通用字段

所有持久化实体：

```text
id
schemaVersion
createdAt
updatedAt
legacyId?       旧记录回链
migrationKey?   幂等迁移
```

## Project

```text
id
name
status: active | archived | cancelled
briefId
currentConfirmedPlanId?
defaultCurrency
timezone
```

Project 不再塞入设备数组、后期状态或 Agent 输出。

## ProjectBrief

```text
id
projectId
shootingType
goal
theme
style
mood
locationIntent
dateIntent
deliverableTarget
constraints[]
notes
```

## EquipmentModel

内置主流设备目录，不代表用户拥有。

```text
id
brand
model
category: camera | lens | light | audio | support | storage | accessory
mount?
sensorFormat?
focalRange?
maxAperture?
tags[]
source
isBuiltIn
```

## EquipmentItem

摄影师实际拥有、常租或可用的设备。

```text
id
equipmentModelId?
customName?
ownership: owned | rented | borrowed | wishlist
quantity
condition
availabilityStatus
notes
```

规则：equipmentModelId 和 customName 至少一个存在。

## Venue

```text
id
name
address?
indoorOutdoor
features[]
lightingNotes
restrictions[]
priceNote?
latitude?
longitude?
referenceAssetIds[]
```

地图相关字段只预留，不在第一阶段实现地图服务。

## TalentProfile

```text
id
displayName
contact?
portfolioUrls[]
styleTags[]
availabilityNotes
consentStatus
boundaries
privateNotes
analysisConsent: not_requested | granted | denied
analysisStatus: none | pending | completed | failed
analysisSummary?
```

未来视觉分析不得输出吸引力排名、身体价值判断或与健康无关的审美评分。

## PlanTemplate

```text
id
name
shootingType
description
briefDefaults
shotPatterns[]
preparationChecklist[]
source: built-in | feishu | custom
```

## ProjectResourceAssignment

统一关系实体，资源本体仍保持类型化。

```text
id
projectId
resourceType: equipment | venue | talent
resourceId
planId?
role
quantity?
status
notes
```

Equipment、Venue、Talent 均可跨项目复用。

## ReferenceAsset

真实参考素材本体。

```text
id
assetKind: real_photo | lighting_reference | pose_reference | composition_reference | color_reference | location_reference
sourceType: feishu | obsidian | local | pexels | url | upload
sourceId?
sourceUrl?
previewUrl?
localPath?
title
tags[]
photographer?
licenseStatus
verificationStatus
contentHash?
perceptualHash?
synthetic: false
```

## ProjectReferenceLink

```text
id
projectId
referenceAssetId
role: mood | pose | lighting | color | composition | location | general
notes
locked
```

## ShotReferenceLink

```text
id
shotId
referenceAssetId
role
score?
reason?
locked
rejected
```

## PlanningContextSnapshot

不可变。生成时记录实际使用的内容，之后库数据变化不影响历史 Run。

```text
id
projectId
briefSnapshot
selectedTemplate
selectedEquipment[]
selectedVenue?
selectedTalent[]
selectedReferences[]
historicalReviewSummary[]
constraints[]
lookRequest?
createdAt
contextHash
```

## GenerationRun

```text
id
projectId
contextSnapshotId
runType: plan | plan_regeneration | expected_look
provider
model
promptVersion
status: queued | running | awaiting_approval | failed | approved | rejected
instruction?
rawOutput?
normalizedOutput?
validation
error?
parentRunId?
```

GenerationRun 不属于正式方案库。

## Plan

稳定业务身份。

```text
id
projectId
title
planStatus: candidate | confirmed | archived | cancelled
activeRevisionId
confirmedRevisionId?
```

草稿存在于 GenerationRun 或未发布 PlanRevision，不使用 Plan 的 draft 状态污染正式库。

## PlanRevision

不可变方案版本。

```text
id
planId
revisionNumber
sourceRunId?
concept
rationale
visualDirection
preparationGuide
expectedDeliverableCount
mustHaveShotCount
riskPlan[]
expectedLookId?
status: candidate | confirmed | superseded
createdBy
confirmedAt?
```

确认后不可原地修改；修改必须新建 revision。

## Shot

```text
id
planRevisionId
sequence
group
scene
shotSize
cameraAngle
composition
focalLength
aperture?
shutter?
iso?
whiteBalance?
lighting
poseGuidance
subjectAction
variationCount
targetSelectCount
priority: must | recommended | optional
estimatedMinutes
fallback
captureStatus
```

## ExpectedLook

```text
id
planRevisionId
enabled
realReferenceAssetIds[]
generatedAssetIds[]
colorIntent
lightingIntent
retouchIntent
skinRetouchIntent?
backgroundIntent?
lutIntent?
notes
```

这里描述预期，不执行正式后期。

## ImageGenerationRun

```text
id
projectId
planRevisionId?
provider
model
prompt
negativePrompt?
seed?
status
requestedCount
completedCount
error?
```

## GeneratedAsset

```text
id
imageGenerationRunId
projectId
planRevisionId?
assetKind: generated_concept
url?
localBlobKey?
width?
height?
prompt
provider
model
synthetic: true
status
```

## CalendarEvent

```text
id
projectId
planId?
planRevisionId?
eventType: shoot | meeting | deadline | delivery | personal
startAt
endAt
allDay
timezone
location
participantAssignmentIds[]
status: tentative | confirmed | completed | cancelled
expectedRevenue?
currency?
```

## Task

```text
id
projectId
planRevisionId?
calendarEventId?
postProductionJobId?
assigneeRole?
title
phase
status
dueAt?
```

Task 不再代表拍摄日程本身。

## FinancialEntry

```text
id
projectId
calendarEventId?
type: expected_revenue | received_revenue | expense
amount
currency
occurredAt
status
notes
```

收益汇总必须分别显示预计、已收、费用和净额。

## PostProductionJob

```text
id
projectId
planRevisionId
status: not_started | backed_up | selecting | editing | awaiting_feedback | delivered
expectedLookSnapshot
backupPrimary
backupSecondary
materialPath
initialSelectCount?
finalSelectCount?
targetDeliverableCount?
editVersion?
colorBrief
retouchBrief
feedbackStatus
clientFeedback?
deliveryUrl?
deliveredAt?
```

## LUTPreset

```text
id
name
inputColorSpace
style
fileUrl?
license
source
strengthDefault
```

LUTPreset 是库；PostProductionJob 通过 ID 引用它。

## ParticipantAssignment

```text
id
projectId
talentProfileId?
role: photographer | model | assistant | client | makeup | stylist
calendarEventIds[]
status
callTime?
notes
```

## SharePacket

```text
id
projectId
planRevisionId
recipientRole: model | assistant
recipientAssignmentId?
version
status: draft | published | revoked | expired
payloadSnapshot
publishedAt?
expiresAt?
```

SharePacket 是发送时的快照。后续方案变化必须生成新版本，不能静默改变已发送内容。
