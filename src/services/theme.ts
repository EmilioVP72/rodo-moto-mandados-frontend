// Gestor de Modo Obscuro / Claro para RODO Moto Mandados

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'rodo_theme_mode';

export const getThemePreference = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'light'; // Por defecto iniciar con tema limpio y brillante RODO
};

export const applyTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore
  }

  return isDark;
};

export const toggleTheme = (currentMode: ThemeMode): ThemeMode => {
  const nextMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
  applyTheme(nextMode);
  return nextMode;
};
