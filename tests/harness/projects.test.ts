// tests/harness/projects.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import {
  auditTasks,
  ensureStartedTask,
  findProject,
  findProjectItem,
  findStatusField,
  issueNumberFromTaskId,
  markDoneTask,
  taskIdFromIssueNumber,
  updateTaskTrackingFrontmatter,
  updateGhProjectFrontmatter
} from '../../scripts/harness-projects.mjs'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'harness-projects-'))
})
afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function writeIndex(dir: string, body: string): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'INDEX.md'), body)
}

describe('harness-projects helpers', () => {
  it('findProject 按 number 找 Project', () => {
    expect(findProject({ projects: [{ number: 6, id: 'p6' }] }, 6)).toEqual({ number: 6, id: 'p6' })
  })

  it('findStatusField 找 Status 和 Done option', () => {
    const status = findStatusField({
      fields: [
        { name: 'Title', id: 'title' },
        {
          name: 'Status',
          id: 'status',
          options: [
            { id: 'todo', name: 'Todo' },
            { id: 'done', name: 'Done' }
          ]
        }
      ]
    })
    expect(status).toEqual({ fieldId: 'status', doneOptionId: 'done', inProgressOptionId: undefined })
  })

  it('task_id 使用 GitHub Issue number 派生的 GH-{number}', () => {
    expect(taskIdFromIssueNumber(123)).toBe('GH-123')
    expect(issueNumberFromTaskId('GH-123')).toBe(123)
    expect(issueNumberFromTaskId('gh-456')).toBe(456)
    expect(issueNumberFromTaskId('SPFOODY-123')).toBeNull()
  })

  it('findProjectItem 优先按 item id 匹配', () => {
    const item = findProjectItem(
      { items: [{ id: 'a', title: 'Wrong' }, { id: 'b', title: 'Task' }] },
      { itemId: 'b', task: 'task', title: 'Other' }
    )
    expect(item?.id).toBe('b')
  })

  it('findProjectItem 可按 title 和 body 匹配', () => {
    expect(findProjectItem({ items: [{ id: 'a', title: 'Task title' }] }, { title: 'Task title' })?.id).toBe('a')
    expect(findProjectItem({ items: [{ id: 'b', content: { body: 'Work: docs/works/task-x' } }] }, { task: 'task-x' })?.id).toBe('b')
  })

  it('findProjectItem 可按 issue URL 匹配真实 Issue item', () => {
    const issueUrl = 'https://github.com/Caldis/berth/issues/123'
    expect(findProjectItem({ items: [{ id: 'a', content: { url: issueUrl } }] }, { issueUrl })?.id).toBe('a')
    expect(findProjectItem({ items: [{ id: 'b', url: issueUrl }] }, { issueUrl })?.id).toBe('b')
  })

  it('updateGhProjectFrontmatter 更新已有 gh_project block', () => {
    const next = updateGhProjectFrontmatter(
      ['---', 'task: t', 'gh_project:', '  item_id: old', '  item_status: In Progress', '---', 'body'].join('\n'),
      { item_id: 'new', item_status: 'Done' }
    )
    expect(next).toContain('  item_id: new')
    expect(next).toContain('  item_status: Done')
  })

  it('updateGhProjectFrontmatter 可插入 gh_project block', () => {
    const next = updateGhProjectFrontmatter(['---', 'task: t', '---', 'body'].join('\n'), {
      project_number: 6,
      item_id: 'item',
      item_status: 'Done'
    })
    expect(next).toContain('gh_project:\n  project_number: 6\n  item_id: item\n  item_status: Done')
  })

  it('updateTaskTrackingFrontmatter 写入 task_id、issue 和 gh_project', () => {
    const next = updateTaskTrackingFrontmatter(['---', 'task: sample', 'type: feature', 'phase: explore', 'created: 2026-06-01', '---', 'body'].join('\n'), {
      task_id: 'GH-123',
      issue: {
        number: 123,
        repo: 'Caldis/berth',
        url: 'https://github.com/Caldis/berth/issues/123',
        id: 'I_123'
      },
      gh_project: {
        project_number: 6,
        item_id: 'PVTI_123',
        item_status: 'In Progress'
      }
    })
    expect(next).toContain('task_id: GH-123')
    expect(next).toContain('issue:\n  number: 123\n  repo: Caldis/berth\n  url: https://github.com/Caldis/berth/issues/123\n  id: I_123')
    expect(next).toContain('gh_project:\n  project_number: 6\n  item_id: PVTI_123\n  item_status: In Progress')
  })

  it('ensureStartedTask 绑定真实 issue, 加入 Project, 设置 In Progress 并回写 INDEX', () => {
    const dir = join(root, 'docs/works/2026-06-01-gh-123-sample')
    writeIndex(
      dir,
      ['---', 'task: sample', 'task_id: GH-123', 'type: feature', 'phase: explore', 'created: 2026-06-01', 'issue:', '  number: 123', '  repo: Caldis/berth', '---', 'body'].join('\n')
    )
    const calls: string[][] = []
    const gh = (args: string[]): unknown => {
      calls.push(args)
      if (args[0] === 'project' && args[1] === 'list') return { projects: [{ number: 6, id: 'PVT_6', url: 'https://github.com/users/Caldis/projects/6' }] }
      if (args[0] === 'issue' && args[1] === 'view') return { number: 123, url: 'https://github.com/Caldis/berth/issues/123', id: 'I_123', title: 'sample', state: 'OPEN' }
      if (args[0] === 'project' && args[1] === 'item-list') return { items: [] }
      if (args[0] === 'project' && args[1] === 'item-add') return { id: 'PVTI_123' }
      if (args[0] === 'project' && args[1] === 'field-list') {
        return {
          fields: [
            {
              name: 'Status',
              id: 'STATUS',
              options: [
                { id: 'todo', name: 'Todo' },
                { id: 'progress', name: 'In Progress' },
                { id: 'done', name: 'Done' }
              ]
            }
          ]
        }
      }
      if (args[0] === 'project' && args[1] === 'item-edit') return { id: 'PVTI_123' }
      throw new Error(`unexpected gh call: ${args.join(' ')}`)
    }

    ensureStartedTask(dir, { gh })

    const markdown = readFileSync(join(dir, 'INDEX.md'), 'utf8')
    expect(calls.some((args) => args.includes('item-add') && args.includes('--url') && args.includes('https://github.com/Caldis/berth/issues/123'))).toBe(true)
    expect(calls.some((args) => args.includes('item-edit') && args.includes('progress'))).toBe(true)
    expect(markdown).toContain('task_id: GH-123')
    expect(markdown).toContain('item_id: PVTI_123')
    expect(markdown).toContain('item_status: In Progress')
  })

  it('auditTasks 检出 active Done 和 archived 未 Done', () => {
    writeIndex(
      join(root, 'docs/works/2026-06-01-active'),
      ['---', 'task: active', 'type: feature', 'phase: verify', 'created: 2026-06-01', 'gh_project:', '  item_id: PVTI_active', '---'].join('\n')
    )
    writeIndex(
      join(root, 'docs/works/_archive/2026-06-01-done'),
      ['---', 'task: done', 'type: feature', 'phase: archive', 'created: 2026-06-01', 'gh_project:', '  item_id: PVTI_done', '---'].join('\n')
    )
    const errors = auditTasks(root, {
      items: [
        { id: 'PVTI_active', status: 'Done' },
        { id: 'PVTI_done', status: 'In Progress' }
      ]
    })
    expect(errors).toEqual([
      'active: active task has Done project status',
      'done: archived task project status is In Progress'
    ])
  })

  it('auditTasks strict 检出 active task 缺少 issue 或 Project item', () => {
    writeIndex(
      join(root, 'docs/works/2026-06-01-gh-123-missing-item'),
      ['---', 'task: missing item', 'task_id: GH-123', 'type: feature', 'phase: explore', 'created: 2026-06-01', 'issue:', '  number: 123', '---'].join('\n')
    )
    writeIndex(
      join(root, 'docs/works/2026-06-01-gh-124-missing-issue'),
      ['---', 'task: missing issue', 'task_id: GH-124', 'type: feature', 'phase: explore', 'created: 2026-06-01', 'gh_project:', '  item_id: PVTI_124', '---'].join('\n')
    )
    expect(auditTasks(root, { items: [] }, { strict: true })).toEqual([
      'missing item: active task missing gh_project.item_id',
      'missing issue: active task missing issue.number'
    ])
  })

  it('auditTasks strict 拒绝 Project item 占位符, 但允许 pending-auth blocked 任务', () => {
    writeIndex(
      join(root, 'docs/works/2026-06-01-gh-123-placeholder'),
      ['---', 'task: placeholder', 'task_id: GH-123', 'type: feature', 'phase: verify', 'created: 2026-06-01', 'issue:', '  number: 123', 'gh_project:', '  item_id: TBD', '---'].join('\n')
    )
    writeIndex(
      join(root, 'docs/works/2026-06-01-gh-124-pending-auth'),
      ['---', 'task: pending auth', 'task_id: GH-124', 'type: feature', 'phase: blocked', 'created: 2026-06-01', 'issue:', '  number: 124', 'gh_project:', '  status: pending-auth', '---'].join('\n')
    )

    expect(auditTasks(root, { items: [] }, { strict: true })).toEqual([
      'placeholder: invalid gh_project.item_id "TBD"'
    ])
  })

  it('markDoneTask 缺少 gh_project.item_id 时停止, 不补建 Project item', () => {
    const dir = join(root, 'docs/works/2026-06-01-gh-123-sample')
    writeIndex(
      dir,
      ['---', 'task: sample', 'task_id: GH-123', 'type: feature', 'phase: verify', 'created: 2026-06-01', 'issue:', '  number: 123', '---'].join('\n')
    )
    const gh = (): unknown => {
      throw new Error('gh should not be called')
    }
    expect(() => markDoneTask(dir, { gh })).toThrow('gh_project.item_id')
  })
})
