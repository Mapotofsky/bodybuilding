import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 pt-16 pb-12 px-6 flex flex-col items-center">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-4 shadow-lg">
          <Dumbbell className="text-white" size={32} />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">IronLog</h1>
        <p className="text-emerald-100 text-sm mt-1">记录每一次突破</p>
      </div>

      {/* Form card */}
      <div className="flex-1 px-6 -mt-5">
        <div className="bg-white rounded-3xl shadow-lg p-6 space-y-5">
          <h2 className="text-xl font-bold text-slate-900">登录账号</h2>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition bg-slate-50 focus:bg-white text-sm"
                placeholder="请输入邮箱地址"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none transition bg-slate-50 focus:bg-white text-sm"
                placeholder="请输入密码"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 text-white font-semibold rounded-2xl hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-sm shadow-emerald-200 mt-2"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            还没有账号？{" "}
            <Link to="/register" className="text-emerald-600 font-semibold">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
