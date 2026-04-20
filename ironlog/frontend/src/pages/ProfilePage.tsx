import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import api from "@/services/api";
import { LogOut, Save, User as UserIcon } from "lucide-react";
import { useToastStore } from "@/components/Toast";
import { useConfirmStore } from "@/components/ConfirmDialog";

export default function ProfilePage() {
  const { user, logout, fetchUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    nickname: user?.nickname || "",
    gender: user?.gender || "",
    height: user?.height?.toString() || "",
    weight: user?.weight?.toString() || "",
    birth_date: user?.birth_date || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        nickname: user.nickname || "",
        gender: user.gender || "",
        height: user.height?.toString() || "",
        weight: user.weight?.toString() || "",
        birth_date: user.birth_date || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/users/me", {
        nickname: form.nickname || undefined,
        gender: form.gender || undefined,
        height: form.height ? parseFloat(form.height) : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        birth_date: form.birth_date || undefined,
      });
      await fetchUser();
      setEditing(false);
    } catch {
      useToastStore.getState().add("保存失败", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const ok = await useConfirmStore.getState().show("退出登录", "确定退出登录？");
    if (ok) {
      logout();
      window.location.href = "/login";
    }
  };

  if (!user) return null;

  const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all";

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-8 pb-12 flex flex-col items-center text-white">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-3 shadow-lg ring-2 ring-white/30">
          <UserIcon size={36} className="text-white" />
        </div>
        <h1 className="text-xl font-bold">{user.nickname || "未设置昵称"}</h1>
        <p className="text-emerald-100 text-sm mt-0.5">{user.email}</p>
      </div>

      <div className="px-4 -mt-5 space-y-4">
        {/* Stats row */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid grid-cols-3 divide-x divide-slate-100">
          {[
            { v: user.height ? `${user.height}` : "—", u: "cm", l: "身高" },
            { v: user.weight ? `${user.weight}` : "—", u: "kg", l: "体重" },
            { v: user.gender === "male" ? "男" : user.gender === "female" ? "女" : "—", u: "", l: "性别" },
          ].map(({ v, u, l }) => (
            <div key={l} className="text-center">
              <p className="text-xl font-bold text-slate-900">{v}<span className="text-sm font-normal text-slate-400 ml-0.5">{u}</span></p>
              <p className="text-xs text-slate-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Profile card */}
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
                { l: "昵称", v: user.nickname || "未设置" },
                { l: "性别", v: user.gender === "male" ? "男" : user.gender === "female" ? "女" : "未设置" },
                { l: "身高", v: user.height ? `${user.height} cm` : "未设置" },
                { l: "体重", v: user.weight ? `${user.weight} kg` : "未设置" },
                { l: "出生日期", v: user.birth_date || "未设置" },
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
                <input
                  type="text"
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  className={inputCls}
                  placeholder="如何称呼你？"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">性别</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={inputCls}
                >
                  <option value="">未设置</option>
                  <option value="male">男</option>
                  <option value="female">女</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">身高 (cm)</label>
                  <input
                    type="number"
                    value={form.height}
                    onChange={(e) => setForm({ ...form, height: e.target.value })}
                    className={inputCls}
                    placeholder="170"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">体重 (kg)</label>
                  <input
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    className={inputCls}
                    placeholder="70"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">出生日期</label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-white border border-red-100 text-red-500 rounded-2xl flex items-center justify-center gap-2 font-semibold text-sm shadow-sm active:scale-[0.98] transition-transform"
        >
          <LogOut size={16} />
          退出登录
        </button>
      </div>
    </div>
  );
}
