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
  '> Local-first, read-only desktop app that scans and visualizes your AI agent assets',
  '> (Skills, MCP servers, hooks, subagents, sessions, cost) for Claude Code and Codex.',
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

if (existsSync(sharedAssets)) {
  cpSync(sharedAssets, join(dist, 'assets'), { recursive: true })
}

console.log(
  `[postbuild] sitemap.xml (${pages.length} urls), llms.txt, llms-full.txt (${(full.length / 1024).toFixed(1)} KB), shared assets written.`,
)
