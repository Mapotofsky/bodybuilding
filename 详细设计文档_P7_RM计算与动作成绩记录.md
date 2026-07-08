# P7 详细设计文档：RM 计算与动作成绩记录

> 对应概要设计：P4.1 RM 计算、动作成绩记录和动作详情增强
> 状态：规划中；当前代码只有训练组 RPE 字段和动作详情实时统计，尚无持久化成绩事件
> 前置依赖：P0 WorkoutDoc 聚合与训练完成/编辑/删除流程、P1 动作引用解析、P2 分片与 migration、P3 同步、P4.1 统计和分享图消费入口

---

## 1. 目标、边界与当前事实

P7 提供两个能力：

1. RM 计算器：独立小工具，支持手动输入重量、次数、RPE，展示公式明细、均值、离散程度和说明。
2. 动作成绩记录：从已完成训练派生真实 PR 与基于 RPE 修正 RM 刷新事件，持久化后供动作详情、统计页和分享图消费。

当前代码事实：

- `WorkoutSetDoc.rpe` 已存在，service 校验范围为 1..10 或 null。
- `WorkoutSetDoc.isWarmup` 已存在；P0 个人动作统计的表现指标排除热身组。
- `WorkoutDoc` 是聚合文档，训练创建、编辑、复制、删除均通过 `services/workout.ts` 和 `LocalJsonRepository`。
- `core/workoutMetrics.ts` 已提供重量单位换算和训练容量口径。
- 动作详情当前只有实时派生统计与历史组记录，不保存 PR/RM 事件。

P7 不负责身体数据、时间段备注、统计页面布局、分享图模板或 AI。页面不得直接从训练页生成成绩事件；必须由训练 service 或维护工具统一调度。

---

## 2. RM 公式与计算口径

### 2.1 输入

RM 估算只覆盖 `exerciseType === "strength"` 的工作组，且必须满足：

- `isWarmup !== true`
- `weight != null`
- `reps` 为整数且在 `1..12`
- `rpe` 为数字且在 `1..10`
- `effectiveReps = reps + (10 - rpe)` 也在 `1..12`

没有 RPE 的 strength 组不生成 RM 估算事件，只保留真实 PR 候选。`RIR = 10 - RPE` 只作为计算概念和 UI 说明，不进入 `WorkoutSetDoc`、成绩事件或其他持久化文档。

有氧训练 RPE 按主观感受和心率分区解释，不参与 RM 估算。

### 2.2 公式

首版固定四个公式，均使用 `effectiveReps`：

```text
Epley:    weight * (1 + effectiveReps / 30)
Brzycki:  weight * 36 / (37 - effectiveReps)
Lombardi: weight * effectiveReps ^ 0.10
Wathen:   100 * weight / (48.8 + 53.8 * exp(-0.075 * effectiveReps))
```

公式输入重量先转换为规范 kg；展示时按 `SettingsDoc.weightUnit` 转换。RM 主比较口径为四公式均值，同时保存四公式明细和标准差或范围。

并列候选排序：

1. 四公式均值更高。
2. 实际重量更高。
3. 原始 reps 更高。
4. `achievedAt` 较新。

---

## 3. 动作成绩持久化模型

### 3.1 ExercisePerformanceRecordDoc

定义位置规划为 `frontend/src/core/models.ts`。

```ts
type PerformanceRecordKind = "true_pr" | "rpe_adjusted_rm";

type PerformanceMetricType =
  | "strength.max_weight"
  | "strength.max_reps"
  | "strength.max_set_volume"
  | "strength.max_workout_volume"
  | "strength.rpe_adjusted_rm_mean"
  | "cardio.max_distance"
  | "cardio.max_duration"
  | "cardio.best_average_speed"
  | "reps_only.max_set_reps"
  | "reps_only.max_workout_reps"
  | "static_hold.max_set_duration"
  | "static_hold.max_workout_duration";

type PerformanceUnit =
  | "kg"
  | "kg_reps"
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
  weightKg: number | null;
  reps: number | null;
  rpe: number | null;
  effectiveReps: number | null;
  distanceM: number | null;
  durationSec: number | null;
  workoutVolumeKgReps: number | null;
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

真实 PR 排除热身组。首版覆盖：

| 动作类型 | 指标 |
|---|---|
| strength | 最大重量、最大次数、最大单组容量、最大训练容量 |
| cardio | 最大距离、最长时长、最佳平均速度 |
| reps_only | 最大单组次数、最大训练总次数 |
| static_hold | 最大单组保持时长、最大训练总保持时长 |

最大次数事件同时保存该组重量；同次数时更高重量刷新。容量类规范单位为 `kg_reps`，距离为 `m`，时长为 `sec`，速度为 `m_per_sec`，次数为 `reps`，重量和 RM 为 `kg`。

训练总容量仍遵守 P0 既有口径；页面不得自行重复计算。

---

## 5. 刷新事件生成规则

### 5.1 只保存刷新历史最佳

`ExercisePerformanceRecordDoc` 只保存刷新历史最佳的事件，不保存每次训练候选点。当前最佳、排行榜、周期对比从事件列表与 WorkoutDoc 派生。

生成时按 `achievedAt` 升序扫描有效已完成训练：

1. 过滤 `deletedAt != null` 和 `endTime == null` 的训练。
2. 按 `WorkoutExerciseDoc.exerciseType` 解释历史数据，不按当前 ExerciseDoc.type 重解释。
3. 对每个动作、指标生成候选。
4. 与该动作该指标此前历史最佳比较。
5. 只有刷新时写入成绩事件。

动作替代重定向沿用 P1 规则：历史 `exerciseId` 可解析到当前有效目标时，成绩归并到解析后的目标动作；原始来源 workout/set ID 保留。

### 5.2 触发时机

训练 service 必须统一调度：

- 已完成训练保存后：重算该 workout 影响的动作。
- 已完成训练编辑保存后：重算该 workout 变更前后影响的动作。
- 已完成训练 tombstone 删除后：删除或失效由该 workout 产生的成绩事件，并重算相关动作。
- 未结束草稿：不生成成绩事件，也不触发重算。
- 复制训练：复制出的未完成训练不生成事件；完成后按新训练生成。

页面不得在 finish UI、动作详情页或统计页直接写成绩事件。

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
- 展示 Epley / Brzycki / Lombardi / Wathen 明细、均值、标准差或范围。
- 展示“次数 - RM 估算倍率”曲线。
- 说明公式适用范围和限制。
- 说明力量训练 RPE 与有氧训练 RPE 的不同解释。

计算器结果不自动写入训练、模板或成绩事件；只有来源于已完成 WorkoutDoc 的记录才进入 `ExercisePerformanceRecordDoc`。

---

## 7. 动作详情增强

动作详情页回答“这个动作我练得怎么样”。P7 在现有 P1 动作详情基础上新增：

- 真实 PR 摘要。
- 基于 RPE 修正 RM 摘要。
- 最近刷新记录。
- 来源训练/来源组跳转。
- 周期对比。
- 趋势图表：单次训练容量、工作组数、最大重量、基于 RPE 修正 RM 均值。
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

P2 需要新增：

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
| `input` | 摘要和调试 | 保存必要输入，不保存 RIR | 固定字段 | 月分片 |
| `rm` | RM 摘要和公式展开 | 四公式明细、均值、离散程度 | RM 事件必填，真实 PR 为 null | 月分片 |

---

## 11. 验收与回归

实现完成后至少验证：

- 没有 RPE 的 strength 组不生成 RM 估算事件。
- reps 或 effectiveReps 超出 `1..12` 不生成 RM 估算事件。
- 四个公式均使用 `effectiveReps`，主比较口径为均值。
- RIR 不进入 WorkoutDoc 或成绩事件。
- 热身组不生成 PR/RM；训练总容量仍按 P0 口径。
- strength、cardio、reps_only、static_hold 的真实 PR 指标均可生成刷新事件。
- 只保存刷新历史最佳事件，不保存每次训练候选点。
- 训练完成、编辑、删除均触发相关动作重算；草稿不触发。
- 手动重算不会产生重复事件。
- 成绩事件按月分片进入 manifest、DocumentStore export/import、WebDAV pull/merge/push、backup、tmp/MOVE。
- 动作详情、统计页、分享图只读消费成绩事件摘要，不直接生成或修补事件。
- 切换 `SettingsDoc.weightUnit` 只影响展示，不改写规范 kg / kg_reps 事件值。

本轮文档修改不运行 build/test/android sync；代码实现交付时按 AGENTS.md 执行项目级验证、grep 零残留和关键训练流程走查。
