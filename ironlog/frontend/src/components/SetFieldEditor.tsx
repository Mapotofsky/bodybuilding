import { useState } from "react";
import { getRecordingModeSpec, validateWorkoutSetForMode, type RecordingField } from "@/core/recordingModes";
import type { WeightUnit } from "@/core/models";
import type { RecordingSnapshot } from "@/utils/recordingPresentation";
import { weightFieldLabel } from "@/utils/recordingPresentation";
import StepInput from "@/components/ui/StepInput";

export interface SetFieldDraft {
  weight: string;
  reps: string;
  distanceM: string;
  durationSec: string;
  contextValue?: string;
}

interface SetFieldEditorProps {
  recording: RecordingSnapshot;
  value: SetFieldDraft;
  weightUnit: WeightUnit;
  onChange: (field: keyof SetFieldDraft, value: string) => void;
}

/** Shared controlled editor for every raw set field selected by the recording-mode registry. */
export default function SetFieldEditor({ recording, value, weightUnit, onChange }: SetFieldEditorProps) {
  const fields = getRecordingModeSpec(recording.recording_mode).fields;
  const gridClass = fields.length === 1 ? "grid-cols-1" : "grid-cols-2";
  const [validationError, setValidationError] = useState<string | null>(null);

  function change(field: keyof SetFieldDraft, nextValue: string) {
    onChange(field, nextValue);
    const next = { ...value, [field]: nextValue };
    setValidationError(validateSetFieldDraft(recording, next));
  }

  return (
    <div className="space-y-2 min-w-0">
      <div className={`grid ${gridClass} gap-3 min-w-0`} data-recording-mode={recording.recording_mode}>
        {fields.map((field, index) => (
          <div key={field} className={fields.length === 3 && index === 2 ? "col-span-2" : "min-w-0"}>
            <RecordingFieldInput
              field={field}
              recording={recording}
              weightUnit={weightUnit}
              value={value[fieldDraftKey(field)] ?? ""}
              onChange={(next) => change(fieldDraftKey(field), next)}
            />
          </div>
        ))}
      </div>
      {(recording.context_kind ?? "none") === "resistance_level" && (
        <StepInput label="阻力档位（可选）" value={value.contextValue ?? ""} onChange={(next) => change("contextValue", next)} step={0.5} min={0} max={200} inputMode="decimal" />
      )}
      {recording.context_kind === "incline_percent" && (
        <StepInput label="坡度 (%)" value={value.contextValue ?? ""} onChange={(next) => change("contextValue", next)} step={0.5} min={0} max={100} inputMode="decimal" />
      )}
      {validationError && <p role="alert" className="text-xs text-red-500">{validationError}</p>}
    </div>
  );
}

function RecordingFieldInput({ field, recording, weightUnit, value, onChange }: {
  field: RecordingField;
  recording: RecordingSnapshot;
  weightUnit: WeightUnit;
  value: string;
  onChange: (value: string) => void;
}) {
  switch (field) {
    case "weight":
      return <StepInput label={`${weightFieldLabel(recording)} (${weightUnit})`} value={value} onChange={onChange} step={weightUnit === "kg" ? 2.5 : 5} inputMode="decimal" />;
    case "reps":
      return <StepInput label={recording.recording_mode === "reps_duration" ? "步数（可选）" : recording.count_basis === "per_side" ? "每侧次数" : "次数"} value={value} onChange={onChange} step={1} inputMode="numeric" />;
    case "distanceM":
      return <StepInput label={recording.count_basis === "per_side" ? "每侧距离 (m)" : "距离 (m)"} value={value} onChange={onChange} step={10} inputMode="decimal" />;
    case "durationSec":
      return <StepInput label={durationLabel(recording)} value={value} onChange={onChange} step={10} inputMode="numeric" />;
  }
}

function fieldDraftKey(field: RecordingField): keyof SetFieldDraft {
  switch (field) {
    case "weight": return "weight";
    case "reps": return "reps";
    case "distanceM": return "distanceM";
    case "durationSec": return "durationSec";
  }
}

function parseDraftValue(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
}

export function validateSetFieldDraft(recording: RecordingSnapshot, value: SetFieldDraft): string | null {
  const fields = getRecordingModeSpec(recording.recording_mode).fields;
  try {
    validateWorkoutSetForMode({
      weight: fields.includes("weight") ? parseDraftValue(value.weight) : null,
      reps: fields.includes("reps") ? parseDraftValue(value.reps) : null,
      distanceM: fields.includes("distanceM") ? parseDraftValue(value.distanceM) : null,
      durationSec: fields.includes("durationSec") ? parseDraftValue(value.durationSec) : null,
      contextValue: parseDraftValue(value.contextValue ?? ""),
    }, {
      recordingMode: recording.recording_mode,
      loadBasis: recording.load_basis,
      countBasis: recording.count_basis,
      loadDirection: recording.load_direction,
      rateMetric: recording.rate_metric,
      contextKind: recording.context_kind ?? "none",
    }, "draft");
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "请输入有效数值";
  }
}

function durationLabel(recording: RecordingSnapshot): string {
  const base = recording.recording_mode === "duration" || recording.recording_mode === "weight_duration" ? "保持时间" : "用时";
  return `${recording.count_basis === "per_side" ? "每侧" : ""}${base} (秒)`;
}
