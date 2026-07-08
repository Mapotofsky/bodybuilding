import type { TimelineNoteDoc, TimelineNoteRangeType } from "@/core/models";
import { localRepository } from "@/repositories/localJsonRepository";

export interface TimelineNotePayload {
  content: string;
  range_type: TimelineNoteRangeType;
  start_date: string;
  end_date?: string | null;
  workout_id?: string | null;
}

export interface TimelineNote {
  id: string;
  content: string;
  range_type: TimelineNoteRangeType;
  start_date: string;
  end_date: string | null;
  workout_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function listTimelineNotes(): Promise<TimelineNote[]> {
  return (await localRepository.listTimelineNotes()).map(toTimelineNote);
}

export async function getTimelineNote(id: string): Promise<TimelineNote> {
  const note = await localRepository.getTimelineNote(id);
  if (!note) throw new Error("时间段备注不存在");
  return toTimelineNote(note);
}

export async function createTimelineNote(body: TimelineNotePayload): Promise<TimelineNote> {
  return toTimelineNote(await localRepository.createTimelineNote(await normalizeTimelineNotePayload(body)));
}

export async function updateTimelineNote(id: string, body: TimelineNotePayload): Promise<TimelineNote> {
  await getTimelineNote(id);
  return toTimelineNote(await localRepository.updateTimelineNote(id, await normalizeTimelineNotePayload(body)));
}

export async function deleteTimelineNote(id: string): Promise<void> {
  await localRepository.deleteTimelineNote(id);
}

export async function listEffectiveTimelineNotes(params: { from: string; to: string }): Promise<TimelineNote[]> {
  const queryStart = normalizeDate(params.from, "开始日期");
  const clippedQueryEnd = minDate(normalizeDate(params.to, "结束日期"), todayString());
  if (clippedQueryEnd < queryStart) return [];
  const notes = await localRepository.listTimelineNotes();
  return notes
    .filter((note) => {
      const effectiveEnd = note.rangeType === "open_ended" ? todayString() : minDate(note.endDate || note.startDate, todayString());
      return note.startDate <= clippedQueryEnd && effectiveEnd >= queryStart;
    })
    .map(toTimelineNote);
}

async function normalizeTimelineNotePayload(body: TimelineNotePayload): Promise<Omit<TimelineNoteDoc, "id" | "createdAt" | "updatedAt" | "deletedAt" | "schemaVersion">> {
  const content = body.content.trim();
  if (!content || content.length > 500) throw new Error("备注内容必须为 1 到 500 个字符");
  const rangeType = body.range_type;
  if (rangeType !== "single_day" && rangeType !== "date_range" && rangeType !== "open_ended") throw new Error("备注范围类型无效");
  const startDate = normalizeDate(body.start_date, "开始日期");
  if (startDate > todayString()) throw new Error("开始日期不能晚于今天");
  const endDate = normalizeEndDate(rangeType, startDate, body.end_date);
  const workoutId = body.workout_id ?? null;
  if (workoutId && !(await localRepository.getWorkout(workoutId))) throw new Error("关联训练不存在");
  return {
    content,
    rangeType,
    startDate,
    endDate,
    workoutId,
  };
}

function normalizeEndDate(rangeType: TimelineNoteRangeType, startDate: string, endDate: string | null | undefined): string | null {
  if (rangeType === "single_day") {
    if (endDate != null && endDate !== startDate) throw new Error("单日备注的结束日期必须等于开始日期");
    return startDate;
  }
  if (rangeType === "open_ended") {
    if (endDate != null) throw new Error("持续备注不能设置结束日期");
    return null;
  }
  if (!endDate) throw new Error("日期范围备注必须设置结束日期");
  const normalized = normalizeDate(endDate, "结束日期");
  if (normalized < startDate) throw new Error("结束日期不能早于开始日期");
  return normalized;
}

function normalizeDate(value: string, label: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) throw new Error(`${label}格式无效`);
  return value;
}

function toTimelineNote(doc: TimelineNoteDoc): TimelineNote {
  return {
    id: doc.id,
    content: doc.content,
    range_type: doc.rangeType,
    start_date: doc.startDate,
    end_date: doc.endDate,
    workout_id: doc.workoutId,
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
}

function minDate(left: string, right: string): string {
  return left < right ? left : right;
}

function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
