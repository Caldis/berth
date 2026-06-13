import { Navigate, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom'
import { HeroUIProvider } from '@heroui/react'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from '@/components/theme-provider'
import { AppLayout } from '@/components/layout/app-layout'
import { Overview } from '@/pages/overview'
import { Sessions } from '@/pages/sessions'
import { SessionDetail } from '@/pages/session-detail'
import { Teams } from '@/pages/teams'
import { Instructions } from '@/pages/instructions'
import { Capabilities } from '@/pages/capabilities'
import { PluginDetail } from '@/pages/plugin-detail'
import { Usage } from '@/pages/usage'
import { PageErrorBoundary } from '@/components/layout/page-error-boundary'

const capabilityLegacyTabRoutes: Record<string, string> = {
  mcp: '/capabilities/mcp',
  hooks: '/capabilities/hooks',
  plugins: '/capabilities/plugins',
  statusLine: '/capabilities/status-line',
  permissions: '/capabilities/permissions',
  env: '/capabilities/env'
}

export function LegacyCapabilitiesRedirect(): React.ReactElement {
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'mcp'
  return <Navigate to={capabilityLegacyTabRoutes[tab] ?? '/capabilities/mcp'} replace />
}

/**
 * GH-94 removed the misclassified "Agent Teams as instruction asset" page;
 * GH-114 restores the path's intent by pointing it at the runtime records view.
 */
export function AgentTeamsLegacyRedirect(): React.ReactElement {
  return <Navigate to="/teams" replace />
}

export default function App(): React.ReactElement {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  return (
    <ThemeProvider defaultTheme="system">
      <HeroUIProvider navigate={navigate} locale={i18n.language} reducedMotion="user">
        <AppLayout>
          {/* GH-115 T4: 全路由默认错误兜底 — 任意页面渲染异常不再整窗白屏; /usage 保留专属文案的内层 boundary */}
          <PageErrorBoundary>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<SessionDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/instructions" element={<Navigate to="/instructions/skills" replace />} />
            <Route path="/instructions/memories" element={<Instructions activeSection="memories" />} />
            <Route path="/instructions/conventions" element={<Instructions activeSection="conventions" />} />
            <Route path="/instructions/skills" element={<Instructions activeSection="skills" />} />
            <Route path="/instructions/subagents" element={<Instructions activeSection="subagents" />} />
            <Route path="/instructions/commands" element={<Instructions activeSection="commands" />} />
            <Route path="/instructions/output-modes" element={<Instructions activeSection="outputModes" />} />
            <Route path="/instructions/agent-teams" element={<AgentTeamsLegacyRedirect />} />
            <Route path="/instructions/*" element={<Navigate to="/instructions/skills" replace />} />
            <Route path="/capabilities" element={<Navigate to="/capabilities/mcp" replace />} />
            <Route path="/capabilities/mcp" element={<Capabilities activeSection="mcp" />} />
            <Route path="/capabilities/hooks" element={<Capabilities activeSection="hooks" />} />
            <Route path="/capabilities/plugins" element={<Capabilities activeSection="plugins" />} />
            <Route path="/capabilities/plugins/:pluginId" element={<PluginDetail />} />
            <Route path="/capabilities/status-line" element={<Capabilities activeSection="statusLine" />} />
            <Route path="/capabilities/permissions" element={<Capabilities activeSection="permissions" />} />
            <Route path="/capabilities/env" element={<Capabilities activeSection="env" />} />
            <Route path="/capabilities/*" element={<Navigate to="/capabilities/mcp" replace />} />
            <Route path="/configuration/instructions" element={<Navigate to="/instructions/skills" replace />} />
            <Route path="/configuration/capabilities" element={<LegacyCapabilitiesRedirect />} />
            <Route
              path="/usage"
              element={
                <PageErrorBoundary titleKey="usage.pageErrorTitle" bodyKey="usage.pageErrorBody">
                  <Usage />
                </PageErrorBoundary>
              }
            />
          </Routes>
          </PageErrorBoundary>
        </AppLayout>
      </HeroUIProvider>
    </ThemeProvider>
  )
}
