import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { glob } from 'glob'
import type { AgentAdapterDefinition } from '../../adapter-api'
import type { AgentAdapter, Asset, AssetScope, DetectResult, ScanRoot } from '../types'
import type { ScanError } from '@shared/types/ipc'
import { isRecord } from '../_shared/parser-helpers'
import { declaredSourceFromPolicy } from '../_shared/declared-source-policy'
import { resolveProjectConfigRoots } from '../../project-config-roots'
import {
  parseGeminiContextFile,
  parseGeminiCredentialPresence,
  parseGeminiExtensionManifest,
  parseGeminiSettings
} from './parsers'

const DEFAULT_CONTEXT_FILE_NAMES = ['GEMINI.md'] as const

export interface GeminiCliAdapterOptions {
  homeDir?: string
  projectDir?: string
  env?: NodeJS.ProcessEnv
}

export class GeminiCliAdapter implements AgentAdapter {
  readonly id = 'gemini-cli'
  readonly displayName = 'Gemini CLI'

  private readonly homeDir: string
  private readonly projectDirs: string[]
  private readonly env: NodeJS.ProcessEnv

  constructor(
    private readonly definition: AgentAdapterDefinition,
    options: GeminiCliAdapterOptions = {}
  ) {
    this.homeDir = options.homeDir ?? os.homedir()
    this.projectDirs = resolveProjectConfigRoots(options.projectDir)
    this.env = options.env ?? process.env
  }

  async detect(): Promise<DetectResult> {
    const paths = await this.scanRoots()
    return {
      installed: paths.length > 0,
      version: paths.length > 0 ? this.definition.version : undefined,
      paths
    }
  }

  async scanRoots(): Promise<ScanRoot[]> {
    return (await this.scanSourceCoverage()).filter((source) => source.status === 'scanned')
  }

  async scanSourceCoverage(): Promise<ScanRoot[]> {
    return this.definition.sources.map((source) =>
      declaredSourceFromPolicy(source, {
        homeDir: this.homeDir,
        projectDir: this.projectDirs[0],
        env: this.env
      })
    )
  }

  async scanAll(): Promise<{ assets: Asset[]; errors: ScanError[] }> {
    const errors: ScanError[] = []
    return {
      assets: [
        ...this.scanInstructions(errors),
        ...this.scanCapabilities(errors),
        ...this.scanIntegration(errors)
      ],
      errors
    }
  }

  private scanInstructions(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const geminiDir = this.geminiDir()
    const userSettings = path.join(geminiDir, 'settings.json')
    const userContextNames = readContextFileNames(userSettings) ?? [...DEFAULT_CONTEXT_FILE_NAMES]

    for (const fileName of userContextNames) {
      const filePath = path.join(geminiDir, fileName)
      if (!fs.existsSync(filePath)) continue
      const asset = safeScan(errors, filePath, 'gemini-context', () =>
        parseGeminiContextFile(filePath, 'user')
      )
      if (asset) assets.push(asset)
    }

    for (const projectDir of this.projectDirs) {
      const projectSettings = path.join(projectDir, '.gemini', 'settings.json')
      const projectContextNames =
        readContextFileNames(projectSettings) ?? userContextNames
      for (const fileName of projectContextNames) {
        const filePath = path.join(projectDir, fileName)
        if (!fs.existsSync(filePath)) continue
        const asset = safeScan(errors, filePath, 'gemini-context', () =>
          parseGeminiContextFile(filePath, 'project')
        )
        if (asset) assets.push(asset)
      }
    }

    return assets
  }

  private scanCapabilities(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const settingsSources: Array<[string, AssetScope]> = [
      [path.join(this.geminiDir(), 'settings.json'), 'user']
    ]
    for (const projectDir of this.projectDirs) {
      settingsSources.push([path.join(projectDir, '.gemini', 'settings.json'), 'project'])
    }

    for (const [filePath, scope] of settingsSources) {
      if (!fs.existsSync(filePath)) continue
      const settingsAssets = safeScan(errors, filePath, 'gemini-settings', () =>
        parseGeminiSettings(filePath, scope)
      )
      if (settingsAssets) assets.push(...settingsAssets)
    }

    const extensionsDir = path.join(this.geminiDir(), 'extensions')
    for (const manifestPath of safeGlob('*/gemini-extension.json', extensionsDir, errors, 'gemini-extension')) {
      const extensionAssets = safeScan(errors, manifestPath, 'gemini-extension', () =>
        parseGeminiExtensionManifest(manifestPath)
      )
      if (extensionAssets) assets.push(...extensionAssets)
    }

    return assets
  }

  private scanIntegration(errors: ScanError[]): Asset[] {
    const assets: Asset[] = []
    const geminiDir = this.geminiDir()
    for (const pattern of ['oauth_creds.json', 'credentials.json', '.credentials']) {
      for (const filePath of safeGlob(pattern, geminiDir, errors, 'gemini-credential')) {
        const credential = safeScan(errors, filePath, 'gemini-credential', () =>
          parseGeminiCredentialPresence(filePath)
        )
        if (credential) assets.push(credential)
      }
    }
    return assets
  }

  private geminiDir(): string {
    return path.join(this.homeDir, '.gemini')
  }
}

function readContextFileNames(settingsPath: string): string[] | undefined {
  if (!fs.existsSync(settingsPath)) return undefined
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    const context = isRecord(parsed) && isRecord(parsed.context) ? parsed.context : undefined
    const fileName = context?.fileName
    if (typeof fileName === 'string' && fileName.trim().length > 0) return [fileName]
    if (Array.isArray(fileName)) {
      const names = fileName.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      return names.length > 0 ? names : undefined
    }
  } catch {
    // parseGeminiSettings records malformed JSON during capability scanning.
  }
  return undefined
}

function safeScan<T>(
  errors: ScanError[],
  filePath: string,
  type: string,
  fn: () => T
): T | null {
  try {
    return fn()
  } catch (err) {
    errors.push({
      path: filePath,
      type,
      message: err instanceof Error ? err.message : String(err)
    })
    return null
  }
}

function safeGlob(
  pattern: string,
  cwd: string,
  errors: ScanError[],
  type: string
): string[] {
  if (!fs.existsSync(cwd)) return []
  try {
    return glob.sync(pattern, {
      cwd,
      absolute: true,
      windowsPathsNoEscape: true
    })
  } catch (err) {
    errors.push({
      path: cwd,
      type,
      message: err instanceof Error ? err.message : String(err)
    })
    return []
  }
}
