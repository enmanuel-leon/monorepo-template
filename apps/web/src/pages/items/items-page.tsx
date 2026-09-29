import { useTranslation } from 'react-i18next';
import { useItemsPage } from './use-items-page';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Modal } from '../../components/ui/modal';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';

export function ItemsPage() {
  const { t } = useTranslation();
  const {
    items,
    isLoading,
    isModalOpen,
    setIsModalOpen,
    title,
    setTitle,
    description,
    setDescription,
    isCreating,
    handleCreate,
    handleRefresh,
    itemToDeleteId,
    openDeleteModal,
    closeDeleteModal,
    handleConfirmDelete,
    isDeleting,
  } = useItemsPage();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('items.title')}
        </h1>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            {t('common.refresh')}
          </Button>

          <Button
            className="bg-[#7B6CF6] text-white hover:bg-[#6a5bf0]"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t('items.addItem')}
          </Button>
        </div>
      </div>

      {/* Items Table / List */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101216] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#131519] text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5">{t('common.title')}</th>
                <th className="px-5 py-3.5">{t('common.description')}</th>
                <th className="px-5 py-3.5">{t('common.createdAt')}</th>
                <th className="px-5 py-3.5 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    {t('common.loading')}
                  </td>
                </tr>
              )}

              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                    {t('common.noData')}
                  </td>
                </tr>
              )}

              {!isLoading &&
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">
                      {item.title}
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {item.description || '-'}
                    </td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openDeleteModal(item.id)}
                        aria-label={t('items.deleteTitle')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Creating Item */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('items.createModalTitle')}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label={t('common.title')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label={t('common.description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300"
              onClick={() => setIsModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isCreating} className="bg-[#7B6CF6] text-white">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal for Confirming Item Deletion */}
      <ConfirmModal
        isOpen={Boolean(itemToDeleteId)}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title={t('items.deleteTitle')}
        description={t('items.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
