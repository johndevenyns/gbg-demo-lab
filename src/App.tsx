import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import AdminDashboard from "./pages/AdminDashboard";
import DemoConfig from "./pages/DemoConfig";
import DemoPreview from "./pages/DemoPreview";
import DemoEmbed from "./pages/DemoEmbed";
import VerificationSettings from "./pages/VerificationSettings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/auth" element={<Auth />} />
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
                <VerificationSettings />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
