import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  VerificationTypeConfig,
  MdlProvider,
  VerificationTypeConfigRow,
  MdlProviderRow,
  VerificationTypeFormData,
  MdlProviderFormData,
  transformVerificationTypeRow,
  transformMdlProviderRow,
} from "@/types/verification";

// ============ Verification Types ============

export function useVerificationTypes(enabledOnly = false) {
  return useQuery({
    queryKey: ['verification-types', enabledOnly],
    queryFn: async (): Promise<VerificationTypeConfig[]> => {
      let query = supabase
        .from('verification_type_configs')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (enabledOnly) {
        query = query.eq('is_enabled', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data as VerificationTypeConfigRow[]).map(transformVerificationTypeRow);
    },
  });
}

export function useUpdateVerificationType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<VerificationTypeFormData> }) => {
      // Build update object without config_schema to avoid type issues
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.typeKey !== undefined) dbUpdates.type_key = updates.typeKey;
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.iconName !== undefined) dbUpdates.icon_name = updates.iconName || null;
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;
      if (updates.defaultResourceId !== undefined) dbUpdates.default_resource_id = updates.defaultResourceId || null;
      if (updates.requiresBiometric !== undefined) dbUpdates.requires_biometric = updates.requiresBiometric;
      if (updates.requiresDocument !== undefined) dbUpdates.requires_document = updates.requiresDocument;
      if (updates.supportsQrCode !== undefined) dbUpdates.supports_qr_code = updates.supportsQrCode;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
      
      const { data, error } = await supabase
        .from('verification_type_configs')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformVerificationTypeRow(data as VerificationTypeConfigRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-types'] });
      toast.success("Verification type updated");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useCreateVerificationType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: VerificationTypeFormData) => {
      const dbData = {
        type_key: data.typeKey,
        display_name: data.displayName,
        description: data.description || null,
        icon_name: data.iconName || null,
        is_enabled: data.isEnabled,
        default_resource_id: data.defaultResourceId || null,
        requires_biometric: data.requiresBiometric,
        requires_document: data.requiresDocument,
        supports_qr_code: data.supportsQrCode,
        display_order: data.displayOrder,
      };
      
      const { data: result, error } = await supabase
        .from('verification_type_configs')
        .insert(dbData)
        .select()
        .single();
      
      if (error) throw error;
      return transformVerificationTypeRow(result as VerificationTypeConfigRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-types'] });
      toast.success("Verification type created");
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
}

export function useDeleteVerificationType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('verification_type_configs')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-types'] });
      toast.success("Verification type deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}

// ============ mDL Providers ============

export function useMdlProviders(enabledOnly = false) {
  return useQuery({
    queryKey: ['mdl-providers', enabledOnly],
    queryFn: async (): Promise<MdlProvider[]> => {
      let query = supabase
        .from('mdl_providers')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (enabledOnly) {
        query = query.eq('is_enabled', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data as MdlProviderRow[]).map(transformMdlProviderRow);
    },
  });
}

export function useUpdateMdlProvider() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MdlProviderFormData> }) => {
      // Build update object without config_options to avoid type issues
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.providerKey !== undefined) dbUpdates.provider_key = updates.providerKey;
      if (updates.displayName !== undefined) dbUpdates.display_name = updates.displayName;
      if (updates.description !== undefined) dbUpdates.description = updates.description || null;
      if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl || null;
      if (updates.domain !== undefined) dbUpdates.domain = updates.domain || null;
      if (updates.countryCode !== undefined) dbUpdates.country_code = updates.countryCode || null;
      if (updates.scope !== undefined) dbUpdates.scope = updates.scope;
      if (updates.isEnabled !== undefined) dbUpdates.is_enabled = updates.isEnabled;
      if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
      
      const { data, error } = await supabase
        .from('mdl_providers')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformMdlProviderRow(data as MdlProviderRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdl-providers'] });
      toast.success("Provider updated");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
}

export function useCreateMdlProvider() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: MdlProviderFormData) => {
      const dbData = {
        provider_key: data.providerKey,
        display_name: data.displayName,
        description: data.description || null,
        logo_url: data.logoUrl || null,
        domain: data.domain || null,
        country_code: data.countryCode || null,
        scope: data.scope,
        is_enabled: data.isEnabled,
        display_order: data.displayOrder,
      };
      
      const { data: result, error } = await supabase
        .from('mdl_providers')
        .insert(dbData)
        .select()
        .single();
      
      if (error) throw error;
      return transformMdlProviderRow(result as MdlProviderRow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdl-providers'] });
      toast.success("Provider created");
    },
    onError: (error) => {
      toast.error(`Failed to create: ${error.message}`);
    },
  });
}

export function useDeleteMdlProvider() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mdl_providers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mdl-providers'] });
      toast.success("Provider deleted");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
}
