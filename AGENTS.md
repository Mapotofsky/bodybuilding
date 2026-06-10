# IronLog AI 开发行为规则

> 最后更新：2026-04-21（整合 P1 + P2 + P2-hotfix 阶段复盘）

---

## 元规则（最高优先级）

### M1. 数据链路必须端到端验证

修改涉及前后端数据传递的任何字段时，必须追踪完整链路：前端 state → service payload → HTTP body → 后端 schema → ORM 写入 → 响应序列化。

- 正例：为 WorkoutCreatePage 添加 plan_template_id，打开 `schemas/workout.py` 确认字段存在，再打开 `workouts.py` 确认 `Workout(...)` 构造器使用了该字段。
- 反例：只在前端 buildPayload 中加字段，认为「已完成」，不检查后端接收端。

### M2. 删除符号前必须全文搜索所有引用

删除任何 import、函数、变量前，执行 `grep_search` 确认零残留引用。

- 正例：删除 `WorkoutExercise` 前，搜索到 `Workout` 还有 6 处引用，仅删除不再使用的符号。
- 反例：删除整行 `from app.models.workout import Workout, WorkoutExercise, WorkoutSet`，不检查 `Workout` 的引用。

### M3. 用户明确措辞优先于自我推断

用户使用了精确动词（「过滤」、「仅显示」、「隐藏」），必须按字面语义实现，不得用技术上更简单的替代方案偷换。

- 正例：用户说「过滤动作列表」→ 非模板动作不渲染。
- 反例：用户说「过滤动作列表」→ 实现为将模板动作 sort 到前面。

### M4. 多入口功能必须枚举所有路径后再编码

对任何「用户可以通过多个入口触发同一功能」的需求，在编码前列出所有入口，逐一确认实现覆盖。

- 正例：「按模板过滤」有两个入口，两条都实现后才算完成。
- 反例：实现了入口①，认为功能已完成，不检查入口②。

### M5. 不破坏存量功能

任何重构或删除操作，完成后必须验证：全量 build 通过 + 对修改文件依赖的端点做心理走查。

### M6. 禁止使用 Shell 命令修改含中文的源文件

本项目运行于 Windows，PowerShell `Get-Content -Raw | Set-Content -Encoding UTF8` 会破坏中文字符编码，导致源文件损坏需 git rollback。

- 正例：将 `bg-blue-500` 替换为 `bg-emerald-500`，使用 `multi_edit` 工具逐条精确替换。
- 反例：`(Get-Content -Raw) -replace 'blue-500','emerald-500' | Set-Content`，执行后中文乱码。

### M7. 批量修改后必须抽查文件内容再 build

任何批量操作完成后，先 `read_file` 抽查关键行内容正确，再触发 build。

- 正例：多文件 multi_edit 完成 → `read_file` 确认中文字符正常 → build。
- 反例：操作完成 → 直接 build → 发现文件损坏时已浪费一轮。

---

## 需求理解规则

### R1. 接收需求后先枚举场景

收到功能需求后，列出所有使用场景（入口 × 状态 × 路径）。如发现场景数量与描述不符，主动向用户确认，而非假设。

### R2. 「列表展示」需求必须明确行为类型

过滤（不渲染）/ 排序（重排但都渲染）/ 高亮（都渲染但视觉区分）/ 分组，四者不可互换。需求描述不明确时，主动询问，不自行选择成本最低的实现。

### R3. 变更前列出所有依赖

收到「删除/修改 X」的指令时，在执行前列出直接依赖和间接依赖，逐一确认处理方式。

---

## 编码实现规则

### C1. 跨层字段修改检查清单

任何新增/修改/删除数据字段时，依次检查：

- [ ] 前端 TypeScript 类型定义
- [ ] 前端 service 函数的 payload
- [ ] 后端 Pydantic 入参 schema
- [ ] 后端 ORM 模型写入语句
- [ ] 后端响应 schema（如字段需要回传）

### C2. 删除代码的顺序

先删逻辑（函数体、endpoint），再删导入。删导入时，对同一 import 语句中每个符号单独确认是否有其他引用。

### C3. 过滤逻辑实现规范

「仅显示 X」= `.filter()` 返回 false 则不渲染；「优先显示 X」= `.sort()` 所有项目仍然渲染。两者不可互换。

### C4. 前端代码修改工具优先级

`multi_edit` > `edit` > `write_to_file`（新建）>>> 任何 Shell/PowerShell 字符串操作。

除非明确要求创建新文件或执行系统级操作，永远不得用 Shell 命令修改源代码文件内容。

- 正例：将 8 个文件中的类名批量替换，分批使用 `multi_edit` 逐文件精确操作。
- 反例：写 PowerShell 循环遍历所有 `.tsx` 文件批量 `-replace`。

### C5. 「全量替换」任务完成前必须 grep 验证零残留

凡是「将项目中所有 window.confirm / 某颜色类名 替换为 X」的任务，mark completed 之前执行 `grep_search` 确认零残留，完成报告中明确写出结果。

- 正例：替换完成 → `grep_search "window\.confirm"` 返回空 → 写「grep 零残留」→ mark completed。
- 反例：逐文件替换后凭印象认为已全部处理，用户测试时发现 TemplateEditPage 仍有残留。

### C6. 描述代码行为等同于编写断言，必须心算执行验证

解释任何一段代码的运行行为前，必须逐行心算执行路径，不得凭函数名或外观推断结果。凡输出"此代码会显示/返回 X"，等同于在断言，断言前需验证。

- 正例：解释 `labelFormatter={(l) => l}` 前，心算 Recharts 在无 XAxis 时传入的是 index（0/1/2），指出实际显示的是数组下标而非日期，并顺手修复。
- 反例：看到 `labelFormatter={(l) => l}`，认为 `l` 就是 `date` 字段，直接写"显示日期如 04-21"，用户截图举证后才修复。

### C7. 修改调度/查询核心逻辑后必须枚举并走查边界 case

任何对计划调度、日期查询、过滤条件的结构性修改，完成后立即在注释旁列出所有边界 case（至少：正常路径、今日完成、范围内/外完成、无历史记录四种），逐一心算通过后才标记完成。

- 正例：移除 `Workout.date < from_date` 后，列出"今日已完成→next_date=today+gap，仍能正确渲染已完成标记"等边界，逐一验证。
- 反例：新逻辑看起来正确即提交，不检查与存量 `cyclic_done_dates` 去重逻辑的交互。

---

## 沟通与确认规则

### D1. 以下情况必须停下来确认

- 需求中出现两个以上入口/路径，但描述侧重其中一个时
- 需求动词可被解释为多种技术实现时
- 删除操作波及超过 3 个文件时

### D2. 「已完成」声明中必须包含验证依据

每次声明完成时，写明做了哪些验证（build 结果 / grep 结果 / read 确认），而非直接说「已完成」。

- 正例：「PlanEditPage 完成。build 零错误；grep window.confirm 零残留。」
- 反例：「PlanEditPage 已完成，蓝色全部替换为翠绿色。」

### D3. todo list 中的同一 batch，无需等待用户催促

当 todo list 有多个 `pending` 步骤且上一步无错误时，自主推进到当前 batch 全部完成再汇报。

- 正例：Batch E 三个页面，完成第一个后直接继续，三个全部完成后一次性汇报。
- 反例：完成第一个页面后停止输出，等待用户发「Continue」。

---

## 交付与自检规则

### V1. 每次交付前的自检清单

- [ ] 全量 build/typecheck 通过，无 `error TS`
- [ ] 未删除任何仍被引用的符号
- [ ] 所有「入口路径」均已实现（不仅是第一条）
- [ ] 新增前端字段已在后端 schema 中对应存在
- [ ] 没有以「排序」实现「过滤」类需求
- [ ] 全量替换类任务已 grep 验证零残留
- [ ] 涉及数字统计展示时，已确认数据集日期边界 = 标签口径（如"本月"对应 `monthStart~monthEnd`，不可用包含溢出的 `calStart~calEnd`）
- [ ] 调用 API 的新姿势（如不传参、新参数组合）时，已读 service 函数 + 后端端点源码，确认该调用方式有效

### V2. 多文件变更必须逐文件列出修改内容

不得使用「相关文件已同步更新」等模糊表述。

---

## 上下文管理规则

### U1. 每次新实现开始前重读需求原文关键动词

不依赖记忆或上一轮总结，重新确认：用户用的是哪个动词、列出了哪些场景。

### U2. 单轮修改 5 个以上文件时，完成后走查副作用

明确列出「哪个文件的副作用还未验证」，逐一确认后才汇报完成。

---

## 本项目特有规则

### P1. 前后端字段同步规范

`WorkoutCreatePage.buildPayload` 中的所有字段，必须在 `schemas/workout.py` 的 `WorkoutCreate` 类中有对应字段，且 `api/v1/workouts.py` 的 `create_workout` 函数中将该字段传入 `Workout(...)` 构造器。修改任一层时，同步检查其他两层。

- 正例：加 `plan_template_id` → 同步更新 WorkoutCreate schema + Workout(...) 构造器。
- 反例：只加前端 buildPayload，假设后端已支持。

### P2. plans.py 日历端点依赖 Workout 模型

`app/api/v1/plans.py` 的 `get_calendar` 端点使用 `Workout` 模型做完成状态查询。任何对该文件导入的修改，必须保留 `from app.models.workout import Workout`。

### P3. WorkoutCreatePage 的两条激活模板入口

① URL 参数 `?template_id=X`（来自今日计划）；② 页面内计划/模板选择器（来自主入口）。任何对模板过滤逻辑的修改必须同时在两条路径下验证。

### P4. 前端全局对话框一致性规范

禁止在任何页面使用 `window.confirm`、`window.prompt`、`window.alert`。统一使用：

- 确认操作：`await useConfirmStore.getState().show("标题", "描述")`，返回 true 则执行
- 通知提示：`useToastStore.getState().add("消息", "success" | "error" | "info")`

- 正例：删除模板 → `useConfirmStore.getState().show(...)` → ok 后调用 deleteTemplate。
- 反例：`if (!window.confirm("确认删除？")) return;`

### P5. 前端 Emerald 主题一致性规范

禁止在新增或修改代码中使用 `blue-*`、`gray-*` 作为主色调。统一使用：

| 用途 | 类名 |
| --- | --- |
| 页面背景 | `bg-slate-50` |
| 主操作按钮 | `bg-emerald-500 hover:bg-emerald-600 text-white` |
| 输入框焦点 | `focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400` |
| 分类/状态徽章 | `bg-emerald-50 text-emerald-600 border border-emerald-100` |
| 卡片边框 | `border border-slate-100` |
| 次要文字 | `text-slate-500` |

- 正例：`className="bg-emerald-500 text-white rounded-2xl font-semibold"`
- 反例：`className="bg-blue-500 text-white rounded-2xl"`
