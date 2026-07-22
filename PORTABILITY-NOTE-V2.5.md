# V2.5 跨平台文件名处理

原始 V2.4 交接包的 `context/obsidian/` 中有 40 个文件使用无法解码为 UTF-8 的历史 Windows 文件名。它们不是 V2.5 运行时依赖，但会导致标准 ZIP 无法可靠创建或在其他系统解压。

处理方式：

- 工作目录中的原始文件未被用作运行时数据。
- 所有受影响文件按原始字节完整复制到 `context/obsidian-portable/files/`。
- `context/obsidian-portable/manifest.json` 保存原始路径字节、转义显示、SHA-256、大小和新路径。
- 正式 ZIP 跳过无法表示的原始路径，只包含可移植副本。
- `context/obsidian/photo-workflow.md` 等正常 UTF-8 文件仍按原路径保留。

该处理不改变 12 张 V2.5 真实参考图片及其数据包；它只修复历史上下文附件的跨平台交接问题。
