# IronLog AI 开发行为规则

> 最后更新：2026-07-14（Android-first 本地单人版）

---

## 元规则（最高优先级）

### M1. 数据链路必须端到端验证

修改涉及训练、动作、计划、模板、资料、设置、同步字段时，必须追踪完整链路：

```text
页面 state -> service payload -> core doc type -> repository -> DocumentStore -> IndexedDB/Capacitor Filesystem -> 读取/响应映射
```

同步相关字段还必须追踪：

```text
settings/profile/doc -> SyncService -> WebDavClient -> JSON shard -> remote backup/tmp/MOVE
```

### M2. 删除符号前必须全文搜索所有引用

删除任何 import、函数、变量、类型、路由前，必须全文搜索引用，确认不会破坏运行路径。

### M3. 用户明确措辞优先于自我推断

用户说“过滤/仅显示/隐藏”时，必须按字面语义实现。

- “仅显示 X” = `.filter()` 不渲染非 X。
- “优先显示 X” = `.sort()` 仍渲染全部。
- “高亮 X” = 全部渲染但视觉区分。

### M4. 多入口功能必须枚举所有路径后再编码

例如 WorkoutCreatePage 的模板入口有两条：

1. URL 参数 `?template_id=X`。
2. 页面内计划/模板选择器。

任何模板过滤修改必须同时覆盖两条路径。

### M5. 不破坏存量功能

涉及 `frontend` 源码、测试、构建配置、依赖或 Android 工程的修改，完成后必须至少验证：

- `npm run build`
- `npm test`
- `npm run android:sync`
- 关键 grep 零残留

纯文档修改不运行上述构建链。应改为核对文档所述代码事实、内部链接与中文内容，并执行 `git diff --check`。

### M6. 禁止使用 Shell 命令修改含中文源文件/文档

本项目运行于 Windows，禁止使用 PowerShell 字符串替换批量改中文文件，避免编码损坏。

允许：

- `Get-Content` 读取。
- `rg` / `Select-String` 搜索。
- `apply_patch` 精确编辑。

禁止：

- `Get-Content -Raw | Set-Content`
- PowerShell `-replace` 写回中文文件。
- shell 循环批量替换中文源码/文档。

### M7. 批量修改后必须抽查内容再 build

多文件修改后，必须抽查关键文件内容，确认中文正常，再执行 build/test。

---

## 当前项目战略

IronLog 当前分支目标：

- 开源单人版。
- Android-first。
- 本地优先。
- 不租服务器。
- 不需要账号、登录、JWT、FastAPI、PostgreSQL。
- 训练数据保存为 JSON 文档分片。
- WebDAV 只作为文件同步/备份层，不作为数据库。
- 数据模型未来可映射到微信小程序 CloudBase/MongoDB。

---

## 架构规则

### A1. 页面不得直接访问存储

页面只能调用 `src/services/*`。

正确路径：

```text
pages -> services -> repositories -> platform DocumentStore
```

### A2. core 必须保持纯 TypeScript

`src/core` 不得依赖：

- React
- DOM
- Capacitor
- WebDAV
- IndexedDB

core 可以包含：

- 文档类型。
- schema migration。
- 默认数据。
- 统计纯函数。
- 日历调度纯函数。
- 导入导出纯函数。

### A3. Repository 隔离数据来源

页面和业务 service 不应知道数据来自：

- IndexedDB
- Capacitor Filesystem
- WebDAV
- 未来 CloudBase

### A4. WebDAV 不是数据库

WebDAV 只能被当作远端文件系统。

同步流程必须遵守：

1. pull remote manifest。
2. 拉取变更分片。
3. merge。
4. 写本地。
5. 上传 `.tmp-*`。
6. `MOVE` 到正式文件。
7. 上传前写 `backups/`。

不得把 WebDAV 当作实时查询数据库。

### A5. WebDAV 端点配置不得写入同步 JSON

WebDAV `url`、`username`、`passwordRef` 和密码明文都是本机-only 同步端点配置，不得进入 `settings.json`、manifest、远端 JSON 分片或 backup。

WebDAV 密码只能通过平台 secret/Preferences 或明确隔离的 secret 存储保存。清除同步配置只清除本机端点配置和对应 secret，不删除训练、动作、模板、资料或头像资源。

---

## 数据模型规则

### D1. 所有领域 id 使用 string

禁止新增自增 number id。

适用对象：

- ExerciseDoc
- TrainingPlanDoc
- TemplateDoc
- WorkoutDoc
- ProfileDoc
- SettingsDoc

### D2. 所有文档必须有元字段

每条可持久化文档必须包含：

- `createdAt`
- `updatedAt`
- `deletedAt`
- `schemaVersion`

### D3. 删除使用 tombstone

默认删除逻辑：

```text
deletedAt = now
```

默认列表、日历、统计必须过滤 tombstone。

### D4. WorkoutDoc 是聚合文档

WorkoutDoc 内部保存 exercises 和 sets。

不得恢复 SQL 风格的：

- workout_exercises 表模型。
- workout_sets 表模型。

### D5. schemaVersion 从 1 开始

- 首个对外或内部测试兼容基线建立前，经用户确认仅有可丢弃开发数据时，字段和默认数据可以直接替换当前 schema、默认值与测试 fixture，并按运行指南清理测试存储；不得为已经放弃的测试格式编写兼容 migration。
- 兼容基线建立后，新增或变更持久化字段必须进入 migration，不能只依赖页面默认值。

### D6. 受限字段必须在提交与 service 层校验

页面可用 string 保留可清空、可重输的临时输入；提交时再转换。

- 不得用 `Number(value) || fallback` 回填空值。
- 不得只依赖 HTML `min`/`max`；service 写入前必须校验类型与范围。
- 同一校验与归一化路径必须覆盖 create、update、copy、自动保存等所有写入口；页面和 repository 不得绕过。

### D7. 开发期直接替换，兼容基线后增量演进

- 当前项目尚未发布内部测试版且没有真实用户数据。经用户明确批准的默认数据、测试数据和非关键字段调整应直接替换，不为旧测试动作、旧默认目录或废弃字段增加 migration、redirect、兼容分支或增量合并逻辑。
- 直接替换必须同步更新当前 schema、默认数据、fixture、字段契约和测试；验证前按运行指南清理浏览器、Android 虚拟机及隔离 WebDAV 目录中的旧测试数据。
- 首个兼容基线建立后，非空用户文档才适用稳定 ID 增量补齐、读取边界迁移、旧字段保留和 WebDAV 兼容往返要求。

### D8. 跨文档引用删除必须可解析

- 运行时删除用户记录，或兼容基线建立后删除已发布内置记录时，若被训练、模板或统计引用，必须先明确保留、迁移或重定向策略；不得静默断链。
- 重定向是有方向的映射，解析必须防自环、循环和缺失目标，并保留原始历史 ID 与快照。
- 用户已批准整体替换且会清空全部测试快照时，废弃内置测试动作不建立重定向；必须同时替换引用它们的默认 fixture，并验证新快照不存在悬空引用。

### D9. 持久化字段变更必须先更新契约矩阵

新增、删除或重命名持久化字段前，必须先更新字段契约矩阵；未标明页面、service、core、mapper、repository、migration、同步状态的字段不得实现。

### D10. 可清空字段必须区分 undefined 与 null

- `undefined` 表示不修改。
- `null` 表示显式清空。
- 页面“清除/未设置/取消选择”不得用 `undefined` 代替 `null`。

---

## 前端实现规则

### F1. 禁止原生弹窗

禁止：

- `window.confirm`
- `window.alert`
- `window.prompt`

确认操作使用全局 ConfirmDialog。通知使用 Toast。

### F2. 开发阶段优先干净抽象

当前仍是开发阶段。实现主题、导航、表单、同步等基础能力时，必须优先建立清晰的单一抽象或设计 token 层；不得用“过渡兼容”“临时覆盖”“选择器补丁”等方式把旧实现细节固化成长期依赖。若为赶进度必须采用临时方案，必须同时写明移除条件、影响范围和后续替换路径，并且不得作为功能完成的依据。

### F3. 保持页面调用面稳定

大改数据层时优先修改 services，减少页面层大面积重写。

### F4. 模板过滤必须是真过滤

激活模板后动作列表必须：

```ts
allExercises.filter((exercise) => templateExerciseIds.has(exercise.id))
```

不得用排序替代过滤。

### F4a. 自定义动作创建/编辑必须复用共享表单

动作库、模板编辑、训练创建和训练编辑中的自定义动作创建/编辑必须复用共享组件和同一 `services/exercise` 字段契约。

共享字段至少覆盖：

- 名称。
- 分类。
- 记录类型。
- description。
- primaryMuscleGroupIds。
- secondaryMuscleGroupIds。

### F5. 全局样式不得覆盖 Tailwind 间距工具类

涉及 `margin`、`padding` 的全局 reset 必须放入 `@layer base`；不得在 Tailwind 导入后以未分层的 `*` 规则覆盖 `p-*`、`m-*`、`space-y-*`。

### F6. Android 数值输入与窄屏行布局必须显式约束

- 不得依赖 Android WebView 的原生 number spinner；有步进需求时使用共享控件或明确的加减按钮。
- “固定操作按钮 + 可增长输入”使用固定列 + `minmax(0, 1fr)` 的 Grid，或同时声明输入 `min-w-0` 与按钮 `shrink-0`。

### F7. 统计与单位换算必须单一权威

训练容量、重量单位换算和展示单位必须使用 core/service 的单一权威实现；页面不得自行重复计算 `set.weight * set.reps` 或拼接固定单位。

### F8. 产品文案必须面向用户而非开发者

写入页面、弹窗、空状态、说明页、帮助页、Toast 或表单提示的文案时，必须从用户任务和当下场景出发，不得把设计文档、实现决策、内部模块名或给 AI/开发者看的约束暴露给用户。

- 不得出现“依据 P7 设计”“按设计文档”“service/schema/payload”“不参与某计算路径”等内部实现或验收语言。
- 不得用产品名替代自然说明，例如“力量训练里，IronLog 按...”应改为直接说明用户要理解的概念或操作。
- 说明专业术语时，首次出现缩写必须先给全称和中文解释，例如“自觉用力程度（Rating of Perceived Exertion，RPE）”“剩余次数（Reps in Reserve，RIR，即‘还能做几次’）”。
- 面向用户的说明应短、具体、可操作；资料来源和设计依据只用于实现判断或代码注释，不直接显示在产品界面。

---

## 验证规则

### V1. 源码或工程交付前必须执行

```bash
cd ironlog/frontend
npm run build
npm test
npm run android:sync
```

默认将上述三条全量命令留到全部实现完成后的最终验收批次，仅执行一次。若其中某条失败，定位和修复阶段只运行受影响范围的定向测试或命令；不得为同一失败重复整套全量验证。

如 Android APK 构建相关，需要额外尝试：

```bash
cd ironlog/frontend/android
.\gradlew.bat assembleDebug
```

若失败在 Gradle 分发包下载，应明确说明是网络/环境问题。

### V2. 源码或工程交付必须 grep 零残留

```bash
rg -n "window\.(confirm|alert|prompt)" src
rg -n "blue-|gray-" src
rg -n "axios|auth|token|access_token|refresh_token|/api|services/api|Bearer" src vite.config.ts package.json
```

注意：WebDAV Basic `Authorization` 如在 WebDAV client 内出现，需要在报告中说明它不是登录/JWT 运行路径。

纯文档交付无需执行本节 grep；仅在文档引用了这些代码约束时，核对描述是否准确。

### V3. 人工走查

浏览器或 Android AVD 人工走查仅在本次修改 UI、CSS 或输入控件时执行；纯 core、service、存储、同步或文档修改不得触发该走查。

核心训练相关修改必须走查：

- 新建训练。
- 训练中记录组和 `restSeconds`。
- 保存后详情可见。
- 复制训练保留组数据和模板关联。
- 按模板过滤动作是真过滤。
- 日历月份统计日期口径正确。
- WebDAV 未配置时应用仍可本地使用。

### V4. 移动端布局与数值输入走查

修改全局 CSS、数值输入或横向操作行后，必须在 Android WebView 的 360px 与 412px 宽度核对：无溢出、无裁切、输入可清空重输、步进与最小/最大值正确。

### V5. 数据回归测试

开发期直接替换默认数据或字段时，至少覆盖：新快照与当前目录精确一致、废弃测试记录不残留、当前 schema 读取后原样保存、嵌套 ID 稳定、引用无悬空、未展示字段保留和 WebDAV 序列化。兼容基线建立后再增加非空数据增量合并、旧快照迁移、历史字段保留与重定向解析测试。

### V6. 聚合编辑必须保护未展示字段

聚合文档编辑页必须有读后原样保存测试，保护未展示字段、预留字段、嵌套 ID 和同步导入字段不被保存流程清空或重建。

### V7. 删除持久化字段必须零残留

删除持久化字段后必须全文搜索零残留，并覆盖 core model、默认数据、mapper、service payload、页面兼容类型、测试 fixture 和文档。

### V8. 产品文案交付前必须检查内部语境泄漏

新增或修改用户可见文案后，必须按范围搜索是否误写入设计、实现或开发语境词。至少检查本次涉及文件中的 `P0|P1|P2|P3|P4|P5|P6|P7|概要设计|详细设计|设计文档|schema|payload|service|repository|DocumentStore|实现|开发` 等词，并人工判断是否属于用户需要看到的内容。

### V9. Android 环境测试必须分级并审查真机安全性

用户没有测试专用手机，不得把日常手机视为可随意清空或污染的测试设备。新增或修改测试文件时，必须在受影响的详细设计、运行指南或部署指南中注明：测试能否由 Web/本机自动测试完成，是否需要人工在 Android Studio 虚拟机或真机运行，以及运行时会修改的数据、凭据、远端状态和清理方式。

- Web 端能够满足验证目标时，优先使用 Web/本机自动测试。
- Web 端不能覆盖 Android API、WebView 或原生插件行为时，优先在 Android Studio 虚拟机完成。
- 只有硬件能力、厂商系统差异或真实系统集成无法由虚拟机验证时，才要求真机测试；无法安全执行时应明确标记“真机未验证”，不得指示用户冒险运行。
- 真机测试前必须检查测试使用的 applicationId、Context、Filesystem、SharedPreferences、Keystore alias、系统权限、外部账户、WebDAV 目录和网络请求，确认是否会读取、覆盖、清空或删除日常应用和远端数据。
- 会共享正式存储名、正式 Keystore alias、正式账户或正式远端目录的测试，必须先改为测试专用标识和定向清理；不得在日常手机上执行全量 `clear`、删除正式密钥、卸载应用或清除应用数据的测试流程。
- 必须在真机运行的测试，其文档必须写明前置备份、可观察结果、失败影响、清理与回滚步骤，并区分自动化测试和人工走查。

---

## 文档规则

### DOC1. 文档必须匹配当前战略

所有产品/运行/部署/设计文档必须以本地单人版为准。

不得把 FastAPI/PostgreSQL/JWT/社区/Wiki 写成当前运行目标。

可以在“已移除/归档/不再需要”上下文中提及旧架构。

### DOC2. README 优先可运行

README 必须优先说明：

- 本地运行。
- build/test。
- Android sync/open/APK。
- JSON 分片。
- WebDAV 同步。

### DOC3. 中文文档修改后必须抽查

修改中文文档后，用 `Get-Content` 抽查关键文件，确认无乱码。

### DOC4. 设计文档必须分层且可追溯

概要设计定义范围、架构和模块职责；详细设计必须以概要设计为依据，按功能域展开，不得各自定义冲突的边界。

### DOC5. 详细设计必须能指导实现与验收

每个功能域至少写清：范围与依赖、数据契约、调用或交互流程、业务规则、异常或边界处理、验证方式。

不得只复述目标、功能名称或愿景。

### DOC6. 事实、限制与规划必须分离

文档中的目录、脚本、配置、路由、数据路径和协议必须以当前代码核对。

已实现、已移除或归档、已知限制、未来规划必须明确标注；不得将规划写成现状，也不得编造不存在的文件、接口或能力。

### DOC7. 文档分层与最小修订

- 概要设计是唯一上游，定义范围、模块边界、权威归属、跨模块不变量和路线图状态；P0–P5 只能细化已定义模块。
- 每项规则只在一个权威文档完整定义；跨文档只保留完成当前任务所需的调用或依赖摘要，并链接/指向权威文档。
- README、运行、部署和技术路线面向维护者/使用者，不复制详细设计的 schema、调用链、错误格式或验收矩阵；规划仅写必要状态或条件性提醒。
- 修改既有文档时使用最小 apply_patch，保留已核验章节与读者价值；除非用户明确要求，不得为统一文风整篇重写。
