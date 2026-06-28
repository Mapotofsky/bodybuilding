import { useState, useEffect, useRef } from "react";
import { Camera, Save, Trash2, User as UserIcon, RefreshCw } from "lucide-react";
import { clearProfileAvatar, getProfile, getProfileAvatarDataUrl, saveProfileAvatar, updateProfile } from "@/services/profile";
import { getSettings, updateSettings } from "@/services/settings";
import type { User } from "@/types";
import { useToastStore } from "@/components/Toast";
import { useNavigate } from "react-router-dom";
import { useConfirmStore } from "@/components/ConfirmDialog";

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nickname: "",
    gender: "",
    height: "",
    weight: "",
    birth_date: "",
    weight_unit: "kg" as "kg" | "lb",
  });
  const [saving, setSaving] = useState(false);
  const confirm = useConfirmStore((state) => state.show);

  useEffect(() => {
    Promise.all([getProfile(), getSettings(), getProfileAvatarDataUrl()]).then(([data, settings, avatar]) => {
      setProfile(data);
      setAvatarDataUrl(avatar);
      setForm({
        nickname: data.nickname || "",
        gender: data.gender || "",
        height: data.height?.toString() || "",
        weight: data.weight?.toString() || "",
        birth_date: data.birth_date || "",
        weight_unit: settings.weight_unit,
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const [next] = await Promise.all([
        updateProfile({
          nickname: form.nickname || null,
          gender: form.gender || null,
          height: form.height ? parseFloat(form.height) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          birth_date: form.birth_date || null,
        }),
        updateSettings({ weight_unit: form.weight_unit }),
      ]);
      setProfile(next);
      setEditing(false);
      useToastStore.getState().add("资料已保存", "success");
    } catch {
      useToastStore.getState().add("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const next = await saveProfileAvatar(dataUrl);
      setProfile(next);
      setAvatarDataUrl(dataUrl);
      useToastStore.getState().add("头像已保存", "success");
    } catch (err) {
      useToastStore.getState().add(err instanceof Error ? err.message : "头像保存失败", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearAvatar = async () => {
    const ok = await confirm("清除头像", "只会清除本机资料中的头像引用和头像资源，不会影响训练数据。");
    if (!ok) return;
    try {
      const next = await clearProfileAvatar();
      setProfile(next);
      setAvatarDataUrl(null);
      useToastStore.getState().add("头像已清除", "success");
    } catch (err) {
      useToastStore.getState().add(err instanceof Error ? err.message : "清除头像失败", "error");
    }
  };

  if (!profile) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">加载中...</div>;
  }

  const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all";

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-8 pb-12 flex flex-col items-center text-white">
        <div className="relative mb-3">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/30 overflow-hidden">
            {avatarDataUrl ? <img src={avatarDataUrl} alt="头像" className="w-full h-full object-cover" /> : <UserIcon size={36} className="text-white" />}
          </div>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full bg-white text-emerald-600 shadow-sm flex items-center justify-center" aria-label="选择头像">
            <Camera size={16} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
        </div>
        <h1 className="text-xl font-bold">{profile.nickname || "训练者"}</h1>
        <p className="text-emerald-100 text-sm mt-0.5">本地单人版</p>
        {avatarDataUrl && (
          <button type="button" onClick={handleClearAvatar} className="mt-3 inline-flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1.5 rounded-full text-white">
            <Trash2 size={12} />
            清除头像
          </button>
        )}
      </div>

      <div className="px-5 -mt-5 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid grid-cols-3 divide-x divide-slate-100">
          {[
            { v: profile.height ? `${profile.height}` : "—", u: "cm", l: "身高" },
            { v: profile.weight ? `${profile.weight}` : "—", u: "kg", l: "体重" },
            { v: profile.gender === "male" ? "男" : profile.gender === "female" ? "女" : "—", u: "", l: "性别" },
          ].map(({ v, u, l }) => (
            <div key={l} className="text-center">
              <p className="text-xl font-bold text-slate-900">{v}<span className="text-sm font-normal text-slate-400 ml-0.5">{u}</span></p>
              <p className="text-xs text-slate-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">个人资料</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full"
              >
                编辑
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm text-white font-semibold bg-emerald-500 px-3 py-1 rounded-full flex items-center gap-1 disabled:opacity-50"
              >
                <Save size={12} /> {saving ? "保存中" : "保存"}
              </button>
            )}
          </div>

          {!editing ? (
            <div className="space-y-0 divide-y divide-slate-50">
              {[
                { l: "昵称", v: profile.nickname || "未设置" },
                { l: "性别", v: profile.gender === "male" ? "男" : profile.gender === "female" ? "女" : "未设置" },
                { l: "身高", v: profile.height ? `${profile.height} cm` : "未设置" },
                { l: "体重", v: profile.weight ? `${profile.weight} kg` : "未设置" },
                { l: "训练重量单位", v: form.weight_unit },
                { l: "出生日期", v: profile.birth_date || "未设置" },
              ].map(({ l, v }) => (
                <div key={l} className="flex justify-between items-center py-2.5">
                  <span className="text-sm text-slate-500">{l}</span>
                  <span className="text-sm font-semibold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">昵称</label>
                <input type="text" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className={inputCls} placeholder="如何称呼你？" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">性别</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
                  <option value="">未设置</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">身高 (cm)</label>
                  <input type="number" value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} className={inputCls} placeholder="170" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">体重 (kg)</label>
                  <input type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className={inputCls} placeholder="70" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">出生日期</label>
                <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">训练重量单位</label>
                <select value={form.weight_unit} onChange={(e) => setForm({ ...form, weight_unit: e.target.value as "kg" | "lb" })} className={inputCls}>
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate("/sync")}
          className="w-full py-3.5 bg-white border border-slate-100 text-slate-700 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
        >
          <RefreshCw size={16} className="text-emerald-500" />
          数据同步与备份
        </button>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}
