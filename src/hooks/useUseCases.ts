import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlobalUseCase, DemoUseCaseLink, UseCasePageContent } from '@/types/useCase';
import { toast } from 'sonner';

// ── Global Use Cases (managed by global admins) ──

function mapGlobalRow(row: Record<string, unknown>): GlobalUseCase {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    iconName: (row.icon_name as string) ?? 'Package',
    industryId: (row.industry_id as string) ?? null,
    defaultFormSteps: (row.default_form_steps as Record<string, unknown>[]) ?? [],
    defaultVerificationType: (row.default_verification_type as string) ?? 'docBio',
    defaultPageContent: (row.default_page_content as UseCasePageContent) ?? {},
    displayOrder: row.display_order as number,
    isEnabled: row.is_enabled as boolean,
    showFillPass: (row.show_fill_pass as boolean) ?? false,
    showFillFail: (row.show_fill_fail as boolean) ?? false,
    portalType: (row.portal_type as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useGlobalUseCases() {
  return useQuery({
    queryKey: ['global-use-cases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_use_cases')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return (data ?? []).map(mapGlobalRow);
    },
  });
}

export function useCreateGlobalUseCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (uc: Omit<GlobalUseCase, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('global_use_cases')
        .insert([{
          title: uc.title,
          description: uc.description ?? null,
          icon_name: uc.iconName,
          default_form_steps: JSON.parse(JSON.stringify(uc.defaultFormSteps)) as unknown as null,
          default_verification_type: uc.defaultVerificationType,
          default_page_content: uc.defaultPageContent as unknown as null,
          display_order: uc.displayOrder,
          is_enabled: uc.isEnabled,
        }])
        .select()
        .single();
      if (error) throw error;
      return mapGlobalRow(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-use-cases'] });
      toast.success('Use case created');
    },
    onError: (e) => toast.error(`Failed to create use case: ${e.message}`),
  });
}

export function useUpdateGlobalUseCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<GlobalUseCase> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.iconName !== undefined) dbUpdates.icon_name = updates.iconName;
      if (updates.defaultFormSteps !== undefined) dbUpdates.default_form_steps = JSON.parse(JSON.stringify(updates.defaultFormSteps));
      if (updates.defaultVerificationType !== undefined) dbUpdates.default_verification_type = updates.defaultVerificationType;
      if (updates.defaultPageContent !== undefined) dbUpdates.default_page_content = updates.defaultPageContent;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;
      if (updates.showFillPass !== undefined) dbUpdates.show_fill_pass = updates.showFillPass;
      if (updates.showFillFail !== undefined) dbUpdates.show_fill_fail = updates.showFillFail;
      if (updates.portalType !== undefined) dbUpdates.portal_type = updates.portalType;
      if (updates.industryId !== undefined) dbUpdates.industry_id = updates.industryId;

      const { data, error } = await supabase
        .from('global_use_cases')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return mapGlobalRow(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-use-cases'] });
      toast.success('Use case updated');
    },
    onError: (e) => toast.error(`Failed to update use case: ${e.message}`),
  });
}

export function useDeleteGlobalUseCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('global_use_cases').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['global-use-cases'] });
      toast.success('Use case deleted');
    },
    onError: (e) => toast.error(`Failed to delete use case: ${e.message}`),
  });
}

// ── Demo Use Case Links (per-demo linking) ──

function mapLinkRow(row: Record<string, unknown>): DemoUseCaseLink {
  return {
    id: row.id as string,
    demoId: row.demo_id as string,
    useCaseId: row.use_case_id as string,
    isEnabled: row.is_enabled as boolean,
    displayOrder: row.display_order as number,
    formStepsOverride: (row.form_steps_override as Record<string, unknown>[]) ?? null,
    verificationTypeOverride: (row.verification_type_override as string) ?? null,
    pageContentOverride: (row.page_content_override as UseCasePageContent) ?? null,
    portalTypeOverride: (row.portal_type_override as PortalType) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useDemoUseCaseLinks(demoId: string | undefined) {
  return useQuery({
    queryKey: ['demo-use-case-links', demoId],
    queryFn: async () => {
      if (!demoId) return [];
      // Fetch links with joined global use case data
      const { data, error } = await supabase
        .from('demo_use_case_links')
        .select('*, global_use_cases(*)')
        .eq('demo_id', demoId)
        .order('display_order');
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => {
        const link = mapLinkRow(row);
        const globalData = row.global_use_cases as Record<string, unknown> | null;
        if (globalData) {
          link.globalUseCase = mapGlobalRow(globalData);
        }
        return link;
      });
    },
    enabled: !!demoId,
  });
}

export function useAddDemoUseCaseLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ demoId, useCaseId, displayOrder }: { demoId: string; useCaseId: string; displayOrder: number }) => {
      const { data, error } = await supabase
        .from('demo_use_case_links')
        .insert([{
          demo_id: demoId,
          use_case_id: useCaseId,
          display_order: displayOrder,
          is_enabled: true,
        }])
        .select('*, global_use_cases(*)')
        .single();
      if (error) throw error;
      const link = mapLinkRow(data);
      const globalData = (data as Record<string, unknown>).global_use_cases as Record<string, unknown> | null;
      if (globalData) link.globalUseCase = mapGlobalRow(globalData);
      return link;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['demo-use-case-links', data.demoId] });
      toast.success('Use case added to demo');
    },
    onError: (e) => toast.error(`Failed to add use case: ${e.message}`),
  });
}

export function useUpdateDemoUseCaseLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, demoId, updates }: { id: string; demoId: string; updates: Partial<DemoUseCaseLink> }) => {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
      if (updates.formStepsOverride !== undefined) dbUpdates.form_steps_override = updates.formStepsOverride ? JSON.parse(JSON.stringify(updates.formStepsOverride)) : null;
      if (updates.verificationTypeOverride !== undefined) dbUpdates.verification_type_override = updates.verificationTypeOverride;
      if (updates.pageContentOverride !== undefined) dbUpdates.page_content_override = updates.pageContentOverride;
      if (updates.portalTypeOverride !== undefined) dbUpdates.portal_type_override = updates.portalTypeOverride;

      const { error } = await supabase
        .from('demo_use_case_links')
        .update(dbUpdates)
        .eq('id', id);
      if (error) throw error;
      return { demoId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['demo-use-case-links', data.demoId] });
    },
    onError: (e) => toast.error(`Failed to update: ${e.message}`),
  });
}

export function useRemoveDemoUseCaseLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, demoId }: { id: string; demoId: string }) => {
      const { error } = await supabase.from('demo_use_case_links').delete().eq('id', id);
      if (error) throw error;
      return { demoId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['demo-use-case-links', data.demoId] });
      toast.success('Use case removed from demo');
    },
    onError: (e) => toast.error(`Failed to remove: ${e.message}`),
  });
}
