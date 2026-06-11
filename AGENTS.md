# IronLog AI 开发行为规则

> 最后更新：2026-06-11（Android-first 本地单人版）

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

完成后必须至少验证：

- `npm run build`
- `npm test`
- `npm run android:sync`
- 关键 grep 零残留

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
- ManualScheduleEntryDoc

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

---

## 验证规则

### V1. 每次交付前必须执行

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

### V2. 必须 grep 零残留

```bash
rg -n "window\.(confirm|alert|prompt)" src
rg -n "blue-|gray-" src
rg -n "axios|auth|token|access_token|refresh_token|/api|services/api|Bearer" src vite.config.ts package.json
```

注意：WebDAV Basic `Authorization` 如在 WebDAV client 内出现，需要在报告中说明它不是登录/JWT 运行路径。

### V3. 人工走查

核心训练相关修改必须走查：

- 新建训练。
- 训练中记录组和 `restSeconds`。
- 保存后详情可见。
- 复制训练保留组数据和模板关联。
- 按模板过滤动作是真过滤。
- 日历月份统计日期口径正确。
- WebDAV 未配置时应用仍可本地使用。

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
