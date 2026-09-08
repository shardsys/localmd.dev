import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ThemeProvider } from '#/components/theme-provider'
import appCss from '../styles.css?url'

// Set the .dark class before hydration (stored choice, else OS preference) to avoid a flash.
const THEME_INIT_SCRIPT =
  '(function(){try{var t=localStorage.getItem("localmd-theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches);if(d)document.documentElement.classList.add("dark")}catch(e){}})()'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'localmd' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Jost:wght@700&display=swap' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => <p className="p-4">Not found</p>,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
