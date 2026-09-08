# localmd.dev

Live preview of a local Markdown file, entirely in the browser. Pick a file once; it is
re-read from disk every second and re-rendered on change. Nothing is uploaded.

Renders GFM, highlighted code, KaTeX math, Mermaid diagrams and sanitized HTML. Other text and
code files show with syntax highlighting, SVG and images display inline; Markdown and SVG can be
switched between the rendered and the raw view (`?view=raw`).
Optionally set a root folder to get breadcrumbs, folder listings, relative links and images.
Listings are keyboard navigable: `↑`/`↓` or `k`/`j`, `PageUp`/`PageDown`, `Home`/`End` or `g`/`G`,
`Enter`/`→`/`l` opens, `Backspace`/`←`/`h` goes up, `Esc` clears; `Alt+↑` opens the containing folder
from anywhere.

Requires a Chromium-based browser (File System Access API).

```bash
bun run dev      # http://localhost:3000
bun run deploy   # build + wrangler deploy
```
