import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useAuthStore } from "./stores/auth";
import AppShell from "./components/layout/AppShell";
import Login from "./routes/Login";
import NotebookPage from "./routes/Notebook";
import DatabasePage from "./routes/Database";
import BibliographyPage from "./routes/Bibliography";
import ProtocolsPage from "./routes/Protocols";
import DashboardPage from "./routes/Dashboard";
import PlasmidStudioPage from "./routes/Tools/PlasmidStudio";
import CalculatorsPage from "./routes/Tools/Calculators";
import GelSimulatorPage from "./routes/Tools/GelSimulator";
import AlignmentPage from "./routes/Tools/Alignment";
import StatsPage from "./routes/Tools/Stats";
import PlateMapPage from "./routes/Tools/PlateMap";
import QPCRPage from "./routes/Tools/QPCR";
import GrowthCurvePage from "./routes/Tools/GrowthCurve";
import RestrictionMapPage from "./routes/Tools/RestrictionMap";
import SettingsPage from "./routes/Settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 24 * 60 * 60 * 1_000, // keep cache 24h → survives server restarts
      networkMode: "offlineFirst",   // show cached data immediately, don't block on network
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: "hhgl_query_cache",
  throttleTime: 2_000, // write at most every 2s
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard",    element: <DashboardPage /> },
      { path: "notebook",     element: <NotebookPage /> },
      { path: "database",     element: <DatabasePage /> },
      { path: "bibliography", element: <BibliographyPage /> },
      { path: "protocols",    element: <ProtocolsPage /> },
      { path: "tools",             element: <Navigate to="/tools/plasmid" replace /> },
      { path: "tools/plasmid",     element: <PlasmidStudioPage /> },
      { path: "tools/calculators", element: <CalculatorsPage /> },
      { path: "tools/gel",         element: <GelSimulatorPage /> },
      { path: "tools/alignment",   element: <AlignmentPage /> },
      { path: "tools/stats",       element: <StatsPage /> },
      { path: "tools/platemap",    element: <PlateMapPage /> },
      { path: "tools/qpcr",        element: <QPCRPage /> },
      { path: "tools/growth",      element: <GrowthCurvePage /> },
      { path: "tools/restriction", element: <RestrictionMapPage /> },
      { path: "settings",          element: <SettingsPage /> },
    ],
  },
]);

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 24 * 60 * 60 * 1_000 }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  );
}
