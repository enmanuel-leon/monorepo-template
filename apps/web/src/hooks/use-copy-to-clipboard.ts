import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useCopyToClipboard(timeout = 2000) {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = useCallback(
    async (text: string, successMessage = 'Copied to clipboard!') => {
      if (!navigator?.clipboard) {
        toast.error('Clipboard API not available');
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        toast.success(successMessage);

        setTimeout(() => {
          setIsCopied(false);
        }, timeout);

        return true;
      } catch {
        toast.error('Failed to copy to clipboard');
        return false;
      }
    },
    [timeout],
  );

  return { isCopied, copyToClipboard };
}
