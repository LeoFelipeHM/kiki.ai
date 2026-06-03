import { createContext, useContext, ReactNode } from 'react';

interface ThemeContextType {
  themeColor: string;
}

const ThemeContext = createContext<ThemeContextType>({ themeColor: 'from-purple-500 to-pink-500' });

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
  themeColor: string;
}

export function ThemeProvider({ children, themeColor }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={{ themeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}
