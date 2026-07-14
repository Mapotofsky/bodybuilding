# IronLog 本地单人版

IronLog 已重构为 Android-first、本地优先的单人训练日志应用。当前运行路径是 `frontend` 下的 React/Vite/Capacitor 应用；旧 FastAPI 后端已归档到 `legacy/backend`，不再作为单人版运行依赖。

## 当前状态与路线图

当前已实现离线训练、计划/模板、训练记录月历与统计、动作库/动作详情、训练详情 PNG 分享图、本地头像资料、5 套主题及语义色彩映射和 WebDAV 手动同步。Android 保存分享图时写入系统相册的 `Pictures/IronLog`，浏览器开发模式继续使用下载。HomePage 可展示今日计划和补训建议；CalendarPage 当前仅显示实际训练记录，不渲染计划条目。

以下 AI 能力均为规划中，不能按当前功能描述：AI provider/API key 配置、AI 问答/训练分析、联网 agent 和 AI 计划候选导入。主题语义映射已完成；当前内部候选已通过 360px、412px 与横屏自动布局测试，并在 Android 16（API 36）AVD 的 411px WebView 逐套核对 5 套主题、主内容滚动、底部 Tab 和分享预览。目标真机已完成功能复测及 HTTPS WebDAV 保存、读取、重启后同步与远端脱敏检查。

## 文档索引

根目录文档是当前版本的规范来源：

- [概要设计文档](概要设计文档.md)：范围、模块边界、数据模型和验收基线。
- [技术路线分析](技术路线分析.md)：技术决策、替代路线和已知风险。
- [本地运行指南](如何运行IronLog.md)：开发、测试、Android 调试与 WebDAV 配置。
- [发布与交付指南](部署指南.md)：APK、静态 Web、版本兼容与发布检查。
- [精选动作候选](candidates.md)：默认动作候选、上游追溯、策展映射和人工纠错的唯一权威。
- [默认动作库引入实施方案](默认动作库引入实施方案.md)：下一轮整体替换、字段链路、生成方式、测试和验收步骤。
- [P0 核心训练](详细设计文档_P0_核心训练.md)、[P1 计划与日历](详细设计文档_P1_计划与动作库.md)、[P2 本地文档存储](详细设计文档_P2_本地文档存储与数据迁移.md)、[P3 WebDAV 与 Android](详细设计文档_P3_WebDAV同步与Android平台.md)：实现级契约。
- [P4 主题系统与 UI 导航](详细设计文档_P4_主题系统与UI导航.md)：主题选择、语义 token/兼容色彩映射与五项底部导航已实现；当前候选的自动布局与 AVD 视觉验收结果见该文档。
- [P5 AI 智能体与安全](详细设计文档_P5_AI智能体与安全.md)：已批准路线图的详细设计；当前未实现。

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
npm run test:layout
```

`npm run build` 会执行 TypeScript 检查并生成 Vite 产物到 `dist/`。`npm test` 会运行迁移、文档分片存储和 WebDAV 同步的单元测试；`npm run test:layout` 使用本机 Chrome 验证 360px、412px 和横屏下的动态视口、主内容滚动区与底部导航几何关系，并从准备训练的具体动作按钮模拟触摸上滑。它不能替代 Android WebView、软键盘和系统安全区域的验收。

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
- `appName`: `IronLog录铁`

Android 内部测试版本由 [`frontend/release/version.json`](ironlog/frontend/release/version.json) 统一定义。修改构建序号后执行 `npm run release:sync` 和 `npm run release:check`；`npm run android:sync` 会自动同步并校验版本元数据。
- `webDir`: `dist`
- 已接入插件：App、Filesystem、Preferences，以及原生 `WebDavHttp`、`SecretStore` 和 `ImageSaver` 插件；App 将 Android 系统返回键和边缘返回手势接入应用内路由，Preferences 只保存本机端点配置及待迁移旧密码，不再承载新写入的 Android 密码正文

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

训练按月分片，应用启动时会归一化当前本地分片；历史 FastAPI/PostgreSQL 数据和旧训练索引文件不在兼容范围。项目尚未建立首个内部测试兼容基线且没有真实用户数据，经批准的默认动作和非关键字段变更直接替换开发测试快照，不为废弃测试格式增加 migration。数据模型、开发期重置边界、tombstone 和训练聚合规则见 P0、P1、P2。

## WebDAV 同步

入口：应用内 `我的 -> 数据同步与备份`。

使用步骤：

1. 填写 WebDAV URL、用户名和密码。
2. 点击保存设置。
3. 点击测试连接。
4. 点击手动同步。

WebDAV 只作为远端文件同步/备份，不是数据库；当前采用手动同步和 last-write-wins，并保留远端备份。Android 密码由 Keystore 中不可导出的应用密钥使用 AES-GCM 加密，密文保存在应用私有存储；旧 Preferences 密码在首次读取时完成“写新、读回确认、删旧”迁移。浏览器开发环境仍把 secret 放在 IndexedDB 独立键下，安全等级低于 Android。密码、密文和解密材料不会进入 JSON 或远端 WebDAV。同步协议、冲突限制和 Android 传输细节见 P3。

WebDAV 未配置时，应用仍可完全离线本地使用。

## 目录说明

```text
ironlog/
  frontend/                 # React + Vite + Capacitor 应用
    android/                # Capacitor Android 工程
    src/
      core/                 # 领域模型、schema migration、测试
      repositories/         # 本地 JSON 仓储
      platform/             # IndexedDB / Capacitor Filesystem / Android Keystore secret 适配
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
npm run test:layout
npm run android:sync
```

当前 Android APK 命令行构建依赖 Gradle 分发包下载。如果本机网络无法访问 `services.gradle.org`，`.\gradlew.bat assembleDebug` 会在下载 Gradle wrapper 时失败；Android 工程和 Capacitor 同步链路本身已就绪。

## 当前限制

- WebDAV 为手动备份同步，使用 last-write-wins，并非实时无冲突协作。
- 当前没有用户可操作的数据导入/导出或远端备份恢复 UI。
- 当前主题选择和全局语义色彩映射已可用；保留的 `emerald-*`、`slate-*` 类由 Tailwind 主题变量映射到当前主题角色，不作为未迁移残留。当前没有 AI 配置、AI 问答、联网检索或 AI 计划导入。AI 未配置时，现有离线训练、模板、动作库/动作详情和 WebDAV 能力不受影响。
- 卸载 Android 应用、清除应用数据或清除浏览器站点数据会删除本地副本；重要数据应先完成一次成功的 WebDAV 同步。
