import { useState, type SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const activeOrg = authClient.useActiveOrganization();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
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
      toast.success(t('items.createdSuccess'));
    },
    onError: () => {
      toast.error(t('items.createError'));
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
      setItemToDeleteId(null);
      toast.success(t('items.deletedSuccess'));
    },
    onError: () => {
      toast.error(t('items.deleteError'));
    },
  });

  function handleCreate(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }
    createMutation.mutate();
  }

  function openDeleteModal(id: string) {
    setItemToDeleteId(id);
  }

  function closeDeleteModal() {
    setItemToDeleteId(null);
  }

  async function handleConfirmDelete() {
    if (!itemToDeleteId) {
      return;
    }
    await deleteMutation.mutateAsync(itemToDeleteId);
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
    handleRefresh: () => refetch(),
    itemToDeleteId,
    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
    isDeleting: deleteMutation.isPending,
  };
}
