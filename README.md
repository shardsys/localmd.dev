# localmd.dev

<p align="center">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="240" height="160" role="img" aria-label="A small bird perched on a branch">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5eb8d8"/>
      <stop offset="1" stop-color="#2b6f96"/>
    </linearGradient>
  </defs>
  <path d="M18 134h204" stroke="#8a6a4a" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M188 134c10-6 18-6 26-14-3 12-11 16-20 17z" fill="#7fae4e"/>
  <path d="M120 116v18M136 114v20" stroke="#e0913a" stroke-width="4" stroke-linecap="round"/>
  <path d="M70 96 24 110l12-32z" fill="#2b6f96"/>
  <ellipse cx="118" cy="82" rx="52" ry="38" transform="rotate(-12 118 82)" fill="url(#body)"/>
  <circle cx="168" cy="56" r="27" fill="#5eb8d8"/>
  <path d="M164 30c2-9 8-13 16-14-5 6-6 11-5 17z" fill="#5eb8d8"/>
  <ellipse cx="112" cy="84" rx="33" ry="19" transform="rotate(-22 112 84)" fill="#20597c"/>
  <path d="M150 74c14 4 28 1 36-6-6 12-24 17-36 6z" fill="#f2f6f8" opacity=".55"/>
  <path d="M192 50l24 8-24 8z" fill="#e0913a"/>
  <circle cx="177" cy="48" r="5" fill="#123448"/>
  <circle cx="179" cy="46" r="1.7" fill="#fff"/>
</svg>
</p>

Live preview of a local Markdown file, entirely in the browser. Pick a file once; it is
re-read from disk every second and re-rendered on change. Nothing is uploaded.

Renders GFM, highlighted code, KaTeX math, Mermaid diagrams and sanitized HTML (inline SVG included).
Other text and code files show with syntax highlighting, SVG and images display inline, PDFs preview
in a frame; Markdown and SVG can be switched between the rendered and the raw view (`?view=raw`).
Optionally set a root folder to get breadcrumbs, folder listings, relative links and images.
Listings are keyboard navigable: `↑`/`↓` or `k`/`j`, `PageUp`/`PageDown`, `Home`/`End` or `g`/`G`,
`Enter`/`→`/`l` opens, `Backspace`/`←`/`h` goes up, `Esc` clears; `Alt+↑` opens the containing folder
from anywhere.

Requires a Chromium-based browser (File System Access API).

```bash
bun run dev      # http://localhost:3000
bun run deploy   # build + wrangler deploy
```
