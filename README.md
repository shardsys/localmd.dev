# localmd.dev

Live preview of a local Markdown file, entirely in the browser. Pick a file once; it is
re-read from disk every second and re-rendered on change. Nothing is uploaded.

Renders GFM, highlighted code, KaTeX math, Mermaid diagrams and sanitized HTML.
Optionally set a root folder to get breadcrumbs, folder listings, relative links and images.

Requires a Chromium-based browser (File System Access API).

```bash
bun run dev      # http://localhost:3000
bun run deploy   # build + wrangler deploy
```
