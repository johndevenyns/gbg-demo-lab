import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PortalConfig } from "@/types/portalConfig";

export interface PortalType {
  id: string;
  typeKey: string;
  displayName: string;
  description?: string;
  iconName: string;
  isEnabled: boolean;
  displayOrder: number;
  defaultConfig?: PortalConfig;
  createdAt: string;
  updatedAt: string;
}

const rowToPortalType = (row: any): PortalType => ({
  id: row.id,
  typeKey: row.type_key,
  displayName: row.display_name,
  description: row.description,
  iconName: row.icon_name || 'Monitor',
  isEnabled: row.is_enabled,
  displayOrder: row.display_order,
  defaultConfig: row.default_config || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function usePortalTypes() {
  return useQuery({
    queryKey: ['portal_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_types' as any)
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data || []).map(rowToPortalType);
    },
  });
}

export function useEnabledPortalTypes() {
  return useQuery({
    queryKey: ['portal_types', 'enabled'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_types' as any)
        .select('*')
        .eq('is_enabled', true)
        .order('display_order');
      if (error) throw error;
      return (data || []).map(rowToPortalType);
    },
  });
}

export function useCreatePortalType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { typeKey: string; displayName: string; description?: string; iconName?: string }) => {
      const { data, error } = await supabase
        .from('portal_types' as any)
        .insert({
          type_key: input.typeKey,
          display_name: input.displayName,
          description: input.description || null,
          icon_name: input.iconName || 'Monitor',
        })
        .select()
        .single();
      if (error) throw error;
      return rowToPortalType(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_types'] });
      toast.success("Portal type created");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}

export function useUpdatePortalType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<{ displayName: string; description: string; iconName: string; isEnabled: boolean; displayOrder: number }> }) => {
      const row: Record<string, any> = {};
      if (updates.displayName !== undefined) row.display_name = updates.displayName;
      if (updates.description !== undefined) row.description = updates.description;
      if (updates.iconName !== undefined) row.icon_name = updates.iconName;
      if (updates.isEnabled !== undefined) row.is_enabled = updates.isEnabled;
      if (updates.displayOrder !== undefined) row.display_order = updates.displayOrder;
      const { error } = await supabase.from('portal_types' as any).update(row).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_types'] });
      toast.success("Portal type updated");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}

export function useDeletePortalType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portal_types' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal_types'] });
      toast.success("Portal type deleted");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });
}
