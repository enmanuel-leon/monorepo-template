import { useState, type SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '../../lib/api-client';
import { authClient } from '../../lib/auth-client';

export interface Item {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
}

export function useItemsPage() {
  const queryClient = useQueryClient();
  const activeOrg = authClient.useActiveOrganization();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const activeOrgId = activeOrg.data?.id;

  const {
    data: items = [],
    isLoading,
    refetch,
  } = useQuery<Item[]>({
    queryKey: ['items', activeOrgId],
    queryFn: async () => {
      let url = '/api/v1/items';
      if (activeOrgId) {
        url = `/api/v1/items?organizationId=${activeOrgId}`;
      }
      const data = await apiFetch<Item[]>(url);
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    },
    staleTime: 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiFetch('/api/v1/items', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          organizationId: activeOrgId,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      toast.success('Item created successfully!');
    },
    onError: () => {
      toast.error('Failed to create item');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/v1/items/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Item deleted successfully!');
    },
    onError: () => {
      toast.error('Failed to delete item');
    },
  });

  function handleCreate(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    createMutation.mutate();
  }

  return {
    items,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    title,
    setTitle,
    description,
    setDescription,
    isCreating: createMutation.isPending,
    handleCreate,
    handleDelete: (id: string) => deleteMutation.mutate(id),
    handleRefresh: () => refetch(),
  };
}
