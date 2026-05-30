#!/usr/bin/env node
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { createAgentDevContext, formatResult, parseArgs, runCli } from './agent-dev-core.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const context = createAgentDevContext({ root })
const args = process.argv.slice(2)
const options = parseArgs(args)

runCli(args, context)
  .then((result) => {
    process.stdout.write(formatResult(result, options.json))
  })
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
