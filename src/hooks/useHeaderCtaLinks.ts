import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HeaderCtaLink {
  id: string;
  demoId: string;
  cssSelector: string;
  useCaseId: string;
  elementLabel: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): HeaderCtaLink {
  return {
    id: row.id as string,
    demoId: row.demo_id as string,
    cssSelector: row.css_selector as string,
    useCaseId: row.use_case_id as string,
    elementLabel: (row.element_label as string) ?? null,
    displayOrder: row.display_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useHeaderCtaLinks(demoId: string | undefined) {
  return useQuery({
    queryKey: ['header-cta-links', demoId],
    queryFn: async () => {
      if (!demoId) return [];
      const { data, error } = await supabase
        .from('demo_header_cta_links')
        .select('*')
        .eq('demo_id', demoId)
        .order('display_order');
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!demoId,
  });
}

export function useAddHeaderCtaLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (link: { demoId: string; cssSelector: string; useCaseId: string; elementLabel?: string; displayOrder: number }) => {
      const { data, error } = await supabase
        .from('demo_header_cta_links')
        .insert([{
          demo_id: link.demoId,
          css_selector: link.cssSelector,
          use_case_id: link.useCaseId,
          element_label: link.elementLabel ?? null,
          display_order: link.displayOrder,
        }])
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['header-cta-links', data.demoId] });
      toast.success('CTA link added');
    },
    onError: (e) => toast.error(`Failed to add CTA link: ${e.message}`),
  });
}

export function useDeleteHeaderCtaLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, demoId }: { id: string; demoId: string }) => {
      const { error } = await supabase.from('demo_header_cta_links').delete().eq('id', id);
      if (error) throw error;
      return { demoId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['header-cta-links', data.demoId] });
      toast.success('CTA link removed');
    },
    onError: (e) => toast.error(`Failed to remove CTA link: ${e.message}`),
  });
}
