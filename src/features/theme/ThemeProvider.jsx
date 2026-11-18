import { createContext, useContext, useEffect, useState } from 'react';
const ThemeContext = createContext(null);
const storageKey = 'pe03:theme';
function initialTheme() {
  try { const saved = localStorage.getItem(storageKey); if (saved === 'light' || saved === 'dark') return saved; } catch { /* Preferência disponível apenas durante esta sessão. */ }
  return 'light';
}
export function ThemeProvider({ children }) {
  const [theme, updateTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  function setTheme(value) {
    if (value !== 'light' && value !== 'dark') return;
    updateTheme(value);
    try { localStorage.setItem(storageKey, value); } catch { /* Mantém a preferência em memória. */ }
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
