import { useEffect, useLayoutEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, CalendarDays, User, ClipboardList, Dumbbell } from "lucide-react";
import { getSettings } from "@/services/settings";
import { applyThemeId } from "@/theme/applyTheme";
import { scrollTargetsToTop } from "@/utils/scroll";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "首页" },
  { path: "/exercises", icon: Dumbbell, label: "动作库" },
  { path: "/plans", icon: ClipboardList, label: "计划" },
  { path: "/calendar", icon: CalendarDays, label: "日历" },
  { path: "/profile", icon: User, label: "我的" },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    getSettings()
      .then((settings) => applyThemeId(settings.theme_id))
      .catch(() => applyThemeId(null));
  }, []);

  useLayoutEffect(() => {
    scrollTargetsToTop(mainRef.current, window);
  }, [location.pathname]);

  return (
    <div className="app-screen flex flex-col min-h-screen min-h-dvh">
      <main ref={mainRef} className="flex-1 pb-24 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 md:max-w-[768px]">
        <div
          className="backdrop-blur-md border-t pb-safe"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "0 -1px 0 0 rgba(0,0,0,0.06)",
          }}
        >
          <div className="grid grid-cols-5 items-stretch h-16 px-1.5">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
              const isActive =
                path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(path);
              return (
                <button
                  type="button"
                  key={path}
                  onClick={() => navigate(navigationTarget(path))}
                  className="min-w-0 h-16 px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all duration-200"
                >
                  <span
                    className="flex items-center justify-center w-11 max-w-full h-7 rounded-full transition-all duration-200"
                    style={{ backgroundColor: isActive ? "var(--color-primary-soft)" : "transparent" }}
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)" }}
                    />
                  </span>
                  <span
                    className="max-w-full truncate text-[10px] font-medium transition-colors duration-200"
                    style={{ color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)" }}
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

function navigationTarget(path: string): string {
  if (path !== "/exercises" || typeof sessionStorage === "undefined") return path;
  return `${path}${sessionStorage.getItem("ironlog.exerciseLibraryQuery") || ""}`;
}
