# IronLog 本地运行指南

> 适用版本：Android-first 本地单人版
> 本指南只描述当前运行路径：React/Vite/Capacitor。本版本不需要 Python、PostgreSQL、FastAPI、账号或后端服务。

---

## 1. 环境要求

| 场景 | 必需工具 | 建议版本 |
|---|---|---|
| Web 开发、构建和测试 | Node.js、npm | Node.js 20+、npm 10+ |
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
- 默认动作库。
- schemaVersion 为 1 的 manifest。

## 3. 日常验证命令

在提交或修改核心逻辑前执行：

```powershell
cd D:\workspaces\vscodeWorkspace\project\bodybuilding\ironlog\frontend
npm run build
npm test
npm run android:sync
```

含义：

| 命令 | 验证内容 |
|---|---|
| `npm run build` | TypeScript 构建和 Vite 生产产物。 |
| `npm test` | 运行当前 Vitest 单元测试。 |
| `npm run android:sync` | 先 build，再将 `dist/` 同步进 `android/` 工程。 |

`android:sync` 成功不等于 APK 已编译；它只验证 Capacitor 资源同步。

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

## 5. 使用流程

1. 打开首页，选择“开始训练”或从计划/日历发起训练；日历入口是选中日期后创建训练，不表示 CalendarPage 会渲染计划条目。若上次训练未结束，先选择继续草稿或结束草稿后新建。
2. 选择动作，记录重量、次数和休息时间；完成每组后会立即写入本地数据。
3. 结束训练后补充感受和备注，进入训练详情。
4. 在“计划”中创建计划与模板；按模板训练时动作列表只显示模板中的动作。
5. 在“我的 -> 数据同步与备份”配置 WebDAV，可测试连接并手动同步。

未配置 WebDAV 时，前四步仍可离线运行。

## 6. WebDAV 配置要求

配置页面需要 URL、用户名和密码。应用会在所填 URL 下使用 `ironlog-data/` 目录，请为 IronLog 使用独立目录或独立 WebDAV 账户。

当前同步协议需要服务端支持：

- `GET`、`PUT`、`DELETE`
- `MKCOL`、`MOVE`、`PROPFIND`
- Basic Authorization

测试连接会创建/确认远端同步目录并执行 PROPFIND。同步前远端已有数据会写入 `backups/`，但当前没有自动清理策略。

## 7. 尚未可用的规划能力

以下能力尚未实现；当前没有对应的页面、环境变量、命令、provider 或 API 配置：

- 默认主题外的 4 套完整主题与主题选择。
- AI provider、模型、API key、动作问答、训练分析、计划候选导入和联网资料检索。

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
