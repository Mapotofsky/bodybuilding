# P7 详细设计文档：RM 计算与动作成绩记录

> 对应概要设计：P4.1 RM 计算、动作成绩记录和动作详情增强
> 状态：当前 v6 实现基线；新增爬楼机频率，并将阻力上下文完全排除出自动成绩事件
> 前置依赖：P0 WorkoutDoc 聚合与训练完成/编辑/删除流程、P1 动作引用解析、P2 分片与 migration、P3 同步、P4.1 统计和分享图消费入口

---

## 1. 目标、边界与当前事实

P7 提供两个能力：

1. RM 计算器：从“小工具”集合页进入，支持手动输入重量、次数、RPE，展示四公式结果、均值、具体公式和倍率曲线。
2. 动作成绩记录：从已完成训练派生真实 PR 与基于 RPE 修正 RM 刷新事件，持久化后供动作详情、统计页和分享图消费。

当前代码事实：

- `WorkoutSetDoc.rpe` 已存在，service 校验范围为 1..10 或 null。
- `WorkoutSetDoc.isWarmup` 已存在；P0 个人动作统计的表现指标排除热身组。
- `WorkoutDoc` 是聚合文档，训练创建、编辑、复制、删除均通过 `services/workout.ts` 和 `LocalJsonRepository`。
- `core/workoutMetrics.ts` 已提供重量单位换算和训练容量口径。
- `core/rm.ts`、RM 计算器和力量/有氧 RPE 说明页已接入小工具。
- `ExercisePerformanceRecordDoc` 已进入 core model、repository、DocumentStore、SyncService 和 `exercise-performance/YYYY-MM.json` 分片。
- 动作详情、日历统计和训练详情 PNG 分享图已只读消费 PR/RM 刷新事件；动作趋势仍从 WorkoutDoc 派生。

P7 不负责身体数据、时间段备注、统计页面布局、分享图模板或 AI。页面不得直接从训练页生成成绩事件；必须由训练 service 或维护工具统一调度。

---

## 2. RM 公式与计算口径

### 2.1 输入

RM 估算只覆盖历史快照为 `recordingMode="weight_reps"` 且 `loadDirection="higher_better"` 的工作组，且必须满足：

- `isWarmup !== true`
- `weight != null`
- `reps` 为整数且在 `1..12`
- `rpe` 为数字且在 `1..10`
- `effectiveReps = reps + (10 - rpe)` 也在 `1..12`

没有 RPE 的合格负重次数组不生成 RM 估算事件，只保留真实 PR 候选。辅助重量、负重时间和负重距离模式不生成 RM。`RIR = 10 - RPE` 只作为计算概念和 UI 说明，不进入 `WorkoutSetDoc`、成绩事件或其他持久化文档。

有氧训练 RPE 按主观感受和心率分区解释，不参与 RM 估算。

### 2.2 公式

首版固定四个公式，均使用 `effectiveReps`：

```text
Epley:    weight * (1 + effectiveReps / 30)
Brzycki:  weight * 36 / (37 - effectiveReps)
Lombardi: weight * effectiveReps ^ 0.10
Wathen:   100 * weight / (48.8 + 53.8 * exp(-0.075 * effectiveReps))
```

公式输入重量先转换为规范 kg；重量 PR 与 RPE 1RM 始终使用该输入重量，不应用 `loadBasis` 的每手倍率或 `countBasis` 的每侧倍率。`loadBasis="total"` 显示“最大重量”“估算 1RM”，`loadBasis="per_hand"` 显示“每手最大重量”“每手估算 1RM”。展示时保留原始输入重量与双口径，并按 `SettingsDoc.weightUnit` 转换。RM 主比较口径为四公式均值，同时保存四公式明细和标准差或范围。

并列候选排序：

1. 四公式均值更高。
2. 输入重量换算后的 kg 更高。
3. 原始 reps 更高。
4. `achievedAt` 较新。

---

## 3. 动作成绩持久化模型

### 3.1 ExercisePerformanceRecordDoc

定义位置：`frontend/src/core/models.ts`。

```ts
type PerformanceRecordKind = "true_pr" | "rpe_adjusted_rm";

type PerformanceMetricType =
  | "weight.max"
  | "reps.max_set"
  | "reps.max_workout"
  | "volume.max_set"
  | "volume.max_workout"
  | "rm.rpe_adjusted_mean"
  | "assistance.best_reps"
  | "assistance.min_weight"
  | "distance.max_set"
  | "distance.max_workout"
  | "duration.max_set"
  | "duration.max_workout"
  | "frequency.max"
  | "speed.max"
  | "load_duration.max"
  | "load_distance.max"
  | "load_distance_rate.max";

type PerformanceUnit =
  | "kg"
  | "kg_reps"
  | "kg_seconds"
  | "kg_meters"
  | "kg_meters_per_second"
  | "m"
  | "sec"
  | "m_per_sec"
  | "reps";

interface RmFormulaResults {
  epleyKg: number;
  brzyckiKg: number;
  lombardiKg: number;
  wathenKg: number;
  meanKg: number;
  standardDeviationKg: number;
  minKg: number;
  maxKg: number;
}

interface PerformanceInputSummary {
  recordingMode: RecordingMode;
  enteredLoad: number | null;
  enteredLoadUnit: "kg" | "lb" | null;
  loadBasis: LoadBasis | null;
  countBasis: CountBasis;
  loadDirection: LoadDirection | null;
  rateMetric: RateMetric;
  contextKind: ContextKind;
  contextValue: number | null;
  reps: number | null;
  rpe: number | null;
  distanceM: number | null;
  durationSec: number | null;
}

interface ExercisePerformanceRecordDoc extends BaseDoc {
  exerciseId: DocId;
  kind: PerformanceRecordKind;
  metricType: PerformanceMetricType;
  value: number;
  unit: PerformanceUnit;
  achievedAt: ISODateTime;
  sourceWorkoutId: DocId;
  sourceWorkoutExerciseId: DocId;
  sourceSetId: DocId | null;
  input: PerformanceInputSummary;
  rm: RmFormulaResults | null;
}
```

持久化文件：`exercise-performance/YYYY-MM.json`，按 `achievedAt.slice(0, 7)` 分片。分片内保留 tombstone，随 manifest 和 WebDAV 往返。

### 3.2 不保存的字段

成绩事件不保存：

- `exerciseNameSnapshot`
- category 快照
- 肌群快照
- 模板名
- 训练标题或页面展示文案
- `previousBestValue`
- RIR

展示时通过 `ExerciseDoc` 和来源 `WorkoutDoc` 解析。`previousBestValue` 仅在统计摘要或 Top 提升动作派生时即时计算，不新增持久化字段。

### 3.3 ID 生成

成绩事件 ID 必须确定性生成，避免重复重算产生重复记录。建议组成：

```text
performance:<metricType>:<sourceWorkoutId>:<sourceWorkoutExerciseId>:<sourceSetId-or-workout>:<formula-scope>
```

真实 PR 的 workout 级指标可使用 `sourceSetId=null` 和 `sourceScope=workout`；单组指标使用来源 set。RM 事件使用来源 set 和 `rpe_adjusted_rm` scope。

---

## 4. 真实 PR 覆盖范围

真实 PR 排除热身组，且只由受控指标注册表生成，不得运行时扫描非空字段后盲目相乘。

| 快照配置 | 指标与比较规则 |
|---|---|
| `higher_better + weight_reps` | 只记录单一 `weight.max`，值为输入重量换算后的 kg；`total` 显示“最大重量”，`per_hand` 显示“每手最大重量”。另记录最大次数、最大单组/训练容量；容量按聚合倍率计算，RM 使用输入重量。 |
| `lower_better + weight_reps` | 最大次数（同次数辅助重量更小者胜）与最低辅助重量（同重量次数更多者胜）；不生成普通容量或 RM。 |
| `reps` / `duration` | 单组 PR 保持输入次数/时长；训练总次数/总时长按 `countBasis` 聚合。 |
| `reps_duration` | 时间必填、次数可选；有次数时生成次数与时间事实型 PR，并仅在次数和时间同时存在时派生 `frequency.max`，规范单位为 reps/min，爬楼机页面显示为步频。 |
| `distance_duration` | 单组 PR 保持输入距离/时长；训练总距离/总时长按 `countBasis` 聚合。两项齐全且 `rateMetric=distance_per_time` 时生成速度，分子和分母同口径，`per_side` 倍率抵消。 |
| `weight_duration` | `weight.max` 使用输入重量，最长时间保持输入值，持续负载按聚合倍率计算（kg·s）；不生成 kg·次或 RM。 |
| `weight_distance_duration` | `weight.max` 使用输入重量；有距离生成距离负载（kg·m），只有时间生成持续负载（kg·s）；三项齐全且启用竞速时生成单位时间负载（kg·m/s），速率分子和分母同口径，`per_side` 倍率抵消。 |

比较器必须为主值及每个 tie-breaker 分别声明 `min` 或 `max`，禁止假定全部数值越大越好。所有成绩输入摘要保留 `recordingMode`、原始重量及单位、`loadBasis`、`countBasis`、`loadDirection`、`rateMetric`、次数、距离、时间和 RPE；任何可由这些值重算的倍率、聚合值、换算重量和有效次数均不持久化。kg·m 只称“距离负载”，kg·m/s 只称“单位时间负载”。

`contextKind=resistance_level` 是成绩生成的硬排除条件：不生成最快速度、最远距离、最长时间、最高阻力、同档位最佳或任何其他自动 PR/RM，也不新增事实事件。原始时间、距离、阻力档位保留在 WorkoutDoc，速度只由距离/时间派生；动作详情只从 WorkoutDoc 展示历史列表、趋势和本次上下文。重建时删除椭圆机、固定自行车的既有派生成绩事件，但不删除或改写训练历史。坡度动作仍可生成速度；速度相同时坡度较高者胜。

---

## 5. 刷新事件生成规则

### 5.1 只保存刷新历史最佳

`ExercisePerformanceRecordDoc` 只保存刷新历史最佳的事件，不保存每次训练候选点。当前最佳、排行榜、周期对比从事件列表与 WorkoutDoc 派生。

生成时按 `achievedAt` 升序扫描有效已完成训练：

1. 过滤 `deletedAt != null` 和 `endTime == null` 的训练。
2. 按 `WorkoutExerciseDoc` 六项记录快照解释历史数据，不按当前 ExerciseDoc 配置重解释。
3. 对每个动作、指标生成候选。
4. 与该动作该指标此前历史最佳比较。
5. 只有刷新时写入成绩事件。

动作替代重定向沿用 P1 规则：历史 `exerciseId` 可解析到当前有效目标时，成绩归并到解析后的目标动作；原始来源 workout/set ID 保留。

### 5.2 触发时机

训练 service 统一调度：

- 新完成训练保存后：从该 workout 派生候选 PR/RM，与持久化成绩事件中同 `exerciseId + metricType` 的当前最佳比较；只有刷新时写入该 workout 的 `ExercisePerformanceRecordDoc`。
- 已完成训练编辑保存后：当前使用 `rebuildAllPerformanceRecords()` 全量重算，确保当前最佳可回退到历史次优。
- 已完成训练 tombstone 删除后：当前使用 `rebuildAllPerformanceRecords()` 全量重算，确保来源为已删除训练的最佳记录失效并回退。
- WebDAV pull/merge 后：仅当合并结果实际改变本地训练记录或动作替代解析相关数据时，触发 `rebuildAllPerformanceRecords()` 维护本地派生成绩一致性；若只是把本地已有数据和成绩事件上传到云端，则不重算。同步拉下来的成绩事件自身按普通业务分片合并，不单独触发重算。
- 未结束草稿：不生成成绩事件，也不触发重算。
- 复制训练：复制出的未完成训练不生成事件；完成后按新训练生成。

页面不得在 finish UI、动作详情页或统计页直接写成绩事件。

当前全量 rebuild 是简单可靠的一致性修复策略，保留为动作详情重算、同步合并本地来源数据变化后的修复以及后续维护工具使用。后续可把已完成训练编辑/删除优化为局部 rebuild，但必须继续覆盖来源最佳回退和同步导入后的不一致修复。

### 5.3 手动重算

动作详情页提供“重算成绩”或维护入口，支持：

- 重算当前动作。
- 维护工具重算全部成绩。

重算流程先从历史 WorkoutDoc 派生目标事件集合，再以确定性 ID 替换对应范围内旧事件。重复重算不得产生重复事件。异常中断不得让正式 snapshot 留下半套事件；实现时应复用 P2 的批量提交原语或在 repository 层提供等价原子提交。

---

## 6. RM 计算器与说明页

入口：`我的 -> 小工具 -> RM 计算器`。

能力：

- 手动输入重量、单位、次数、RPE。
- 展示 `RIR = 10 - RPE`、`effectiveReps = reps + RIR`。
- 展示 Epley / Brzycki / Lombardi / Wathen 明细和均值；计算器已同时展示四个公式，不额外展示范围或标准差说明。
- 展示以 `effectiveReps` 为 x 轴、`1RM / 重量` 为 y 轴的四公式倍率曲线。
- 说明公式限制；不在结果区补充估算范围或标准差。
- 说明力量训练 RPE 与有氧训练 RPE 的不同解释。

计算器结果不自动写入训练、模板或成绩事件；只有来源于已完成 WorkoutDoc 的记录才进入 `ExercisePerformanceRecordDoc`。

---

## 7. 动作详情增强

动作详情页回答“这个动作我练得怎么样”。P7 在现有 P1 动作详情基础上新增：

- 真实 PR 摘要。
- 基于 RPE 修正 RM 摘要，1RM 预测展示为四公式均值 ± 标准差。
- 来源训练/来源组跳转。
- 周期对比。
- 动作成绩按 `metricType` 分组展示当前最佳，每个指标只保留最新/最大的一条。
- 趋势图表展示当前受控指标名称；负重次数模式可使用每次训练的 RPE 修正 RM，距离时间模式可使用每次训练速度，其他模式使用各自注册的主指标。
- 年份 / 全部切换。
- 手动重算或重建入口。

动作详情页不承担公式教学；公式明细和倍率曲线只在 RM 工具页展开。肌群可视化仍基于 P1/P4.1 的 `primaryMuscleGroupIds` / `secondaryMuscleGroupIds`，不是 P7 数据模型。

趋势曲线从 WorkoutDoc 派生，成绩事件只用于刷新历史最佳、当前最佳和摘要；不得为了趋势图保存每次训练候选点。

---

## 8. 统计与分享图消费

P4.1 统计页只读消费 P7 service：

- 本周期新增真实 PR 数。
- 本周期基于 RPE 修正 RM 刷新数。
- Top 提升动作。
- 最近刷新记录。

Top 提升动作的 `previousBestValue` 从当前刷新事件之前的同动作同指标历史事件派生，不持久化。

训练详情分享图读取本次 workout 产生的刷新事件，只展示“本次刷新 N 项记录”和最多 2-3 条动作指标摘要；不展开公式明细，不展示公式教学，不新增独立开关。

---

## 9. 本地存储、migration 与同步

P2 已新增：

- `DataSnapshot.exercisePerformanceRecords: ExercisePerformanceRecordDoc[]`
- `isExercisePerformanceShardPath(path)`
- `exercisePerformanceShardPath(achievedAt)`
- manifest shards 中加入 `exercise-performance/YYYY-MM.json`
- DocumentStore export/import 往返
- repository 对成绩事件的写入、替换、tombstone 或按来源 workout 清理能力
- SyncService pull/merge/push 对成绩事件分片的支持

分片按 `achievedAt` 归属。某月只有 tombstone 成绩事件时仍必须保留分片，避免其他设备复活旧事件。

成绩事件属于普通业务数据，会随 WebDAV 同步。它不得保存 WebDAV URL、username、passwordRef、password、AI key、动作名称快照或个人身体数据。

---

## 10. 字段契约摘要

完整矩阵见 P2。P7 新增字段必须覆盖：

| 字段 | 页面 | service/core | repository/migration | 同步 |
|---|---|---|---|---|
| `exerciseId` | 动作详情、统计摘要 | P1 替代解析归并 | 固定引用 | 月分片 |
| `kind/metricType` | 指标标签、筛选 | 候选生成与比较 | 枚举校验 | 月分片 |
| `value/unit` | 当前最佳、摘要、排序 | 规范单位计算；展示单位转换 | 固定单位 | 月分片 |
| `achievedAt` | 排序、周期归属 | 来源训练日期/时间派生 | 决定分片 | 月分片 |
| 来源 workout/exercise/set ID | 跳转来源 | 重算和清理 | 保留引用 | 月分片 |
| `input` | 摘要和调试 | 保存原始重量及单位、六项记录快照、次数、距离、时长、上下文和 RPE；不保存可推导的倍率、聚合值、换算重量、有效次数或 RIR | 固定字段 | 月分片 |
| `rm` | RM 摘要和公式展开 | 四公式明细、均值、离散程度 | RM 事件必填，真实 PR 为 null | 月分片 |

---

## 11. 验收与回归

交付和后续回归至少验证：

- 没有 RPE 的普通负重次数组不生成 RM 估算事件。
- reps 或 effectiveReps 超出 `1..12` 不生成 RM 估算事件。
- 四个公式均使用 `effectiveReps`，主比较口径为均值。
- `20 kg/手 × 10、whole_set` 为 400 kg·次；`20 kg × 每侧 10、per_side` 为 400 kg·次；两者均为 `per_hand + per_side` 时为 800 kg·次。lb 必须先换算 kg 再应用聚合倍率；重量 PR 和 RM 始终使用输入重量换算后的 kg。
- 农夫行走 `32 kg/手 × 40 m、whole_set` 生成 2560 kg·m；手提箱行走语义 `32 kg × 每侧 40 m、per_side` 也生成 2560 kg·m。两种每侧输入在速度和单位时间负载中均不得因左右倍率而被错误翻倍。
- 辅助重量相同次数时更小重量胜、相同重量时更多次数胜，且不生成普通容量或 RM。
- RIR 不进入 WorkoutDoc 或成绩事件。
- 热身组不生成 PR/RM；训练总容量仍按 P0 口径。
- 七种记录方式按注册策略生成；阻力上下文无论原始字段如何都不得生成自动 PR/RM。
- 只保存刷新历史最佳事件，不保存每次训练候选点。
- 训练完成、编辑、删除均触发相关动作重算；草稿不触发。
- 手动重算不会产生重复事件。
- 成绩事件按月分片进入 manifest、DocumentStore export/import、WebDAV pull/merge/push、backup、tmp/MOVE；六项记录快照和非冗余输入摘要往返不丢失。阻力上下文动作不生成成绩事件。
- 动作详情、统计页、分享图只读消费成绩事件摘要，不直接生成或修补事件。
- 切换 `SettingsDoc.weightUnit` 只影响展示，不改写规范 kg / kg_reps 事件值。
- kg·m 和 kg·m/s 分别显示为“距离负载”和“单位时间负载”，不使用“功”或“功率”。

本轮文档修改不运行 build/test/android sync；代码实现交付时按 AGENTS.md 执行项目级验证、grep 零残留和关键训练流程走查。
