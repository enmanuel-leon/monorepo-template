import { create } from 'zustand';
import { THEMES, type Theme } from '../constants/theme.constants';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
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

const initialTheme =
  (typeof localStorage !== 'undefined' && (localStorage.getItem('theme') as Theme)) || THEMES.DARK;
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,
  setTheme: (theme: Theme) => {
    localStorage.setItem('theme', theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      let nextTheme: Theme = THEMES.DARK;
      if (state.theme === THEMES.DARK) {
        nextTheme = THEMES.LIGHT;
      }
      localStorage.setItem('theme', nextTheme);
      applyTheme(nextTheme);
      return { theme: nextTheme };
    });
  },
}));
