// GH-113 SQLite de-risk probe: load better-sqlite3, open a real DB, exercise
// CREATE/INSERT/SELECT, and report the host ABI. Run under both the system Node
// and `ELECTRON_RUN_AS_NODE=1 electron` to see which ABI the prebuilt .node
// matches. This is throwaway evidence for the de-risk spike, not shipped code.
const os = require('os')
const path = require('path')
const fs = require('fs')

const host = {
  argv0: process.argv0,
  node: process.versions.node,
  modules: process.versions.modules,
  electron: process.versions.electron || null,
  runAsNode: process.env.ELECTRON_RUN_AS_NODE || null
}

try {
  const Database = require('better-sqlite3')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'berth-sqlite-probe-'))
  const dbPath = path.join(dir, 'probe.db')
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec('CREATE TABLE asset (id TEXT PRIMARY KEY, name TEXT NOT NULL)')
  const insert = db.prepare('INSERT INTO asset (id, name) VALUES (?, ?)')
  const tx = db.transaction((rows) => rows.forEach((r) => insert.run(r.id, r.name)))
  tx([{ id: 'a1', name: 'hello' }, { id: 'a2', name: 'world' }])
  const count = db.prepare('SELECT COUNT(*) AS c FROM asset').get().c
  const rows = db.prepare('SELECT id, name FROM asset ORDER BY id').all()
  db.close()
  fs.rmSync(dir, { recursive: true, force: true })
  console.log(JSON.stringify({ ok: true, host, count, rows }))
} catch (err) {
  console.log(JSON.stringify({ ok: false, host, error: String(err && err.message || err) }))
  process.exitCode = 1
}
