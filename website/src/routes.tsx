import type { RouteRecord } from 'vite-react-ssg'
import { Layout } from './components/Layout'
import { LANGS } from './lib/langs'
import { Home } from './pages/Home'
import { Features } from './pages/Features'
import { KnowledgeHub } from './pages/KnowledgeHub'
import { About } from './pages/About'
import { Privacy } from './pages/Privacy'
import { Changelog } from './pages/Changelog'
import { RootRedirect } from './pages/RootRedirect'
import { NotFound } from './pages/NotFound'

export const routes: RouteRecord[] = [
  { path: '/', element: <RootRedirect /> },
  ...LANGS.map((lang) => ({
    path: `/${lang}`,
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'features', element: <Features /> },
      { path: 'knowledge', element: <KnowledgeHub /> },
      { path: 'about', element: <About /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'changelog', element: <Changelog /> },
    ],
  })),
  { path: '*', element: <NotFound /> },
]
