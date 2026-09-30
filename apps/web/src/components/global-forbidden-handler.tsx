import { useForbiddenOrgHandler } from '../hooks/use-forbidden-org-handler';

export function GlobalForbiddenHandler(): null {
  useForbiddenOrgHandler();
  return null;
}
