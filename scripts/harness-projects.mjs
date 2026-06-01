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
const DEFAULT_REPO = 'Caldis/berth'
const PROJECT_ITEM_ID = /^PVTI_[A-Za-z0-9_-]+$/

export function isValidProjectItemId(value) {
  return PROJECT_ITEM_ID.test(String(value || '').trim())
}

export function isPendingProjectAuth(frontmatter) {
  const gh = frontmatter.gh_project || {}
  return gh.status === 'pending-auth' && frontmatter.phase === 'blocked'
}

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

export function taskIdFromIssueNumber(number) {
  const value = Number(number)
  if (!Number.isInteger(value) || value <= 0) throw new Error(`invalid GitHub Issue number: ${number}`)
  return `GH-${value}`
}

export function issueNumberFromTaskId(taskId) {
  const match = /^GH-(\d+)$/i.exec(String(taskId || '').trim())
  return match ? Number(match[1]) : null
}

function normalizeUrl(url) {
  return url ? String(url).replace(/\/$/, '') : ''
}

function repoFromIssueUrl(url) {
  const match = /^https:\/\/github\.com\/([^/]+\/[^/]+)\/issues\/\d+$/i.exec(String(url || ''))
  return match ? match[1] : null
}

export function findProjectItem(itemsJson, { itemId, task, title, issueUrl }) {
  const items = itemsJson.items || []
  if (itemId) {
    const exact = items.find((item) => item.id === itemId)
    if (exact) return exact
  }
  const normalizedIssueUrl = normalizeUrl(issueUrl)
  if (normalizedIssueUrl) {
    const byIssueUrl = items.find((item) => {
      return normalizeUrl(item.url) === normalizedIssueUrl || normalizeUrl(item.content && item.content.url) === normalizedIssueUrl
    })
    if (byIssueUrl) return byIssueUrl
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

function updateFrontmatterScalar(markdown, key, value, afterKey = 'task') {
  if (value === undefined || value === null || value === '') return markdown
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const end = findFrontmatterEnd(lines)
  if (end < 0) throw new Error('INDEX.md missing frontmatter')
  const line = `${key}: ${value}`
  const existing = lines.findIndex((candidate, index) => index > 0 && index < end && candidate.startsWith(`${key}:`))
  if (existing >= 0) {
    lines[existing] = line
    return lines.join('\n')
  }
  const after = lines.findIndex((candidate, index) => index > 0 && index < end && candidate.startsWith(`${afterKey}:`))
  lines.splice(after >= 0 ? after + 1 : end, 0, line)
  return lines.join('\n')
}

function updateNestedFrontmatterBlock(markdown, blockName, updates) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const end = findFrontmatterEnd(lines)
  if (end < 0) throw new Error('INDEX.md missing frontmatter')

  let start = lines.findIndex((line, index) => index > 0 && index < end && line === `${blockName}:`)
  if (start < 0) {
    const inserted = [`${blockName}:`]
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

export function updateGhProjectFrontmatter(markdown, updates) {
  return updateNestedFrontmatterBlock(markdown, 'gh_project', updates)
}

export function updateTaskTrackingFrontmatter(markdown, updates) {
  let next = markdown
  next = updateFrontmatterScalar(next, 'task_id', updates.task_id)
  if (updates.issue) next = updateNestedFrontmatterBlock(next, 'issue', updates.issue)
  if (updates.gh_project) next = updateGhProjectFrontmatter(next, updates.gh_project)
  return next
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
    itemId: isValidProjectItemId(gh.item_id) ? gh.item_id : undefined
  }
}

function issueContext(frontmatter) {
  const issue = frontmatter.issue || {}
  const number = issue.number ? Number(issue.number) : issueNumberFromTaskId(frontmatter.task_id)
  const repo = issue.repo || process.env.HARNESS_ISSUE_REPO || DEFAULT_REPO
  return {
    id: issue.id,
    number,
    repo,
    url: issue.url || (number ? `https://github.com/${repo}/issues/${number}` : undefined),
    state: issue.state
  }
}

function readIssue(frontmatter, gh) {
  const issue = issueContext(frontmatter)
  if (!issue.number && !issue.url) throw new Error('INDEX.md must include issue.number or task_id=GH-{number}')
  const args = ['issue', 'view', issue.number ? String(issue.number) : issue.url, '--json', 'number,url,id,title,state']
  if (issue.number && issue.repo) args.push('--repo', issue.repo)
  const viewed = gh(args)
  const url = viewed.url || issue.url
  return {
    id: viewed.id || issue.id,
    number: Number(viewed.number || issue.number),
    repo: issue.repo || repoFromIssueUrl(url) || DEFAULT_REPO,
    url,
    state: viewed.state || issue.state
  }
}

function ensureProject(context, gh = ghJson) {
  if (context.projectId) return context
  const projectList = gh(['project', 'list', '--owner', context.owner, '--format', 'json', '--limit', '100'])
  const project = findProject(projectList, context.number)
  if (!project) throw new Error(`GitHub Project #${context.number} not found for ${context.owner}`)
  return { ...context, projectId: project.id, projectUrl: project.url }
}

function ensureItem(context, taskDir, frontmatter, issue, gh = ghJson) {
  if (context.itemId) return context
  const items = gh(['project', 'item-list', String(context.number), '--owner', context.owner, '--format', 'json', '--limit', '500'])
  const title = taskTitle(frontmatter, taskDir)
  const existing = findProjectItem(items, { task: frontmatter.task || basename(taskDir), title, issueUrl: issue && issue.url })
  if (existing) return { ...context, itemId: existing.id }
  const created = issue && issue.url
    ? gh(['project', 'item-add', String(context.number), '--owner', context.owner, '--url', issue.url, '--format', 'json'])
    : gh([
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

function setProjectStatus(context, statusName, gh = ghJson) {
  const fields = gh(['project', 'field-list', String(context.number), '--owner', context.owner, '--format', 'json'])
  const status = findStatusField(fields)
  if (!status) throw new Error('GitHub Project Status field with Done option not found')
  const optionId = statusName === 'Done' ? status.doneOptionId : status.inProgressOptionId
  if (!optionId) throw new Error(`GitHub Project Status field missing ${statusName} option`)
  gh([
    'project',
    'item-edit',
    '--id',
    context.itemId,
    '--project-id',
    context.projectId,
    '--field-id',
    status.fieldId,
    '--single-select-option-id',
    optionId,
    '--format',
    'json'
  ])
}

export function listTaskDirs(base) {
  if (!existsSync(base)) return []
  return readdirSync(base)
    .filter((name) => !name.startsWith('_') && statSync(join(base, name)).isDirectory())
    .map((name) => join(base, name))
}

export function auditTasks(root, itemsJson, options = {}) {
  const errors = []
  const strict = Boolean(options.strict)
  for (const dir of listTaskDirs(join(root, 'docs/works'))) {
    const { frontmatter } = readTaskIndex(dir)
    const gh = frontmatter.gh_project || {}
    const issue = frontmatter.issue || {}
    if (strict && !issue.number) errors.push(`${frontmatter.task}: active task missing issue.number`)
    const itemId = String(gh.item_id || '').trim()
    if (isPendingProjectAuth(frontmatter)) {
      if (itemId) errors.push(`${frontmatter.task}: pending Project auth task must not keep gh_project.item_id`)
      continue
    }
    if (strict && !itemId) errors.push(`${frontmatter.task}: active task missing gh_project.item_id`)
    if (!itemId) continue
    if (!isValidProjectItemId(itemId)) {
      errors.push(`${frontmatter.task}: invalid gh_project.item_id "${itemId}"`)
      continue
    }
    const item = findProjectItem(itemsJson, { itemId: gh.item_id, task: frontmatter.task, title: taskTitle(frontmatter, dir), issueUrl: issue.url })
    if (item && item.status === 'Done') errors.push(`${frontmatter.task}: active task has Done project status`)
  }
  for (const dir of listTaskDirs(join(root, 'docs/works/_archive'))) {
    const { frontmatter } = readTaskIndex(dir)
    const gh = frontmatter.gh_project || {}
    if (!gh.item_id) continue
    if (!isValidProjectItemId(gh.item_id)) {
      errors.push(`${frontmatter.task}: archived task has invalid gh_project.item_id "${gh.item_id}"`)
      continue
    }
    const issue = frontmatter.issue || {}
    const item = findProjectItem(itemsJson, { itemId: gh.item_id, task: frontmatter.task, title: taskTitle(frontmatter, dir), issueUrl: issue.url })
    if (!item) errors.push(`${frontmatter.task}: archived task project item not found`)
    else if (item.status !== 'Done') errors.push(`${frontmatter.task}: archived task project status is ${item.status || 'empty'}`)
  }
  return errors
}

export function ensureStartedTask(taskDir, options = {}) {
  const gh = options.gh || ghJson
  const { indexPath, markdown, frontmatter } = readTaskIndex(taskDir)
  const issue = readIssue(frontmatter, gh)
  let context = ensureProject(projectContext(frontmatter), gh)
  context = ensureItem(context, taskDir, frontmatter, issue, gh)
  setProjectStatus(context, 'In Progress', gh)
  const next = updateTaskTrackingFrontmatter(markdown, {
    task_id: taskIdFromIssueNumber(issue.number),
    issue,
    gh_project: {
      status: 'tracked',
      project_id: context.projectId,
      project_number: context.number,
      project_url: context.projectUrl || `https://github.com/users/${context.owner}/projects/${context.number}`,
      item_id: context.itemId,
      item_status: 'In Progress'
    }
  })
  writeFileSync(indexPath, next)
  console.log(`harness-projects: ${frontmatter.task || basename(taskDir)} is In Progress`)
}

export function markDoneTask(taskDir, options = {}) {
  const gh = options.gh || ghJson
  const { indexPath, markdown, frontmatter } = readTaskIndex(taskDir)
  if (!frontmatter.gh_project || !isValidProjectItemId(frontmatter.gh_project.item_id))
    throw new Error('INDEX.md missing gh_project.item_id; run harness-projects ensure before archive')
  const context = ensureProject(projectContext(frontmatter), gh)
  setProjectStatus(context, 'Done', gh)
  const items = gh(['project', 'item-list', String(context.number), '--owner', context.owner, '--format', 'json', '--limit', '500'])
  const issue = issueContext(frontmatter)
  const item = findProjectItem(items, { itemId: context.itemId, task: frontmatter.task, title: taskTitle(frontmatter, taskDir), issueUrl: issue.url })
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
  const errors = auditTasks(root, items, { strict: process.argv.includes('--strict') })
  if (errors.length > 0) {
    console.error('harness-projects: FAILED\n' + errors.map((error) => `  - ${error}`).join('\n'))
    process.exit(1)
  }
  console.log('harness-projects: all project statuses match local task state')
}

function main() {
  const [cmd, taskDirArg] = process.argv.slice(2)
  if (cmd === 'ensure' || cmd === 'start') {
    if (!taskDirArg) throw new Error('usage: node scripts/harness-projects.mjs ensure <task-dir>')
    ensureStartedTask(taskDirArg)
    return
  }
  if (cmd === 'done') {
    if (!taskDirArg) throw new Error('usage: node scripts/harness-projects.mjs done <task-dir>')
    markDoneTask(taskDirArg)
    return
  }
  if (cmd === 'check' || !cmd) {
    checkProjects(process.cwd())
    return
  }
  throw new Error(`unknown command: ${cmd}`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
