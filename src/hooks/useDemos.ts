import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { demosApi } from "@/lib/api/demos";
import { DemoEnvironment, IndustryTemplate } from "@/types/demo";
import { toast } from "sonner";

export function useDemos() {
  return useQuery({
    queryKey: ['demos'],
    queryFn: demosApi.getAll,
  });
}

export function useDemo(id: string | undefined) {
  return useQuery({
    queryKey: ['demos', id],
    queryFn: () => id ? demosApi.getById(id) : null,
    enabled: !!id,
  });
}

export function useDemoBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['demos', 'slug', slug],
    queryFn: () => slug ? demosApi.getBySlug(slug) : null,
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent refetches that cause form state loss
    refetchOnWindowFocus: false,
  });
}

export function useCreateDemo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ customerName, template }: { customerName: string; template: IndustryTemplate }) =>
      demosApi.create(customerName, template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demos'] });
      toast.success("Demo environment created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create demo: ${error.message}`);
    },
  });
}

export function useUpdateDemo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DemoEnvironment> }) =>
      demosApi.update(id, updates),
    onSuccess: (data) => {
      // Invalidate all demo queries including slug-based ones
      queryClient.invalidateQueries({ queryKey: ['demos'] });
      queryClient.setQueryData(['demos', data.id], data);
      // Also update the slug-based cache so preview pages get the update
      queryClient.setQueryData(['demos', 'slug', data.slug], data);
      toast.success("Demo updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update demo: ${error.message}`);
    },
  });
}

export function useDeleteDemo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: demosApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demos'] });
      toast.success("Demo deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete demo: ${error.message}`);
    },
  });
}
