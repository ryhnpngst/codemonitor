import { describe, it, expect } from 'vitest';

describe('Theme System Logic', () => {
  type Theme = 'light' | 'dark';

  const toggleTheme = (current: Theme): Theme => {
    return current === 'dark' ? 'light' : 'dark';
  };

  const getMonacoTheme = (theme: Theme): string => {
    return theme === 'light' ? 'vs' : 'vs-dark';
  };

  it('harus berganti dari mode dark ke light saat ditoggle', () => {
    expect(toggleTheme('dark')).toBe('light');
  });

  it('harus berganti dari mode light ke dark saat ditoggle', () => {
    expect(toggleTheme('light')).toBe('dark');
  });

  it('harus memetakan tema Monaco Editor ke "vs" saat mode light', () => {
    expect(getMonacoTheme('light')).toBe('vs');
  });

  it('harus memetakan tema Monaco Editor ke "vs-dark" saat mode dark', () => {
    expect(getMonacoTheme('dark')).toBe('vs-dark');
  });
});

