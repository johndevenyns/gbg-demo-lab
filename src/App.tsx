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
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import QrCodePreview from "./pages/QrCodePreview";
...
          <Route
            path="/admin/global-settings"
            element={
              <ProtectedRoute>
                <GlobalSettingsPage />
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
