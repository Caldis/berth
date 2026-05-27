import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { AppLayout } from '@/components/layout/app-layout'
import { Overview } from '@/pages/overview'
import { Sessions } from '@/pages/sessions'
import { SessionDetail } from '@/pages/session-detail'
import { Instructions } from '@/pages/instructions'
import { Capabilities } from '@/pages/capabilities'
import { Usage } from '@/pages/usage'
import { Settings } from '@/pages/settings'

export default function App(): React.ReactElement {
  return (
    <ThemeProvider defaultTheme="system">
      <AppLayout>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/sessions/:id" element={<SessionDetail />} />
          <Route path="/configuration/instructions" element={<Instructions />} />
          <Route path="/configuration/capabilities" element={<Capabilities />} />
          <Route path="/usage" element={<Usage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppLayout>
    </ThemeProvider>
  )
}
