# IronLog 项目控制面

## 项目定位

- IronLog 是开源、Android-first、本地优先的单人训练日志应用。
- 业务数据保存为本地 JSON 文档分片；WebDAV 只承担手动同步与备份，不是数据库。
- 当前产品不需要账号、业务服务端、JWT、FastAPI 或 PostgreSQL。
- 未来平台扩展不得改变当前本地真源和离线可用性。

## 核心架构不变量

- 页面经 `pages -> services -> repositories -> DocumentStore` 访问数据，不直接访问实际存储。
- `src/core` 保持纯 TypeScript，不依赖 React、DOM、Capacitor、WebDAV 或具体存储实现。
- repository 隔离 IndexedDB、Capacitor Filesystem、WebDAV 及未来适配器；页面和业务 service 不判断实际数据来源。
- WebDAV URL、用户名、`passwordRef`、密码正文及其他本机端点或秘密配置不得进入 `settings.json`、manifest、同步分片、远端 backup 或日志。
- 用户可见的统计、单位换算和领域语义使用 core/service 的单一权威实现，页面不另建并行解释。

## 高风险保护

- 已有本地和 WebDAV 快照一律按可能含用户数据处理；不得静默清空、整体覆盖、断开引用或删除正式数据。
- 持久化记录的删除、合并或重定向必须先解析受影响引用，并保留既有历史事实。
- 真机、正式 Keystore、正式账户和正式 WebDAV 目录不得作为可任意清理的测试环境。
- 清除同步配置只能清除本机端点和对应 secret，不得删除训练、动作、模板、资料、资源或远端业务数据。
- 用户可见文案围绕用户任务表达，不泄漏设计文档、模块名、schema、payload 或内部验收语言。

## 工作流路由

### 数据演进

出现以下任一范围时，读取 [P2 本地文档存储与数据迁移](docs/详细设计文档_P2_本地文档存储与数据迁移.md)；涉及远端格式或合并时同时读取 [P3 WebDAV 同步与 Android 平台](docs/详细设计文档_P3_WebDAV同步与Android平台.md)，并使用 [ironlog-data-evolution](.agents/skills/ironlog-data-evolution/SKILL.md)：

- 持久化字段、schema、默认数据、内置目录或 migration；
- JSON shard、manifest、WebDAV 序列化；
- 持久化记录的删除、合并、替代或重定向。

### Android 验证

涉及 Capacitor、Android 原生插件、WebView 特有行为、APK、Gradle、AVD、系统权限、Keystore 或真机时，读取 [本地运行指南](docs/如何运行IronLog.md)、[P3](docs/详细设计文档_P3_WebDAV同步与Android平台.md)；涉及安装、签名或发布产物时再读取 [部署指南](docs/部署指南.md)，并使用 [ironlog-android-validation](.agents/skills/ironlog-android-validation/SKILL.md)。

### 文档治理

修改概要设计、P0–P7 详细设计、README、运行、部署、技术路线或文档职责时，使用 [ironlog-doc-governance](.agents/skills/ironlog-doc-governance/SKILL.md)。文档权威职责以 [概要设计文档](docs/概要设计文档.md) 的文档职责表为准。

### 普通任务

- 普通前端或业务修改只读取当前功能直接相关的 P0–P7 文档，不预加载无关 Skill 或全部设计文档。
- 删除或重命名符号前搜索受影响引用；删除持久化字段或记录还必须走数据演进路由。
- 跨域任务只组合当前请求实际需要的 Skill，不因一个 Skill 被加载而自动加载其他 Skill。

## 验证边界

- 根据可观察风险选择最低但足够的验证层级，先运行受影响范围的定向验证。
- 只有稳定可观察契约、兼容性、安全不变量或可复现缺陷需要新的失败信号时才新增测试；优先扩展最近的现有测试。
- 实现细节只有在本身构成互操作或安全契约时才直接断言；布局、滚动和真实交互按可观察行为验证。
- 最终全量验证最多一次；失败后只重跑相关范围。
- Android sync/build 只在 Android 集成、原生范围或 Android 交付物实际变化时运行。
- 纯文档和控制面修改执行内容核对、Skill 结构检查、中文抽查和 `git diff --check`，不运行产品构建或测试。
- 验收标准通过后停止；相邻问题另行报告，不扩展当前范围。

## 文件编辑与交付

- 保留工作树中的无关改动，不回滚或混入当前任务。
- 修改中文源码或文档使用 `apply_patch`；多文件编辑后抽查中文内容和链接。
- 最终报告实际修改、实际验证、限制和未决项；不得把未执行的设备、构建、发布或外部操作写成已完成。
