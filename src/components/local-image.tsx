import { useEffect, useState } from 'react'
import type { ComponentProps } from 'react'

type Props = ComponentProps<'img'> & { resolve: (src: string) => Promise<string | null> }

/** <img> whose relative src is read from the root folder and served as a blob URL. */
export function LocalImage({ src = '', resolve, alt, ...props }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    let blob: string | null = null
    resolve(src).then((u) => {
      if (cancelled) {
        if (u) URL.revokeObjectURL(u)
        return
      }
      blob = u
      setUrl(u)
    })
    return () => {
      cancelled = true
      if (blob) URL.revokeObjectURL(blob)
    }
  }, [src, resolve])
  if (!url) return <span className="text-sm text-muted-foreground">[image: {alt || src}]</span>
  return <img src={url} alt={alt} {...props} />
}
