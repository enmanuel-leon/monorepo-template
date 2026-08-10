import { useNavigate } from 'react-router-dom';
import { authClient } from '../../lib/auth-client';
import { queryClient } from '../../lib/query-client';
import { useLocaleStore } from '../../stores/locale.store';
import { useThemeStore } from '../../stores/theme.store';

export function useAppLayout() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const activeOrg = authClient.useActiveOrganization();
  const userOrgs = authClient.useListOrganizations();
  const { locale, setLocale } = useLocaleStore();
  const { theme, toggleTheme } = useThemeStore();

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
    setLocale(nextLang);
  }

  return {
    user: session.data?.user,
    organization: activeOrg.data,
    organizations: userOrgs.data || [],
    locale,
    theme,
    handleSignOut,
    handleSelectOrg,
    handleLanguageToggle,
    toggleTheme,
  };
}
