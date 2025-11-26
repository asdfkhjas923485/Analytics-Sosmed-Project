import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Import from "./pages/Import";
import Performa from "./pages/Performa";
import WaktuTerbaik from "./pages/WaktuTerbaik";
import Audiens from "./pages/Audiens";
import Laporan from "./pages/Laporan";
import Platform from "./pages/Platform";
import Perbandingan from "./pages/Perbandingan";
import RingkasanInsight from "./pages/RingkasanInsight";
import ProjectNew from "./pages/ProjectNew";
import Bantuan from "./pages/Bantuan";
import BantuanAdmin from "./pages/BantuanAdmin";
import AdminTest from "./pages/AdminTest";
import TargetKPI from "./pages/TargetKPI";
import Kampanye from "./pages/Kampanye";
import CaptionGenerator from "./pages/CaptionGenerator";
import KompetitorAnalysis from "./pages/KompetitorAnalysis";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/import" element={<Import />} />
              <Route path="/performa" element={<Performa />} />
              <Route path="/waktu-terbaik" element={<WaktuTerbaik />} />
              <Route path="/audiens" element={<Audiens />} />
              <Route path="/laporan" element={<Laporan />} />
              <Route path="/platform" element={<Platform />} />
              <Route path="/perbandingan" element={<Perbandingan />} />
              <Route path="/ringkasan-insight" element={<RingkasanInsight />} />
              <Route path="/projects/new" element={<ProjectNew />} />
              <Route path="/bantuan" element={<Bantuan />} />
              <Route path="/bantuan-admin" element={<BantuanAdmin />} />
              <Route path="/target-kpi" element={<TargetKPI />} />
              <Route path="/kampanye" element={<Kampanye />} />
              <Route path="/caption-generator" element={<CaptionGenerator />} />
              <Route path="/kompetitor-analysis" element={<KompetitorAnalysis />} />
              <Route path="/admin-test" element={<AdminTest />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
