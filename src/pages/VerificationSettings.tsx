import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Settings, Users, UserCheck, LayoutTemplate, ListChecks, Briefcase, Monitor, Shield, FolderOpen, KeyRound, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { UserManagement } from "@/components/admin/UserManagement";
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

export default function VerificationSettings() {
  const navigate = useNavigate();
  const { user, signOut, isGlobalAdmin } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="admin-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
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

      {/* Main Content */}
      <main className="admin-container py-8">
        <Tabs defaultValue={isGlobalAdmin ? "industries" : "verification"} className="space-y-6">
          <TabsList>
            {isGlobalAdmin && (
              <TabsTrigger value="industries" className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                Industries
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
              <TabsTrigger value="use-cases" className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Use Cases
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4" />
                Form Templates
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
              <TabsTrigger value="field-config" className="flex items-center gap-2">
                <ListChecks className="w-4 h-4" />
                Fields
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
              <TabsTrigger value="portal-types" className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Portal Types
              </TabsTrigger>
            )}
            <TabsTrigger value="verification" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Verification
            </TabsTrigger>
            {isGlobalAdmin && (
              <TabsTrigger value="invite-templates" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Invite Templates
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
              <TabsTrigger value="reg-codes" className="flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Registration Codes
              </TabsTrigger>
            )}
            {isGlobalAdmin && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="industries" className="space-y-6">
            <IndustryManagement />
          </TabsContent>

          <TabsContent value="use-cases" className="space-y-6">
            <GlobalUseCaseManagement />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <FormTemplateManagement />
          </TabsContent>

          <TabsContent value="field-config" className="space-y-6">
            <GlobalFieldConfigManagement />
          </TabsContent>

          <TabsContent value="portal-types" className="space-y-6">
            <PortalTypeManagement />
          </TabsContent>

          <TabsContent value="verification" className="space-y-6">
            <UnifiedVerificationSettings isGlobalAdmin={isGlobalAdmin} />
          </TabsContent>

          <TabsContent value="invite-templates" className="space-y-6">
            <InvitationTemplateManagement />
          </TabsContent>

          <TabsContent value="reg-codes" className="space-y-6">
            <GlobalRegistrationCodeManagement />
          </TabsContent>

          <TabsContent value="portal-users" className="space-y-6">
            <PortalUserManagement />
          </TabsContent>

          <TabsContent value="profiles" className="space-y-6">
            <TestProfileManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}