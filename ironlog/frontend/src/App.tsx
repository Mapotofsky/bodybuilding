import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import HomePage from "@/pages/HomePage";
import WorkoutsPage from "@/pages/WorkoutsPage";
import WorkoutDetailPage from "@/pages/WorkoutDetailPage";
import WorkoutCreatePage from "@/pages/WorkoutCreatePage";
import ProfilePage from "@/pages/ProfilePage";
import WorkoutEditPage from "@/pages/WorkoutEditPage";
import PlansPage from "@/pages/PlansPage";
import PlanCreatePage from "@/pages/PlanCreatePage";
import PlanDetailPage from "@/pages/PlanDetailPage";
import PlanEditPage from "@/pages/PlanEditPage";
import TemplateEditPage from "@/pages/TemplateEditPage";
import CalendarPage from "@/pages/CalendarPage";
import ExerciseDetailPage from "@/pages/ExerciseDetailPage";
import ExerciseLibraryPage from "@/pages/ExerciseLibraryPage";
import SyncPage from "@/pages/SyncPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="workouts" element={<WorkoutsPage />} />
        <Route path="workouts/new" element={<WorkoutCreatePage />} />
        <Route path="workouts/:id" element={<WorkoutDetailPage />} />
        <Route path="workouts/:id/edit" element={<WorkoutEditPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/new" element={<PlanCreatePage />} />
        <Route path="plans/:id" element={<PlanDetailPage />} />
        <Route path="plans/:id/edit" element={<PlanEditPage />} />
        <Route path="plans/:id/templates/:tid" element={<TemplateEditPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="sync" element={<SyncPage />} />
        <Route path="exercises" element={<ExerciseLibraryPage />} />
        <Route path="exercises/:id" element={<ExerciseDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
