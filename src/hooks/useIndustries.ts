import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Industry } from '@/types/industry';
import { toast } from 'sonner';

function mapRow(row: Record<string, unknown>): Industry {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    iconName: (row.icon_name as string) ?? 'Building2',
    portalType: (row.portal_type as string) ?? 'none',
    portalConfig: (row.portal_config as Industry['portalConfig']) ?? undefined,
    displayOrder: row.display_order as number,
    isEnabled: row.is_enabled as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useIndustries() {
  return useQuery({
    queryKey: ['industries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
  });
}

export function useCreateIndustry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (industry: Omit<Industry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('industries')
        .insert([{
          title: industry.title,
          description: industry.description ?? null,
          icon_name: industry.iconName,
          portal_type: industry.portalType,
          display_order: industry.displayOrder,
          is_enabled: industry.isEnabled,
        }])
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['industries'] });
      toast.success('Industry created');
    },
    onError: (e) => toast.error(`Failed to create industry: ${e.message}`),
  });
}

export function useUpdateIndustry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Industry> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.iconName !== undefined) dbUpdates.icon_name = updates.iconName;
      if (updates.portalType !== undefined) dbUpdates.portal_type = updates.portalType;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;

      const { data, error } = await supabase
        .from('industries')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['industries'] });
      toast.success('Industry updated');
    },
    onError: (e) => toast.error(`Failed to update industry: ${e.message}`),
  });
}

export function useDeleteIndustry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('industries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['industries'] });
      toast.success('Industry deleted');
    },
    onError: (e) => toast.error(`Failed to delete industry: ${e.message}`),
  });
}
