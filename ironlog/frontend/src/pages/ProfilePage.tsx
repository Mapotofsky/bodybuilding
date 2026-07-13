import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Calculator, ChevronRight, RefreshCw, Ruler, Settings, User as UserIcon } from "lucide-react";
import { getCurrentBodyMetrics, type CurrentBodyMetrics } from "@/services/bodyMetrics";
import { getProfile, getProfileAvatarDataUrl } from "@/services/profile";
import type { User } from "@/types";

const ENTRIES = [
  { label: "个人资料", description: "昵称、头像、性别和出生日期", path: "/profile/details", icon: UserIcon },
  { label: "应用设置", description: "主题和重量单位", path: "/settings", icon: Settings },
  { label: "同步备份", description: "WebDAV 本机配置和手动同步", path: "/sync", icon: RefreshCw },
  { label: "身体数据", description: "身高、体重、体脂和围度趋势", path: "/body-metrics", icon: Ruler },
  { label: "时间段备注", description: "训练背景、器械和生活状态标记", path: "/timeline-notes", icon: Activity },
  { label: "小工具", description: "RM 计算器、RPE 说明等训练工具", path: "/tools", icon: Calculator },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<User | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [currentBody, setCurrentBody] = useState<CurrentBodyMetrics | null>(null);

  useEffect(() => {
    Promise.all([getProfile(), getProfileAvatarDataUrl(), getCurrentBodyMetrics()])
      .then(([nextProfile, avatar, body]) => {
        setProfile(nextProfile);
        setAvatarDataUrl(avatar);
        setCurrentBody(body);
      });
  }, []);

  if (!profile) {
    return <div className="app-page app-screen flex items-center justify-center app-text-muted">加载中...</div>;
  }

  return (
    <div className="app-page app-screen pb-8">
      <div className="app-profile-hero px-6 pt-8 pb-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/30 overflow-hidden">
          {avatarDataUrl ? <img src={avatarDataUrl} alt="头像" className="w-full h-full object-cover" /> : <UserIcon size={36} className="text-white" />}
        </div>
        <h1 className="text-xl font-bold mt-3">{profile.nickname || "训练者"}</h1>
        <p className="text-white/80 text-sm mt-0.5">本地单人版</p>
      </div>

      <div className="px-5 -mt-5 space-y-4">
        <div className="app-surface app-divide rounded-2xl border shadow-sm p-4 grid grid-cols-3 divide-x">
          {[
            { v: currentBody?.height_cm.value ?? null, u: "cm", l: "身高" },
            { v: currentBody?.weight.value ?? null, u: currentBody?.weight.unit || "kg", l: "体重" },
            { v: profile.gender === "male" ? "男" : profile.gender === "female" ? "女" : null, u: "", l: "性别" },
          ].map(({ v, u, l }) => (
            <div key={l} className="text-center min-w-0">
              <p className="text-xl font-bold app-text truncate">{v ?? "—"}{v != null && <span className="text-sm font-normal app-text-muted ml-0.5">{u}</span>}</p>
              <p className="text-xs app-text-muted mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {ENTRIES.map(({ label, description, path, icon: Icon }) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="app-surface w-full rounded-2xl border shadow-sm p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            >
              <span className="app-primary-soft w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold app-text">{label}</span>
                <span className="block text-xs app-text-muted mt-0.5 truncate">{description}</span>
              </span>
              <ChevronRight size={18} className="app-text-muted shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
