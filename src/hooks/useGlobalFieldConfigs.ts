import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GlobalFieldConfig {
  id: string;
  field_type: string;
  api_name: string;
  display_name: string;
  is_api_field: boolean;
  category: string;
  placeholder: string;
  required_by_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type GlobalFieldConfigInsert = Omit<GlobalFieldConfig, 'id' | 'created_at' | 'updated_at'>;

const QUERY_KEY = ['global_field_configs'];

export function useGlobalFieldConfigs() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<GlobalFieldConfig[]> => {
      const { data, error } = await supabase
        .from('global_field_configs' as any)
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
}

export function useCreateGlobalFieldConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: GlobalFieldConfigInsert) => {
      const { data, error } = await supabase
        .from('global_field_configs' as any)
        .insert(config as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GlobalFieldConfig;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Field added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateGlobalFieldConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<GlobalFieldConfigInsert> }) => {
      const { data, error } = await supabase
        .from('global_field_configs' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as GlobalFieldConfig;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Field updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGlobalFieldConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('global_field_configs' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success("Field deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
