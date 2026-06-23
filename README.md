# IronLog 本地单人版

IronLog 已重构为 Android-first、本地优先的单人训练日志应用。当前运行路径是 `frontend` 下的 React/Vite/Capacitor 应用；旧 FastAPI 后端已归档到 `legacy/backend`，不再作为单人版运行依赖。

## 文档索引

根目录文档是当前版本的规范来源：

- [概要设计文档](概要设计文档.md)：范围、模块边界、数据模型和验收基线。
- [技术路线分析](技术路线分析.md)：技术决策、替代路线和已知风险。
- [本地运行指南](如何运行IronLog.md)：开发、测试、Android 调试与 WebDAV 配置。
- [发布与交付指南](部署指南.md)：APK、静态 Web、版本兼容与发布检查。
- [P0 核心训练](详细设计文档_P0_核心训练.md)、[P1 计划与日历](详细设计文档_P1_计划与动作库.md)、[P2 本地文档存储](详细设计文档_P2_本地文档存储与数据迁移.md)、[P3 WebDAV 与 Android](详细设计文档_P3_WebDAV同步与Android平台.md)：实现级契约。

## 本地运行

```bash
cd frontend
npm install
npm run dev
```

应用不需要服务器、数据库、登录、JWT 或 PostgreSQL。

## 构建 Web 资源

```bash
cd frontend
npm run build
npm test
```

`npm run build` 会执行 TypeScript 检查并生成 Vite 产物到 `dist/`。`npm test` 会运行迁移、文档分片存储和 WebDAV 同步的单元测试。

## Android

同步 Web 产物到 Android 工程：

```bash
cd frontend
npm run android:sync
```

用 Android Studio 打开工程：

```bash
cd frontend
npm run android:open
```

命令行构建 debug APK：

```powershell
cd frontend/android
.\gradlew.bat assembleDebug
```

Capacitor 配置：

- `appId`: `app.ironlog.local`
- `appName`: `IronLog`
- `webDir`: `dist`
- 已接入插件：Filesystem、Preferences，以及用于 WebDAV 非标准 HTTP 方法的原生 `WebDavHttp` 插件

## 本地数据格式

应用使用文档型 JSON 分片，而不是一个巨大的 `ironlog.json`：

```text
ironlog-data/
  manifest.json
  profile.json
  settings.json
  exercises.json
  templates.json
  workouts/
    2026-06.json
    2026-07.json
```

训练数据的唯一真源是 `workouts/YYYY-MM.json`。每个月文件保存该月的 `WorkoutDoc[]`，包括 tombstone；`DataSnapshot.workouts` 仅在内存中聚合，绝不会再持久化为单一训练索引文件。`manifest.json` 的 `shards` 会列出全部静态文件和实际存在的训练月分片。

现有浏览器 IndexedDB、Android 模拟器或测试 App 中的当前分片数据会在启动时经 `migrateSnapshot` 归一化，并增量补齐缺失的默认动作和新增字段，不应因常规字段演进而清除。历史 FastAPI/PostgreSQL 数据和旧的单一训练索引文件不在兼容范围；只有持有这两类旧数据时才需要先导出或清除后重新开始。

所有领域 ID 都是 string（新建用户记录通常由 `crypto.randomUUID()` 生成；内置和本地单例使用稳定 string ID）。每条文档包含：

- `createdAt`
- `updatedAt`
- `deletedAt`
- `schemaVersion`

删除使用 tombstone：`deletedAt` 不为 `null` 表示已删除，不立即物理删除。

`WorkoutDoc` 是聚合文档，内部保存 exercises 和 sets，包括 `restSeconds`。每个训练动作还保存 `exerciseType` 快照，确保动作被替代或改类型后历史训练仍按记录时的类型解释。未结束训练（`endTime=null`）会作为草稿在下次进入新建训练页时提供继续或结束后新建的选择。这种结构可以自然映射到未来 MongoDB/CloudBase collections，不需要复刻 SQL join table。

## WebDAV 同步

入口：应用内 `我的 -> 数据同步与备份`。

使用步骤：

1. 填写 WebDAV URL、用户名和密码。
2. 点击保存设置。
3. 点击测试连接。
4. 点击手动同步。

同步设计原则：

- WebDAV 只作为远端文件系统，不作为数据库。
- 远端以配置 URL 下的 `ironlog-data/` 作为专属同步根目录，避免与用户其他 WebDAV 文件混放。
- 同步会先依据远端 `manifest.json` 拉取静态文件和训练月分片，再与本地数据合并。
- 合并策略第一版使用 last-write-wins，并记录冲突日志。
- 上传时先写 `.tmp-*` 临时文件，再用 `MOVE` 发布为正式文件，避免半写入。
- 上传前会把远端已有分片备份到 `backups/`。
- Android 端通过原生 OkHttp 通道执行 `MKCOL`、`MOVE` 和 `PROPFIND`，避免 WebView 对这些 WebDAV 方法的兼容性限制；`GET`、`PUT`、`DELETE` 继续使用 Capacitor HTTP。
- 密码不会写入 JSON 数据文件或同步到 WebDAV；当前 Android 通过 Capacitor Preferences、浏览器开发通过 IndexedDB 的独立 key 保存。它们与 JSON 分片隔离，但当前不是 IronLog 实现的硬件级加密凭据库；远端 `settings.json` 的 `passwordRef` 和 `lastSyncAt` 始终为 `null`。

WebDAV 未配置时，应用仍可完全离线本地使用。

## 目录说明

```text
ironlog/
  frontend/                 # React + Vite + Capacitor 应用
    android/                # Capacitor Android 工程
    src/
      core/                 # 领域模型、schema migration、测试
      repositories/         # 本地 JSON 仓储
      platform/             # IndexedDB / Capacitor Filesystem / Preferences 适配
      services/             # 页面稳定调用面，内部转到本地仓储
      sync/                 # WebDAV client 和同步服务
  legacy/
    backend/                # 旧 FastAPI/PostgreSQL 后端归档
```

## 验证命令

```bash
cd frontend
npm run build
npm test
npm run android:sync
```

当前 Android APK 命令行构建依赖 Gradle 分发包下载。如果本机网络无法访问 `services.gradle.org`，`.\gradlew.bat assembleDebug` 会在下载 Gradle wrapper 时失败；Android 工程和 Capacitor 同步链路本身已就绪。

## 当前限制

- WebDAV 为手动备份同步，使用 last-write-wins，并非实时无冲突协作。
- 当前没有用户可操作的数据导入/导出或远端备份恢复 UI。
- 卸载 Android 应用、清除应用数据或清除浏览器站点数据会删除本地副本；重要数据应先完成一次成功的 WebDAV 同步。
