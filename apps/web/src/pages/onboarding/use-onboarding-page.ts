import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '../../lib/auth-client';
import { queryClient } from '../../lib/query-client';
import { useLocaleStore } from '../../stores/locale.store';

export interface TimezoneObj {
  id: string;
  ianaName: string;
  displayName: string;
  gmtOffset: string;
  countryCode: string;
}

export interface CountryObj {
  code: string;
  iso3?: string;
  name: string;
  flag?: string;
  timezones: TimezoneObj[];
}

function detectCountryCode(countries: CountryObj[]): string | null {
  try {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const matchedCountry = countries.find((country) =>
      country.timezones?.some((timezone) => timezone.ianaName === userTimeZone),
    );
    return matchedCountry?.code || null;
  } catch {
    return null;
  }
}

function findFirstTimezone(countries: CountryObj[], countryCode: string): TimezoneObj | null {
  const matchedCountry = countries.find((country) => country.code === countryCode) || countries[0];
  return matchedCountry?.timezones?.[0] || null;
}

export function useOnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const session = authClient.useSession();
  const { locale, setLocale } = useLocaleStore();
  const [step, setStep] = useState<number>(1);
  const [displayName, setDisplayName] = useState(session.data?.user?.name || '');
  const [countryCode, setCountryCode] = useState('MX');
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneObj | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    if (!session.isPending && !session.data?.user) {
      navigate('/login', { replace: true });
    }
  }, [session.data?.user, session.isPending, navigate]);

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

  // Client-side browser timezone & country auto-detection
  useEffect(() => {
    if (countries.length === 0) {
      return;
    }

    const detectedCode = detectCountryCode(countries);
    let targetCode = countryCode;
    if (detectedCode && countryCode === 'MX') {
      targetCode = detectedCode;
      setCountryCode(detectedCode);
    }

    const timezone = findFirstTimezone(countries, targetCode);
    if (timezone) {
      setSelectedTimezone(timezone);
    }
  }, [countries, countryCode]);

  function handleNext() {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setIsConfirmModalOpen(true);
  }

  function handleBack() {
    if (step > 1) {
      setStep(step - 1);
      return;
    }
    navigate('/login');
  }

  async function handleConfirmLaunch() {
    setLoading(true);
    setError(null);

    let tzId: string | undefined = undefined;
    if (selectedTimezone) {
      tzId = selectedTimezone.id;
    }

    try {
      const profileResponse = await fetch('/api/v1/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          countryCode,
          timezoneId: tzId,
        }),
      });
      if (!profileResponse.ok) {
        throw new Error(t('onboarding.launchError'));
      }

      if (orgName.trim().length > 0) {
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const res = await authClient.organization.create({
          name: orgName,
          slug,
        });

        if (res.error || !res.data) {
          throw new Error(t('onboarding.organizationCreateError'));
        }

        const activeOrganization = await authClient.organization.setActive({
          organizationId: res.data.id,
        });
        if (activeOrganization.error) {
          throw new Error(t('onboarding.organizationActivateError'));
        }

        const organizations = await authClient.organization.list();
        if (
          organizations.error ||
          !organizations.data?.some((organization) => organization.id === res.data.id)
        ) {
          throw new Error(t('onboarding.organizationRefreshError'));
        }
      }

      const sessionResponse = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      if (sessionResponse.error) {
        throw new Error(t('onboarding.launchError'));
      }
      await queryClient.invalidateQueries();
      setLoading(false);
      setIsConfirmModalOpen(false);
      // Reload the protected tree so Better Auth hooks read the newly active organization.
      window.location.replace('/');
    } catch (launchError) {
      setLoading(false);
      if (launchError instanceof Error) {
        setError(launchError.message);
      } else {
        setError(t('onboarding.launchError'));
      }
    }
  }

  function handleLanguageSelect(newLang: string) {
    setLocale(newLang);
  }

  return {
    step,
    displayName,
    setDisplayName,
    countryCode,
    setCountryCode,
    selectedTimezone,
    countries,
    orgName,
    setOrgName,
    loading,
    error,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    locale,
    handleNext,
    handleBack,
    handleConfirmLaunch,
    handleLanguageSelect,
  };
}
