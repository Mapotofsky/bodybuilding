import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, Dumbbell, User } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "首页" },
  { path: "/workouts", icon: Dumbbell, label: "训练" },
  { path: "/profile", icon: User, label: "我的" },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white border-t border-gray-200 z-50 md:max-w-[768px]">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive =
              path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                  isActive ? "text-blue-500" : "text-gray-400"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-xs">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
