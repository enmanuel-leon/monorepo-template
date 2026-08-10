import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../../lib/auth-client';
import type { CountryObj, TimezoneObj } from '../onboarding/use-onboarding-page';

interface UserProfile {
  name?: string;
  email?: string;
  countryCode?: string;
  timezoneId?: string;
  country?: CountryObj;
  timezone?: TimezoneObj;
}

export function useSettingsPage() {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();
  const orgs = authClient.useListOrganizations();

  const user = (session.data?.user as unknown as UserProfile) || undefined;

  const [name, setName] = useState(user?.name || '');
  const [countryCode, setCountryCode] = useState(user?.countryCode || 'MX');
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneObj | null>(
    user?.timezone || null,
  );
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      if (matchedCountry && matchedCountry.timezones && matchedCountry.timezones.length > 0) {
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

      const res = await fetch('/me', {
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
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  async function handleCreateOrganization(e: React.FormEvent) {
    e.preventDefault();
    if (!newOrgName.trim()) {
      return;
    }

    setCreatingOrg(true);
    const slug = newOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await authClient.organization.create({
      name: newOrgName,
      slug,
    });
    setNewOrgName('');
    setCreatingOrg(false);
    setIsModalOpen(false);
  }

  async function handleSelectOrg(organizationId: string) {
    await authClient.organization.setActive({
      organizationId,
    });
  }

  return {
    user,
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
    handleCreateOrganization,
    handleSelectOrg,
  };
}
