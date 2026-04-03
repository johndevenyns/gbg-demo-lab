import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Globe } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { PortalUserManagement } from './PortalUserManagement';

interface UnifiedUserManagementProps {
  isGlobalAdmin: boolean;
}

export function UnifiedUserManagement({ isGlobalAdmin }: UnifiedUserManagementProps) {
  return (
    <Tabs defaultValue={isGlobalAdmin ? "admin-users" : "portal-users"} className="space-y-4">
      <TabsList>
        {isGlobalAdmin && (
          <TabsTrigger value="admin-users" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Admin Users
          </TabsTrigger>
        )}
        <TabsTrigger value="portal-users" className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Portal Users
        </TabsTrigger>
      </TabsList>

      {isGlobalAdmin && (
        <TabsContent value="admin-users">
          <UserManagement />
        </TabsContent>
      )}

      <TabsContent value="portal-users">
        <PortalUserManagement />
      </TabsContent>
    </Tabs>
  );
}
