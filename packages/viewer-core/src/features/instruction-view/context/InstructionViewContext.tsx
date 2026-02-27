/**
 * InstructionViewContext
 *
 * Isolated context for theme and language in the InstructionView.
 * Allows independent settings from the Creator app.
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

// ============================================
// Types
// ============================================

export type InstructionTheme = 'light' | 'dark';
export type InstructionLanguage = 'de' | 'en' | 'es' | 'fr' | 'it' | 'pl' | 'pt' | 'nl' | 'cs' | 'hu' | 'ro' | 'sk' | 'uk' | 'ru' | 'zh' | 'ja' | 'ko';

interface InstructionViewContextValue {
  // Theme
  theme: InstructionTheme;
  setTheme: (theme: InstructionTheme) => void;
  toggleTheme: () => void;
  isDark: boolean;

  // Language
  language: InstructionLanguage;
  setLanguage: (language: InstructionLanguage) => void;

  // Viewer Mode (simplified viewer preview - what workers see)
  viewerMode: boolean;
  setViewerMode: (mode: boolean) => void;
  toggleViewerMode: () => void;

}

interface InstructionViewProviderProps {
  children: ReactNode;
  /** Initial theme for the instruction view */
  defaultTheme?: InstructionTheme;
  /** Initial language for the instruction view */
  defaultLanguage?: InstructionLanguage;
  /** Callback when theme changes (for syncing with database) */
  onThemeChange?: (theme: InstructionTheme) => void;
  /** Callback when language changes (for syncing with parent state) */
  onLanguageChange?: (language: InstructionLanguage) => void;
}

// ============================================
// Context
// ============================================

const InstructionViewContext = createContext<InstructionViewContextValue | null>(null);

// ============================================
// Provider
// ============================================

export function InstructionViewProvider({
  children,
  defaultTheme = 'dark',
  defaultLanguage = 'en',
  onThemeChange,
  onLanguageChange,
}: InstructionViewProviderProps) {
  const [theme, setThemeState] = useState<InstructionTheme>(defaultTheme);
  const [language, setLanguageState] = useState<InstructionLanguage>(defaultLanguage);
  const [viewerMode, setViewerMode] = useState(false);

  const setTheme = useCallback((newTheme: InstructionTheme) => {
    setThemeState(newTheme);
    onThemeChange?.(newTheme);
  }, [onThemeChange]);

  const setLanguage = useCallback((newLanguage: InstructionLanguage) => {
    setLanguageState(newLanguage);
    onLanguageChange?.(newLanguage);
  }, [onLanguageChange]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const newTheme = prev === 'dark' ? 'light' : 'dark';
      onThemeChange?.(newTheme);
      return newTheme;
    });
  }, [onThemeChange]);

  const toggleViewerMode = useCallback(() => {
    setViewerMode((prev) => !prev);
  }, []);

  const value = useMemo<InstructionViewContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
      language,
      setLanguage,
      viewerMode,
      setViewerMode,
      toggleViewerMode,
    }),
    [theme, setTheme, toggleTheme, language, setLanguage, viewerMode, toggleViewerMode]
  );

  return (
    <InstructionViewContext.Provider value={value}>
      {children}
    </InstructionViewContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useInstructionView(): InstructionViewContextValue {
  const context = useContext(InstructionViewContext);
  if (!context) {
    throw new Error('useInstructionView must be used within InstructionViewProvider');
  }
  return context;
}

// ============================================
// Optional Hook (returns null if outside provider)
// ============================================

export function useInstructionViewOptional(): InstructionViewContextValue | null {
  return useContext(InstructionViewContext);
}
