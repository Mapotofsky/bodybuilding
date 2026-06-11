import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { localRepository } from "@/repositories/localJsonRepository";
import { makePasswordKey } from "@/platform/documentStore";
import { syncNow, testWebDavConnection, type SyncStatus } from "@/sync/syncService";
import { useToastStore } from "@/components/Toast";

export default function SyncPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRef, setPasswordRef] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>("unconfigured");
  const [message, setMessage] = useState("未配置");
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  useEffect(() => {
    localRepository.getSettings().then((settings) => {
      setUrl(settings.webdav.url);
      setUsername(settings.webdav.username);
      setPasswordRef(settings.webdav.passwordRef);
      setLastSyncAt(settings.lastSyncAt);
      const configured = Boolean(settings.webdav.url && settings.webdav.username && settings.webdav.passwordRef);
      setStatus(configured ? "success" : "unconfigured");
      setMessage(configured ? "已配置" : "未配置");
    });
  }, []);

  async function saveSettings() {
    const nextPasswordRef = password ? (passwordRef || makePasswordKey()) : passwordRef;
    if (password && nextPasswordRef) await localRepository.writeSecret(nextPasswordRef, password);
    await localRepository.updateSettings({
      webdav: { url: url.trim(), username: username.trim(), passwordRef: nextPasswordRef },
    });
    setPassword("");
    setPasswordRef(nextPasswordRef);
    setStatus(url && username && nextPasswordRef ? "success" : "unconfigured");
    setMessage(url && username && nextPasswordRef ? "已配置" : "未配置");
    useToastStore.getState().add("同步设置已保存", "success");
  }

  async function handleTest() {
    setBusy(true);
    try {
      await saveSettings();
      await testWebDavConnection();
      setStatus("success");
      setMessage("连接成功");
    } catch (err) {
      setStatus("failed");
      setMessage(err instanceof Error ? err.message : "连接失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    setStatus("syncing");
    setMessage("同步中");
    setConflicts([]);
    try {
      await saveSettings();
      const result = await syncNow();
      setStatus(result.status);
      setMessage(result.message);
      setConflicts(result.conflicts);
      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      setStatus("failed");
      setMessage(err instanceof Error ? err.message : "同步失败");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-slate-50 focus:bg-white transition-all";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100">
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <h1 className="font-bold text-base text-slate-900">数据同步</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">WebDAV</h2>
            <StatusBadge status={status} label={message} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} placeholder="https://example.com/dav/ironlog" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">用户名</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} autoComplete="username" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">密码</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} type="password" autoComplete="current-password" placeholder={passwordRef ? "已保存，留空则不修改" : ""} />
            <p className="text-xs text-slate-400 mt-1">密码不会写入 JSON 数据文件。</p>
          </div>
          <button onClick={saveSettings} disabled={busy} className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-semibold disabled:opacity-50">
            保存设置
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">上次同步</span>
            <span className="font-semibold text-slate-800">{lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "从未同步"}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleTest} disabled={busy} className="py-3 bg-slate-100 text-slate-700 rounded-2xl font-semibold text-sm disabled:opacity-50">
              测试连接
            </button>
            <button onClick={handleSync} disabled={busy} className="py-3 bg-emerald-500 text-white rounded-2xl font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
              <RefreshCw size={16} className={status === "syncing" ? "animate-spin" : ""} />
              手动同步
            </button>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="font-semibold text-amber-700 text-sm mb-2">冲突日志</p>
            <div className="space-y-1">
              {conflicts.map((item, idx) => (
                <p key={idx} className="text-xs text-amber-700">{item}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: SyncStatus; label: string }) {
  const ok = status === "success";
  const failed = status === "failed" || status === "conflict";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
      ok
        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
        : failed
        ? "bg-red-50 text-red-600 border-red-100"
        : "bg-slate-100 text-slate-500 border-slate-200"
    }`}>
      {ok ? <CheckCircle2 size={12} /> : failed ? <XCircle size={12} /> : null}
      {label}
    </span>
  );
}
