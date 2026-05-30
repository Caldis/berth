export interface ProjectDirOptions {
  isDev: boolean
  cwd: string
}

export function resolveDefaultProjectDir({ isDev, cwd }: ProjectDirOptions): string | undefined {
  return isDev ? undefined : cwd
}

