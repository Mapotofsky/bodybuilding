import { useEffect, useRef } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useLocation, useNavigate } from "react-router-dom";
import { dismissTopAndroidBackLayer } from "@/navigation/androidBackLayers";

interface BackLocation {
  pathname: string;
  search: string;
}

interface BackActions {
  dismissOverlay: () => boolean;
  goBack: () => void;
  replace: (target: string) => void;
  exitApp: () => void;
}

export default function AndroidBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef<BackLocation>(location);
  locationRef.current = location;

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;

    let active = true;
    let removeListener: (() => Promise<void>) | undefined;

    void App.addListener("backButton", () => {
      const historyIndex = window.history.state?.idx;
      const hasAppHistory = Number.isInteger(historyIndex) && historyIndex > 0;
      handleAndroidBack(hasAppHistory, locationRef.current, {
        dismissOverlay: dismissTopAndroidBackLayer,
        goBack: () => navigate(-1),
        replace: (target) => navigate(target, { replace: true }),
        exitApp: () => void App.exitApp(),
      });
    }).then((handle) => {
      if (active) removeListener = handle.remove;
      else void handle.remove();
    });

    return () => {
      active = false;
      if (removeListener) void removeListener();
    };
  }, [navigate]);

  return null;
}

export function handleAndroidBack(hasAppHistory: boolean, location: BackLocation, actions: BackActions): void {
  if (actions.dismissOverlay()) return;
  if (hasAppHistory) {
    actions.goBack();
    return;
  }

  const fallback = androidBackFallback(location);
  if (fallback) actions.replace(fallback);
  else actions.exitApp();
}

export function androidBackFallback({ pathname, search }: BackLocation): string | null {
  if (/^\/exercises\/[^/]+$/.test(pathname)) {
    const from = new URLSearchParams(search).get("from");
    return from === "/exercises" || from?.startsWith("/exercises?") ? from : "/exercises";
  }

  const workoutEdit = pathname.match(/^\/workouts\/([^/]+)\/edit$/);
  if (workoutEdit) return `/workouts/${workoutEdit[1]}`;
  if (/^\/workouts\/[^/]+$/.test(pathname)) return "/workouts";
  if (pathname === "/workouts/new") return "/";

  const templateEdit = pathname.match(/^\/plans\/([^/]+)\/templates\/[^/]+$/);
  if (templateEdit) return `/plans/${templateEdit[1]}`;
  const planEdit = pathname.match(/^\/plans\/([^/]+)\/edit$/);
  if (planEdit) return `/plans/${planEdit[1]}`;
  if (/^\/plans\/[^/]+$/.test(pathname) || pathname === "/plans/new") return "/plans";

  if (pathname.startsWith("/tools/")) return "/tools";
  if (["/profile/details", "/settings", "/body-metrics", "/timeline-notes", "/tools", "/sync"].includes(pathname)) {
    return "/profile";
  }

  return null;
}
