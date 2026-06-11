import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join, resolve } from 'path'

// GH-117: e2e 统一隔离根。berth 主进程经 os.homedir() 解析 ~/.claude 等 home 级
// 扫描根 (src/main/agent-homes.ts), 不隔离 HOME 时 e2e 会扫宿主真实数据 —
// 运行时长与候选列表随宿主 ~/.claude 体量漂移 (macOS 开发机上 activate 链路
// 实测 10s, 超出断言 5s 窗口, 即原 darwin "平台失败" 的真因)。
export interface IsolatedDirs {
  userDataDir: string
  codexHome: string
  homeDir: string
}

export function prepareIsolatedDirs(tempDir: string): IsolatedDirs {
  const dirs: IsolatedDirs = {
    userDataDir: join(tempDir, 'user-data'),
    codexHome: join(tempDir, 'codex-home'),
    homeDir: join(tempDir, 'home')
  }
  mkdirSync(dirs.userDataDir, { recursive: true })
  mkdirSync(dirs.codexHome, { recursive: true })
  mkdirSync(dirs.homeDir, { recursive: true })
  return dirs
}

export async function launchBerthApp(
  dirs: IsolatedDirs,
  extraEnv: Record<string, string> = {}
): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), `--user-data-dir=${dirs.userDataDir}`],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      CODEX_HOME: dirs.codexHome,
      // 已知差异: win32 的 os.homedir() 读 USERPROFILE 而非 HOME, 此处不覆盖
      // USERPROFILE (会波及 Electron 自身路径推导, 且无法在 POSIX 机上实证) —
      // Windows 行为与隔离前一致, 隔离仅在 POSIX 生效 (GH-117 02-SPEC 决策 1)。
      ...(process.platform !== 'win32' ? { HOME: dirs.homeDir } : {}),
      ...extraEnv
    }
  })
  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  return { app, page }
}
