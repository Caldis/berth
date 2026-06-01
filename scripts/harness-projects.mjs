// scripts/harness-projects.mjs
// GitHub Projects 同步工具: archive 前置 Done, 以及只读漂移检查。
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from './harness-lib.mjs'

const DEFAULT_OWNER = 'Caldis'
const DEFAULT_PROJECT_NUMBER = 6
const AUTH_HINT = 'gh auth refresh -h github.com -s project,read:project'

function ghJson(args) {
  try {
    const out = execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    return JSON.parse(out)
  } catch (error) {
    const stderr = error && error.stderr ? String(error.stderr) : ''
    if (/project|scope|auth/i.test(stderr)) {
      throw new Error(`GitHub Project access failed. Run: ${AUTH_HINT}`)
    }
    throw error
  }
}

export function findProject(projectsJson, number = DEFAULT_PROJECT_NUMBER) {
  return (projectsJson.projects || []).find((project) => Number(project.number) === Number(number)) || null
}

export function findStatusField(fieldsJson) {
  const field = (fieldsJson.fields || []).find((candidate) => candidate.name === 'Status')
  if (!field) return null
  const done = (field.options || []).find((option) => option.name === 'Done')
  const inProgress = (field.options || []).find((option) => option.name === 'In Progress')
  return done ? { fieldId: field.id, doneOptionId: done.id, inProgressOptionId: inProgress && inProgress.id } : null
}

export function findProjectItem(itemsJson, { itemId, task, title }) {
  const items = itemsJson.items || []
  if (itemId) {
    const exact = items.find((item) => item.id === itemId)
    if (exact) return exact
  }
  const normalizedTitle = title && title.trim().toLowerCase()
  if (normalizedTitle) {
    const byTitle = items.find((item) => item.title && item.title.trim().toLowerCase() === normalizedTitle)
    if (byTitle) return byTitle
  }
  if (task) {
    return items.find((item) => {
      const body = item.content && item.content.body ? item.content.body : ''
      return body.includes(task) || (item.title && item.title.includes(task))
    }) || null
  }
  return null
}

export function readTaskIndex(taskDir) {
  const indexPath = join(taskDir, 'INDEX.md')
  if (!existsSync(indexPath)) throw new Error(`missing ${indexPath}`)
  const markdown = readFileSync(indexPath, 'utf8')
  const frontmatter = parseFrontmatter(markdown)
  if (!frontmatter) throw new Error(`${indexPath} missing frontmatter`)
  return { indexPath, markdown, frontmatter }
}

function findFrontmatterEnd(lines) {
  if (lines[0] !== '---') return -1
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === '---') return index
  }
  return -1
}

export function updateGhProjectFrontmatter(markdown, updates) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const end = findFrontmatterEnd(lines)
  if (end < 0) throw new Error('INDEX.md missing frontmatter')

  let start = lines.findIndex((line, index) => index > 0 && index < end && line === 'gh_project:')
  if (start < 0) {
    const inserted = ['gh_project:']
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null && value !== '') inserted.push(`  ${key}: ${value}`)
    }
    lines.splice(end, 0, ...inserted)
    return lines.join('\n')
  }

  let blockEnd = start + 1
  while (blockEnd < end && /^  [A-Za-z0-9_]+:/.test(lines[blockEnd])) blockEnd += 1

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null || value === '') continue
    const pattern = new RegExp(`^  ${key}:`)
    const existing = lines.findIndex((line, index) => index > start && index < blockEnd && pattern.test(line))
    if (existing >= 0) {
      lines[existing] = `  ${key}: ${value}`
    } else {
      lines.splice(blockEnd, 0, `  ${key}: ${value}`)
      blockEnd += 1
    }
  }

  return lines.join('\n')
}

function taskTitle(frontmatter, taskDir) {
  return frontmatter.task || basename(taskDir)
}

function projectContext(frontmatter) {
  const gh = frontmatter.gh_project || {}
  return {
    owner: process.env.HARNESS_PROJECT_OWNER || DEFAULT_OWNER,
    number: gh.project_number || process.env.HARNESS_PROJECT_NUMBER || DEFAULT_PROJECT_NUMBER,
    projectId: gh.project_id,
    projectUrl: gh.project_url,
    itemId: gh.item_id
  }
}

function ensureProject(context) {
  if (context.projectId) return context
  const projectList = ghJson(['project', 'list', '--owner', context.owner, '--format', 'json', '--limit', '100'])
  const project = findProject(projectList, context.number)
  if (!project) throw new Error(`GitHub Project #${context.number} not found for ${context.owner}`)
  return { ...context, projectId: project.id, projectUrl: project.url }
}

function ensureItem(context, taskDir, frontmatter) {
  if (context.itemId) return context
  const items = ghJson(['project', 'item-list', String(context.number), '--owner', context.owner, '--format', 'json', '--limit', '200'])
  const title = taskTitle(frontmatter, taskDir)
  const existing = findProjectItem(items, { task: frontmatter.task || basename(taskDir), title })
  if (existing) return { ...context, itemId: existing.id }
  const created = ghJson([
    'project',
    'item-create',
    String(context.number),
    '--owner',
    context.owner,
    '--title',
    title,
    '--body',
    `Work: ${taskDir}`,
    '--format',
    'json'
  ])
  return { ...context, itemId: created.id }
}

export function listTaskDirs(base) {
  if (!existsSync(base)) return []
  return readdirSync(base)
    .filter((name) => !name.startsWith('_') && statSync(join(base, name)).isDirectory())
    .map((name) => join(base, name))
}

export function auditTasks(root, itemsJson) {
  const errors = []
  for (const dir of listTaskDirs(join(root, 'docs/works'))) {
    const { frontmatter } = readTaskIndex(dir)
    const gh = frontmatter.gh_project || {}
    if (!gh.item_id) continue
    const item = findProjectItem(itemsJson, { itemId: gh.item_id, task: frontmatter.task, title: taskTitle(frontmatter, dir) })
    if (item && item.status === 'Done') errors.push(`${frontmatter.task}: active task has Done project status`)
  }
  for (const dir of listTaskDirs(join(root, 'docs/works/_archive'))) {
    const { frontmatter } = readTaskIndex(dir)
    const gh = frontmatter.gh_project || {}
    if (!gh.item_id) continue
    const item = findProjectItem(itemsJson, { itemId: gh.item_id, task: frontmatter.task, title: taskTitle(frontmatter, dir) })
    if (!item) errors.push(`${frontmatter.task}: archived task project item not found`)
    else if (item.status !== 'Done') errors.push(`${frontmatter.task}: archived task project status is ${item.status || 'empty'}`)
  }
  return errors
}

function setDone(taskDir) {
  const { indexPath, markdown, frontmatter } = readTaskIndex(taskDir)
  let context = ensureProject(projectContext(frontmatter))
  context = ensureItem(context, taskDir, frontmatter)
  const fields = ghJson(['project', 'field-list', String(context.number), '--owner', context.owner, '--format', 'json'])
  const status = findStatusField(fields)
  if (!status) throw new Error('GitHub Project Status field with Done option not found')
  ghJson([
    'project',
    'item-edit',
    '--id',
    context.itemId,
    '--project-id',
    context.projectId,
    '--field-id',
    status.fieldId,
    '--single-select-option-id',
    status.doneOptionId,
    '--format',
    'json'
  ])
  const items = ghJson(['project', 'item-list', String(context.number), '--owner', context.owner, '--format', 'json', '--limit', '200'])
  const item = findProjectItem(items, { itemId: context.itemId, task: frontmatter.task, title: taskTitle(frontmatter, taskDir) })
  if (!item || item.status !== 'Done') throw new Error(`GitHub Project item ${context.itemId} was not verified as Done`)
  const next = updateGhProjectFrontmatter(markdown, {
    status: 'tracked',
    project_id: context.projectId,
    project_number: context.number,
    project_url: context.projectUrl || `https://github.com/users/${context.owner}/projects/${context.number}`,
    item_id: context.itemId,
    item_status: 'Done'
  })
  writeFileSync(indexPath, next)
  console.log(`harness-projects: ${frontmatter.task || basename(taskDir)} is Done`)
}

function checkProjects(root) {
  const items = ghJson([
    'project',
    'item-list',
    String(process.env.HARNESS_PROJECT_NUMBER || DEFAULT_PROJECT_NUMBER),
    '--owner',
    process.env.HARNESS_PROJECT_OWNER || DEFAULT_OWNER,
    '--format',
    'json',
    '--limit',
    '200'
  ])
  const errors = auditTasks(root, items)
  if (errors.length > 0) {
    console.error('harness-projects: FAILED\n' + errors.map((error) => `  - ${error}`).join('\n'))
    process.exit(1)
  }
  console.log('harness-projects: all project statuses match local task state')
}

function main() {
  const [cmd, taskDirArg] = process.argv.slice(2)
  if (cmd === 'done') {
    if (!taskDirArg) throw new Error('usage: node scripts/harness-projects.mjs done <task-dir>')
    setDone(taskDirArg)
    return
  }
  if (cmd === 'check' || !cmd) {
    checkProjects(process.cwd())
    return
  }
  throw new Error(`unknown command: ${cmd}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
