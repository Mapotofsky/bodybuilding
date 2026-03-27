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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-blue-50 to-white">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
          <Dumbbell className="text-white" size={28} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">IronLog</h1>
      </div>

      <div className="w-full max-w-sm">
        <h2 className="text-xl font-semibold text-center mb-6">登录</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="请输入邮箱"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="请输入密码"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 transition"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          还没有账号？{" "}
          <Link to="/register" className="text-blue-500 font-medium">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
