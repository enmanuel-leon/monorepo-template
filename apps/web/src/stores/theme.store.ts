import { create } from 'zustand';
import { THEMES, type Theme } from '../constants/theme.constants';
import { getApiUrl } from '../lib/api-client';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme, syncWithBackend?: boolean) => void;
  toggleTheme: (syncWithBackend?: boolean) => void;
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    if (theme === THEMES.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

function syncPreferenceToApi(patch: Record<string, unknown>): void {
  try {
    fetch(getApiUrl('/api/v1/me'), {
      credentials: 'include',
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).catch(() => {
      // Ignore background sync errors when unauthenticated or offline
    });
  } catch {
    // Ignore synchronous exceptions
  }
}

let initialTheme: Theme = THEMES.DARK;
if (typeof localStorage !== 'undefined') {
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === THEMES.LIGHT || storedTheme === THEMES.DARK) {
    initialTheme = storedTheme;
  }
}
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  setTheme: (theme: Theme, syncWithBackend = false) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
    applyTheme(theme);
    set({ theme });

    if (syncWithBackend) {
      syncPreferenceToApi({ theme });
    }
  },
  toggleTheme: (syncWithBackend = false) => {
    set((state) => {
      let nextTheme: Theme = THEMES.DARK;
      if (state.theme === THEMES.DARK) {
        nextTheme = THEMES.LIGHT;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', nextTheme);
      }
      applyTheme(nextTheme);

      if (syncWithBackend) {
        syncPreferenceToApi({ theme: nextTheme });
      }

      return { theme: nextTheme };
    });
  },
}));
