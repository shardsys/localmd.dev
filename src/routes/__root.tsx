import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { ThemeProvider } from '#/components/theme-provider'
import appCss from '../styles.css?url'

// Set the .dark class before hydration (stored choice, else OS preference) to avoid a flash;
// likewise .collapsed for the small-screen top bar (see Sidebar).
const INIT_SCRIPT =
  '(function(){try{var c=document.documentElement.classList;var t=localStorage.getItem("localmd-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))c.add("dark");if(localStorage.getItem("localmd-collapsed")==="1")c.add("collapsed")}catch(e){}})()'

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
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
