import { Settings2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Slider } from '#/components/ui/slider'
import { DEFAULTS, FONTS, RANGES } from '#/hooks/use-settings'
import type { Font, NumericKey, Settings } from '#/hooks/use-settings'
import { cn } from '#/lib/utils'

const FONT_LABELS: Record<Font, string> = { sans: 'Sans', serif: 'Serif', mono: 'Mono' }

type Props = {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  side: 'top' | 'bottom'
  align: 'start' | 'center' | 'end'
}

export function SettingsMenu({ settings, onChange, side, align }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Preferences">
          <Settings2 className="size-4" />
          <span className="sr-only">Preferences</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} sideOffset={8} className="w-64 space-y-5 p-4 duration-200">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Font</div>
          <div className="grid grid-cols-3 rounded-md bg-muted p-0.5 text-xs">
            {(Object.keys(FONTS) as Font[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onChange({ font: f })}
                className={cn(
                  'rounded-[5px] py-1 transition-colors',
                  FONTS[f],
                  settings.font === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {FONT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        {(Object.keys(RANGES) as NumericKey[]).map((k) => (
          <Range key={k} k={k} value={settings[k]} onChange={(v) => onChange({ [k]: v })} />
        ))}
        <div className="flex justify-end">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange(DEFAULTS)}
          >
            Reset
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Range({ k, value, onChange }: { k: NumericKey; value: number; onChange: (v: number) => void }) {
  const r = RANGES[k]
  const decimals = r.step < 0.01 ? 3 : r.step < 1 ? 2 : 0
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{r.label}</span>
        <span className="tabular-nums">
          {value.toFixed(decimals)}
          {r.unit}
        </span>
      </div>
      <Slider min={r.min} max={r.max} step={r.step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  )
}
