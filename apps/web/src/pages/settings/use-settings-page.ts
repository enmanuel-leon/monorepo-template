import { useState, useEffect, type SyntheticEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../../lib/auth-client';
import type { CountryObj, TimezoneObj } from '../onboarding/use-onboarding-page';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface UserProfile {
  name?: string;
  email?: string;
  countryCode?: string;
  timezoneId?: string;
  country?: CountryObj;
  timezone?: TimezoneObj;
}

interface UserProfileResponse {
  user: UserProfile;
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
      const response = await fetch('/api/v1/me');
      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }
      return response.json();
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

  const countriesQuery = useQuery<CountryObj[]>({
    queryKey: ['reference-countries-full'],
    queryFn: async () => {
      const res = await fetch('/api/v1/reference/countries');
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
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

      const res = await fetch('/api/v1/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, countryCode, timezoneId: tzId }),
      });
      if (!res.ok) {
        throw new Error('Failed to update profile');
      }
      return res.json();
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

  async function handleDeletePasskey(id: string) {
    if (!window.confirm(t('settings.passkeyDeleteConfirm'))) {
      return;
    }

    setIsManagingPasskey(true);
    const result = await authClient.passkey.deletePasskey({ id });
    setIsManagingPasskey(false);

    if (result.error) {
      toast.error(t('settings.passkeyDeleteError'));
      return;
    }

    toast.success(t('settings.passkeyDeleted'));
    await passkeysQuery.refetch();
  }

  async function handleCreateOrganization(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newOrgName.trim()) {
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
    handleAddPasskey,
    handleUpdatePasskey,
    handleDeletePasskey,
    handleCreateOrganization,
    handleSelectOrg,
  };
}
