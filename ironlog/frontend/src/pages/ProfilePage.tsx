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

  return (
    <div className="p-4 space-y-6">
      {/* Avatar & Name */}
      <div className="flex flex-col items-center pt-4">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-3">
          <UserIcon size={36} className="text-blue-500" />
        </div>
        <h1 className="text-xl font-bold">{user.nickname || user.email}</h1>
        <p className="text-sm text-gray-400">{user.email}</p>
      </div>

      {/* Info Card */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">个人资料</h2>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-sm text-blue-500"
            >
              编辑
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm text-blue-500 flex items-center gap-1"
            >
              <Save size={14} /> {saving ? "保存中" : "保存"}
            </button>
          )}
        </div>

        {!editing ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">昵称</span>
              <span>{user.nickname || "未设置"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">性别</span>
              <span>
                {user.gender === "male"
                  ? "男"
                  : user.gender === "female"
                  ? "女"
                  : "未设置"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">身高</span>
              <span>{user.height ? `${user.height} cm` : "未设置"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">体重</span>
              <span>{user.weight ? `${user.weight} kg` : "未设置"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">出生日期</span>
              <span>{user.birth_date || "未设置"}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">昵称</label>
              <input
                type="text"
                value={form.nickname}
                onChange={(e) =>
                  setForm({ ...form, nickname: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">性别</label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="">未设置</option>
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  身高(cm)
                </label>
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) =>
                    setForm({ ...form, height: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  体重(kg)
                </label>
                <input
                  type="number"
                  value={form.weight}
                  onChange={(e) =>
                    setForm({ ...form, weight: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                出生日期
              </label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) =>
                  setForm({ ...form, birth_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 bg-red-50 text-red-500 rounded-xl flex items-center justify-center gap-2 font-medium"
      >
        <LogOut size={18} />
        退出登录
      </button>
    </div>
  );
}
