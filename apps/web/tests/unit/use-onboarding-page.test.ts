import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { renderHook, createTestQueryClient } from '../test-utils';
import { useOnboardingPage } from '../../src/pages/onboarding/use-onboarding-page';
import { authClient } from '../../src/lib/auth-client';
import * as apiClient from '../../src/lib/api-client';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseSession = vi.fn();
const mockUseListOrganizations = vi.fn();
const mockCreateOrg = vi.fn();
const mockSetActive = vi.fn();
const mockListOrgs = vi.fn();
const mockGetSession = vi.fn();

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: () => mockUseSession(),
    useListOrganizations: () => mockUseListOrganizations(),
    organization: {
      create: (args: unknown) => mockCreateOrg(args),
      setActive: (args: unknown) => mockSetActive(args),
      list: () => mockListOrgs(),
    },
    getSession: (args: unknown) => mockGetSession(args),
  },
}));

let mockLocale = 'en';
const mockSetLocale = vi.fn((newLocale: string) => {
  mockLocale = newLocale;
});

vi.mock('../../src/stores/locale.store', () => ({
  useLocaleStore: () => ({
    locale: mockLocale,
    setLocale: mockSetLocale,
  }),
}));

const mockCountriesList = [
  {
    code: 'MX',
    name: 'Mexico',
    timezones: [
      {
        id: 'tz-mx-1',
        ianaName: 'America/Mexico_City',
        displayName: 'Mexico City (GMT-06:00)',
        gmtOffset: 'GMT-06:00',
        countryCode: 'MX',
      },
    ],
  },
  {
    code: 'US',
    name: 'United States',
    timezones: [
      {
        id: 'tz-us-1',
        ianaName: 'America/New_York',
        displayName: 'New York (GMT-05:00)',
        gmtOffset: 'GMT-05:00',
        countryCode: 'US',
      },
    ],
  },
];

const mockLocationReplace = vi.fn();

describe('useOnboardingPage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    mockLocationReplace.mockReset();
    mockLocale = 'en';
    localStorage.clear();

    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        replace: mockLocationReplace,
      },
    });

    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', name: 'New User', email: 'new@example.com' } },
      isPending: false,
    });

    mockUseListOrganizations.mockReturnValue({
      data: [],
      isPending: false,
    });

    mockCreateOrg.mockResolvedValue({
      data: { id: 'org-created-1', name: 'Acme Workspace' },
      error: null,
    });
    mockSetActive.mockResolvedValue({ data: {}, error: null });
    mockListOrgs.mockResolvedValue({
      data: [{ id: 'org-created-1', name: 'Acme Workspace' }],
      error: null,
    });
    mockGetSession.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null });

    vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (path: string) => {
      if (path === '/api/v1/reference/countries') {
        return { countries: mockCountriesList };
      }
      if (path === '/api/v1/me') {
        return { success: true };
      }
      return {};
    });
  });

  it('initializes with step 1, session user display name, default country MX, and null timezone', () => {
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(hook.current.step).toBe(1);
    expect(hook.current.displayName).toBe('New User');
    expect(hook.current.countryCode).toBe('MX');
    expect(hook.current.orgName).toBe('');
    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBeNull();
    expect(hook.current.isConfirmModalOpen).toBe(false);
    expect(hook.current.locale).toBe('en');
    hook.unmount();
  });

  it('handles empty display name fallback when session user name is undefined', () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: 'u-1', name: undefined } },
      isPending: false,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(hook.current.displayName).toBe('');
    hook.unmount();
  });

  it('redirects to /login when session is resolved but user is missing', () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    hook.unmount();
  });

  it('does not redirect while session is pending', () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: true,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(mockNavigate).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('redirects to / when user already has organizations', () => {
    mockUseListOrganizations.mockReturnValue({
      data: [{ id: 'org-existing-1', name: 'Existing Org' }],
      isPending: false,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    hook.unmount();
  });

  it('does not redirect to / while user organizations are pending', () => {
    mockUseListOrganizations.mockReturnValue({
      data: [{ id: 'org-existing-1' }],
      isPending: true,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(mockNavigate).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('navigates through steps with handleNext and handleBack', () => {
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(hook.current.step).toBe(1);

    act(() => {
      hook.current.handleNext();
    });
    expect(hook.current.step).toBe(2);

    act(() => {
      hook.current.handleNext();
    });
    expect(hook.current.step).toBe(3);

    act(() => {
      hook.current.handleNext();
    });
    expect(hook.current.step).toBe(3);
    expect(hook.current.isConfirmModalOpen).toBe(true);

    act(() => {
      hook.current.handleBack();
    });
    expect(hook.current.step).toBe(2);

    act(() => {
      hook.current.handleBack();
    });
    expect(hook.current.step).toBe(1);

    act(() => {
      hook.current.handleBack();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    hook.unmount();
  });

  it('updates form state values via setters', () => {
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    act(() => {
      hook.current.setDisplayName('Custom Name');
      hook.current.setCountryCode('US');
      hook.current.setOrgName('Custom Startup');
      hook.current.setIsConfirmModalOpen(true);
    });

    expect(hook.current.displayName).toBe('Custom Name');
    expect(hook.current.countryCode).toBe('US');
    expect(hook.current.orgName).toBe('Custom Startup');
    expect(hook.current.isConfirmModalOpen).toBe(true);
    hook.unmount();
  });

  it('handles language select by updating locale store', () => {
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    act(() => {
      hook.current.handleLanguageSelect('es');
    });

    expect(mockSetLocale).toHaveBeenCalledWith('es');
    hook.unmount();
  });

  it('sets timezone and country when countries query is populated', async () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ timeZone: 'America/New_York' }),
    } as unknown as Intl.DateTimeFormat);

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reference-countries-full'], mockCountriesList);

    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(hook.current.countryCode).toBe('US');
    expect(hook.current.selectedTimezone).not.toBeNull();
    expect(hook.current.selectedTimezone?.ianaName).toBe('America/New_York');
    hook.unmount();
  });

  it('handles Intl error inside detectCountryCode safely', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('Intl failure');
    });

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reference-countries-full'], mockCountriesList);

    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(hook.current.countryCode).toBe('MX');
    hook.unmount();
  });

  it('handles country with empty timezones gracefully without setting timezone', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      ['reference-countries-full'],
      [
        {
          code: 'MX',
          name: 'Mexico',
          timezones: [],
        },
      ],
    );

    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(hook.current.selectedTimezone).toBeNull();
    hook.unmount();
  });

  it('does not auto-detect when countries array is empty', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reference-countries-full'], []);

    const hook = renderHook(() => useOnboardingPage(), queryClient);

    expect(hook.current.countryCode).toBe('MX');
    expect(hook.current.selectedTimezone).toBeNull();
    hook.unmount();
  });

  it('handleConfirmLaunch successfully updates profile without orgName and navigates', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reference-countries-full'], mockCountriesList);

    const hook = renderHook(() => useOnboardingPage(), queryClient);

    act(() => {
      hook.current.setDisplayName('Alex Doe');
      hook.current.setCountryCode('MX');
      hook.current.setOrgName('');
      hook.current.setIsConfirmModalOpen(true);
    });

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/v1/me', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Alex Doe',
        countryCode: 'MX',
        timezoneId: 'tz-mx-1',
        locale: 'en',
        theme: 'dark',
        hasCompletedOnboarding: true,
      }),
    });
    expect(mockCreateOrg).not.toHaveBeenCalled();
    expect(mockGetSession).toHaveBeenCalledWith({
      query: { disableCookieCache: true },
    });
    expect(hook.current.loading).toBe(false);
    expect(hook.current.isConfirmModalOpen).toBe(false);
    expect(mockLocationReplace).toHaveBeenCalledWith('/');
    hook.unmount();
  });

  it('handleConfirmLaunch reads stored theme from localStorage when available', async () => {
    localStorage.setItem('theme', 'light');

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reference-countries-full'], mockCountriesList);

    const hook = renderHook(() => useOnboardingPage(), queryClient);

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(apiClient.apiFetch).toHaveBeenCalledWith(
      '/api/v1/me',
      expect.objectContaining({
        body: expect.stringContaining('"theme":"light"'),
      }),
    );
    hook.unmount();
  });

  it('handleConfirmLaunch successfully creates and activates organization when orgName is present', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['reference-countries-full'], mockCountriesList);

    const hook = renderHook(() => useOnboardingPage(), queryClient);

    act(() => {
      hook.current.setDisplayName('Alex Doe');
      hook.current.setOrgName('Tech Corp & Co');
      hook.current.setIsConfirmModalOpen(true);
    });

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(mockCreateOrg).toHaveBeenCalledWith({
      name: 'Tech Corp & Co',
      slug: 'tech-corp-co',
    });
    expect(mockSetActive).toHaveBeenCalledWith({
      organizationId: 'org-created-1',
    });
    expect(mockListOrgs).toHaveBeenCalled();
    expect(mockGetSession).toHaveBeenCalled();
    expect(mockLocationReplace).toHaveBeenCalledWith('/');
    expect(hook.current.loading).toBe(false);
    expect(hook.current.isConfirmModalOpen).toBe(false);
    hook.unmount();
  });

  it('handleConfirmLaunch catches profile update failure and sets error message', async () => {
    vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (path: string) => {
      if (path === '/api/v1/reference/countries') {
        return { countries: mockCountriesList };
      }
      if (path === '/api/v1/me') {
        throw new Error('Profile update failed');
      }
      return {};
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('Profile update failed');
    expect(mockLocationReplace).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleConfirmLaunch catches organization creation error and sets error', async () => {
    mockCreateOrg.mockResolvedValueOnce({
      data: null,
      error: { message: 'Organization name exists' },
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    act(() => {
      hook.current.setOrgName('Duplicate Org');
    });

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('onboarding.organizationCreateError');
    expect(mockLocationReplace).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleConfirmLaunch catches organization activation error and sets error', async () => {
    mockSetActive.mockResolvedValueOnce({
      error: { message: 'Activation failed' },
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    act(() => {
      hook.current.setOrgName('Active Fail Org');
    });

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('onboarding.organizationActivateError');
    expect(mockLocationReplace).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleConfirmLaunch catches organization refresh error when list returns error', async () => {
    mockListOrgs.mockResolvedValueOnce({
      error: { message: 'Could not fetch list' },
      data: null,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    act(() => {
      hook.current.setOrgName('Refresh Error Org');
    });

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('onboarding.organizationRefreshError');
    expect(mockLocationReplace).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleConfirmLaunch catches organization refresh error when created org is not in list', async () => {
    mockListOrgs.mockResolvedValueOnce({
      data: [{ id: 'some-other-org' }],
      error: null,
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    act(() => {
      hook.current.setOrgName('Missing Org');
    });

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('onboarding.organizationRefreshError');
    expect(mockLocationReplace).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleConfirmLaunch catches getSession error and sets launchError', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: null,
      error: { message: 'Session lookup failed' },
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('onboarding.launchError');
    expect(mockLocationReplace).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('handleConfirmLaunch handles non-Error exception gracefully', async () => {
    vi.spyOn(apiClient, 'apiFetch').mockImplementation(async (path: string) => {
      if (path === '/api/v1/reference/countries') {
        return { countries: mockCountriesList };
      }
      if (path === '/api/v1/me') {
        throw 'A raw string error occurred';
      }
      return {};
    });

    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    await act(async () => {
      await hook.current.handleConfirmLaunch();
    });

    expect(hook.current.loading).toBe(false);
    expect(hook.current.error).toBe('onboarding.launchError');
    expect(mockLocationReplace).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('executes countries query queryFn via apiFetch', async () => {
    const queryClient = createTestQueryClient();
    const hook = renderHook(() => useOnboardingPage(), queryClient);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    expect(apiClient.apiFetch).toHaveBeenCalledWith('/api/v1/reference/countries');
    hook.unmount();
  });
});
