import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function useOnboardingPage() {
  const navigate = useNavigate();
  const session = authClient.useSession();
  const { locale, setLocale } = useLocaleStore();
  const [step, setStep] = useState<number>(1);
  const [displayName, setDisplayName] = useState(session.data?.user?.name || '');
  const [countryCode, setCountryCode] = useState('MX');
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneObj | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
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
    if (countries.length > 0) {
      let detectedCode: string | null = null;
      try {
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (userTimeZone) {
          for (const c of countries) {
            if (c.timezones && c.timezones.some((tz) => tz.ianaName === userTimeZone)) {
              detectedCode = c.code;
              break;
            }
          }
        }
      } catch {
        // Fallback
      }

      let targetCode = countryCode;
      if (detectedCode && countryCode === 'MX') {
        targetCode = detectedCode;
        setCountryCode(detectedCode);
      }

      let matchedCountry = countries.find((c) => c.code === targetCode);
      if (!matchedCountry) {
        matchedCountry = countries[0];
      }

      if (matchedCountry && matchedCountry.timezones && matchedCountry.timezones.length > 0) {
        setSelectedTimezone(matchedCountry.timezones[0]);
      }
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

    let tzId: string | undefined = undefined;
    if (selectedTimezone) {
      tzId = selectedTimezone.id;
    }

    try {
      await fetch('/api/v1/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayName,
          countryCode,
          timezoneId: tzId,
        }),
      });

      if (orgName.trim().length > 0) {
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const res = await authClient.organization.create({
          name: orgName,
          slug,
        });

        if (res && res.data) {
          await authClient.organization.setActive({
            organizationId: res.data.id,
          });
        }
      }

      await authClient.getSession({ query: { disableCookieCache: true } });
      await queryClient.invalidateQueries();
      setLoading(false);
      setIsConfirmModalOpen(false);
      navigate('/', { replace: true });
    } catch {
      setLoading(false);
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
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    locale,
    handleNext,
    handleBack,
    handleConfirmLaunch,
    handleLanguageSelect,
  };
}
