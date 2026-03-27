import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import HomePage from "@/pages/HomePage";
import WorkoutsPage from "@/pages/WorkoutsPage";
import WorkoutDetailPage from "@/pages/WorkoutDetailPage";
import WorkoutCreatePage from "@/pages/WorkoutCreatePage";
import ProfilePage from "@/pages/ProfilePage";
import WorkoutEditPage from "@/pages/WorkoutEditPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, fetchUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchUser();
  }, [isAuthenticated]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="workouts/new" element={<WorkoutCreatePage />} />
        <Route path="workouts/:id" element={<WorkoutDetailPage />} />
        <Route path="workouts/:id/edit" element={<WorkoutEditPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
    </Routes>
  );
}
