# P3 详细设计文档：WebDAV 同步与 Android 平台

> 对应概要设计：M3 同步部分、M4 Android 平台；M5/M6 设置同步与秘密隔离
> 状态：当前实现基线，包含明确的安全和冲突限制；主题与 AI 同步影响为规划中
> 前置依赖：P2 本地文档存储与数据迁移。

---

## 1. 目标与范围

本模块让用户在不部署 IronLog 服务端的前提下，将本地 JSON 分片同步到自有 WebDAV 空间，并在 Android 设备上通过 Capacitor 运行相同业务代码。

本模块保证：未配置 WebDAV 时应用离线可用；已配置时可测试连接、手动同步、写远端备份并显示 LWW 日志。

本模块不保证：实时双向同步、无冲突编辑、端到端加密、自动备份清理、账户权限管理、跨设备安全凭据同步或可视化冲突恢复。它也不是 AI 后端、provider 代理、联网检索或计划导入通道。

---

## 2. 同步配置与秘密边界

### 2.1 SettingsDoc

```ts
interface WebDavSettings {
  url: string;
  username: string;
  passwordRef: string | null;
}

interface SettingsDoc extends BaseDoc {
  weightUnit: "kg" | "lb";
  webdav: WebDavSettings;
  lastSyncAt: string | null;
}
```

SyncPage 输入 URL、用户名、密码。保存密码时：

1. 页面生成或复用 `passwordRef`。
2. 调用 `localRepository.writeSecret(passwordRef, password)`。
3. `settings.json` 只保存 `passwordRef`，不保存 password。

同步到远端前，`snapshotToFiles` 强制将 remote `settings.json` 的 `passwordRef`、`lastSyncAt` 清空。URL 和用户名当前仍会同步，便于同一用户在另一设备补齐密码后继续使用。

### 2.2 当前安全状态

Android secret 当前由 Capacitor Preferences 保存。它隔离于 JSON 分片，满足“密码不进 WebDAV 文件”的最低要求；但不是本项目实现的 Keystore/硬件级加密安全存储。对外发布不得把它描述为端到端加密或系统凭据库。

WebDAV 请求使用 Basic Authorization，必须优先要求 HTTPS。建议用户创建专用目录和低权限专用账户。

---

### 2.3 规划中的主题与 AI 设置同步

themeId 是非秘密设置，应按当前 settings 的 LWW 语义同步；未知值保持原值，由 UI 运行时回退默认主题。未来 AI 的 provider/model/能力开关属于候选非秘密设置；是否同步 endpoint、预算和审计偏好需在实现前决定。

apiKeyRef 与任何未来秘密引用必须同 passwordRef 一样，在远端 settings.json、backups 和日志中清空；merge 必须保留当前设备自己的秘密引用，不能从远端恢复或覆盖。AI provider 或未来 agent gateway 是可选外部依赖；其失败不得阻塞本地训练、模板、动作库或 WebDAV。

## 3. WebDavClient 契约

文件：`frontend/src/sync/webdavClient.ts`。

| 方法 | HTTP 方法 | 用途 |
|---|---|---|
| `propfind(path)` | PROPFIND | 测试/枚举目录能力。 |
| `get(path)` | GET | 拉取 manifest 与分片。 |
| `put(path, body, etag?)` | PUT | 上传 JSON 或备份；客户端支持可选 If-Match。 |
| `move(from, to, overwrite)` | MOVE | 发布临时文件。 |
| `delete(path)` | DELETE | 删除远端过期训练月分片。 |
| `mkcol(path)` | MKCOL | 创建同步根、workouts、backups 目录。 |

路径由 `joinUrl(base, path)` 拼接，不能以用户输入直接替换分片路径。`remoteDataUrl` 会确保根目录以 `ironlog-data` 结尾，避免把分片直接写到用户 WebDAV 根目录。

### 3.1 平台传输选择

| 环境 | GET/PUT/DELETE | MKCOL/MOVE/PROPFIND |
|---|---|---|
| 浏览器开发 | `fetch` | `fetch`，受 CORS/服务端支持限制。 |
| Capacitor Android | `CapacitorHttp` | 自定义 `WebDavHttp` 原生插件。 |

Android 原生插件位于：

```text
frontend/android/app/src/main/java/app/ironlog/local/WebDavHttpPlugin.java
```

它基于 OkHttp，只允许 `DELETE`、`GET`、`MKCOL`、`MOVE`、`PROPFIND`、`PUT` 六种方法，并设置连接/读取/写入超时。`MainActivity` 必须在 `super.onCreate` 前注册该插件；删除或改名插件前必须搜索 TypeScript 的 `registerPlugin("WebDavHttp")` 引用。

---

## 4. 同步流程

文件：`frontend/src/sync/syncService.ts`。

### 4.1 连通性测试

```text
SyncPage 测试连接
  -> 保存 URL/用户名/密码引用
  -> configuredClient()
  -> MKCOL(ironlog-data)
  -> PROPFIND(ironlog-data)
```

MKCOL 返回 201 表示创建成功，405 表示目录已存在，均视为正常；其他状态抛错并显示到页面状态 badge。

### 4.2 手动同步

```text
SyncPage 手动同步
  -> configuredClient
  -> 读取 local snapshot
  -> GET remote manifest
  -> GET manifest 列出的分片
  -> migrate remote snapshot
  -> merge local/remote
  -> replaceSnapshot(merged)
  -> 创建远端目录
  -> 备份远端分片
  -> 每个本地分片 PUT tmp
  -> MOVE tmp 到正式分片
  -> 删除过期远端训练月分片
  -> 更新本地 lastSyncAt
```

远端没有 `manifest.json` 时，`pullRemoteFiles` 返回空对象，流程直接将本地快照作为首次上传内容。

### 4.3 临时文件发布

每个分片写入：

```text
<path>.tmp-<timestamp> --PUT--> 临时文件
临时文件 --MOVE overwrite=T--> <path>
```

若 MOVE 返回 409，当前代码先 DELETE 目标，再用 `overwrite=F` 重试 MOVE。此行为是为兼容服务端差异而存在；失败时必须保留错误，不得继续标记同步成功。

### 4.4 备份

同步前读取远端 manifest 列出的分片，并把可读取文件写入：

```text
backups/<ISO timestamp>-<path 中 / 替换为 ->
```

备份是远端覆盖前的副本。当前没有压缩、校验、保留数量或恢复 UI；备份失败目前也没有独立状态建模。后续增强应先定义恢复流程，再增加“自动清理”。

---

## 5. 合并规则与冲突

### 5.1 当前实现

`mergeSnapshots` 对 profile、settings、动作、计划、模板和训练按文档 ID 合并。

```text
同一 ID 且 updatedAt 相同：保留本地
同一 ID 且 updatedAt 不同：记录日志，选择 ISO 时间较新的文档
只存在于一方：保留该文档
```

settings 特殊处理：选择较新的设置后，强制保留本地 `passwordRef` 和 `lastSyncAt`，防止秘密引用被远端覆盖。

### 5.2 当前不足

- `updatedAt` 不同并不一定代表真实冲突；当前日志只是 LWW 选择记录。
- 缺少同步共同基线、ETag 条件写和重试回拉，因此两个设备连续同步仍可能覆盖。
- WebDavClient 支持 If-Match 参数，但 SyncService 还未使用 manifest 的 etag。
- 不进行字段级合并；同一 WorkoutDoc 的不同 sets 修改会整份文档二选一。

不要把当前状态宣传为“无冲突双向同步”。发布说明应称为“手动 JSON 备份同步，使用 LWW 合并”。

---

## 6. Android 工程与交付

### 6.1 Capacitor 配置

文件：`frontend/capacitor.config.ts`。

```ts
{
  appId: "app.ironlog.local",
  appName: "IronLog",
  webDir: "dist",
  server: { androidScheme: "https" }
}
```

每次修改 Web 代码后执行：

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend
npm run android:sync
```

这会先 build 再同步 `dist/` 至 Android；它不是 APK 编译命令。

### 6.2 权限与文件

AndroidManifest 当前需要 `android.permission.INTERNET`。应用数据保存在私有目录，用户不应依赖文件管理器直接编辑 JSON。FileProvider 仅为未来受控文件分享预留；当前没有用户导出 UI。

### 6.3 构建验收

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend
npm run build
npm test
npm run android:sync

cd android
.\gradlew.bat assembleDebug
```

若最后一步因 Gradle 下载或 Android SDK 缺失失败，记录为环境阻塞；不得声称 APK 已验证。

---

## 7. 测试场景

| 场景 | 期望 |
|---|---|
| 未配置同步 | SyncPage 显示未配置，训练功能照常工作。 |
| 保存密码 | 本地 settings 保存 passwordRef，导出的远端 settings 清空 passwordRef。 |
| 首次同步 | 无 manifest 时创建目录和全部分片。 |
| 常规同步 | 先 pull/merge，再 tmp/MOVE 发布，lastSyncAt 更新。 |
| 有差异合并 | 产生 LWW 日志，页面显示冲突日志区域。 |
| Android WebDAV | PROPFIND/MOVE/MKCOL 走原生插件，不被 WebView 限制。 |
| 分片删除 | 本地不再有的训练月分片从远端删除，不删除静态分片。 |
| 动作详情元数据 | `primaryMuscleGroupIds`、`secondaryMuscleGroupIds` 与 `description` 随 `exercises.json` 同步；个人统计不写入远端 JSON。 |
| 主题/AI 规划字段 | 实现后验证 themeId 可同步且未知值可回退；apiKeyRef 永不进入远端 JSON、备份或日志。 |

当前自动测试位于 `src/sync/syncService.test.ts`。任何改变同步顺序、分片格式、密码字段或插件方法集合的修改，都必须增加相应测试并走查失败恢复路径。
