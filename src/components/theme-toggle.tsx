import { Moon, Sun } from 'lucide-react'
import { useTheme } from '#/components/theme-provider'
import { Button } from '#/components/ui/button'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const Icon = theme === 'dark' ? Moon : Sun
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={`Theme: ${theme}`}
    >
      <Icon className="size-4" />
      <span className="sr-only">Toggle theme (current: {theme})</span>
    </Button>
  )
}
