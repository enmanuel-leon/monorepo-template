import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '../test-utils';
import { useHomePage } from '../../src/pages/home/use-home-page';
import { authClient } from '../../src/lib/auth-client';

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    useActiveOrganization: vi.fn(),
    useListOrganizations: vi.fn(),
  },
}));

describe('useHomePage Hook Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active organization when activeOrg.data is present', () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: { id: 'org-active-1', name: 'Active Org', slug: 'active-org' },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [{ id: 'org-active-1', name: 'Active Org', slug: 'active-org' }],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    const hook = renderHook(() => useHomePage());

    expect(hook.current.user?.name).toBe('John Doe');
    expect(hook.current.organization?.name).toBe('Active Org');
    hook.unmount();
  });

  it('falls back to first user organization when activeOrg.data is null', () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: { user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' } },
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useSession>);

    vi.mocked(authClient.useActiveOrganization).mockReturnValue({
      data: null,
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useActiveOrganization>);

    vi.mocked(authClient.useListOrganizations).mockReturnValue({
      data: [{ id: 'org-fallback-1', name: 'Fallback Org', slug: 'fallback-org' }],
      isPending: false,
    } as unknown as ReturnType<typeof authClient.useListOrganizations>);

    const hook = renderHook(() => useHomePage());

    expect(hook.current.organization?.name).toBe('Fallback Org');
    expect(hook.current.organization?.id).toBe('org-fallback-1');
    hook.unmount();
  });
});
