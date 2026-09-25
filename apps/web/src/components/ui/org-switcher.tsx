import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronDown, Plus, Check, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Org {
  id: string;
  name: string;
}

interface OrgSwitcherProps {
  currentOrg: Org | null;
  organizations: Org[];
  canCreateOrg?: boolean;
  onSelectOrg: (id: string) => void;
}

export function OrgSwitcher({
  currentOrg,
  organizations,
  canCreateOrg = true,
  onSelectOrg,
}: Readonly<OrgSwitcherProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  function handleSelect(id: string) {
    onSelectOrg(id);
    setIsOpen(false);
  }

  function handleCreateNew() {
    setIsOpen(false);
    navigate('/settings');
  }

  let currentOrgName = t('common.switchOrg');
  if (currentOrg) {
    currentOrgName = currentOrg.name;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-left text-xs font-semibold text-slate-800 hover:bg-slate-200 dark:border-white/10 dark:bg-[#131519] dark:text-slate-200 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-[#7B6CF6] flex-none" />
          <span className="truncate">{currentOrgName}</span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-none ml-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#101216] space-y-1">
          <div className="px-2 py-1 text-[10.5px] font-semibold uppercase text-slate-400">
            {t('common.orgs')}
          </div>

          {organizations.map((org) => {
            let isCurrent = false;
            if (currentOrg?.id === org.id) {
              isCurrent = true;
            }

            let buttonClass =
              'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5';
            if (isCurrent) {
              buttonClass = 'bg-[#7B6CF6]/15 text-[#7B6CF6] font-semibold';
            }

            return (
              <button
                key={org.id}
                type="button"
                onClick={() => handleSelect(org.id)}
                className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors ${buttonClass}`}
              >
                <span className="truncate">{org.name}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 text-[#7B6CF6]" />}
              </button>
            );
          })}

          <div className="border-t border-slate-200 dark:border-white/5 pt-1 mt-1">
            {canCreateOrg && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[#7B6CF6] hover:bg-slate-100 dark:hover:bg-white/5 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('common.createOrg')}</span>
              </button>
            )}
            {!canCreateOrg && (
              <div className="px-2.5 py-1.5 text-[10.5px] text-amber-500 flex items-center gap-1.5 font-medium">
                <ShieldAlert className="w-3.5 h-3.5 flex-none" />
                <span>{t('selectOrg.ownerLimitNotice')}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
