import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'danger',
  isLoading = false,
}: Readonly<ConfirmModalProps>) {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  let resolvedConfirmText = confirmText;
  if (!resolvedConfirmText) {
    if (variant === 'danger') {
      resolvedConfirmText = t('common.delete');
    } else {
      resolvedConfirmText = t('common.confirm');
    }
  }

  let resolvedCancelText = cancelText;
  if (!resolvedCancelText) {
    resolvedCancelText = t('common.cancel');
  }

  let iconNode = <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />;
  let iconBgClass = 'bg-rose-500/10 border-rose-500/20';
  let buttonVariant: 'danger' | 'primary' = 'danger';

  if (variant === 'warning') {
    iconNode = <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />;
    iconBgClass = 'bg-amber-500/10 border-amber-500/20';
    buttonVariant = 'primary';
  } else if (variant === 'primary') {
    iconNode = <Info className="h-5 w-5 text-[#7B6CF6] shrink-0" />;
    iconBgClass = 'bg-[#7B6CF6]/10 border-[#7B6CF6]/20';
    buttonVariant = 'primary';
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-5">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconBgClass}`}
          >
            {iconNode}
          </div>
          <div className="pt-1">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
          >
            {resolvedCancelText}
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            onClick={onConfirm}
            disabled={isLoading}
            className="min-w-20"
          >
            {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {resolvedConfirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
