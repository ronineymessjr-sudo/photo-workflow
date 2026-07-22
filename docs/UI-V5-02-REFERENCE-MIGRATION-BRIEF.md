# UI-V5-02 参考图关系迁移简要说明

## 现在缺什么

兼容页面目前仍把参考图当作“某个项目自己的记录”，镜头绑定也会直接修改 Shot。V5 已经把它拆成三层，但页面还没有接上：

1. `ReferenceAsset`：全局参考图本体，只保存一份。
2. `ProjectReferenceLink`：某个项目选择了这张参考图。
3. `ShotReferenceLink`：某个镜头如何使用这张参考图，例如构图、姿势、光线或色彩参考。

## 下一步需要接入

- `IngestReferenceAsset`：从本地、Obsidian、飞书或 URL 收录参考图，并执行去重与来源校验。
- `SelectReferenceForProject`：把全局参考图选入当前项目，不复制资源本体。
- `BindReferenceToShot`：把项目中的参考图绑定到具体镜头，保存用途、理由、锁定或拒绝状态。

页面读取改用 V5 `referenceLibrary` 查询模型；移除项目关系或镜头关系时，不能删除全局参考图。

## 页面应保留的操作

- 搜索和筛选全局参考库。
- 收录新的真实参考图。
- 选入或移出当前项目。
- 在方案镜头上选择参考图，并标记参考用途。
- 清楚区分真实参考图和 `synthetic=true` 的 AI 概念图。

## 完成标准

- 同一 URL 或文件重复导入不会产生多个 `ReferenceAsset`。
- 同一参考图可以被多个项目复用。
- 移除项目关系不会删除参考图本体。
- 删除镜头绑定不会影响项目关系。
- 页面不再直接写 `references` 或修改 Shot 内的旧参考字段。
- 运行 `npm run test:scope -- references` 并通过。

本任务不调整视觉、不接真实外部账号，也不修改 Schema v5 或关系含义。
