import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  showLabel = false 
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Ubah ke tema terang' : 'Ubah ke tema gelap'}
      title={isDark ? 'Ubah ke tema terang' : 'Ubah ke tema gelap'}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-200 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
        isDark
          ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80 shadow-sm'
          : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm'
      } ${className}`}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
          {showLabel && <span>Tema Terang</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-600 transition-transform hover:-rotate-12" />
          {showLabel && <span>Tema Gelap</span>}
        </>
      )}
    </button>
  );
};

