import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { TimelineNoteRangeType } from "@/core/models";
import { createTimelineNote, deleteTimelineNote, listTimelineNotes, updateTimelineNote, type TimelineNote } from "@/services/timelineNotes";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { useToastStore } from "@/components/Toast";

const RANGE_LABELS: Record<TimelineNoteRangeType, string> = {
  single_day: "单日",
  date_range: "日期范围",
  open_ended: "持续中",
};

export default function TimelineNotesPage() {
  const navigate = useNavigate();
  const confirm = useConfirmStore((state) => state.show);
  const toast = useToastStore((state) => state.add);
  const [notes, setNotes] = useState<TimelineNote[]>([]);
  const [editing, setEditing] = useState<TimelineNote | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    setNotes(await listTimelineNotes());
  }

  async function remove(note: TimelineNote) {
    const ok = await confirm("删除时间段备注", "删除后会写入 tombstone，不会改变训练、身体数据或成绩记录。");
    if (!ok) return;
    await deleteTimelineNote(note.id);
    toast("备注已删除", "success");
    reload();
  }

  return (
    <div className="app-page app-screen pb-8">
      <div className="sticky top-0 z-10 app-surface border-b app-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="w-9 h-9 flex items-center justify-center rounded-full app-surface-muted" aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold app-text flex-1">时间段备注</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="app-primary-bg w-9 h-9 rounded-full flex items-center justify-center" aria-label="新增备注">
          <Plus size={18} />
        </button>
      </div>

      <div className="px-5 pt-5 space-y-2">
        {notes.length === 0 ? (
          <div className="app-surface rounded-2xl border py-12 text-center text-sm app-text-muted">还没有时间段备注</div>
        ) : notes.map((note) => (
          <div key={note.id} className="app-surface rounded-2xl border shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="app-primary-soft text-xs font-semibold px-2 py-0.5 rounded-full border">{RANGE_LABELS[note.range_type]}</span>
                  <span className="text-xs app-text-muted">{rangeText(note)}</span>
                </div>
                <p className="text-sm app-text font-semibold mt-2 whitespace-pre-wrap">{note.content}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => { setEditing(note); setShowForm(true); }} className="w-9 h-9 app-surface-muted rounded-full flex items-center justify-center" aria-label="编辑">
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(note)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: "var(--color-danger)", backgroundColor: "var(--color-surface-2)" }} aria-label="删除">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <TimelineNoteForm
          initial={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function TimelineNoteForm({ initial, onClose, onSaved }: { initial: TimelineNote | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToastStore((state) => state.add);
  const [content, setContent] = useState(initial?.content || "");
  const [rangeType, setRangeType] = useState<TimelineNoteRangeType>(initial?.range_type || "single_day");
  const [startDate, setStartDate] = useState(initial?.start_date || todayString());
  const [endDate, setEndDate] = useState(initial?.end_date || initial?.start_date || todayString());
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const payload = {
        content,
        range_type: rangeType,
        start_date: startDate,
        end_date: rangeType === "open_ended" ? null : rangeType === "single_day" ? startDate : endDate,
        workout_id: initial?.workout_id ?? null,
      };
      if (initial) await updateTimelineNote(initial.id, payload);
      else await createTimelineNote(payload);
      toast(initial ? "备注已更新" : "备注已新增", "success");
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "app-input w-full px-3 py-2.5 border rounded-xl text-sm";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="关闭" />
      <div className="relative w-full max-w-[480px] app-surface rounded-t-3xl p-5 space-y-4 md:max-w-[768px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold app-text">{initial ? "编辑时间段备注" : "新增时间段备注"}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full app-surface-muted flex items-center justify-center" aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold app-text-muted mb-1.5">内容</label>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} className="app-input w-full px-3 py-2.5 border rounded-xl text-sm min-h-24" placeholder="例如：开始跑步通勤" />
        </div>
        <div>
          <label className="block text-xs font-semibold app-text-muted mb-1.5">范围类型</label>
          <select value={rangeType} onChange={(event) => setRangeType(event.target.value as TimelineNoteRangeType)} className={inputCls}>
            <option value="single_day">单日</option>
            <option value="date_range">日期范围</option>
            <option value="open_ended">持续中</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold app-text-muted mb-1.5">开始日期</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold app-text-muted mb-1.5">结束日期</label>
            <input type="date" value={rangeType === "single_day" ? startDate : endDate} disabled={rangeType !== "date_range"} onChange={(event) => setEndDate(event.target.value)} className={inputCls} />
          </div>
        </div>
        <button onClick={submit} disabled={saving} className="app-primary-bg w-full h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <Save size={15} />
          {saving ? "保存中" : "保存"}
        </button>
      </div>
    </div>
  );
}

function rangeText(note: TimelineNote): string {
  if (note.range_type === "open_ended") return `${note.start_date} 起`;
  if (note.range_type === "single_day") return note.start_date;
  return `${note.start_date} 至 ${note.end_date}`;
}

function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
