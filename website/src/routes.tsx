import type { RouteRecord } from 'vite-react-ssg'
import { I18nextProvider } from 'react-i18next'
import { Layout } from './components/Layout'
import { Footer } from './components/Footer'
import { Nav } from './components/Nav'
import { getI18n } from './i18n'
import { DEFAULT_LANG, LANGS } from './lib/langs'
import { getArticles } from './content'
import { Home } from './pages/Home'
import { Features } from './pages/Features'
import { KnowledgeHub } from './pages/KnowledgeHub'
import { Article } from './pages/Article'
import { About } from './pages/About'
import { Privacy } from './pages/Privacy'
import { Changelog } from './pages/Changelog'
import { RootRedirect } from './pages/RootRedirect'
import { NotFound } from './pages/NotFound'

function DefaultNotFound() {
  return (
    <I18nextProvider i18n={getI18n(DEFAULT_LANG)}>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">
          <NotFound />
        </main>
        <Footer />
      </div>
    </I18nextProvider>
  )
}

export const routes: RouteRecord[] = [
  { path: '/', element: <RootRedirect /> },
  ...LANGS.map((lang) => ({
    path: `/${lang}`,
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'features', element: <Features /> },
      { path: 'knowledge', element: <KnowledgeHub /> },
      ...getArticles(lang).map((a) => ({
        path: `knowledge/${a.pillar}/${a.slug}`,
        element: <Article lang={lang} pillar={a.pillar} slug={a.slug} />,
      })),
      { path: 'about', element: <About /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'changelog', element: <Changelog /> },
      { path: '*', element: <NotFound /> },
    ],
  })),
  { path: '*', element: <DefaultNotFound /> },
]
