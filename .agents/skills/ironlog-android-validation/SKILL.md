---
name: ironlog-android-validation
description: 为 IronLog 的 Capacitor、Android 原生插件、WebView 行为、Android sync、Gradle/APK、AVD、系统权限、Keystore 或真机集成选择并执行安全验证；纯 Web 逻辑或普通文档修改不使用。
---

# IronLog Android 验证

## 事实源与范围

先读取 [本地运行指南](../../../docs/如何运行IronLog.md) 和 [P3 WebDAV 同步与 Android 平台](../../../docs/详细设计文档_P3_WebDAV同步与Android平台.md)。涉及签名、安装升级或交付产物时再读取 [部署指南](../../../docs/部署指南.md)。这些文档定义当前命令、applicationId、数据位置、插件、权限、版本和签名事实；本 Skill 只决定验证升级与安全门。

## 验证升级顺序

1. 先用 Web/本机的 core、service、DocumentStore mock、响应式布局或构建检查覆盖可观察行为。
2. 只有 Web 无法覆盖 Capacitor Filesystem、WebView、软键盘、安全区、系统返回或原生插件时，升级到隔离 AVD。
3. 只有厂商系统差异、真实相册、硬件或真实系统集成无法由 AVD 替代时，才使用测试真机。

不因“Android-first”机械运行全链路。每次升级都说明 Web/AVD 为什么不足，以及下一层要观察的结果。

## 命令门

- Web 资源或业务代码变化不自动触发 `android:sync`。
- Capacitor 配置、Android 集成、原生插件注册、打包 Web 资源或 Android 交付物实际变化时，运行 `npm run android:sync`；它只证明 build 与资源同步，不等于 APK 已编译。
- 需要验证 Android 编译、原生代码或 APK 时，在 `frontend/android` 运行目标明确的 Gradle 任务；普通 debug APK 使用 `assembleDebug`。
- instrumentation 只在相关原生行为变化且有可用 AVD/设备时运行 P3/运行指南指定的 `:app:` 任务。没有连接设备时，只能报告 test APK 构建结果。
- 正式签名、安装升级或发布检查使用部署指南的版本与 Keystore 规则，不把 debug 结果写成 release 结果。

## 设备与外部系统隔离

在 AVD、真机、账户或 WebDAV 上执行写入前，确认：

- 目标 serial 与设备类型明确，applicationId 不会命中日常安装和数据；
- 应用私有存储、Preferences、Keystore alias 与系统权限使用测试范围；
- 外部账户权限受限，WebDAV 使用 HTTPS 测试专用账户和隔离目录；
- 网络请求、相册或文件写入的目标和可清理产物明确；
- 不执行卸载、全量清除应用数据、删除正式密钥或清空正式远端目录。

若无法隔离共享标识或正式资源，停止可能破坏数据的验证。

## 备份、失败与清理

- 可能影响非空数据前，确认已有可验证备份、升级保留路径和失败后的恢复入口。
- 记录实际命令、设备/AVD、可观察结果、失败影响、产生的测试数据及定向清理方式。
- 清理只删除本次创建且已准确识别的测试应用数据、测试 secret、测试远端目录或系统产物；不扩大到相邻数据。
- 构建工具、SDK、Gradle 下载、设备连接或安全隔离不足时，保留现场并明确报告环境阻塞或“真机未验证”，不改业务代码绕过。

## 停止条件

- 最低足够层级已覆盖本次 Android 风险后停止，不为完整清单继续升级设备层级。
- 无法确认目标、备份、失败影响或回滚路径时，不执行真机、正式 Keystore、正式账户或正式 WebDAV 写入。
- 报告只陈述实际完成的 sync、构建、AVD 或真机结果。
- 本 Skill 不自动调用数据或文档 Skill；只有当前请求同时包含那些范围时才组合。
