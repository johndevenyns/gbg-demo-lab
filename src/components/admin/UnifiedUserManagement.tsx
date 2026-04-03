import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Globe } from 'lucide-react';
import { UserManagement } from './UserManagement';
import { PortalUserManagement } from './PortalUserManagement';

interface UnifiedUserManagementProps {
  isGlobalAdmin: boolean;
}

export function UnifiedUserManagement({ isGlobalAdmin }: UnifiedUserManagementProps) {
  return (
    <Tabs defaultValue="admin-users" className="space-y-4">
      <TabsList>
        <TabsTrigger value="admin-users" className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Admin Users
        </TabsTrigger>
        <TabsTrigger value="portal-users" className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Portal Users
        </TabsTrigger>
      </TabsList>

      <TabsContent value="admin-users">
        <UserManagement isGlobalAdmin={isGlobalAdmin} />
      </TabsContent>

      <TabsContent value="portal-users">
        <PortalUserManagement />
      </TabsContent>
    </Tabs>
  );
}
