import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DemoUseCase, UseCasePageContent } from '@/types/useCase';
import { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { toast } from 'sonner';

// Map DB row to app type
function mapRow(row: Record<string, unknown>): DemoUseCase {
  return {
    id: row.id as string,
    demoId: row.demo_id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    iconName: (row.icon_name as string) ?? 'Package',
    displayOrder: row.display_order as number,
    entryMethod: row.entry_method as DemoUseCase['entryMethod'],
    accessCode: (row.access_code as string) ?? undefined,
    pageContent: (row.page_content as UseCasePageContent) ?? {},
    formStepOverrides: (row.form_step_overrides as Record<string, unknown>) ?? undefined,
    isEnabled: row.is_enabled as boolean,
    industryTemplate: (row.industry_template as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useUseCases(demoId: string | undefined) {
  return useQuery({
    queryKey: ['use-cases', demoId],
    queryFn: async () => {
      if (!demoId) return [];
      const { data, error } = await supabase
        .from('demo_use_cases')
        .select('*')
        .eq('demo_id', demoId)
        .order('display_order');
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!demoId,
  });
}

export function useCreateUseCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uc: Omit<DemoUseCase, 'id' | 'createdAt' | 'updatedAt'>) => {
      const insertData: TablesInsert<'demo_use_cases'> = {
        demo_id: uc.demoId,
        title: uc.title,
        description: uc.description ?? null,
        icon_name: uc.iconName,
        display_order: uc.displayOrder,
        entry_method: uc.entryMethod,
        access_code: uc.accessCode ?? null,
        page_content: uc.pageContent as unknown as TablesInsert<'demo_use_cases'>['page_content'],
        form_step_overrides: (uc.formStepOverrides ?? null) as unknown as TablesInsert<'demo_use_cases'>['form_step_overrides'],
        is_enabled: uc.isEnabled,
        industry_template: uc.industryTemplate ?? null,
      };
      const { data, error } = await supabase
        .from('demo_use_cases')
        .insert([insertData])
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['use-cases', data.demoId] });
      toast.success('Use case created');
    },
    onError: (e) => toast.error(`Failed to create use case: ${e.message}`),
  });
}

export function useUpdateUseCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, demoId, updates }: { id: string; demoId: string; updates: Partial<DemoUseCase> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.iconName !== undefined) dbUpdates.icon_name = updates.iconName;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
      if (updates.entryMethod !== undefined) dbUpdates.entry_method = updates.entryMethod;
      if (updates.accessCode !== undefined) dbUpdates.access_code = updates.accessCode;
      if (updates.pageContent !== undefined) dbUpdates.page_content = updates.pageContent;
      if (updates.formStepOverrides !== undefined) dbUpdates.form_step_overrides = updates.formStepOverrides;
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;

      const { data, error } = await supabase
        .from('demo_use_cases')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...mapRow(data), demoId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['use-cases', data.demoId] });
      toast.success('Use case updated');
    },
    onError: (e) => toast.error(`Failed to update use case: ${e.message}`),
  });
}

export function useDeleteUseCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, demoId }: { id: string; demoId: string }) => {
      const { error } = await supabase.from('demo_use_cases').delete().eq('id', id);
      if (error) throw error;
      return { demoId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['use-cases', data.demoId] });
      toast.success('Use case deleted');
    },
    onError: (e) => toast.error(`Failed to delete use case: ${e.message}`),
  });
}
