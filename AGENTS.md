# IronLog AI 开发行为规则

> 最后更新：2026-06-22（Android-first 本地单人版）

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

### A5. 密码不得写入 JSON

WebDAV 密码只能通过平台 secret/Preferences 或明确隔离的 secret 存储保存。

`settings.json` 只能保存 `passwordRef`。

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

新增字段必须进入 migration，不能只依赖页面默认值。

### D6. 受限字段必须在提交与 service 层校验

页面可用 string 保留可清空、可重输的临时输入；提交时再转换。

- 不得用 `Number(value) || fallback` 回填空值。
- 不得只依赖 HTML `min`/`max`；service 写入前必须校验类型与范围。
- 同一校验与归一化路径必须覆盖 create、update、copy、自动保存等所有写入口；页面和 repository 不得绕过。

### D7. 默认数据与 schema 演进必须增量兼容

- 非空本地文档不得因新增默认数据或字段而被重置、截断或覆盖。
- 默认数据按稳定 ID 增量补齐；内置记录以代码契约修正其受控字段，自定义记录保持不变。
- 新持久化字段必须在读取边界迁移、写回本地并能随 WebDAV 往返；迁移不得清空旧字段。

### D8. 跨文档引用删除必须可解析

- 删除被训练、模板或统计引用的记录前，明确保留、迁移或重定向策略；不得静默断链。
- 重定向是有方向的映射，解析必须防自环、循环和缺失目标，并保留原始历史 ID 与快照。

---

## 前端实现规则

### F1. 禁止原生弹窗

禁止：

- `window.confirm`
- `window.alert`
- `window.prompt`

确认操作使用全局 ConfirmDialog。通知使用 Toast。

### F2. Emerald/Slate 主题

新增或修改 UI 不得使用 `blue-*`、`gray-*` 作为主色调。

推荐：

- 页面背景：`bg-slate-50`
- 主按钮：`bg-emerald-500 hover:bg-emerald-600 text-white`
- 输入焦点：`focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400`
- 次要文字：`text-slate-500`
- 卡片边框：`border border-slate-100`

### F3. 保持页面调用面稳定

大改数据层时优先修改 services，减少页面层大面积重写。

### F4. 模板过滤必须是真过滤

激活模板后动作列表必须：

```ts
allExercises.filter((exercise) => templateExerciseIds.has(exercise.id))
```

不得用排序替代过滤。

### F5. 全局样式不得覆盖 Tailwind 间距工具类

涉及 `margin`、`padding` 的全局 reset 必须放入 `@layer base`；不得在 Tailwind 导入后以未分层的 `*` 规则覆盖 `p-*`、`m-*`、`space-y-*`。

### F6. Android 数值输入与窄屏行布局必须显式约束

- 不得依赖 Android WebView 的原生 number spinner；有步进需求时使用共享控件或明确的加减按钮。
- “固定操作按钮 + 可增长输入”使用固定列 + `minmax(0, 1fr)` 的 Grid，或同时声明输入 `min-w-0` 与按钮 `shrink-0`。

---

## 验证规则

### V1. 源码或工程交付前必须执行

```bash
cd ironlog/frontend
npm run build
npm test
npm run android:sync
```

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

涉及迁移、默认数据、聚合更新或引用删除时，至少覆盖：非空数据增量合并、读取后原样保存、嵌套 ID 稳定、历史字段保留、重定向解析与 WebDAV 序列化。

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
