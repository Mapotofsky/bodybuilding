# 如何运行 IronLog

> 当前版本：本地单人版，不需要后端和数据库  
> 最后更新：2026-06-11

## 1. 环境要求

基础运行：

- Node.js
- npm

Android 构建：

- JDK
- Android Studio 或 Android SDK
- 可访问 Gradle wrapper 分发包下载地址

不再需要：

- Python
- FastAPI
- PostgreSQL
- Alembic
- Redis
- Nginx
- 云服务器

## 2. 安装依赖

```bash
cd ironlog/frontend
npm install
```

## 3. Web 开发模式

```bash
cd ironlog/frontend
npm run dev
```

打开 Vite 输出的本地地址即可。

Web 开发模式下，数据保存到 IndexedDB。无需启动任何服务。

## 4. 构建 Web 产物

```bash
cd ironlog/frontend
npm run build
```

输出目录：

```text
ironlog/frontend/dist/
```

## 5. 运行测试

```bash
cd ironlog/frontend
npm test
```

当前测试覆盖 core schema migration 的最小路径。

## 6. 同步到 Android 工程

```bash
cd ironlog/frontend
npm run android:sync
```

该命令会：

1. 执行 `npm run build`。
2. 将 `dist/` 复制到 Android assets。
3. 同步 Capacitor 插件。

## 7. 打开 Android 工程

```bash
cd ironlog/frontend
npm run android:open
```

使用 Android Studio 构建、安装、调试。

## 8. 命令行构建 APK

```bash
cd ironlog/frontend/android
./gradlew assembleDebug
```

Windows PowerShell 可使用：

```powershell
.\gradlew.bat assembleDebug
```

如果首次运行时无法下载 Gradle：

```text
Downloading https://services.gradle.org/distributions/gradle-*.zip
java.net.ConnectException: Connection refused
```

说明当前网络无法访问 Gradle 分发包，需要配置网络、代理或手动准备 Gradle 缓存。

## 9. 本地数据位置

Web 开发：

- IndexedDB 数据库：`ironlog-local`

Android：

- Capacitor Filesystem 的应用 Data 目录。
- 逻辑目录：`ironlog-data/`

数据分片：

```text
manifest.json
profile.json
settings.json
exercises.json
templates.json
workouts/index.json
workouts/YYYY-MM.json
```

## 10. WebDAV 同步

入口：

```text
我的 -> 数据同步与备份
```

步骤：

1. 填写 WebDAV URL。
2. 填写用户名。
3. 填写密码。
4. 保存设置。
5. 测试连接。
6. 手动同步。

WebDAV 未配置时，应用仍可完全本地使用。
