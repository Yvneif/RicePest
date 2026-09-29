import { Suspense, lazy } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { BottomNav } from "./components/layout/BottomNav";
import { DesktopNav } from "./components/layout/DesktopNav";
import { AdminLoginPage } from "./pages/admin/Shared";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const IdentifyPage = lazy(() =>
  import("./pages/IdentifyPage").then((m) => ({ default: m.IdentifyPage })),
);
const CatalogPage = lazy(() =>
  import("./pages/CatalogPage").then((m) => ({ default: m.CatalogPage })),
);
const RecommendPage = lazy(() =>
  import("./pages/RecommendPage").then((m) => ({ default: m.RecommendPage })),
);
const HistoryPage = lazy(() =>
  import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })),
);
const AdminDashboardPage = lazy(() =>
  import("./pages/admin/DashboardPage").then((m) => ({ default: m.AdminDashboardPage })),
);
const AdminCatalogPage = lazy(() =>
  import("./pages/admin/CatalogPage").then((m) => ({ default: m.AdminCatalogPage })),
);
const AdminUsersPage = lazy(() =>
  import("./pages/admin/UsersPage").then((m) => ({ default: m.AdminUsersPage })),
);

function RouteFallback() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600/20 border-t-brand-600" />
    </div>
  );
}

function PageShell({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

const PUBLIC_PATHS = new Set(["/", "/identify", "/catalog", "/recommend", "/history"]);

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && PUBLIC_PATHS.has(location.pathname) && <DesktopNav />}
      <Suspense fallback={<RouteFallback />}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageShell>
                  <HomePage />
                </PageShell>
              }
            />
            <Route
              path="/identify"
              element={
                <PageShell>
                  <IdentifyPage />
                </PageShell>
              }
            />
            <Route
              path="/catalog"
              element={
                <PageShell>
                  <CatalogPage />
                </PageShell>
              }
            />
            <Route
              path="/recommend"
              element={
                <PageShell>
                  <RecommendPage />
                </PageShell>
              }
            />
            <Route
              path="/history"
              element={
                <PageShell>
                  <HistoryPage />
                </PageShell>
              }
            />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/catalog" element={<AdminCatalogPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      {!isAdmin && PUBLIC_PATHS.has(location.pathname) && <BottomNav />}
    </>
  );
}
