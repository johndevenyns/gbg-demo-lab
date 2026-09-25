import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TestUserProfile {
  id: string;
  profile_name: string;
  profile_type: 'pass' | 'fail';
  field_data: Record<string, string>;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export function useTestProfiles() {
  return useQuery({
    queryKey: ['test-user-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_user_profiles')
        .select('*')
        .order('profile_type', { ascending: true })
        .order('profile_name', { ascending: true });
      if (error) throw error;
      return data as TestUserProfile[];
    },
  });
}

export function useCreateTestProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Omit<TestUserProfile, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('test_user_profiles')
        .insert(profile)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-user-profiles'] }),
  });
}

export function useCreateTestProfilesBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profiles: Omit<TestUserProfile, 'id' | 'created_at' | 'updated_at'>[]) => {
      const { data, error } = await supabase
        .from('test_user_profiles')
        .insert(profiles)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-user-profiles'] }),
  });
}

export function useUpdateTestProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<TestUserProfile, 'id' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .from('test_user_profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-user-profiles'] }),
  });
}

export function useDeleteTestProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('test_user_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['test-user-profiles'] }),
  });
}
