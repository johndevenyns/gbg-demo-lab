import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LogOut,
  Settings,
  Users,
  UserCheck,
  LayoutTemplate,
  ListChecks,
  Briefcase,
  Monitor,
  Shield,
  FolderOpen,
  KeyRound,
  Mail,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { TestProfileManagement } from "@/components/admin/TestProfileManagement";
import { FormTemplateManagement } from "@/components/admin/FormTemplateManagement";
import { GlobalFieldConfigManagement } from "@/components/admin/GlobalFieldConfigManagement";
import { IndustryManagement } from "@/components/admin/IndustryManagement";
import { PortalTypeManagement } from "@/components/admin/PortalTypeManagement";
import { UnifiedVerificationSettings } from "@/components/admin/UnifiedVerificationSettings";
import { GlobalUseCaseManagement } from "@/components/admin/GlobalUseCaseManagement";
import { GlobalRegistrationCodeManagement } from "@/components/admin/GlobalRegistrationCodeManagement";
import { InvitationTemplateManagement } from "@/components/admin/InvitationTemplateManagement";
import { UnifiedUserManagement } from "@/components/admin/UnifiedUserManagement";

export default function GlobalSettingsPage() {
  const navigate = useNavigate();
  const { signOut, isAdmin, isGlobalAdmin, isLoading, roleChecked } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (isLoading || !roleChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="admin-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Global Settings</h1>
                <p className="text-sm text-muted-foreground">Manage verification types, providers, and users</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="admin-container py-8">
        <Tabs key={isGlobalAdmin ? "global-admin" : "admin"} defaultValue="industries" className="space-y-6 w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
            <TabsTrigger value="industries" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Industries
            </TabsTrigger>
            <TabsTrigger value="use-cases" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Use Cases
            </TabsTrigger>
            <TabsTrigger value="portal-types" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Portal Types
            </TabsTrigger>
            <TabsTrigger value="invite-templates" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Invite Templates
            </TabsTrigger>
            <TabsTrigger value="reg-codes" className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Registration Codes
            </TabsTrigger>
            <TabsTrigger value="profiles" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Test Profiles
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="industries" className="space-y-6">
            <IndustryManagement readOnly={!isGlobalAdmin} />
          </TabsContent>

          <TabsContent value="use-cases" className="space-y-6">
            <Tabs defaultValue="use-cases-main" className="space-y-4 w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
                <TabsTrigger value="use-cases-main" className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Use Cases
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4" />
                  Form Templates
                </TabsTrigger>
                <TabsTrigger value="field-config" className="flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Fields
                </TabsTrigger>
                <TabsTrigger value="verification" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Verification
                </TabsTrigger>
              </TabsList>

              <TabsContent value="use-cases-main" className="space-y-6">
                <GlobalUseCaseManagement readOnly={!isGlobalAdmin} />
              </TabsContent>
              <TabsContent value="templates" className="space-y-6">
                <FormTemplateManagement readOnly={!isGlobalAdmin} />
              </TabsContent>
              <TabsContent value="field-config" className="space-y-6">
                <GlobalFieldConfigManagement readOnly={!isGlobalAdmin} />
              </TabsContent>
              <TabsContent value="verification" className="space-y-6">
                <UnifiedVerificationSettings isGlobalAdmin={isGlobalAdmin} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="portal-types" className="space-y-6">
            <PortalTypeManagement readOnly={!isGlobalAdmin} />
          </TabsContent>

          <TabsContent value="invite-templates" className="space-y-6">
            <InvitationTemplateManagement />
          </TabsContent>

          <TabsContent value="reg-codes" className="space-y-6">
            <GlobalRegistrationCodeManagement />
          </TabsContent>

          <TabsContent value="profiles" className="space-y-6">
            <TestProfileManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UnifiedUserManagement isGlobalAdmin={isGlobalAdmin} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
