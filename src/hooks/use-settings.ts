import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'localmd-settings'

export const FONTS = { sans: 'font-sans', serif: 'font-serif', mono: 'font-mono' } as const
export type Font = keyof typeof FONTS

/** Slider ranges for the numeric settings. */
export const RANGES = {
  size: { min: 13, max: 22, step: 1, unit: 'px', label: 'Text size' },
  width: { min: 36, max: 80, step: 1, unit: 'rem', label: 'Width' },
  tracking: { min: -0.04, max: 0.08, step: 0.005, unit: 'em', label: 'Letter spacing' },
  leading: { min: 1.3, max: 2.1, step: 0.05, unit: '', label: 'Line height' },
} as const
export type NumericKey = keyof typeof RANGES

export type Settings = { font: Font } & Record<NumericKey, number>

export const DEFAULTS: Settings = { font: 'sans', size: 16, width: 48, tracking: 0, leading: 1.75 }

function load(): Settings {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>
    const s = { ...DEFAULTS }
    if (typeof raw.font === 'string' && raw.font in FONTS) s.font = raw.font as Font
    for (const k of Object.keys(RANGES) as NumericKey[]) {
      const v = raw[k]
      if (typeof v === 'number' && Number.isFinite(v)) s[k] = Math.min(RANGES[k].max, Math.max(RANGES[k].min, v))
    }
    return s
  } catch {
    return DEFAULTS
  }
}

/** Settings persisted in localStorage; defaults until hydrated. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  useEffect(() => setSettings(load()), [])
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])
  return { settings, update }
}
