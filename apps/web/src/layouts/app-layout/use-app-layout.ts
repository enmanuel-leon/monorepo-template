import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../../lib/auth-client';
import { apiFetch } from '../../lib/api-client';
import { useLocaleStore } from '../../stores/locale.store';
import { useThemeStore } from '../../stores/theme.store';
import type { Theme } from '../../constants/theme.constants';
import type { InvitationData } from '../../components/ui/invitation-modal';

interface OrgSummary {
  id: string;
  name: string;
  slug?: string | null;
  logo?: string | null;
}

interface OrgMembership {
  id: string;
  organizationId: string;
  role: string;
}

interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  locale?: string;
  theme?: string;
  hasSeenTour?: boolean;
  members?: OrgMembership[];
}

interface UserProfileResponse {
  user?: UserProfile;
}

export function useAppLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();
  const userOrgs = authClient.useListOrganizations();
  const { locale, setLocale } = useLocaleStore();
  const { theme, toggleTheme, setTheme } = useThemeStore();

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<InvitationData | null>(null);
  const hasTriggeredTourRef = useRef(false);

  const profileQuery = useQuery<UserProfileResponse>({
    queryKey: ['current-user-profile'],
    queryFn: async () => {
      return apiFetch<UserProfileResponse>('/api/v1/me');
    },
    enabled: Boolean(session.data?.user),
    staleTime: 5 * 60 * 1000,
  });

  const memberships = profileQuery.data?.user?.members || [];
  let isOwnerOfAnyOrg = false;
  for (const m of memberships) {
    if (m.role === 'owner') {
      isOwnerOfAnyOrg = true;
      break;
    }
  }

  useEffect(() => {
    const profileUser = profileQuery.data?.user;
    if (profileUser) {
      if (profileUser.locale && profileUser.locale !== locale) {
        setLocale(profileUser.locale, false);
      }
      if (profileUser.theme && profileUser.theme !== theme) {
        setTheme(profileUser.theme as Theme, false);
      }

      if (profileUser.hasSeenTour === false && !hasTriggeredTourRef.current) {
        hasTriggeredTourRef.current = true;
        setIsTourOpen(true);
      }
    }
  }, [profileQuery.data?.user, locale, theme, setLocale, setTheme]);

  async function handleCloseTour() {
    setIsTourOpen(false);
    try {
      await apiFetch('/api/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ hasSeenTour: true }),
      });
      queryClient.invalidateQueries({ queryKey: ['current-user-profile'] });
    } catch {
      // Ignored
    }
  }

  function handleStartTour() {
    setIsTourOpen(true);
  }

  function openInvitationModal(invitation: InvitationData) {
    setSelectedInvitation(invitation);
  }

  function closeInvitationModal() {
    setSelectedInvitation(null);
  }

  async function handleInvitationAccepted(_orgId: string) {
    await queryClient.invalidateQueries();
    await userOrgs.refetch();
    await activeOrg.refetch();
  }

  async function handleInvitationDeclined(_invitationId: string) {
    await queryClient.invalidateQueries();
  }

  async function handleSignOut() {
    queryClient.clear();
    await authClient.signOut();
    navigate('/login');
  }

  async function handleSelectOrg(organizationId: string) {
    queryClient.clear();
    await authClient.organization.setActive({
      organizationId,
    });
    queryClient.invalidateQueries();
  }

  function handleLanguageToggle() {
    let nextLang = 'es';
    if (locale === 'es') {
      nextLang = 'en';
    }
    setLocale(nextLang, true);
  }

  function handleThemeToggle() {
    toggleTheme(true);
  }

  let currentOrg: OrgSummary | null = null;
  if (activeOrg.data) {
    currentOrg = activeOrg.data;
  } else if (userOrgs.data && userOrgs.data.length > 0) {
    currentOrg = userOrgs.data[0];
  }

  return {
    user: session.data?.user,
    organization: currentOrg,
    organizations: userOrgs.data || [],
    isOwnerOfAnyOrg,
    locale,
    theme,
    isTourOpen,
    handleCloseTour,
    handleStartTour,
    selectedInvitation,
    openInvitationModal,
    closeInvitationModal,
    handleInvitationAccepted,
    handleInvitationDeclined,
    handleSignOut,
    handleSelectOrg,
    handleLanguageToggle,
    handleThemeToggle,
  };
}
