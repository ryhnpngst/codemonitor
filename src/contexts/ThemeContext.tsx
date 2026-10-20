import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setCurrentTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('color-scheme') || localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const applyTheme = useCallback((targetTheme: Theme) => {
    // 1. Update <meta name="color-scheme">
    let meta = document.querySelector('meta[name="color-scheme"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'color-scheme');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', targetTheme);

    // 2. Update html classes & attributes
    const root = document.documentElement;
    if (targetTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
    }

    // 3. Persist in storage
    try {
      localStorage.setItem('color-scheme', targetTheme);
      localStorage.setItem('theme', targetTheme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Sync with other tabs via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'color-scheme' || e.key === 'theme') {
        const newTheme = e.newValue;
        if (newTheme === 'light' || newTheme === 'dark') {
          setCurrentTheme(newTheme);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setCurrentTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setCurrentTheme(newTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

