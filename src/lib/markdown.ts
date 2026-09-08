/** Markdown/HTML polyglot files keep the Markdown after `<noscript>`; plain .md passes through. */
export function extractBody(text: string): string {
  const open = '<noscript>'
  const a = text.indexOf(open)
  if (a < 0) return text
  const rest = text.slice(a + open.length)
  const b = rest.indexOf('</noscript>')
  return b < 0 ? rest : rest.slice(0, b)
}
