// tests/harness/projects.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// @ts-expect-error mjs sin tipos
import {
  auditTasks,
  findProject,
  findProjectItem,
  findStatusField,
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

  it('auditTasks 检出 active Done 和 archived 未 Done', () => {
    writeIndex(
      join(root, 'docs/works/2026-06-01-active'),
      ['---', 'task: active', 'type: feature', 'phase: verify', 'created: 2026-06-01', 'gh_project:', '  item_id: active-item', '---'].join('\n')
    )
    writeIndex(
      join(root, 'docs/works/_archive/2026-06-01-done'),
      ['---', 'task: done', 'type: feature', 'phase: archive', 'created: 2026-06-01', 'gh_project:', '  item_id: done-item', '---'].join('\n')
    )
    const errors = auditTasks(root, {
      items: [
        { id: 'active-item', status: 'Done' },
        { id: 'done-item', status: 'In Progress' }
      ]
    })
    expect(errors).toEqual([
      'active: active task has Done project status',
      'done: archived task project status is In Progress'
    ])
  })
})
