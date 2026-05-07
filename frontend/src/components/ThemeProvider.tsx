import { createContext, useContext, ReactNode } from 'react';

interface ThemeContextType {
  themeColor: string;
  appearance: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: 'from-purple-500 to-pink-500',
  appearance: 'light',
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
  themeColor: string;
  appearance: 'light' | 'dark';
}

export function ThemeProvider({ children, themeColor, appearance }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={{ themeColor, appearance }}>
      {children}
    </ThemeContext.Provider>
  );
}
