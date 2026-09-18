#!/usr/bin/env node
// Acceptance evidence is produced on a real machine, so it carries the operator's
// home directory, internal connection aliases and session identifiers. This rewrites
// them into placeholders before the documents are committed.
//
// The names themselves are never written into this file: the operator's own name
// comes from the running system, and private project or connection aliases come from
// the environment, so the repository cannot leak what it is meant to remove.
//
//   SSH_ALIASES="conn-a,conn-b" PRIVATE_TERMS="proj-a,proj-b" node scripts/redact-personal-data.mjs
//   SSH_ALIASES="conn-a,conn-b" PRIVATE_TERMS="proj-a,proj-b" node scripts/redact-personal-data.mjs --check
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { join, resolve } from 'node:path'

const rootIndex = process.argv.indexOf('--root')
const ROOT = rootIndex >= 0
  ? resolve(process.argv[rootIndex + 1], 'docs')
  : resolve(import.meta.dirname, '..', 'docs')
const EXTENSIONS = /\.(md|json|ya?ml)$/i
const checkOnly = process.argv.includes('--check')

const escape = value => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
const names = new Set([userInfo().username, homedir().split('/').pop()].filter(name => name && name.length > 2))
const terms = name => (process.env[name] ?? '')
  .split(',')
  .map(term => term.trim())
  .filter(term => term.length > 1)
const connections = terms('SSH_ALIASES')
const projects = terms('PRIVATE_TERMS')

const RULES = [
  // Keep the shape of the path, drop the operator's name.
  { id: 'home-path', pattern: /\/Users\/[A-Za-z0-9._-]+\//g, replacement: '/Users/<user>/' },
  { id: 'person-name', pattern: new RegExp(`\\b[A-Za-z0-9._-]*(?:${[...names].map(escape).join('|')})[A-Za-z0-9._-]*`, 'gi'), replacement: '<user>' },
  { id: 'ssh-alias', pattern: new RegExp(`\\b(?:${connections.map(escape).join('|')})\\b`, 'g'), replacement: '<ssh-connection>' },
  { id: 'private-project', pattern: new RegExp(`\\b(?:${projects.map(escape).join('|')})\\b`, 'g'), replacement: '<private-project>' },
  { id: 'session-id', pattern: /session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, replacement: 'session-<id>' },
]

function files(directory) {
  const found = []
  if (!existsSync(directory)) return found
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) found.push(...files(path))
    else if (EXTENSIONS.test(entry)) found.push(path)
  }
  return found
}

let rewritten = 0
let remaining = 0
for (const path of files(ROOT)) {
  const original = readFileSync(path, 'utf8')
  let text = original
  const counts = []
  for (const rule of RULES.filter(rule => rule.pattern.source !== '\\b(?:)\\b')) {
    const matches = text.match(rule.pattern)
    if (matches === null) continue
    counts.push(`${rule.id}×${matches.length}`)
    text = text.replace(rule.pattern, rule.replacement)
  }
  const left = RULES.flatMap(rule => text.match(rule.pattern) ?? [])
  remaining += left.length
  if (text === original) continue
  const relative = path.replace(`${resolve(ROOT, '..')}/`, '')
  if (checkOnly) {
    console.log(`FAIL ${relative}: ${counts.join(', ')}`)
    continue
  }
  writeFileSync(path, text)
  rewritten += 1
  console.log(`redacted ${relative}: ${counts.join(', ')}`)
}

if (checkOnly) {
  console.log(remaining === 0 ? 'ok   no personal data left in docs/' : `FAIL ${remaining} occurrence(s) left`)
  process.exit(remaining === 0 ? 0 : 1)
}
console.log(`rewrote ${rewritten} file(s); ${remaining} occurrence(s) left`)
