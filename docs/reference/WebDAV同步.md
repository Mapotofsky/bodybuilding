# WebDAV 同步

本文定义远端格式、合并、发布和失败语义。业务 schema、兼容范围与 migration 以[本地存储与迁移](本地存储与迁移.md)为准；Android 原生传输、Keystore 和凭据迁移见[Android 平台与凭据](Android平台与凭据.md)。

## 范围与端点

WebDAV 是用户自有空间中的手动 JSON 分片同步与备份目标，不是数据库或业务服务端。未配置时训练、计划、模板、动作库和日历仍须离线可用。它不提供实时双向同步、无冲突编辑、端到端加密、自动备份清理、跨设备凭据同步或可视化冲突恢复，也不承担 AI 请求或联网检索。

SyncPage 输入 URL、用户名和密码。`services/syncSettings` 生成或复用 `passwordRef`，经 repository 调用平台 `SecretStore.writeSecret`，写入并读回确认后才保存本机端点；密码留空时复用原引用。URL、用户名、`passwordRef` 和密码都只属于本机配置，另一设备须自行配置。清除同步配置只清除本机端点及对应 secret，不删除业务数据；具体凭据清除顺序见[Android 平台与凭据](Android平台与凭据.md)。

`settings.json` 仅包含可同步偏好。`themeId` 按 settings 的 LWW 语义同步，未知值保留原值并由 UI 运行时回退。任何本机端点和秘密引用都不得进入 `settings.json`、manifest、同步分片、远端 backup 或日志；merge 保留当前设备自己的本机配置及 `lastSyncAt`，不能从远端恢复或覆盖。规划中的 AI 设置是否同步须在实现前决定；秘密引用始终遵守同一远端脱敏边界。

## WebDavClient 与远端目录

实现位于 `frontend/src/sync/webdavClient.ts`。`propfind` 测试或枚举目录，`get` 拉取 manifest 与分片，`put` 上传 JSON 或备份并支持可选 If-Match，`move` 发布临时文件，`delete` 删除过期训练月分片或头像资源，`mkcol` 创建同步根、workouts 和 backups。`joinUrl(base, path)` 拼接受控分片路径；`remoteDataUrl` 确保根目录以 `ironlog-data` 结尾，不将分片直接写入用户 WebDAV 根目录。

远端由 `manifest.json` 列出静态 JSON、`workouts/YYYY-MM.json` 和 `assets/avatar/*` 资源；覆盖前副本放入 `backups/`。完整分片、字段和读取兼容规则只在[本地存储与迁移](本地存储与迁移.md)定义。Android 与浏览器的 HTTP 方法选择见[Android 平台与凭据](Android平台与凭据.md)。

## 测试连接与手动同步

测试连接先保存本机端点和密码引用，再创建或检查 `ironlog-data` 目录。MKCOL 返回 201 表示创建，405 表示已存在，均可继续 PROPFIND；其他状态显示为连接错误。

`frontend/src/sync/syncService.ts` 的手动同步顺序：

1. 读取本机端点及本地 snapshot，拉取远端 manifest 和其列出的分片；远端没有 manifest 时按首次上传处理。
2. 使用与本地读取相同的兼容 migration 归一化远端快照，再按文档 ID 合并。
3. `replaceSnapshot(merged)` 写入本地，创建远端目录并备份可读取的旧远端分片。
4. 每个本地分片和头像资源先 PUT 到 `<path>.tmp-<timestamp>`，再 MOVE 到正式路径；删除新 manifest 不再列出的远端训练月分片和头像资源，最后更新本机 `lastSyncAt`。

MOVE 返回 409 时，当前流程先 DELETE 目标，再用 `overwrite=F` 重试 MOVE；失败必须保留错误，不得标记同步成功。备份路径为 `backups/<ISO timestamp>-<path 中 / 替换为 ->`。当前没有压缩、校验、保留数量或恢复 UI，备份失败也没有独立状态建模；定义恢复流程之前不得增加自动清理。头像清除会删除本地资源并将 `profile.avatarUrl` 设为 null，下一次同步依新 manifest 删除过期远端资源；拉取时仅接受 manifest 中的头像路径，导入后引用才可解析为本地预览。

## 合并与冲突

`mergeSnapshots` 按文档 ID 合并 profile、settings、动作、计划、模板和训练。同一 ID 的 `updatedAt` 相同则保留本地；不同则记录 LWW 日志并选择 ISO 时间较新的整份文档；只存在于一方则保留该文档。settings 只合并可同步偏好并保留本地 `lastSyncAt`。远端 migration 在合并前执行，失败不应触发自动清理；不得要求日常真机或正式远端目录清空后同步。

`updatedAt` 不同不一定是真实冲突，当前日志只是 LWW 选择记录。当前没有共同基线、ETag 条件写或重试回拉；WebDavClient 虽支持 If-Match，SyncService 尚未使用 manifest 的 etag。同一 WorkoutDoc 的不同 sets 修改会整份二选一，设备时钟和连续同步可能造成覆盖。对外应称“手动 JSON 备份同步，使用 LWW 合并”，不称无冲突双向同步。

## 验证边界

同步格式、顺序、凭据脱敏或失败恢复变化时，覆盖未配置、首次上传、常规 pull/merge/backup/tmp/MOVE、差异日志、分片与头像删除、旧快照 migration 往返、远端脱敏和失败后数据保留。实现测试主要位于 `src/services/syncSettings.test.ts` 和 `src/sync/syncService.test.ts`；数据兼容用[本地存储与迁移](本地存储与迁移.md)中的规则判断。设备层级与操作命令见[开发与验证](../guides/开发与验证.md)。
