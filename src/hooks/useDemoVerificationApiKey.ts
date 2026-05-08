import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDemoVerificationApiKey(demoId?: string) {
  return useQuery({
    queryKey: ['demo-verification-api-key', demoId],
    enabled: !!demoId,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from('demo_verification_api_keys' as any)
        .select('api_key')
        .eq('demo_id', demoId!)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.api_key as string) || '';
    },
  });
}

export function useSaveDemoVerificationApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ demoId, apiKey }: { demoId: string; apiKey: string }) => {
      const trimmed = apiKey.trim();
      if (!trimmed) {
        const { error } = await supabase
          .from('demo_verification_api_keys' as any)
          .delete()
          .eq('demo_id', demoId);
        if (error) throw error;
        return;
      }
      const { data: existing } = await supabase
        .from('demo_verification_api_keys' as any)
        .select('demo_id')
        .eq('demo_id', demoId)
        .maybeSingle();
      if ((existing as any)?.demo_id) {
        const { error } = await supabase
          .from('demo_verification_api_keys' as any)
          .update({ api_key: trimmed } as any)
          .eq('demo_id', demoId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('demo_verification_api_keys' as any)
          .insert({ demo_id: demoId, api_key: trimmed } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['demo-verification-api-key', vars.demoId] });
      toast.success("Verification API key saved");
    },
    onError: (e: any) => toast.error(`Failed to save: ${e.message}`),
  });
}
