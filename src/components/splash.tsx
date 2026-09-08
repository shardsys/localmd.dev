import { FolderOpen, FolderTree, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '#/components/ui/button'

const FEATURES = [
  { icon: Sparkles, title: 'Rendered beautifully', text: 'GitHub-flavored Markdown, code, math and diagrams.' },
  { icon: RefreshCw, title: 'Live on save', text: 'Edit in your editor; the preview refreshes on every save.' },
  { icon: ShieldCheck, title: 'All client-side', text: 'Your file never leaves the browser. No upload, no server.' },
]

/** Empty state: what localmd does, and the one button that starts it. */
type Props = {
  supported: boolean | null
  pending: string | null
  onOpen: () => void
  onChooseRoot: () => void
  onResume: () => void
}

export function Splash({ supported, pending, onOpen, onChooseRoot, onResume }: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-20 text-center lg:py-32">
      <h1 className="font-title text-5xl font-bold tracking-wide uppercase lg:text-6xl">
        localmd
        <span className="ml-1 text-2xl font-medium tracking-normal normal-case text-muted-foreground lg:text-3xl">.dev</span>
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Open a Markdown file from your machine<br />and see it rendered as you write.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={onOpen} disabled={supported === false}>
          <FolderOpen />
          Open file…
        </Button>
        <Button
          size="lg"
          onClick={onChooseRoot}
          disabled={supported === false}
          title="Enables folder listings, breadcrumbs and relative links"
        >
          <FolderTree />
          Set root folder…
        </Button>
      </div>
      {pending && (
        <Button variant="outline" className="mt-3 max-w-full" onClick={onResume} title="Asks for read permission again">
          Continue with <span className="truncate font-mono text-xs">{pending}</span>
        </Button>
      )}
      {supported === false && (
        <p className="mt-3 text-xs text-muted-foreground">Needs a Chromium-based browser (File System Access API).</p>
      )}
      <ul className="mt-14 grid w-full gap-4 text-left sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl border bg-card p-4 text-card-foreground">
            <Icon className="size-5 text-muted-foreground" />
            <div className="mt-3 text-sm font-medium">{title}</div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
