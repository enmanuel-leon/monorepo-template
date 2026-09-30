import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { authClient } from '../lib/auth-client';

interface OrgItem {
  id: string;
  name: string;
}

export function resolveOrganizationsList(listResult: unknown): OrgItem[] {
  if (Array.isArray(listResult)) {
    return listResult as OrgItem[];
  }
  if (listResult && typeof listResult === 'object' && 'data' in listResult) {
    const data = (listResult as { data?: unknown }).data;
    if (Array.isArray(data)) {
      return data as OrgItem[];
    }
  }
  return [];
}

export function useForbiddenOrgHandler() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    async function handleForbiddenOrg() {
      if (isProcessingRef.current) {
        return;
      }
      isProcessingRef.current = true;

      try {
        await authClient.organization.setActive({ organizationId: null });
        await queryClient.invalidateQueries();

        const listResult = await authClient.organization.list();
        const freshOrgs = resolveOrganizationsList(listResult);

        if (freshOrgs.length === 0) {
          toast.error(t('notifications.noOrganizationsLeft'));
          navigate('/onboarding', { replace: true });
          return;
        }

        if (freshOrgs.length === 1) {
          const soleOrg = freshOrgs[0];
          await authClient.organization.setActive({ organizationId: soleOrg.id });
          await queryClient.invalidateQueries();
          toast.warning(t('notifications.autoSwitchedSingleOrg', { orgName: soleOrg.name }));
          navigate('/', { replace: true });
          return;
        }

        toast.warning(t('notifications.removedSelectAnother'));
        navigate('/select-organization', { replace: true });
      } catch {
        toast.error(t('notifications.forbiddenAccess'));
        navigate('/select-organization', { replace: true });
      } finally {
        if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
          isProcessingRef.current = false;
        } else {
          setTimeout(() => {
            isProcessingRef.current = false;
          }, 500);
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:forbidden-organization', handleForbiddenOrg);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:forbidden-organization', handleForbiddenOrg);
      }
    };
  }, [navigate, queryClient, t]);
}
