import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Save } from "lucide-react";
import { DEFAULT_THEME_ID } from "@/core/models";
import { getSettings, updateSettings } from "@/services/settings";
import { applyThemeId } from "@/theme/applyTheme";
import { THEME_DEFINITIONS } from "@/theme/themes";
import { useToastStore } from "@/components/Toast";

export default function SettingsPage() {
  const navigate = useNavigate();
  const toast = useToastStore((state) => state.add);
  const [form, setForm] = useState({ weight_unit: "kg" as "kg" | "lb", theme_id: DEFAULT_THEME_ID });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then((settings) => {
      setForm({ weight_unit: settings.weight_unit, theme_id: settings.theme_id });
      applyThemeId(settings.theme_id);
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      await updateSettings({ weight_unit: form.weight_unit, theme_id: form.theme_id });
      applyThemeId(form.theme_id);
      toast("设置已保存", "success");
      navigate("/profile");
    } catch {
      toast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "app-input w-full px-4 py-3 border rounded-xl text-sm transition-all";

  return (
    <div className="app-screen min-h-screen pb-8">
      <div className="sticky top-0 z-10 app-surface border-b app-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="w-9 h-9 flex items-center justify-center rounded-full app-surface-muted" aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold app-text">应用设置</h1>
      </div>

      <div className="px-5 pt-5 space-y-4">
        <div className="app-surface rounded-2xl border shadow-sm p-4 space-y-3">
          <div>
            <label htmlFor="settings-weight-unit" className="block text-xs font-semibold app-text-muted mb-1.5">重量单位</label>
            <select id="settings-weight-unit" value={form.weight_unit} onChange={(event) => setForm({ ...form, weight_unit: event.target.value as "kg" | "lb" })} className={inputCls}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
            <p className="text-xs app-text-muted mt-1.5">影响训练重量、体重、PR/RM 重量展示；身高、围度和距离不跟随切换。</p>
          </div>
          <div>
            <label htmlFor="settings-theme" className="block text-xs font-semibold app-text-muted mb-1.5">界面主题</label>
            <select id="settings-theme" value={form.theme_id} onChange={(event) => setForm({ ...form, theme_id: event.target.value })} className={inputCls}>
              {!THEME_DEFINITIONS.some((theme) => theme.id === form.theme_id) && (
                <option value={form.theme_id}>不支持的主题（保留当前值）</option>
              )}
              {THEME_DEFINITIONS.map((theme) => (
                <option key={theme.id} value={theme.id}>{theme.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={save} disabled={saving} className="app-primary-bg w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          <Save size={16} />
          {saving ? "保存中" : "保存"}
        </button>
      </div>
    </div>
  );
}
