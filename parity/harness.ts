import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Parity harness. A fixture file is `{ [functionName]: Case[] }` where each
 * case is `{ name, input, expected }`. In normal mode the fixture on disk is
 * the contract: every case is asserted against src/lib. With
 * `UPDATE_FIXTURES=1` the expected values are recomputed from src/lib for the
 * cases declared in code and the file is rewritten (npm run parity:update).
 */
export interface ParityCase<I = Record<string, unknown>, E = unknown> {
  name: string
  input: I
  expected: E
}

export type CaseSpec<I> = { name: string; input: I }
export type Impl<I, E> = (input: I) => E

const FIXTURES_DIR = join(__dirname, 'fixtures')
const UPDATE = process.env.UPDATE_FIXTURES === '1'

function fixturePath(module: string): string {
  return join(FIXTURES_DIR, `${module}.json`)
}

/**
 * Declare a parity module: `functions` maps each function name to its input
 * cases and the src/lib implementation that computes the expected value.
 */
export function parityModule(
  module: string,
  functions: Record<string, { cases: CaseSpec<any>[]; impl: Impl<any, any> }>
): void {
  const path = fixturePath(module)

  if (UPDATE) {
    const out: Record<string, ParityCase[]> = {}
    for (const [fn, { cases, impl }] of Object.entries(functions)) {
      out[fn] = cases.map((c) => ({ name: c.name, input: c.input, expected: impl(c.input) }))
    }
    writeFileSync(path, JSON.stringify(out, null, 2) + '\n')
  }

  describe(`parity: ${module}`, () => {
    it('fixture file exists (run npm run parity:update)', () => {
      expect(existsSync(path)).toBe(true)
    })
    if (!existsSync(path)) return
    const fixture = JSON.parse(readFileSync(path, 'utf8')) as Record<string, ParityCase[]>

    it('fixture covers exactly the functions and cases declared in code', () => {
      expect(Object.keys(fixture).sort()).toEqual(Object.keys(functions).sort())
      for (const [fn, { cases }] of Object.entries(functions)) {
        expect(fixture[fn].map((c) => c.name)).toEqual(cases.map((c) => c.name))
      }
    })

    for (const [fn, { impl }] of Object.entries(functions)) {
      describe(fn, () => {
        for (const c of fixture[fn] ?? []) {
          it(c.name, () => {
            expect(impl(c.input)).toEqual(c.expected)
          })
        }
      })
    }
  })
}
