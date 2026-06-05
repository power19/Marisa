import { getActiveTheme, THEMES, type HolidayThemeId } from './holidays'

/**
 * Server component. Resolves the active holiday theme and injects CSS custom
 * properties onto <html> via a <style> block. Also sets data-theme on <html>
 * so CSS selectors can target it.
 *
 * Respects NEXT_PUBLIC_FORCE_THEME to preview any theme without changing the date.
 */
export default function ThemeProvider() {
  const forced = process.env.NEXT_PUBLIC_FORCE_THEME as HolidayThemeId | undefined
  const theme = forced ? (THEMES[forced] ?? null) : getActiveTheme()

  if (!theme) return null

  const vars = [
    `--color-accent: ${theme.accent}`,
    `--color-accent-hover: ${theme.accentHover}`,
  ].join('; ')

  return (
    <>
      {/* Inject CSS vars — highest specificity without !important */}
      <style
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `:root { ${vars} }`,
        }}
      />
      {/* data-theme lets CSS and sibling components know which theme is active */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute('data-theme','${theme.id}');`,
        }}
      />
    </>
  )
}

export function getServerTheme() {
  const forced = process.env.NEXT_PUBLIC_FORCE_THEME as HolidayThemeId | undefined
  return forced ? (THEMES[forced] ?? null) : getActiveTheme()
}
