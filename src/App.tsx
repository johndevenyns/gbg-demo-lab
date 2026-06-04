import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { useThemePreference } from "@/hooks/useThemePreference";
import AdminDashboard from "./pages/AdminDashboard";
import DemoConfig from "./pages/DemoConfig";
import DemoPreview from "./pages/DemoPreview";
import DemoEmbed from "./pages/DemoEmbed";
import GlobalSettingsPage from "./pages/GlobalSettingsPage";
import Auth from "./pages/Auth";
import ReportingPage from "./pages/ReportingPage";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import QrCodePreview from "./pages/QrCodePreview";
import VerifyRedirect from "./pages/VerifyRedirect";

// Disable refetch-on-window-focus so returning to the tab doesn't trigger
// query refetches that can cascade into parent re-renders and close open
// dialogs/wizards (e.g. form builder, new demo creator).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

function AppContent() {
  useThemePreference();

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/global-settings"
            element={
              <ProtectedRoute>
                <GlobalSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reporting"
            element={
              <ProtectedRoute>
                <ReportingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/demo/:id"
            element={
              <ProtectedRoute>
                <DemoConfig />
              </ProtectedRoute>
            }
          />
          <Route path="/demo/:slug" element={<DemoPreview />} />
          <Route path="/embed/:slug" element={<DemoEmbed />} />
          <Route path="/qr-preview" element={<QrCodePreview />} />
          <Route path="/verify/redirect" element={<VerifyRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
