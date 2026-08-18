import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

type LuaToken = {
  kind: string
  value: string
}

const frontendSourceDirectory = fileURLToPath(new URL('../', import.meta.url))
const englishLocaleSource = readFileSync(
  new URL('../../../sky_phone/config/locales/en.lua', import.meta.url),
  'utf8',
)
const germanLocaleSource = readFileSync(
  new URL('../../../sky_phone/config/locales/de.lua', import.meta.url),
  'utf8',
)
const phoneStoreSource = readFileSync(
  new URL('./phone.ts', import.meta.url),
  'utf8',
)

function tokenizeLua(source: string): LuaToken[] {
  const tokens: LuaToken[] = []
  let index = 0
  while (index < source.length) {
    const character = source[index]
    if (/\s/.test(character)) {
      index += 1
      continue
    }
    if (source.startsWith('--', index)) {
      const nextLine = source.indexOf('\n', index)
      if (nextLine < 0) break
      index = nextLine
      continue
    }
    if ('{}[]=,;'.includes(character)) {
      tokens.push({ kind: character, value: character })
      index += 1
      continue
    }
    if (character === '"' || character === "'") {
      const quote = character
      let value = ''
      index += 1
      while (index < source.length && source[index] !== quote) {
        if (source[index] === '\\' && index + 1 < source.length) {
          value += source[index + 1]
          index += 2
        } else {
          value += source[index]
          index += 1
        }
      }
      tokens.push({ kind: 'string', value })
      index += 1
      continue
    }
    const match = source
      .slice(index)
      .match(/^[A-Za-z_][A-Za-z0-9_]*|^-?\d+(?:\.\d+)?/)
    if (match) {
      tokens.push({ kind: 'word', value: match[0] })
      index += match[0].length
      continue
    }
    index += 1
  }
  return tokens
}

function collectLuaLocalePaths(source: string): Set<string> {
  const tokens = tokenizeLua(source)
  let position =
    tokens.findIndex(
      (token, index) => token.kind === '=' && tokens[index + 1]?.kind === '{',
    ) + 1
  const paths = new Set<string>()

  function parseValue(path: string[]): void {
    if (tokens[position]?.kind === '{') {
      parseTable(path)
      return
    }
    if (path.length) paths.add(path.join('.'))
    position += 1
  }

  function parseTable(path: string[]): void {
    position += 1
    while (position < tokens.length && tokens[position].kind !== '}') {
      let key: string | null = null
      if (
        tokens[position].kind === 'word' &&
        tokens[position + 1]?.kind === '='
      ) {
        key = tokens[position].value
        position += 2
      } else if (
        tokens[position].kind === '[' &&
        tokens[position + 1]?.kind === 'string' &&
        tokens[position + 2]?.kind === ']' &&
        tokens[position + 3]?.kind === '='
      ) {
        key = tokens[position + 1].value
        position += 4
      }
      parseValue(key === null ? [] : [...path, key])
      while (tokens[position]?.kind === ',' || tokens[position]?.kind === ';') {
        position += 1
      }
    }
    position += 1
  }

  parseTable([])
  return paths
}

function collectDefaultLocalePaths(source: string): Set<string> {
  const ast = ts.createSourceFile(
    'phone.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const declarations = new Map<string, ts.Expression>()
  const registerDeclarations = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      declarations.set(node.name.text, node.initializer)
    }
    ts.forEachChild(node, registerDeclarations)
  }
  registerDeclarations(ast)

  const paths = new Set<string>()
  const collect = (node: ts.Expression, path: string[]): void => {
    if (
      ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node)
    ) {
      collect(node.expression, path)
      return
    }
    if (ts.isIdentifier(node) && declarations.has(node.text)) {
      collect(declarations.get(node.text)!, path)
      return
    }
    if (!ts.isObjectLiteralExpression(node)) {
      if (path.length) paths.add(path.join('.'))
      return
    }
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        collect(property.expression, path)
        continue
      }
      if (!ts.isPropertyAssignment(property)) continue
      const name = property.name
      const key =
        ts.isIdentifier(name) ||
        ts.isStringLiteral(name) ||
        ts.isNumericLiteral(name)
          ? name.text
          : null
      if (key !== null) collect(property.initializer, [...path, key])
    }
  }

  const defaultLocales = declarations.get('defaultLocales')
  expect(defaultLocales).toBeDefined()
  collect(defaultLocales!, [])
  return paths
}

function collectFrontendFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return entry.name === 'development' ? [] : collectFrontendFiles(path)
    }
    return /\.(?:ts|vue)$/.test(entry.name) && !entry.name.includes('.test.')
      ? [path]
      : []
  })
}

describe('phone locale contract', () => {
  const englishPaths = collectLuaLocalePaths(englishLocaleSource)

  it('keeps every bundled frontend fallback in en.lua', () => {
    const missing = [...collectDefaultLocalePaths(phoneStoreSource)].filter(
      (path) => !englishPaths.has(`Nui.${path}`),
    )

    expect(missing).toEqual([])
  })

  it('defines every static frontend translation key in en.lua', () => {
    const missing: string[] = []
    for (const file of collectFrontendFiles(frontendSourceDirectory)) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(
        /phone\.t\(\s*(['"])([^'"`]+)\1\s*[,)]/g,
      )) {
        if (!englishPaths.has(`Nui.${match[2]}`)) {
          missing.push(
            `${relative(frontendSourceDirectory, file)}: ${match[2]}`,
          )
        }
      }
    }

    expect(missing).toEqual([])
  })

  it('keeps the VaultX browser fallback complete for auth and transfers', () => {
    const fallbackPaths = collectDefaultLocalePaths(phoneStoreSource)

    for (const path of [
      'Apps.crypto.auth.network',
      'Apps.crypto.auth.confirmPassword',
      'Apps.crypto.quick.send',
      'Apps.crypto.transfer.walletKey',
      'Apps.crypto.profile.copyKey',
      'Apps.crypto.profile.shareKey',
      'Apps.crypto.activityTypes.transfer_in',
      'Apps.crypto.activityTypes.transfer_out',
      'Apps.crypto.errors.invalid_wallet_key',
    ]) {
      expect(fallbackPaths.has(path), path).toBe(true)
    }
  })

  it('keeps German structurally aligned with English', () => {
    const germanPaths = collectLuaLocalePaths(germanLocaleSource)

    expect([...germanPaths].sort()).toEqual([...englishPaths].sort())
  })
})
