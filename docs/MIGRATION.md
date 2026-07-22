# Classic 数据迁移到模块化 V2

## 原则

- Classic 数据不删除、不覆盖。
- 先 Dry Run，再备份，再 Commit。
- 重复执行必须幂等。
- 所有迁移记录保留 `legacyId` / `migrationKey`。
- 迁移失败恢复执行前快照。

## 已识别来源

迁移器会检查：

- `pw_plans`
- `pa_shots_<planId>` 动态镜头键
- `pw_schedule` / `pw_schedules` / `pw_todos`
- `pw_messages`
- `pw_eq` / `pw_equipment`
- `pw_models` / `pw_venues`
- `pa_reviews`
- `pa_shoot_records`
- `pa_lut_profiles`
- `pa_plan_versions`
- `pa_relation_decisions` / `pa_asset_decisions`
- `pa_feishu_references`
- `pa_custom_shots`
- `pa_projects`

## 操作流程

1. 打开“系统、迁移与交接”。
2. 导出完整备份。
3. 点击“重新生成迁移报告”。此操作不修改数据。
4. 检查检测数量、已存在数量、警告和完整性问题。
5. 点击“执行幂等迁移”。
6. 重新运行完整性审计。
7. 核对项目、方案、镜头、日程、LUT、复盘和现场记录。
8. 保存迁移报告和迁移前备份。

## 备份格式

备份包含：

```json
{
  "format": "photoatelier-backup",
  "schemaVersion": 3,
  "exportedAt": "ISO-8601",
  "namespaces": {
    "v2": {},
    "legacy": {}
  }
}
```

导入支持：

- `merge`：只覆盖备份内出现的 V2 存储项。
- `replace`：清理 V2 命名空间后恢复，其他无关 localStorage 不受影响。

## 上线前验收

- 方案数量一致。
- 动态镜头不遗漏、不重复。
- shoot-call 能关联到正确 planId。
- 设备、LUT、复盘和 ShootRecord 数量合理。
- 没有 `ORPHAN_PROJECT`、`ORPHAN_PLAN` 或重复 ID。
- Classic 原始 key 仍存在。
