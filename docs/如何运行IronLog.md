# IronLog 本地运行指南

> 适用版本：Android-first 本地单人版
> 本指南只描述当前运行路径：React/Vite/Capacitor。本版本不需要 Python、PostgreSQL、FastAPI、账号或后端服务。

---

## 1. 环境要求

| 场景 | 必需工具 | 建议版本 |
|---|---|---|
| Web 开发、构建和测试 | Node.js、npm、本机 Chrome | Node.js 20+、npm 10+、当前稳定版 Chrome |
| Android 同步/打开工程 | Android Studio、Android SDK、JDK | Android Studio 当前稳定版，JDK 17+ |
| 命令行 APK 构建 | 上述工具和可下载的 Gradle 分发包 | 与 `frontend/android` wrapper 一致 |
| WebDAV 同步 | 一个支持 Basic Authentication、PUT、MOVE、MKCOL、PROPFIND 的 WebDAV 服务 | 推荐 HTTPS |

不需要安装：Conda、Python、PostgreSQL、Docker、Alembic。

## 2. 首次安装与 Web 开发

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend
npm install
npm run dev
```

Vite 会输出本地地址，通常是 `http://localhost:5173/`。浏览器开发模式使用 IndexedDB 保存本地文档；刷新页面不会清空训练数据。

首次启动会自动创建：

- 本地 Profile 和 Settings。
- 当前默认动作库，包含农夫行走及其记录配置。
- schemaVersion 为 8 的 manifest。

### 2.1 隔离测试数据重置

`0.1.0-internal.2` 已建立兼容基线，已有本地与 WebDAV 快照必须按可能含用户数据处理。当前代码创建 v8 快照，并显式迁移 v5/v6/v7；v4 及更早和未来版本会明确拒绝，应用不会自动清理。正常升级不得使用本节步骤绕过 migration；完整兼容规则见 P2。

只有开发者已经确认目标是可丢弃的浏览器测试数据、Android Studio 模拟器或隔离 WebDAV 测试目录时，才可按下列步骤定向重置。默认动作目录由 `docs/data_import/candidates.md` 唯一生成；目录实施与验收见《默认动作库引入实施方案》。

- Web 开发：在浏览器开发者工具中进入 `Application -> Storage`，对当前 `localhost` 站点执行 `Clear site data`，清除 IndexedDB 后刷新页面。
- Android Studio 模拟器：卸载 IronLog，或在模拟器系统设置中进入 `Apps -> IronLog -> Storage -> Clear storage`。命令行清理前先用 `adb devices` 确认目标是模拟器，再显式执行 `adb -s emulator-<serial> shell pm clear app.ironlog.local`；不得对日常真机执行该命令。
- 如果旧测试数据已经同步到测试用 WebDAV 目录，清空本地数据前应确认不会被旧远端分片再次同步回来。精选动作目录验收使用全新或已定向清空的隔离测试目录，不复用日常远端目录。

## 3. 验证命令与选择

根据修改的可观察风险选择最低但足够的命令，先运行受影响范围的定向验证。只有 Android 集成、原生范围或 Android 交付物实际变化时才运行 `android:sync`；需要证明 APK 或原生代码可编译时再运行第 4 节的 Gradle 命令。以下是命令用途，不是每次修改都必须完整执行的固定流水线：

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend
npm run catalog:check
npm run build
npm test
npm run test:layout
npm run android:sync
```

含义：

| 命令 | 验证内容 |
|---|---|
| `npm run catalog:generate` | 联网读取固定上游 commit，核对 82 条有来源动作；5 条自编动作不生成 provenance；随后按 87 条显式记录配置重建已提交目录产物。 |
| `npm run catalog:check` | 完全离线按候选文档重建预期文本并检查已提交产物。 |
| `npm run build` | TypeScript 构建和 Vite 生产产物。 |
| `npm test` | 运行当前 Vitest 单元测试。 |
| `npm run test:layout` | 用临时 Chrome 配置验证 360px、412px 和横屏的动态视口、唯一主滚动区与底部 Tab 几何关系；包含从准备训练的具体动作按钮发起的模拟触摸上滑。不读写 Android 数据、Keystore 或 WebDAV。 |
| `npm run android:sync` | 同步版本元数据，先 build，再将 `dist/` 同步进 `android/` 工程；仅用于 Android 集成或交付范围。 |

Android 内部测试版本以 `frontend/release/version.json` 为权威。修改发布构建序号后，运行 `npm run release:sync` 生成 Android 属性文件，再以 `npm run release:check` 确认一致性；`npm run android:sync` 会自动执行这两个步骤。不要手工修改 Gradle 中的版本号。

`android:sync` 成功不等于 APK 已编译；它只验证 Web 构建与 Capacitor 资源同步。验收通过后停止，失败时只重跑相关范围。

## 4. Android 调试与 APK

### 4.1 同步并打开 Android Studio

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend
npm run android:sync
npm run android:open
```

Android Studio 首次打开后等待 Gradle Sync 完成。使用模拟器或真实设备运行 `app` 配置即可调试。

### 4.2 命令行构建 debug APK

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend\android
.\gradlew.bat assembleDebug
```

成功后 APK 通常位于：

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

若第一次构建停在 Gradle wrapper 下载，请先确认网络可访问 Gradle 分发地址，再判断为代码问题。不要通过删除 Android 工程或降级业务依赖来规避环境错误。

### 4.3 Android 数据位置

Android 版通过 Capacitor Filesystem 的 `Directory.Data` 保存 `ironlog-data/` JSON 文件。该目录是应用私有目录；卸载应用或清除应用数据会删除本地训练数据。启用 WebDAV 后先完成一次成功同步，再执行清除数据、换机或升级等破坏性操作。

### 4.4 Android 测试分级、动态视口与分享图

Web/本机自动测试可覆盖统计差值、动作类型展示、训练结束计时冻结、浏览器 PNG 下载，以及 360px/412px/横屏下根布局的动态视口、主滚动区与底部 Tab 几何关系，并从准备训练的具体动作按钮模拟触摸上滑：

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend
npm run test:layout
```

该测试会启动本地 Vite 和临时 Chrome 配置；不会写入 Android 应用数据、Keystore、WebDAV 或系统相册。它不能证明 Android WebView 的软键盘、手势导航或安全区域行为。

AVD 或真机应在 360px、412px、横屏分别检查：短页没有页面级滚动，长页只滚动主内容区，底部 Tab 始终可见且不遮住最后内容；在准备训练页从部位筛选下方的具体动作按钮开始上滑，确认主内容区能立即滚动；在计划创建或个人资料页聚焦底部输入框后，确认软键盘弹出时焦点、Tab 和主内容区仍可见、可滚动、可提交。此走查只使用本地测试数据；除非另行执行同步测试，不要配置或清除 WebDAV、Keystore 或应用数据。

记录方式改造后，优先在 Web 和 AVD 的 360px、412px、横竖屏检查动作库、详情和共享选择器：七种记录方式使用用户文案，重量口径、计数口径、成绩方向与上下文只在适用时显示；普通动作的“重量/次数”等字段及每侧动作的“每侧次数/每侧距离/每侧保持时间或用时”均可清空重输；农夫行走的“每手重量、距离、用时”三字段自适应换行且无横向溢出。未填写项不显示伪 0，来源信息不出现在任何页面。该走查不得加载图片、GIF、Media URL 或非中文 instructions。

测试分级：core、service、DocumentStore、WebDAV mock 和响应式布局优先由 Web/本机自动测试覆盖；WebView、Capacitor Filesystem、软键盘和原生插件行为在 Android Studio AVD 验证；只有厂商系统差异、真实相册或硬件集成无法由 AVD 覆盖时才使用测试真机。本轮记录方式改造不得要求在日常真机清数据、凭据或正式 WebDAV 目录；未执行新构建真机复测时应明确报告“真机未验证”。

Android 系统返回必须同时核对导航栏返回键和左/右边缘返回手势：从动作库进入动作详情后返回，应回到原筛选条件下的动作库；训练编辑、计划编辑、模板编辑和工具详情应按路由层级返回父页面；确认弹窗打开时应先关闭弹窗；只有位于顶级 Tab 且没有应用内历史时才退出到系统桌面。该测试只改变当前路由和弹窗状态，不写训练数据、凭据、WebDAV 或相册；退出后重新启动应用即可恢复测试。

Android 原生插件构建使用：

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend\android
.\gradlew.bat :app:assembleDebugAndroidTest
.\gradlew.bat :app:connectedDebugAndroidTest
```

只运行 `:app:` 任务，避免项目级 `assembleDebugAndroidTest` 触发 Capacitor Cordova 插件模块的 Kotlin 重复类问题。没有连接设备时只能完成 test APK 构建，不能写成真机通过。

当前 `0.1.0-internal.2` 候选已在 Android 16（API 36）AVD 运行 `:app:connectedDebugAndroidTest`，4 项 instrumentation 全部通过。测试覆盖 Android Context 包名以及 Keystore 新凭据、旧凭据迁移、损坏后重新输入和清除配置路径；测试使用隔离的测试键并定向清理，不会清除应用业务数据或 WebDAV 目录。

该候选还在同一 AVD 通过实体返回事件和边缘滑动事件完成“动作库筛选 → 动作详情 → 返回动作库”验证，筛选条件得到保留；动作库处无应用内历史时再次返回会退出到系统桌面。

该候选同时已在目标真机使用 HTTPS 测试专用 WebDAV 完成设置保存、数据读取、应用重启后同步和远端脱敏检查；远端 JSON、manifest、backup 与日志未发现密码、密文、端点、用户名或 `passwordRef`。后续版本仍应使用隔离目录重复该检查，不能沿用本次结果代替新构建验收。

分享图真机测试会在系统相册的 `Pictures/IronLog` 新增一张 PNG，不会写入训练 JSON、WebDAV、Keystore 或同步配置。测试后可只删除该图片；不要清除应用数据、正式密钥或 WebDAV 目录。Android 9 及以下首次保存会请求旧版存储权限，Android 10 及以上通过 MediaStore 保存。

## 5. 使用流程

1. 打开首页，选择“开始训练”或从计划/日历发起训练；日历入口是选中日期后创建训练，不表示 CalendarPage 会渲染计划条目。若上次训练未结束，先选择继续草稿或结束草稿后新建。
2. 选择动作，按该动作的记录方式填写适用字段并记录休息时间；例如农夫行走可填写每手重量以及距离或用时，完成每组后会立即写入本地数据。
3. 结束训练后补充感受和备注，进入训练详情。
4. 在“计划”中创建计划与模板；按模板训练时动作列表只显示模板中的动作。
5. 在“我的”进入个人资料、应用设置、身体数据、时间段备注和小工具；身高、体重等身体数据在“身体数据”中记录。
6. 在“我的 -> 数据同步与备份”配置 WebDAV，可测试连接并手动同步。

未配置 WebDAV 时，前四步仍可离线运行。

## 6. WebDAV 配置要求

配置页面需要 URL、用户名和密码。应用会在所填 URL 下使用 `ironlog-data/` 目录，请为 IronLog 使用独立目录或独立 WebDAV 账户。

Android 新密码由 Keystore 中不可导出的 AES 密钥使用 AES-GCM 加密，密文保存在应用私有存储。升级用户的旧 Preferences 密码会在首次使用时先写入新存储、读回确认，再删除旧值；迁移失败不会清空同步端点或训练数据。若提示安全凭据无法读取，请在同步页重新输入密码，新值会覆盖损坏记录。清除同步配置会同时清理新旧凭据。

浏览器开发环境把密码保存在 IndexedDB 的独立 secret 键中，只适合本地开发，不具备 Android Keystore 的安全等级。当前应用不会技术上拒绝 HTTP URL；内部测试应使用 HTTPS，日常使用强烈建议 HTTPS 和低权限专用账户。

当前同步协议需要服务端支持：

- `GET`、`PUT`、`DELETE`
- `MKCOL`、`MOVE`、`PROPFIND`
- Basic Authorization

测试连接会创建/确认远端同步目录并执行 PROPFIND。同步前远端已有数据会写入 `backups/`，但当前没有自动清理策略。

## 7. 尚未可用的规划能力

以下能力尚未实现；当前没有对应的页面、环境变量、命令、provider 或 API 配置：

- AI provider、模型、API key、动作问答、训练分析、计划候选导入和联网资料检索。

主题选择和语义色彩映射已经实现。源码中保留的 emerald/slate Tailwind 工具类通过全局兼容变量解析为当前主题角色。当前候选已通过 360px、412px 与横屏自动布局测试，并在 Android 16（API 36）AVD 的 411px WebView 逐套核对 5 套主题、主内容滚动区、底部 Tab、动作按钮起始拖动和分享预览；软键盘及厂商系统差异仍按上文人工步骤在目标设备确认。

请不要将 API key 写入 settings.json、WebDAV、项目文件、日志或地址栏。未来 AI 未配置时，离线训练、模板、动作库/动作详情与 WebDAV 必须保持可用。

## 8. 常见问题

### Q: 浏览器刷新后数据不见了

检查是否处于隐私浏览模式、浏览器是否清除了站点数据，或是否手动删除了 IndexedDB。当前没有面向用户的数据导入/导出 UI；重要数据请先同步到 WebDAV。

### Q: Android 端能训练，但 WebDAV 测试连接失败

依次检查 URL 是否为 WebDAV 根目录、账号是否有创建目录权限、服务端是否支持 MKCOL/PROPFIND/MOVE、是否使用 HTTPS。错误状态会显示在同步页面。

### Q: WebDAV 同步后出现“冲突日志”

当前版本按 `updatedAt` 使用 last-write-wins。日志表示同一 ID 的本地/远端数据时间不同，应用选择了较新的文档；它不是可交互的合并界面。保留远端 `backups/` 后再人工检查。

### Q: `npm run android:sync` 找不到 `dist/`

该命令会先执行 `npm run build`。若 build 失败，请先修复 TypeScript/Vite 错误，再重新运行。

### Q: 为什么不需要启动后端或数据库

当前单人版的数据保存在浏览器或 Android 应用本地，不再请求业务后端 API。
