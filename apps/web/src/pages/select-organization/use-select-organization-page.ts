import { useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authClient } from '../../lib/auth-client';
import { apiFetch } from '../../lib/api-client';
import type { InvitationData } from '../../components/ui/invitation-modal';

interface OrgMembership {
  id: string;
  organizationId: string;
  role: string;
  organization?: {
    id: string;
    name: string;
    slug?: string | null;
    logo?: string | null;
  };
}

export interface UserProfileResponse {
  user?: {
    id: string;
    name?: string;
    email?: string;
    members?: OrgMembership[];
  };
}

export interface OrgItem {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
}

export interface UserInvitation {
  id: string;
  organizationId: string;
  organizationName?: string;
  email: string;
  role: string;
  status: string;
}

export function useSelectOrganizationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const orgsQuery = authClient.useListOrganizations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectingOrgId, setSelectingOrgId] = useState<string | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationData | null>(null);

  const profileQuery = useQuery<UserProfileResponse>({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      return apiFetch<UserProfileResponse>('/api/v1/me');
    },
    enabled: Boolean(session.data?.user),
  });

  const invitationsQuery = useQuery<{ data?: UserInvitation[] }>({
    queryKey: ['user-invitations'],
    queryFn: async () => {
      const res = await authClient.organization.listUserInvitations();
      if (res.error) {
        return { data: [] };
      }
      return { data: res.data as UserInvitation[] };
    },
    enabled: Boolean(session.data?.user),
  });

  const memberships = profileQuery.data?.user?.members || [];
  let isOwnerOfAnyOrg = false;
  for (const m of memberships) {
    if (m.role === 'owner') {
      isOwnerOfAnyOrg = true;
      break;
    }
  }

  const roleByOrgId = new Map<string, string>();
  for (const m of memberships) {
    roleByOrgId.set(m.organizationId, m.role);
  }

  const organizations: OrgItem[] = orgsQuery.data || [];
  const invitations: UserInvitation[] = invitationsQuery.data?.data || [];

  async function handleSelectOrg(organizationId: string) {
    setSelectingOrgId(organizationId);
    try {
      const result = await authClient.organization.setActive({
        organizationId,
      });

      if (result.error) {
        toast.error(t('settings.organizationSelectError'));
        setSelectingOrgId(null);
        return;
      }

      await authClient.getSession({ query: { disableCookieCache: true } });
      await queryClient.invalidateQueries();
      setSelectingOrgId(null);
      if (typeof window !== 'undefined' && window.location && process.env.NODE_ENV !== 'test') {
        window.location.href = '/';
      } else {
        navigate('/', { replace: true });
      }
    } catch {
      toast.error(t('settings.organizationSelectError'));
      setSelectingOrgId(null);
    }
  }

  async function handleCreateOrganization(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newOrgName.trim()) {
      return;
    }

    if (isOwnerOfAnyOrg) {
      toast.error(t('selectOrg.ownerLimitReached'));
      return;
    }

    setIsSubmitting(true);
    const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = await authClient.organization.create({
      name: newOrgName.trim(),
      slug,
    });

    if (result.error || !result.data) {
      toast.error(t('settings.organizationCreateError'));
      setIsSubmitting(false);
      return;
    }

    await authClient.organization.setActive({
      organizationId: result.data.id,
    });
    await authClient.getSession({ query: { disableCookieCache: true } });
    await queryClient.invalidateQueries();

    setIsSubmitting(false);
    setIsModalOpen(false);
    toast.success(t('settings.organizationCreated'));
    if (typeof window !== 'undefined' && window.location && process.env.NODE_ENV !== 'test') {
      window.location.href = '/';
    } else {
      navigate('/', { replace: true });
    }
  }

  function openInvitationModal(invitation: InvitationData) {
    setSelectedInvitation(invitation);
  }

  function closeInvitationModal() {
    setSelectedInvitation(null);
  }

  async function handleModalAccepted(_orgId: string) {
    await queryClient.invalidateQueries();
    await orgsQuery.refetch();
    await invitationsQuery.refetch();
    if (typeof window !== 'undefined' && window.location && process.env.NODE_ENV !== 'test') {
      window.location.href = '/';
    } else {
      navigate('/', { replace: true });
    }
  }

  async function handleModalDeclined(_invitationId: string) {
    await queryClient.invalidateQueries();
    await invitationsQuery.refetch();
  }

  async function handleSignOut() {
    queryClient.clear();
    await authClient.signOut();
    if (typeof window !== 'undefined' && window.location && process.env.NODE_ENV !== 'test') {
      window.location.href = '/login';
    } else {
      navigate('/login', { replace: true });
    }
  }

  return {
    user: session.data?.user,
    organizations,
    invitations,
    roleByOrgId,
    isOwnerOfAnyOrg,
    isModalOpen,
    setIsModalOpen,
    newOrgName,
    setNewOrgName,
    isSubmitting,
    selectingOrgId,
    isLoading: orgsQuery.isPending || profileQuery.isPending,
    handleSelectOrg,
    handleCreateOrganization,
    selectedInvitation,
    openInvitationModal,
    closeInvitationModal,
    handleModalAccepted,
    handleModalDeclined,
    handleSignOut,
  };
}
