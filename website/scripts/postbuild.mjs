// Post-build generator: sitemap.xml, llms.txt, llms-full.txt, shared assets.
// Reads the prerendered dist/ HTML so SEO/AI artifacts never drift from content.
import { cpSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const dist = join(root, 'dist')
const sharedAssets = join(repoRoot, 'assets')
const SITE = 'https://berth.caldis.me'

/** Recursively collect all index.html / *.html files under dist. */
function htmlFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) out.push(...htmlFiles(full))
    else if (name.endsWith('.html') && name !== '404.html') out.push(full)
  }
  return out
}

/** dist/zh/knowledge/foo.html -> /zh/knowledge/foo ; dist/zh.html -> /zh ; dist/index.html -> / */
function toRoute(file) {
  let p = '/' + relative(dist, file).replace(/\\/g, '/')
  p = p.replace(/\/index\.html$/, '').replace(/\.html$/, '')
  return p === '' ? '/' : p
}

function tag(html, re) {
  const m = html.match(re)
  return m ? m[1].replace(/\s+/g, ' ').trim() : ''
}

const files = htmlFiles(dist)
const pages = files
  .map((f) => {
    const html = readFileSync(f, 'utf8')
    return {
      route: toRoute(f),
      title: tag(html, /<title[^>]*>([^<]*)<\/title>/i),
      desc: tag(html, /<meta[^>]*name="description"[^>]*content="([^"]*)"/i),
      html,
    }
  })
  .filter((p) => p.route !== '/') // root is a redirect shell
  .sort((a, b) => a.route.localeCompare(b.route))

// ---- sitemap.xml ----
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.map((p) => `  <url><loc>${SITE}${p.route}</loc></url>`),
  '</urlset>',
  '',
].join('\n')
writeFileSync(join(dist, 'sitemap.xml'), sitemap)

// ---- llms.txt (concise nav + summaries) ----
const llms = [
  '# Berth',
  '',
  '> Local-first, read-only desktop app that scans and visualizes AI agent assets',
  '> across Claude Code, Codex, Gemini CLI, GitHub Copilot CLI, Cursor, OpenCode, OpenClaw and Hermes Agent.',
  '> The standalone @berth/scan-engine package exposes a CLI and adapter API, while the desktop app shows scan status, indexed files, scheduler state and editable watcher timing.',
  '',
  'Site: ' + SITE,
  'Source: https://github.com/Caldis/berth',
  'License: MIT',
  '',
  '## Pages',
  ...pages.map((p) => `- [${p.title}](${SITE}${p.route})${p.desc ? ': ' + p.desc : ''}`),
  '',
  'Full content for AI agents: ' + SITE + '/llms-full.txt',
  '',
].join('\n')
writeFileSync(join(dist, 'llms.txt'), llms)

// ---- llms-full.txt (extracted readable text of every page) ----
function plainText(html) {
  const main = (html.match(/<main[\s\S]*?>([\s\S]*?)<\/main>/i) || [, html])[1]
  return main
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const full = [
  '# Berth — Full content for AI agents',
  '',
  'Site: ' + SITE + ' · Source: https://github.com/Caldis/berth · License: MIT',
  '',
  ...pages.map((p) => ['---', '', `## ${p.title}`, `URL: ${SITE}${p.route}`, '', plainText(p.html), ''].join('\n')),
].join('\n')
writeFileSync(join(dist, 'llms-full.txt'), full)

// ---- 404.html (GitHub Pages static fallback) ----
function write404() {
  const source = join(dist, 'en.html')
  const shell = readFileSync(source, 'utf8')
  const title = 'Page not found - Berth'
  const description = 'This Berth page does not exist. Return to the English home page or use the navigation.'
  const main = [
    '<main class="container-page grid min-h-[60vh] place-items-center py-20 text-center">',
    '  <div>',
    '    <div class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-harbor font-display text-xl font-semibold text-white">B</div>',
    '    <span class="eyebrow mt-6 block">404</span>',
    '    <h1 class="mt-3 font-display text-3xl font-semibold tracking-tight">Page not found</h1>',
    '    <p class="mx-auto mt-3 max-w-md text-muted">The page you are looking for does not exist. Use the navigation or return to the English home page.</p>',
    '    <a href="/en" class="btn-primary mt-6">Back to home</a>',
    '  </div>',
    '</main>',
  ].join('\n')

  const html = shell
    .replace(/<title[^>]*>[^<]*<\/title>/i, `<title>${title}</title>`)
    .replace(
      /<meta[^>]*name="description"[^>]*content="[^"]*"[^>]*>/i,
      `<meta name="description" content="${description}" />`,
    )
    .replace(/<link[^>]*rel="canonical"[^>]*>/i, `<link rel="canonical" href="${SITE}/404.html" />`)
    .replace(/<meta[^>]*property="og:title"[^>]*content="[^"]*"[^>]*>/i, `<meta property="og:title" content="${title}" />`)
    .replace(
      /<meta[^>]*property="og:description"[^>]*content="[^"]*"[^>]*>/i,
      `<meta property="og:description" content="${description}" />`,
    )
    .replace(/<meta[^>]*property="og:url"[^>]*content="[^"]*"[^>]*>/i, `<meta property="og:url" content="${SITE}/404.html" />`)
    .replace(/<meta[^>]*name="twitter:title"[^>]*content="[^"]*"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`)
    .replace(
      /<meta[^>]*name="twitter:description"[^>]*content="[^"]*"[^>]*>/i,
      `<meta name="twitter:description" content="${description}" />`,
    )
    .replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<main[\s\S]*?<\/main>/i, main)

  writeFileSync(join(dist, '404.html'), html)
}

write404()

if (existsSync(sharedAssets)) {
  cpSync(sharedAssets, join(dist, 'assets'), { recursive: true })
}

console.log(
  `[postbuild] sitemap.xml (${pages.length} urls), llms.txt, llms-full.txt (${(full.length / 1024).toFixed(1)} KB), 404.html, shared assets written.`,
)
