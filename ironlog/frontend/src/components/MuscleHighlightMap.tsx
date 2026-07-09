import { MUSCLE_GROUP_LABELS, type MuscleGroupId } from "@/types";
import {
  BODY_DETAIL_PATHS,
  BODY_MUSCLE_GROUP_IDS,
  BODY_SHELL_PATHS,
  MUSCLE_REGION_PATHS,
  type BodyMuscleGroupId,
  type MuscleRegion,
} from "./MuscleHighlightMap.paths";

type HighlightState = "primary" | "secondary" | "idle";

interface MuscleHighlightMapProps {
  primaryMuscleGroupIds: MuscleGroupId[];
  secondaryMuscleGroupIds: MuscleGroupId[];
}

export default function MuscleHighlightMap({
  primaryMuscleGroupIds,
  secondaryMuscleGroupIds,
}: MuscleHighlightMapProps) {
  const primarySet = new Set(primaryMuscleGroupIds.filter(isBodyMuscleGroupId));
  const secondarySet = new Set(secondaryMuscleGroupIds.filter(isBodyMuscleGroupId));
  const resolveState = (id: BodyMuscleGroupId): HighlightState => {
    if (primarySet.has(id)) return "primary";
    if (secondarySet.has(id)) return "secondary";
    return "idle";
  };

  return (
    <div className="app-surface-muted rounded-lg border app-border p-3 overflow-hidden">
      {/* <div className="grid grid-cols-2 px-2 text-center text-[11px] font-semibold app-text-muted">
        <span>前视图</span>
        <span>后视图</span>
      </div> */}

      <svg
        viewBox="0 0 535 462"
        className="mt-1 block h-auto w-full max-h-[340px] mx-auto"
        role="img"
        aria-label="目标肌群人体高亮图"
      >
        <title>目标肌群人体高亮图</title>

        <g aria-hidden="true">
          {BODY_SHELL_PATHS.map((path, index) => (
            <path
              key={`shell-${index}`}
              d={path}
              fill="var(--color-surface)"
              stroke="var(--color-text)"
              strokeWidth={1}
              opacity={0.76}
            />
          ))}
        </g>

        {MUSCLE_REGION_PATHS.map((region) => (
          <Region key={region.id} region={region} state={resolveState(region.id)} />
        ))}

        <g aria-hidden="true">
          {BODY_DETAIL_PATHS.map((path, index) => (
            <path
              key={`detail-${index}`}
              d={path}
              fill="var(--color-text-secondary)"
              stroke="var(--color-text)"
              strokeWidth={0}
              opacity={0.72}
            />
          ))}
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs app-text-muted">
        <LegendItem state="primary" label="主目标" />
        <LegendItem state="secondary" label="次要目标" />
        <LegendItem state="idle" label="未命中" />
      </div>
    </div>
  );
}

function Region({ region, state }: { region: MuscleRegion; state: HighlightState }) {
  const style = styleFor(state);
  return (
    <g>
      <title>{`${MUSCLE_GROUP_LABELS[region.id]}：${stateLabel(state)}`}</title>
      {region.paths.map((path, index) => (
        <path
          key={`${region.id}-${index}`}
          d={path}
          fill={style.fill}
          stroke={style.stroke}
          strokeOpacity={style.strokeOpacity}
          strokeWidth={style.strokeWidth}
          opacity={style.opacity}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  );
}

function LegendItem({ state, label }: { state: HighlightState; label: string }) {
  const style = styleFor(state);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full border"
        style={{
          backgroundColor: style.fill,
          borderColor: style.stroke === "none" ? "var(--color-border)" : style.stroke,
          opacity: style.opacity,
        }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function styleFor(state: HighlightState) {
  if (state === "primary") {
    return {
      fill: "var(--color-primary)",
      opacity: 0.96,
      stroke: "var(--color-surface)",
      strokeOpacity: 0.86,
      strokeWidth: 1.12,
    };
  }
  if (state === "secondary") {
    return {
      fill: "var(--color-primary-soft)",
      opacity: 1,
      stroke: "var(--color-primary)",
      strokeOpacity: 0.44,
      strokeWidth: 1.08,
    };
  }
  return {
    fill: "var(--color-text-secondary)",
    opacity: 0.46,
    stroke: "var(--color-surface)",
    strokeOpacity: 0.72,
    strokeWidth: 0.96,
  };
}

function stateLabel(state: HighlightState): string {
  if (state === "primary") return "主目标";
  if (state === "secondary") return "次要目标";
  return "未命中";
}

function isBodyMuscleGroupId(id: MuscleGroupId): id is BodyMuscleGroupId {
  return (BODY_MUSCLE_GROUP_IDS as readonly MuscleGroupId[]).includes(id);
}
