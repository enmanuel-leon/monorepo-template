import { useState, useEffect, type SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../../lib/auth-client';
import { apiFetch } from '../../lib/api-client';
import type { CountryObj, TimezoneObj } from '../onboarding/use-onboarding-page';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface OrgMembership {
  id: string;
  organizationId: string;
  role: string;
}

interface UserProfile {
  name?: string;
  email?: string;
  countryCode?: string;
  timezoneId?: string;
  country?: CountryObj;
  timezone?: TimezoneObj;
  members?: OrgMembership[];
}

interface UserProfileResponse {
  user: UserProfile;
}

export interface OrgMemberItem {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name?: string;
    email: string;
    image?: string | null;
  };
}

export interface OrgInvitationItem {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
  organizationId: string;
}

export function useSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();
  const orgs = authClient.useListOrganizations();
  const passkeysQuery = authClient.useListPasskeys();

  const profileQuery = useQuery<UserProfileResponse>({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      return apiFetch<UserProfileResponse>('/api/v1/me');
    },
    enabled: Boolean(session.data?.user),
  });

  const user = profileQuery.data?.user;
  const email = session.data?.user?.email || user?.email || '';

  const [name, setName] = useState(user?.name || '');
  const [countryCode, setCountryCode] = useState(user?.countryCode || 'MX');
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneObj | null>(
    user?.timezone || null,
  );
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(null);
  const [editingPasskeyName, setEditingPasskeyName] = useState('');
  const [isManagingPasskey, setIsManagingPasskey] = useState(false);
  const [passkeyToDeleteId, setPasskeyToDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'organizations' | 'security'>('profile');

  // Invite member state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [isInviting, setIsInviting] = useState(false);

  // Remove member state
  const [memberToRemove, setMemberToRemove] = useState<OrgMemberItem | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const memberships = profileQuery.data?.user?.members || [];
  let isOwnerOfAnyOrg = false;
  for (const m of memberships) {
    if (m.role === 'owner') {
      isOwnerOfAnyOrg = true;
      break;
    }
  }

  let currentOrgRole = 'member';
  if (activeOrg.data?.id && profileQuery.data?.user?.members) {
    const matched = profileQuery.data.user.members.find(
      (m) => m.organizationId === activeOrg.data?.id,
    );
    if (matched) {
      currentOrgRole = matched.role;
    }
  }
  const canManageMembers = currentOrgRole === 'owner' || currentOrgRole === 'admin';

  const membersQuery = useQuery<OrgMemberItem[]>({
    queryKey: ['org-members', activeOrg.data?.id],
    queryFn: async () => {
      if (!activeOrg.data?.id) {
        return [];
      }
      const res = await authClient.organization.listMembers({
        query: { organizationId: activeOrg.data.id },
      });
      if (res.error || !res.data) {
        return [];
      }
      return res.data.members as unknown as OrgMemberItem[];
    },
    enabled: Boolean(activeOrg.data?.id),
  });

  const sentInvitationsQuery = useQuery<OrgInvitationItem[]>({
    queryKey: ['org-sent-invitations', activeOrg.data?.id],
    queryFn: async () => {
      if (!activeOrg.data?.id) {
        return [];
      }
      const res = await authClient.organization.listInvitations({
        query: { organizationId: activeOrg.data.id },
      });
      if (res.error || !res.data || !Array.isArray(res.data)) {
        return [];
      }
      const allInvites = res.data as unknown as OrgInvitationItem[];
      return allInvites.filter((inv) => inv.status === 'pending');
    },
    enabled: Boolean(activeOrg.data?.id && activeTab === 'organizations'),
  });

  const countriesQuery = useQuery<CountryObj[]>({
    queryKey: ['reference-countries-full'],
    queryFn: async () => {
      const data = await apiFetch<{ countries: CountryObj[] }>('/api/v1/reference/countries');
      return data.countries;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const countries = countriesQuery.data || [];

  useEffect(() => {
    if (user) {
      if (user.name) {
        setName(user.name);
      }
      if (user.countryCode) {
        setCountryCode(user.countryCode);
      }
    }
  }, [user]);

  useEffect(() => {
    if (countries.length > 0) {
      let matchedCountry = countries.find((c) => c.code === countryCode);
      if (!matchedCountry) {
        matchedCountry = countries[0];
      }

      if (matchedCountry?.timezones?.length) {
        setSelectedTimezone(matchedCountry.timezones[0]);
      }
    }
  }, [countryCode, countries]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      let tzId: string | undefined = undefined;
      if (selectedTimezone) {
        tzId = selectedTimezone.id;
      }

      return apiFetch('/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ name, countryCode, timezoneId: tzId }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      toast.success(t('settings.profileSaved'));
    },
    onError: () => {
      toast.error(t('settings.profileSaveError'));
    },
  });

  async function handleAddPasskey() {
    setIsManagingPasskey(true);
    const result = await authClient.passkey.addPasskey({ name: passkeyName.trim() || undefined });
    setIsManagingPasskey(false);

    if (result.error) {
      toast.error(t('settings.passkeyAddError'));
      return;
    }

    setPasskeyName('');
    toast.success(t('settings.passkeyAdded'));
    await passkeysQuery.refetch();
  }

  async function handleUpdatePasskey() {
    if (!editingPasskeyId || !editingPasskeyName.trim()) {
      return;
    }

    setIsManagingPasskey(true);
    const result = await authClient.passkey.updatePasskey({
      id: editingPasskeyId,
      name: editingPasskeyName.trim(),
    });
    setIsManagingPasskey(false);

    if (result.error) {
      toast.error(t('settings.passkeyUpdateError'));
      return;
    }

    setEditingPasskeyId(null);
    setEditingPasskeyName('');
    toast.success(t('settings.passkeyUpdated'));
    await passkeysQuery.refetch();
  }

  function openDeletePasskeyModal(id: string) {
    setPasskeyToDeleteId(id);
  }

  function closeDeletePasskeyModal() {
    setPasskeyToDeleteId(null);
  }

  async function handleConfirmDeletePasskey() {
    if (!passkeyToDeleteId) {
      return;
    }

    setIsManagingPasskey(true);
    const result = await authClient.passkey.deletePasskey({ id: passkeyToDeleteId });
    setIsManagingPasskey(false);

    if (result.error) {
      toast.error(t('settings.passkeyDeleteError'));
      return;
    }

    setPasskeyToDeleteId(null);
    toast.success(t('settings.passkeyDeleted'));
    await passkeysQuery.refetch();
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

    setCreatingOrg(true);
    const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = await authClient.organization.create({
      name: newOrgName,
      slug,
    });

    if (result.error) {
      toast.error(t('settings.organizationCreateError'));
      setCreatingOrg(false);
      return;
    }

    setNewOrgName('');
    setCreatingOrg(false);
    setIsModalOpen(false);
    toast.success(t('settings.organizationCreated'));
  }

  async function handleSelectOrg(organizationId: string) {
    const result = await authClient.organization.setActive({
      organizationId,
    });

    if (result.error) {
      toast.error(t('settings.organizationSelectError'));
      return;
    }

    toast.success(t('settings.organizationSelected'));
    await membersQuery.refetch();
    await sentInvitationsQuery.refetch();
  }

  async function handleInviteMember(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeOrg.data?.id) {
      return;
    }

    setIsInviting(true);
    const result = await authClient.organization.inviteMember({
      email: inviteEmail.trim(),
      role: inviteRole,
      organizationId: activeOrg.data.id,
    });
    setIsInviting(false);

    if (result.error) {
      toast.error(t('settings.inviteError'));
      return;
    }

    setInviteEmail('');
    setIsInviteModalOpen(false);
    toast.success(t('settings.inviteSent'));
    await sentInvitationsQuery.refetch();
  }

  function openRemoveMemberModal(member: OrgMemberItem) {
    setMemberToRemove(member);
  }

  function closeRemoveMemberModal() {
    setMemberToRemove(null);
  }

  async function handleConfirmRemoveMember() {
    if (!memberToRemove || !activeOrg.data?.id) {
      return;
    }

    setIsRemovingMember(true);
    const result = await authClient.organization.removeMember({
      memberIdOrEmail: memberToRemove.id,
      organizationId: activeOrg.data.id,
    });
    setIsRemovingMember(false);

    if (result.error) {
      toast.error(t('settings.removeMemberError'));
      return;
    }

    setMemberToRemove(null);
    toast.success(t('settings.memberRemoved'));
    await membersQuery.refetch();
  }

  async function handleCancelInvitation(invitationId: string) {
    const result = await authClient.organization.cancelInvitation({
      invitationId,
    });

    if (result.error) {
      toast.error(t('settings.inviteError'));
      return;
    }

    toast.success(t('settings.inviteCancelled'));
    await sentInvitationsQuery.refetch();
  }

  return {
    user,
    email,
    activeOrg: activeOrg.data,
    organizations: orgs.data || [],
    name,
    setName,
    countryCode,
    setCountryCode,
    selectedTimezone,
    countries,
    newOrgName,
    setNewOrgName,
    creatingOrg,
    isModalOpen,
    setIsModalOpen,
    isUpdatingProfile: updateProfileMutation.isPending,
    handleSaveProfile: () => updateProfileMutation.mutate(),
    passkeys: passkeysQuery.data || [],
    isLoadingPasskeys: passkeysQuery.isPending,
    passkeysLoadError: Boolean(passkeysQuery.error),
    passkeyName,
    setPasskeyName,
    editingPasskeyId,
    setEditingPasskeyId,
    editingPasskeyName,
    setEditingPasskeyName,
    isManagingPasskey,
    isOwnerOfAnyOrg,
    canManageMembers,
    currentOrgRole,
    members: membersQuery.data || [],
    isLoadingMembers: membersQuery.isPending,
    sentInvitations: sentInvitationsQuery.data || [],
    isLoadingSentInvitations: sentInvitationsQuery.isPending,
    isInviteModalOpen,
    setIsInviteModalOpen,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    isInviting,
    handleInviteMember,
    memberToRemove,
    isRemovingMember,
    openRemoveMemberModal,
    closeRemoveMemberModal,
    handleConfirmRemoveMember,
    handleCancelInvitation,
    activeTab,
    setActiveTab,
    passkeyToDeleteId,
    openDeletePasskeyModal,
    closeDeletePasskeyModal,
    handleConfirmDeletePasskey,
    handleAddPasskey,
    handleUpdatePasskey,
    handleCreateOrganization,
    handleSelectOrg,
  };
}
