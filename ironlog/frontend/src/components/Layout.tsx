import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, CalendarDays, User, ClipboardList } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "首页" },
  { path: "/plans", icon: ClipboardList, label: "计划" },
  { path: "/calendar", icon: CalendarDays, label: "日历" },
  { path: "/profile", icon: User, label: "我的" },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen min-h-dvh">
      <main className="flex-1 pb-24 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 md:max-w-[768px]">
        <div
          className="bg-white/90 backdrop-blur-md border-t border-slate-200/80 pb-safe"
          style={{ boxShadow: "0 -1px 0 0 rgba(0,0,0,0.06)" }}
        >
          <div className="flex justify-around items-center h-16 px-2">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const isActive =
                path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-0.5 flex-1 py-1.5 transition-all duration-200"
                >
                  <span
                    className={`flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200 ${
                      isActive
                        ? "bg-emerald-100"
                        : ""
                    }`}
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={
                        isActive ? "text-emerald-600" : "text-slate-400"
                      }
                    />
                  </span>
                  <span
                    className={`text-[10px] font-medium transition-colors duration-200 ${
                      isActive ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
