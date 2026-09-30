import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { toast } from 'sonner';
import { renderHook, createTestQueryClient } from '../test-utils';
import {
  useForbiddenOrgHandler,
  resolveOrganizationsList,
} from '../../src/hooks/use-forbidden-org-handler';
import { authClient } from '../../src/lib/auth-client';
import React from 'react';
import { GlobalForbiddenHandler } from '../../src/components/global-forbidden-handler';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      let result = key;
      if (options?.orgName) {
        result = `${key}:${options.orgName}`;
      }
      return result;
    },
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockSetActive = vi.fn();
const mockList = vi.fn();

vi.mock('../../src/lib/auth-client', () => ({
  authClient: {
    organization: {
      setActive: (args: unknown) => mockSetActive(args),
      list: () => mockList(),
    },
  },
}));

function renderForbiddenHandlerHook() {
  const queryClient = createTestQueryClient();
  const hook = renderHook(() => useForbiddenOrgHandler(), queryClient);
  return { hook, queryClient };
}

describe('useForbiddenOrgHandler & resolveOrganizationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetActive.mockResolvedValue({ success: true });
    mockList.mockResolvedValue({ data: [] });
  });

  describe('resolveOrganizationsList Helper', () => {
    it('returns array directly when passed an array', () => {
      const input = [{ id: 'org-1', name: 'Org 1' }];
      expect(resolveOrganizationsList(input)).toEqual(input);
    });

    it('returns data array when passed an object with data array', () => {
      const input = { data: [{ id: 'org-2', name: 'Org 2' }] };
      expect(resolveOrganizationsList(input)).toEqual([{ id: 'org-2', name: 'Org 2' }]);
    });

    it('returns empty array when passed null, undefined or empty object', () => {
      expect(resolveOrganizationsList(null)).toEqual([]);
      expect(resolveOrganizationsList(undefined)).toEqual([]);
      expect(resolveOrganizationsList({})).toEqual([]);
      expect(resolveOrganizationsList('not-an-object')).toEqual([]);
    });
  });

  describe('useForbiddenOrgHandler Flow', () => {
    it('redirects to /onboarding and shows error toast when user has 0 organizations', async () => {
      mockList.mockResolvedValue({ data: [] });
      const { hook, queryClient } = renderForbiddenHandlerHook();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden-organization', {
            detail: { status: 403, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
          }),
        );
      });

      expect(mockSetActive).toHaveBeenCalledWith({ organizationId: null });
      expect(invalidateSpy).toHaveBeenCalled();
      expect(mockList).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith('notifications.noOrganizationsLeft');
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding', { replace: true });

      hook.unmount();
    });

    it('auto-switches to the sole remaining organization and navigates to / when user has 1 org', async () => {
      const soleOrg = { id: 'org-solo', name: 'Solo Org' };
      mockList.mockResolvedValue({ data: [soleOrg] });
      const { hook, queryClient } = renderForbiddenHandlerHook();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden-organization', {
            detail: { status: 403, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
          }),
        );
      });

      expect(mockSetActive).toHaveBeenNthCalledWith(1, { organizationId: null });
      expect(mockSetActive).toHaveBeenNthCalledWith(2, { organizationId: 'org-solo' });
      expect(invalidateSpy).toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledWith('notifications.autoSwitchedSingleOrg:Solo Org');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });

      hook.unmount();
    });

    it('redirects to /select-organization and shows warning toast when user has 2 or more orgs', async () => {
      mockList.mockResolvedValue({
        data: [
          { id: 'org-1', name: 'Org 1' },
          { id: 'org-2', name: 'Org 2' },
        ],
      });
      const { hook, queryClient } = renderForbiddenHandlerHook();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden-organization', {
            detail: { status: 403, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
          }),
        );
      });

      expect(mockSetActive).toHaveBeenCalledWith({ organizationId: null });
      expect(invalidateSpy).toHaveBeenCalled();
      expect(toast.warning).toHaveBeenCalledWith('notifications.removedSelectAnother');
      expect(mockNavigate).toHaveBeenCalledWith('/select-organization', { replace: true });

      hook.unmount();
    });

    it('catches list errors, shows forbiddenAccess toast, and navigates to /select-organization', async () => {
      mockList.mockRejectedValue(new Error('Network glitch'));
      const { hook } = renderForbiddenHandlerHook();

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden-organization', {
            detail: { status: 403, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
          }),
        );
      });

      expect(toast.error).toHaveBeenCalledWith('notifications.forbiddenAccess');
      expect(mockNavigate).toHaveBeenCalledWith('/select-organization', { replace: true });

      hook.unmount();
    });

    it('prevents concurrent double execution with mutex flag', async () => {
      let resolveList: (val: unknown) => void = () => {};
      const listPromise = new Promise((resolve) => {
        resolveList = resolve;
      });
      mockList.mockReturnValue(listPromise);

      const { hook } = renderForbiddenHandlerHook();

      await act(async () => {
        window.dispatchEvent(
          new CustomEvent('auth:forbidden-organization', {
            detail: { status: 403, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
          }),
        );
        window.dispatchEvent(
          new CustomEvent('auth:forbidden-organization', {
            detail: { status: 403, message: 'FORBIDDEN_ORGANIZATION_ACCESS' },
          }),
        );
      });

      expect(mockSetActive).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveList({ data: [] });
      });

      expect(mockList).toHaveBeenCalledTimes(1);

      hook.unmount();
    });

    it('removes event listener on unmount', () => {
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { hook } = renderForbiddenHandlerHook();

      hook.unmount();

      expect(removeSpy).toHaveBeenCalledWith('auth:forbidden-organization', expect.any(Function));
    });
  });

  describe('GlobalForbiddenHandler Component', () => {
    it('renders null and mounts the hook cleanly', () => {
      const container = document.createElement('div');
      const root = createRoot(container);
      const queryClient = createTestQueryClient();
      act(() => {
        root.render(
          React.createElement(
            QueryClientProvider,
            { client: queryClient },
            React.createElement(GlobalForbiddenHandler, null),
          ),
        );
      });
      expect(container.innerHTML).toBe('');
      act(() => {
        root.unmount();
      });
    });
  });
});
