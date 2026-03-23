import React, { createContext, useContext } from 'react';
import { colors as lightColors } from './colors';
import { darkColors } from './darkColors';
import { useSettingsStore } from '../stores/settingsStore';

type ThemeColors = typeof lightColors;

const ThemeContext = createContext<{ colors: ThemeColors; isDark: boolean }>({
  colors: lightColors,
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const darkMode = useSettingsStore(state => state.darkMode);
  const themeColors = darkMode ? (darkColors as unknown as ThemeColors) : lightColors;

  return (
    <ThemeContext.Provider value={{ colors: themeColors, isDark: darkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
