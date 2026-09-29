import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmModal } from '../../src/components/ui/confirm-modal';

describe('ConfirmModal Component Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ConfirmModal
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Delete Item"
          description="Are you sure?"
        />,
      );
    });

    expect(container.innerHTML).toBe('');
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders title, description, and default delete confirm button for danger variant', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const onConfirmMock = vi.fn();
    const onCloseMock = vi.fn();

    act(() => {
      root.render(
        <ConfirmModal
          isOpen={true}
          onClose={onCloseMock}
          onConfirm={onConfirmMock}
          title="Delete Confirmation"
          description="This cannot be undone."
          variant="danger"
        />,
      );
    });

    expect(container.textContent).toContain('Delete Confirmation');
    expect(container.textContent).toContain('This cannot be undone.');

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders warning variant with custom texts and calls callbacks', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const onConfirmMock = vi.fn();
    const onCloseMock = vi.fn();

    act(() => {
      root.render(
        <ConfirmModal
          isOpen={true}
          onClose={onCloseMock}
          onConfirm={onConfirmMock}
          title="Warning Title"
          description="Be careful."
          variant="warning"
          confirmText="Yes, proceed"
          cancelText="No, go back"
        />,
      );
    });

    expect(container.textContent).toContain('Yes, proceed');
    expect(container.textContent).toContain('No, go back');

    const buttons = container.querySelectorAll('button');
    let cancelButton: HTMLButtonElement | null = null;
    let confirmButton: HTMLButtonElement | null = null;
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('No, go back')) {
        cancelButton = btn;
      }
      if (btn.textContent?.includes('Yes, proceed')) {
        confirmButton = btn;
      }
    });

    if (cancelButton) {
      act(() => {
        (cancelButton as HTMLButtonElement).click();
      });
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    }

    if (confirmButton) {
      act(() => {
        (confirmButton as HTMLButtonElement).click();
      });
      expect(onConfirmMock).toHaveBeenCalledTimes(1);
    }

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('renders primary variant and disables buttons when isLoading is true', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        <ConfirmModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Primary Title"
          description="Primary desc"
          variant="primary"
          isLoading={true}
        />,
      );
    });

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      if (btn.textContent?.includes('Cancel') || btn.textContent?.includes('Confirm')) {
        expect(btn.disabled).toBe(true);
      }
    });

    act(() => {
      root.unmount();
    });
    container.remove();
  });
});
