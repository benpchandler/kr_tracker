#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import process from 'node:process'

const projectRoot = resolve(new URL('.', import.meta.url).pathname, '..')
const srcDir = resolve(projectRoot, 'src')
const configPath = resolve(srcDir, 'config.ts')

const patterns = [
  { regex: /https?:\/\//g, message: 'Raw http(s) URL literal; move to src/config.ts.' },
  { regex: /kr-tracker-state-v\d+/gi, message: 'Storage key literal duplicated; import STORAGE_KEY.' },
  { regex: /(?:>=|<=|>|<)\s*0\.99/g, message: 'Health threshold comparator literal; import HEALTH_THRESHOLDS.' },
  { regex: /(?:>=|<=|>|<)\s*0\.95/g, message: 'Health threshold comparator literal; import HEALTH_THRESHOLDS.' },
]

const offenders = []

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (entry.name === 'node_modules' || entry.name === 'tests') continue
    const full = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      if (full === configPath) continue
      await checkFile(full)
    }
  }
}

async function checkFile(filePath) {
  const contents = await readFile(filePath, 'utf8')
  for (const { regex, message } of patterns) {
    regex.lastIndex = 0
    let match
    while ((match = regex.exec(contents)) !== null) {
      const line = contents.slice(0, match.index).split(/\r?\n/).length
      offenders.push({
        file: relative(projectRoot, filePath),
        line,
        literal: match[0],
        message,
      })
    }
  }
}

await walk(srcDir)

if (offenders.length) {
  console.error('Literal guardrail violations detected:')
  for (const offender of offenders) {
    console.error(` - ${offender.file}:${offender.line} → ${offender.literal} :: ${offender.message}`)
  }
  process.exit(1)
}
