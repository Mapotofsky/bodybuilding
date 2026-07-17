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
  "weight_reps", "reps", "duration", "distance_duration",
  "weight_duration", "weight_distance_duration",
]);
const WEIGHT_RECORDING_MODES = new Set(["weight_reps", "weight_duration", "weight_distance_duration"]);
const DISTANCE_DURATION_RECORDING_MODES = new Set(["distance_duration", "weight_distance_duration"]);
const VALID_LOAD_BASIS = new Set(["total", "per_hand"]);
const VALID_COUNT_BASIS = new Set(["whole_set", "per_side"]);
const VALID_LOAD_DIRECTIONS = new Set(["higher_better", "lower_better"]);
const VALID_RATE_METRICS = new Set(["none", "distance_per_time", "load_distance_per_time"]);
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
    console.log(`已生成 ${catalog.length} 条默认动作（A=${countGrade(catalog, "A")}，B=${countGrade(catalog, "B")}）`);
    return;
  }

  const committed = await readFile(OUTPUT_PATH, "utf8");
  if (committed !== output) {
    throw new Error("默认动作生成产物与 candidates.md 不一致；请运行 npm run catalog:generate");
  }
  console.log(`离线目录校验通过：A=${countGrade(catalog, "A")}，B=${countGrade(catalog, "B")}，共 ${catalog.length} 条`);
}

function parseCatalog(markdown) {
  return markdown.split(/\r?\n/)
    .filter((line) => /^\| [AB] \|/.test(line))
    .map((line, index) => parseRow(line, index + 1));
}

function parseRow(line, rowNumber) {
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells.length !== 6) throw new Error(`候选表第 ${rowNumber} 行列数无效`);
  const [grade, mapping, upstreamFacts, descriptionCell] = cells;
  const mappingMatch = mapping.match(/^`(ex-[^`]+)`<br>([^<]+)<br>`([a-z_]+) · ([a-z_]+)`<br>`([a-z_]+|null) · ([a-z_]+) · ([a-z_]+|null) · ([a-z_]+)`<br>P `\[([^\]]*)\]`；S `\[([^\]]*)\]`$/);
  if (!mappingMatch) throw new Error(`候选映射无法解析：${mapping}`);
  const upstreamMatch = upstreamFacts.match(/^\[([0-9]{4})\]\([^)]*\) `([^`]+)`<br>`([^/`]+)\/([^`]+)`；`([^`]+)`<br>target `([^`]+)`；group `([^`]+)`；secondary `\[([^\]]*)\]`$/);
  if (!upstreamMatch) throw new Error(`上游事实无法解析：${upstreamFacts}`);

  const [, id, name, category, recordingMode, loadBasisValue, countBasis, loadDirectionValue, rateMetric, primary, secondary] = mappingMatch;
  const [, sourceId, upstreamName, upstreamCategory, upstreamBodyPart, upstreamEquipment, target, muscleGroup, upstreamSecondary] = upstreamMatch;
  const equipment = EQUIPMENT_MAP.get(upstreamEquipment);
  if (!equipment) throw new Error(`候选 ${id} 使用未映射器械：${upstreamEquipment}`);
  return {
    grade,
    seed: {
      id,
      name,
      category,
      recordingMode,
      loadBasis: loadBasisValue === "null" ? null : loadBasisValue,
      countBasis,
      loadDirection: loadDirectionValue === "null" ? null : loadDirectionValue,
      rateMetric,
      equipment,
      description: descriptionCell.split("<br>")[0].replaceAll("↵↵", "\n\n").replaceAll("↵", "\n"),
      primaryMuscleGroupIds: parseList(primary),
      secondaryMuscleGroupIds: parseList(secondary),
      provenance: { source: UPSTREAM_SOURCE, sourceId, sourceRevision: UPSTREAM_SHA },
    },
    upstream: {
      id: sourceId,
      name: upstreamName,
      category: upstreamCategory,
      body_part: upstreamBodyPart,
      equipment: upstreamEquipment,
      target,
      muscle_group: muscleGroup,
      secondary_muscles: parseList(upstreamSecondary),
    },
  };
}

function parseList(value) {
  return value.trim() ? value.split(",").map((item) => item.trim()) : [];
}

function validateCatalog(catalog) {
  if (countGrade(catalog, "A") !== 43 || countGrade(catalog, "B") !== 20 || catalog.length !== 63) {
    throw new Error(`候选数量错误：A=${countGrade(catalog, "A")}，B=${countGrade(catalog, "B")}，总数=${catalog.length}`);
  }
  assertUnique(catalog.map((item) => item.seed.id), "IronLog ID");
  assertUnique(catalog.map((item) => item.seed.provenance.sourceId), "upstream id");
  for (const { seed, upstream } of catalog) {
    if (!CATEGORY_MAP.has(upstream.body_part) || CATEGORY_MAP.get(upstream.body_part) !== seed.category) {
      throw new Error(`${seed.id} 的 category 与候选映射规则不一致`);
    }
    validateRecordingConfiguration(seed);
    if (seed.description.trim().length < 1 || seed.description.length > 500 || seed.description.includes("↵")) {
      throw new Error(`${seed.id} 的 description 长度或换行标记无效`);
    }
    validateMuscles(seed.id, seed.primaryMuscleGroupIds, seed.secondaryMuscleGroupIds);
  }
  if (catalog.some((item) => item.seed.provenance.sourceId === "0684")) throw new Error("0684 不得进入目录");
  const running = catalog.find((item) => item.seed.id === "ex-running")?.seed;
  if (!running || running.provenance.sourceId !== "0685" || running.description.includes("原地") || !running.description.includes("\n")) {
    throw new Error("ex-running 的人工语义扩展不符合已批准契约");
  }
  const farmerWalk = catalog.find((item) => item.seed.id === "ex-farmer-walk")?.seed;
  if (!farmerWalk || farmerWalk.provenance.sourceId !== "2133"
    || farmerWalk.recordingMode !== "weight_distance_duration"
    || farmerWalk.loadBasis !== "per_hand"
    || farmerWalk.countBasis !== "whole_set"
    || farmerWalk.loadDirection !== "higher_better"
    || farmerWalk.rateMetric !== "load_distance_per_time") {
    throw new Error("ex-farmer-walk 的记录配置不符合已批准契约");
  }
  const perSideIds = catalog.filter((item) => item.seed.countBasis === "per_side").map((item) => item.seed.id).sort();
  const expectedPerSideIds = [
    "ex-band-pallof-press",
    "ex-bodyweight-split-squat",
    "ex-dead-bug",
    "ex-dumbbell-bulgarian-split-squat",
    "ex-dumbbell-lunge",
    "ex-dumbbell-step-up",
    "ex-one-arm-dumbbell-row",
    "ex-side-plank",
  ];
  if (JSON.stringify(perSideIds) !== JSON.stringify(expectedPerSideIds)) {
    throw new Error("默认目录的每侧计数动作不符合已批准契约");
  }
}

function validateRecordingConfiguration(seed) {
  if (!VALID_RECORDING_MODES.has(seed.recordingMode)) throw new Error(`${seed.id} 的 recordingMode 无效`);
  if (!VALID_COUNT_BASIS.has(seed.countBasis)) throw new Error(`${seed.id} 的 countBasis 无效`);
  if (!VALID_RATE_METRICS.has(seed.rateMetric)) throw new Error(`${seed.id} 的 rateMetric 无效`);
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
  if (seed.rateMetric !== "none" && !DISTANCE_DURATION_RECORDING_MODES.has(seed.recordingMode)) {
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
  for (const item of catalog) {
    const raw = upstream.get(item.upstream.id);
    if (!raw) throw new Error(`固定上游不存在候选 id：${item.upstream.id}`);
    for (const key of ["id", "name", "category", "body_part", "equipment", "target", "muscle_group"]) {
      if (raw[key] !== item.upstream[key]) throw new Error(`${item.upstream.id}.${key} 与固定上游不一致`);
    }
    if (JSON.stringify(raw.secondary_muscles) !== JSON.stringify(item.upstream.secondary_muscles)) {
      throw new Error(`${item.upstream.id}.secondary_muscles 与固定上游不一致`);
    }
  }
}

function renderCatalog(catalog, candidateHash) {
  const seeds = catalog.map((item) => item.seed);
  return `// 此文件由 scripts/exerciseCatalog.mjs 生成，禁止手改。\n// candidates sha256: ${candidateHash}\n// upstream revision: ${UPSTREAM_SHA}\nimport type { DefaultExerciseSeed } from "./models";\n\nexport const DEFAULT_EXERCISE_SEEDS: DefaultExerciseSeed[] = ${JSON.stringify(seeds, null, 2)};\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function countGrade(catalog, grade) {
  return catalog.filter((item) => item.grade === grade).length;
}

function assertUnique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`${label} 不唯一`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
