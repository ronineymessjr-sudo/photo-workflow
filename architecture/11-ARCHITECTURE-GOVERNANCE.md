# 11｜架构治理

## GPT 负责的内容

只有架构所有者可以决定：

- 新增、删除或重命名领域实体
- 状态机变化
- 跨模块关系
- Repository / Gateway 合同
- JSON Schema 版本
- 迁移顺序
- 数据隐私边界
- 是否接受执行模型提出的 Architecture Question

## 执行模型可以决定的内容

在合同不变的前提下可以决定：

- 纯函数内部实现
- 文件内部私有函数命名
- 测试夹具组织方式
- 性能优化
- 错误处理细节，但错误 code 必须遵循合同

## Architecture Question 格式

```markdown
## Architecture Question

- Task: Txx
- Blocking file/function:
- Existing contract:
- Conflict or missing information:
- Options considered:
- Recommended option:
- Code changes paused: yes
```

没有架构答复前，不得继续写猜测实现。

## 合并审查清单

1. 是否新增了合同外字段？
2. 是否在页面中新增跨实体写入？
3. 是否把全局库重新做成项目复制？
4. 是否让 Agent 未批准就写正式方案？
5. 是否混淆真实参考和 synthetic 资产？
6. 是否把日程或收入重新塞回 Tasks？
7. 是否把后期状态写回 PlanRevision？
8. 是否破坏 V2.3 迁移与备份？
9. 是否包含对应测试？
10. 是否跑过 release gate？

任意一项不满足，不允许进入集成分支。
