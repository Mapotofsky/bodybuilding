import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ChevronLeft, Save, Trash2, User as UserIcon } from "lucide-react";
import { clearProfileAvatar, getProfile, getProfileAvatarDataUrl, saveProfileAvatar, updateProfile } from "@/services/profile";
import type { User } from "@/types";
import { useConfirmStore } from "@/components/ConfirmDialog";
import { useToastStore } from "@/components/Toast";

export default function PersonalProfilePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const confirm = useConfirmStore((state) => state.show);
  const toast = useToastStore((state) => state.add);
  const [profile, setProfile] = useState<User | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ nickname: "", gender: "", birth_date: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getProfile(), getProfileAvatarDataUrl()]).then(([data, avatar]) => {
      setProfile(data);
      setAvatarDataUrl(avatar);
      setForm({
        nickname: data.nickname || "",
        gender: data.gender || "",
        birth_date: data.birth_date || "",
      });
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const next = await updateProfile({
        nickname: form.nickname || null,
        gender: form.gender || null,
        birth_date: form.birth_date || null,
      });
      setProfile(next);
      toast("个人资料已保存", "success");
      navigate("/profile");
    } catch {
      toast("保存失败", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const next = await saveProfileAvatar(dataUrl);
      setProfile(next);
      setAvatarDataUrl(dataUrl);
      toast("头像已保存", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "头像保存失败", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function clearAvatar() {
    const ok = await confirm("清除头像", "只会清除本机资料中的头像引用和头像资源，不会影响训练数据。");
    if (!ok) return;
    try {
      const next = await clearProfileAvatar();
      setProfile(next);
      setAvatarDataUrl(null);
      toast("头像已清除", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "清除头像失败", "error");
    }
  }

  if (!profile) {
    return <div className="app-screen min-h-screen flex items-center justify-center app-text-muted">加载中...</div>;
  }

  const inputCls = "app-input w-full px-4 py-3 border rounded-xl text-sm transition-all";

  return (
    <div className="app-screen min-h-screen pb-8">
      <div className="sticky top-0 z-10 app-surface border-b app-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate("/profile")} className="w-9 h-9 flex items-center justify-center rounded-full app-surface-muted" aria-label="返回">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold app-text">个人资料</h1>
      </div>

      <div className="px-5 pt-5 space-y-4">
        <div className="app-surface rounded-2xl border shadow-sm p-5 flex flex-col items-center">
          <div className="relative">
            <div className="w-20 h-20 app-surface-muted rounded-full flex items-center justify-center overflow-hidden border app-border">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="头像" className="w-full h-full object-cover" /> : <UserIcon size={34} className="app-text-muted" />}
            </div>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -right-1 -bottom-1 w-8 h-8 rounded-full app-primary-bg shadow-sm flex items-center justify-center" aria-label="选择头像">
              <Camera size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
          </div>
          {avatarDataUrl && (
            <button type="button" onClick={clearAvatar} className="mt-3 inline-flex items-center gap-1.5 text-xs app-text-muted">
              <Trash2 size={12} />
              清除头像
            </button>
          )}
        </div>

        <div className="app-surface rounded-2xl border shadow-sm p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold app-text-muted mb-1.5">昵称</label>
            <input type="text" value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} className={inputCls} placeholder="如何称呼你？" />
          </div>
          <div>
            <label className="block text-xs font-semibold app-text-muted mb-1.5">性别</label>
            <select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })} className={inputCls}>
              <option value="">未设置</option>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold app-text-muted mb-1.5">出生日期</label>
            <input type="date" value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} className={inputCls} />
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}
