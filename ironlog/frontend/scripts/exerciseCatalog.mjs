import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const UPSTREAM_SHA = "118e4bd6b14da6df0e36605d7169b65db18389a4";
const UPSTREAM_SOURCE = "hasaneyldrm/exercises-dataset";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CANDIDATES_PATH = path.join(ROOT, "docs/data_import/candidates.md");
const OUTPUT_PATH = path.join(ROOT, "ironlog/frontend/src/core/defaultExercises.generated.ts");
const DATA_URL = `https://raw.githubusercontent.com/${UPSTREAM_SOURCE}/${UPSTREAM_SHA}/data/exercises.json`;

const EQUIPMENT_MAP = new Map([
  ["body weight", "body_weight"],
  ["barbell", "barbell"],
  ["trap bar", "trap_bar"],
  ["dumbbell", "dumbbell"],
  ["cable", "cable"],
  ["leverage machine", "machine"],
  ["sled machine", "machine"],
  ["band", "band"],
  ["kettlebell", "kettlebell"],
  ["wheel roller", "ab_wheel"],
  ["stationary bike", "stationary_bike"],
  ["rope", "jump_rope"],
  ["elliptical machine", "elliptical"],
  ["stepmill machine", "stepmill"],
  ["weighted", "external_weight"],
]);

const CATEGORY_MAP = new Map([
  ["chest", "chest"],
  ["back", "back"],
  ["shoulders", "shoulders"],
  ["upper arms", "arms"],
  ["lower arms", "arms"],
  ["upper legs", "legs"],
  ["lower legs", "legs"],
  ["waist", "core"],
  ["cardio", "cardio"],
]);

const VALID_RECORDING_MODES = new Set([
  "weight_reps", "reps", "reps_duration", "duration", "distance_duration",
  "weight_duration", "weight_distance_duration",
]);
const WEIGHT_RECORDING_MODES = new Set(["weight_reps", "weight_duration", "weight_distance_duration"]);
const DISTANCE_DURATION_RECORDING_MODES = new Set(["distance_duration", "weight_distance_duration"]);
const VALID_LOAD_BASIS = new Set(["total", "per_hand"]);
const VALID_COUNT_BASIS = new Set(["whole_set", "per_side"]);
const VALID_LOAD_DIRECTIONS = new Set(["higher_better", "lower_better"]);
const VALID_RATE_METRICS = new Set(["none", "reps_per_time", "distance_per_time", "load_distance_per_time"]);
const VALID_CONTEXT_KINDS = new Set(["none", "resistance_level", "incline_percent"]);
const VALID_MUSCLES = new Set([
  "chest", "back", "shoulders", "biceps", "triceps", "forearms",
  "core", "glutes", "quadriceps", "hamstrings", "calves",
  "adductors", "abductors", "full_body", "other",
]);

async function main() {
  const mode = process.argv[2];
  if (mode !== "generate" && mode !== "check") {
    throw new Error("用法：node scripts/exerciseCatalog.mjs <generate|check>");
  }

  const markdown = await readFile(CANDIDATES_PATH, "utf8");
  const catalog = parseCatalog(markdown);
  validateCatalog(catalog);

  if (mode === "generate") {
    const upstream = await loadUpstream();
    validateUpstream(catalog, upstream);
  }

  const output = renderCatalog(catalog, sha256(markdown));
  if (mode === "generate") {
    await writeFile(OUTPUT_PATH, output, "utf8");
    console.log(`已生成 ${catalog.length} 条默认动作`);
    return;
  }

  const committed = await readFile(OUTPUT_PATH, "utf8");
  if (committed !== output) {
    throw new Error("默认动作生成产物与 candidates.md 不一致；请运行 npm run catalog:generate");
  }
  console.log(`离线目录校验通过：共 ${catalog.length} 条`);
}

function parseCatalog(markdown) {
  return markdown.split(/\r?\n/)
    .filter((line) => /^\| ex-[^|]+ \|/.test(line))
    .map((line, index) => parseRow(line, index + 1));
}

function parseRow(line, rowNumber) {
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length !== 14) throw new Error(`候选表第 ${rowNumber} 行列数无效`);
  const [id, sourceId, name, category, recordingMode, loadBasisValue, countBasis, loadDirectionValue, rateMetric, contextKind, equipment, primary, secondary, descriptionValue] = cells;
  if (!/^ex-[a-z0-9-]+$/.test(id) || !/^(?:[0-9]{4}|-)$/.test(sourceId)) throw new Error(`候选表第 ${rowNumber} 行 ID 无效`);
  const description = descriptionValue.replaceAll("↵", "\n");
  return {
    id,
    name,
    category,
    recordingMode,
    loadBasis: loadBasisValue === "null" ? null : loadBasisValue,
    countBasis,
    loadDirection: loadDirectionValue === "null" ? null : loadDirectionValue,
    rateMetric,
    contextKind,
    equipment,
    description,
    primaryMuscleGroupIds: parseList(primary),
    secondaryMuscleGroupIds: parseList(secondary),
    ...(sourceId === "-" ? {} : {
      provenance: { source: UPSTREAM_SOURCE, sourceId, sourceRevision: UPSTREAM_SHA },
    }),
  };
}

function parseList(value) {
  return value.trim() ? value.split(",").map((item) => item.trim()) : [];
}

function validateCatalog(catalog) {
  if (catalog.length !== 87) {
    throw new Error(`候选数量错误：总数=${catalog.length}`);
  }
  assertUnique(catalog.map((seed) => seed.id), "IronLog ID");
  assertUnique(catalog.flatMap((seed) => seed.provenance ? [seed.provenance.sourceId] : []), "upstream id");
  for (const seed of catalog) {
    if (![...EQUIPMENT_MAP.values()].includes(seed.equipment)) throw new Error(`${seed.id} 的 equipment 无效`);
    validateRecordingConfiguration(seed);
    if (seed.description.trim().length < 1 || seed.description.length > 500 || seed.description.includes("↵") || seed.description.includes("\n\n")) {
      throw new Error(`${seed.id} 的 description 长度或换行标记无效`);
    }
    validateMuscles(seed.id, seed.primaryMuscleGroupIds, seed.secondaryMuscleGroupIds);
  }
  if (catalog.some((seed) => seed.provenance?.sourceId === "0684")) throw new Error("0684 不得进入目录");
  const running = catalog.find((seed) => seed.id === "ex-running");
  if (!running || running.provenance.sourceId !== "0685" || running.description.includes("原地") || !running.description.includes("\n")) {
    throw new Error("ex-running 的人工语义扩展不符合已批准契约");
  }
  const farmerWalk = catalog.find((seed) => seed.id === "ex-farmer-walk");
  if (!farmerWalk || farmerWalk.provenance.sourceId !== "2133"
    || farmerWalk.recordingMode !== "weight_distance_duration"
    || farmerWalk.loadBasis !== "per_hand"
    || farmerWalk.countBasis !== "whole_set"
    || farmerWalk.loadDirection !== "higher_better"
    || farmerWalk.rateMetric !== "load_distance_per_time") {
    throw new Error("ex-farmer-walk 的记录配置不符合已批准契约");
  }
  const perSideIds = catalog.filter((seed) => seed.countBasis === "per_side").map((seed) => seed.id).sort();
  const expectedPerSideIds = [
    "ex-band-pallof-press",
    "ex-bodyweight-split-squat",
    "ex-cable-one-arm-lateral-raise",
    "ex-copenhagen-side-plank",
    "ex-dead-bug",
    "ex-dumbbell-bulgarian-split-squat",
    "ex-dumbbell-lunge",
    "ex-dumbbell-reverse-lunge",
    "ex-dumbbell-single-leg-deadlift",
    "ex-dumbbell-step-up",
    "ex-kettlebell-renegade-row",
    "ex-one-arm-dumbbell-row",
    "ex-side-plank",
    "ex-single-arm-farmer-walk",
  ];
  if (JSON.stringify(perSideIds) !== JSON.stringify(expectedPerSideIds)) {
    throw new Error("默认目录的每侧计数动作不符合已批准契约");
  }
}

function validateRecordingConfiguration(seed) {
  if (!VALID_RECORDING_MODES.has(seed.recordingMode)) throw new Error(`${seed.id} 的 recordingMode 无效`);
  if (!VALID_COUNT_BASIS.has(seed.countBasis)) throw new Error(`${seed.id} 的 countBasis 无效`);
  if (!VALID_RATE_METRICS.has(seed.rateMetric)) throw new Error(`${seed.id} 的 rateMetric 无效`);
  if (!VALID_CONTEXT_KINDS.has(seed.contextKind)) throw new Error(`${seed.id} 的 contextKind 无效`);
  const usesWeight = WEIGHT_RECORDING_MODES.has(seed.recordingMode);
  if (usesWeight) {
    if (!VALID_LOAD_BASIS.has(seed.loadBasis)) throw new Error(`${seed.id} 的 loadBasis 无效`);
    if (!VALID_LOAD_DIRECTIONS.has(seed.loadDirection)) throw new Error(`${seed.id} 的 loadDirection 无效`);
  } else if (seed.loadBasis !== null || seed.loadDirection !== null) {
    throw new Error(`${seed.id} 的非负重记录模式不得设置负重口径或成绩方向`);
  }
  if (seed.rateMetric === "distance_per_time" && !DISTANCE_DURATION_RECORDING_MODES.has(seed.recordingMode)) {
    throw new Error(`${seed.id} 的 distance_per_time 与记录模式不兼容`);
  }
  if (seed.rateMetric === "load_distance_per_time" && seed.recordingMode !== "weight_distance_duration") {
    throw new Error(`${seed.id} 的 load_distance_per_time 与记录模式不兼容`);
  }
  if (seed.rateMetric === "reps_per_time" && seed.recordingMode !== "reps_duration") {
    throw new Error(`${seed.id} 的 reps_per_time 与记录模式不兼容`);
  }
  if (seed.contextKind === "resistance_level" && seed.rateMetric !== "none") {
    throw new Error(`${seed.id} 记录阻力时不得启用竞速指标`);
  }
  if (seed.rateMetric !== "none" && seed.rateMetric !== "reps_per_time" && !DISTANCE_DURATION_RECORDING_MODES.has(seed.recordingMode)) {
    throw new Error(`${seed.id} 的 rateMetric 与记录模式不兼容`);
  }
}

function validateMuscles(id, primary, secondary) {
  if (primary.length > 3 || secondary.length > 6) throw new Error(`${id} 的肌群数量超限`);
  assertUnique(primary, `${id} 主肌群`);
  assertUnique(secondary, `${id} 次肌群`);
  if ([...primary, ...secondary].some((item) => !VALID_MUSCLES.has(item))) throw new Error(`${id} 包含非法肌群`);
  if (secondary.some((item) => primary.includes(item))) throw new Error(`${id} 的主次肌群交叉`);
}

async function loadUpstream() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`固定上游 exercises.json 读取失败：HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("固定上游 exercises.json 不是数组");
  return new Map(data.map((item) => [item.id, item]));
}

function validateUpstream(catalog, upstream) {
  for (const seed of catalog) {
    if (!seed.provenance) continue;
    const sourceId = seed.provenance.sourceId;
    const raw = upstream.get(sourceId);
    if (!raw) throw new Error(`固定上游不存在候选 id：${sourceId}`);
    if (!CATEGORY_MAP.has(raw.body_part) || CATEGORY_MAP.get(raw.body_part) !== seed.category) {
      throw new Error(`${seed.id} 的 category 与固定上游不一致`);
    }
    if (EQUIPMENT_MAP.get(raw.equipment) !== seed.equipment) {
      throw new Error(`${seed.id} 的 equipment 与固定上游不一致`);
    }
  }
}

function renderCatalog(catalog, candidateHash) {
  return `// 此文件由 scripts/exerciseCatalog.mjs 生成，禁止手改。\n// candidates sha256: ${candidateHash}\n// upstream revision: ${UPSTREAM_SHA}\nimport type { DefaultExerciseSeed } from "./models";\n\nexport const DEFAULT_EXERCISE_SEEDS: DefaultExerciseSeed[] = ${JSON.stringify(catalog, null, 2)};\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`${label} 不唯一`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
