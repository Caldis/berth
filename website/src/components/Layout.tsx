import { Outlet } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import { getI18n } from '@/i18n'
import { useLang } from '@/lib/useLang'
import { Nav } from './Nav'
import { Footer } from './Footer'

export function Layout() {
  const lang = useLang()
  return (
    <I18nextProvider i18n={getI18n(lang)}>
      <div className="flex min-h-screen flex-col">
        <Nav />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </I18nextProvider>
  )
}
