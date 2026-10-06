import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/routing/ProtectedRoute";
import { PageLoader } from "@/components/PageLoader";
import DashboardLayout from "@/layouts/DashboardLayout";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const SaisieComptable = lazy(() => import("@/pages/SaisieComptable"));
const GrandLivre = lazy(() => import("@/pages/GrandLivre"));
const Lettrage = lazy(() => import("@/pages/Lettrage"));
const Logs = lazy(() => import("@/pages/Logs"));
const Brouillons = lazy(() => import("@/pages/Brouillons"));
const Parametres = lazy(() => import("@/pages/Parametres"));

export default function App() {
  return (
    <Suspense fallback={<PageLoader fullScreen />}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="saisie" element={<SaisieComptable />} />
            <Route path="grand-livre" element={<GrandLivre />} />
            <Route path="lettrage" element={<Lettrage />} />
            <Route path="brouillons" element={<Brouillons />} />
            <Route path="logs" element={<Logs />} />
            <Route path="parametres" element={<Parametres />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
