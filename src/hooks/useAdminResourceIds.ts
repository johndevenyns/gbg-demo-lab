import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export interface AdminResourceId {
  id: string;
  adminUserId: string;
  typeKey: string;
  resourceId: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminResourceIdRow {
  id: string;
  admin_user_id: string;
  type_key: string;
  resource_id: string;
  created_at: string;
  updated_at: string;
}

const transform = (row: AdminResourceIdRow): AdminResourceId => ({
  id: row.id,
  adminUserId: row.admin_user_id,
  typeKey: row.type_key,
  resourceId: row.resource_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Fetch the current admin's resource ID overrides */
export function useMyAdminResourceIds() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-resource-ids', 'mine', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<AdminResourceId[]> => {
      const { data, error } = await supabase
        .from('admin_resource_ids' as any)
        .select('*')
        .eq('admin_user_id', user!.id)
        .order('type_key');

      if (error) throw error;
      return ((data as any[]) || []).map(transform);
    },
  });
}

/** Fetch admin resource IDs for a specific admin user (for resolution) */
export function useAdminResourceIdsForUser(adminUserId?: string) {
  return useQuery({
    queryKey: ['admin-resource-ids', adminUserId],
    enabled: !!adminUserId,
    queryFn: async (): Promise<AdminResourceId[]> => {
      const { data, error } = await supabase
        .from('admin_resource_ids' as any)
        .select('*')
        .eq('admin_user_id', adminUserId!)
        .order('type_key');

      if (error) throw error;
      return ((data as any[]) || []).map(transform);
    },
  });
}

/** Upsert (create or update) an admin resource ID */
export function useUpsertAdminResourceId() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ typeKey, resourceId }: { typeKey: string; resourceId: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Try update first
      const { data: existing } = await supabase
        .from('admin_resource_ids' as any)
        .select('id')
        .eq('admin_user_id', user.id)
        .eq('type_key', typeKey)
        .maybeSingle();

      if ((existing as any)?.id) {
        const { error } = await supabase
          .from('admin_resource_ids' as any)
          .update({ resource_id: resourceId } as any)
          .eq('id', (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_resource_ids' as any)
          .insert({
            admin_user_id: user.id,
            type_key: typeKey,
            resource_id: resourceId,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resource-ids'] });
      toast.success("Resource ID saved");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}

/** Delete an admin resource ID override */
export function useDeleteAdminResourceId() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('admin_resource_ids' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-resource-ids'] });
      toast.success("Resource ID override removed");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

/**
 * Hook that resolves resource IDs using the 3-tier hierarchy:
 * Customer (demo-level) → Admin → Global
 *
 * @param customerResourceIds - Resource IDs set at the demo/customer level
 * @param adminUserId - The admin who created this demo (for admin-level lookup)
 */
export function useResolvedResourceIds(
  customerResourceIds: {
    resourceId?: string;
    resourceIdDocBio?: string;
    resourceIdDataBio?: string;
    resourceIdDataOnly?: string;
  },
  adminUserId?: string,
) {
  const { data: adminOverrides = [] } = useAdminResourceIdsForUser(adminUserId);
  const { data: verificationTypes = [] } = useQuery({
    queryKey: ['verification-types-for-resolution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_type_configs')
        .select('type_key, default_resource_id')
        .eq('is_enabled', true);
      if (error) throw error;
      return data || [];
    },
  });

  // Build lookup maps
  const adminMap = new Map(adminOverrides.map(a => [a.typeKey, a.resourceId]));
  const globalMap = new Map(
    verificationTypes
      .filter((t: any) => t.default_resource_id)
      .map((t: any) => [t.type_key, t.default_resource_id as string])
  );

  const resolve = (typeKey: string, customerValue?: string): string | undefined => {
    // 1. Customer level (highest priority)
    if (customerValue) return customerValue;
    // 2. Admin level
    const adminVal = adminMap.get(typeKey);
    if (adminVal) return adminVal;
    // 3. Global level
    return globalMap.get(typeKey);
  };

  return {
    resourceIdDocBio: resolve('docbio', customerResourceIds.resourceIdDocBio),
    resourceIdDataBio: resolve('databio', customerResourceIds.resourceIdDataBio),
    resourceIdDataOnly: resolve('dataonly', customerResourceIds.resourceIdDataOnly),
    // Generic fallback
    resourceId: resolve('docbio', customerResourceIds.resourceId),
  };
}
