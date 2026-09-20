#!/usr/bin/env node
/**
 * split-locales.mjs — Auctum Ledger i18n build step.
 *
 * Splits each single-file locale bundle in localization/02-locale-files/*.json
 * (top-level namespaces, en-US is the source of truth) into per-namespace files:
 *
 *   localization/02-locale-files/<lng>.json
 *     -> app/public/locales/<lng>/<namespace>.json
 *
 * The frontend loads these lazily via i18next-http-backend
 * (loadPath: '/locales/{{lng}}/{{ns}}.json'). Run from the repo root:
 *
 *   node scripts/split-locales.mjs
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const srcDir = join(repoRoot, 'localization', '02-locale-files')
const outDir = join(repoRoot, 'app', 'public', 'locales')

const localeFiles = readdirSync(srcDir).filter((f) => f.endsWith('.json'))
if (localeFiles.length === 0) {
  console.error(`No locale JSON files found in ${srcDir}`)
  process.exit(1)
}

// Clean rebuild so removed namespaces/locales never linger in the shipped bundle.
rmSync(outDir, { recursive: true, force: true })

let totalFiles = 0
for (const file of localeFiles.sort()) {
  const lng = basename(file, '.json')
  const raw = readFileSync(join(srcDir, file), 'utf8')
  const bundle = JSON.parse(raw)

  const namespaces = Object.keys(bundle)
  if (namespaces.length === 0) {
    console.error(`${file}: no top-level namespaces found`)
    process.exit(1)
  }

  const lngDir = join(outDir, lng)
  mkdirSync(lngDir, { recursive: true })

  for (const ns of namespaces.sort()) {
    const target = join(lngDir, `${ns}.json`)
    writeFileSync(target, `${JSON.stringify(bundle[ns], null, 2)}\n`, 'utf8')
    totalFiles += 1
  }
  console.log(`${lng}: ${namespaces.length} namespaces -> ${lngDir}`)
}

console.log(`Done. Wrote ${totalFiles} namespace files for ${localeFiles.length} locales.`)
