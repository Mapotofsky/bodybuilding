# Android 平台与凭据

本文定义 Android 原生能力、传输适配和本机凭据边界。远端文件格式、合并与同步失败语义见 [WebDAV 同步](WebDAV同步.md)；开发和设备验证见[开发与验证](../guides/开发与验证.md)，签名与安装升级见[发布与升级](../guides/发布与升级.md)。

## 平台边界

浏览器开发和 Android 包装共用业务代码。Android 使用 Capacitor Filesystem 保存应用私有目录中的 JSON 分片；本机 WebDAV URL、用户名、`passwordRef` 由 Preferences 保存，密码由独立 `SecretStore` 保护。页面和业务 service 不直接读取平台存储。应用数据不应依赖文件管理器直接编辑。

`frontend/capacitor.config.ts` 定义 Android `appId`、`webDir` 和 scheme；实际值从该配置读取，不在本文另存版本快照。`AndroidManifest.xml` 声明联网权限。Android 9 及以下保存分享图时使用受 `maxSdkVersion=28` 限制的旧版写存储权限；Android 10 及以上使用 MediaStore，不申请广泛存储权限。分享图只写入 `Pictures/IronLog`，不读写业务 JSON、Keystore 或 WebDAV 配置。

`SystemBars` 原生插件接收当前主题及路由推导的状态栏、系统导航区颜色和图标明暗。Android 15 及以上透明系统栏下，由宿主在系统栏区域绘制对应背景；WebView 内容和底部 Tab 保持原有安全区。键盘出现时以系统输入法导航区的可辨识度为先。

## 原生 WebDAV 传输

浏览器开发以 `fetch` 请求 WebDAV，受 CORS 和服务端方法支持限制。Android 的 GET、PUT、DELETE 走 `CapacitorHttp`；MKCOL、MOVE、PROPFIND 走 `WebDavHttp` 原生插件。插件位于 `frontend/android/app/src/main/java/app/ironlog/local/WebDavHttpPlugin.java`，基于 OkHttp，只允许 DELETE、GET、MKCOL、MOVE、PROPFIND、PUT 六种方法，并设置连接、读取和写入超时。`MainActivity` 在 `super.onCreate` 前注册插件；重命名或删除插件前须追踪 TypeScript 的 `registerPlugin("WebDavHttp")` 引用。

## SecretStore 与旧密码迁移

platform 层提供 `readSecret(ref)`、`writeSecret(ref, value)`、`removeSecret(ref)`。Android 插件在 Keystore 中创建或读取不可导出的 AES-256 密钥，以 `AES/GCM/NoPadding` 认证加密；每次写入产生新 IV。应用私有 SharedPreferences 中的密文记录含独立 `version=1`、IV 和 ciphertext。ref 先经 SHA-256 映射为存储键，不参与文件路径拼接。插件错误不得返回密钥、alias、IV、密文或密码正文。

Web 开发环境的 secret 存在 IndexedDB 独立键前缀下，仅用于本地开发兼容，不具备 Android Keystore 的安全等级。

Android 首次读取旧 Capacitor Preferences 密码时，先读新存储；不存在才读旧值。旧值存在时写入新存储并读回逐字确认，确认成功后才删除旧值。写入或校验失败保留旧值、`passwordRef`、端点和业务数据。新值已确认而旧值删除失败时返回新值，后续读取优先使用新值并再次尝试清理。密文损坏或 Keystore 密钥不可用返回 `SECRET_REENTRY_REQUIRED` 对应的可恢复错误，不能伪装为未配置 WebDAV；重新输入密码可覆盖损坏记录。

清除同步配置先幂等删除新安全存储项和旧 Preferences 项，再清除本机端点。凭据删除失败须提示重试，不误报成功；训练、动作、模板、资料、头像及远端业务数据不受清除操作影响。卸载、清除应用数据、换机或系统凭据变化后不承诺恢复，也不宣称硬件安全模块保护或端到端加密。

WebDAV 使用 Basic Authorization；当前 URL 校验不强制拒绝 HTTP。内部测试使用 HTTPS，用户应优先使用 HTTPS、专用目录和低权限专用账户。`url`、`username`、`passwordRef`、密码正文、密文、IV 和 Keystore 材料不得进入可同步 JSON、manifest、远端 backup 或日志；远端脱敏及本地引用保留的合并规则见 [WebDAV 同步](WebDAV同步.md)。

## 验证要点

涉及原生凭据时，验证新安装的写入、读取、覆盖、幂等删除和重复明文产生不同密文；涉及迁移时验证读旧、写新、读回、删旧及每个失败点的旧值保留；涉及传输时验证 Android 的 MKCOL、MOVE、PROPFIND 经原生插件。相关 instrumentation test 位于 `android/app/src/androidTest/java/app/ironlog/local/SecureSecretStoreInstrumentedTest.java`。按[开发与验证](../guides/开发与验证.md)选择 Web、AVD 或真机层级；`android:sync` 只证明资源同步，不代表 APK 或设备行为已验证。
