# Parity fixtures

These fixtures let the TypeScript domain logic in `src/lib/` and the native
`MoneyCore` Swift package (see `docs/NATIVE_APP_PLAN.md`) be tested against
the exact same cases, so the two implementations are checked for agreement
rather than just each being individually "correct".

## Shape

- One JSON file per `MoneyCore` module, e.g. `money.json`, `dates.json`.
- Each file is an object keyed by function name, where each value is an
  array of cases:

  ```json
  {
    "formatCents": [
      { "name": "150 cents, en", "input": { "lang": "en", "cents": 150 }, "expected": "€1.50" }
    ]
  }
  ```

  - `name`: short human-readable description of the case, used as the test name.
  - `input`: the arguments to the function under test, as a JSON object.
  - `expected`: the value the function must return, as JSON.

  Cases for a formatting function carry a `lang` field (`"en"` / `"it"`)
  alongside the function's numeric input, since the TypeScript oracle needs
  `setActiveLanguage` set before calling into `src/lib/`. On the Swift side
  there is no active-language global: `MoneyCoreTests` decodes `lang` into a
  `Language` value and passes it explicitly to the corresponding `MoneyCore`
  function.

- A fixture file is generated only deliberately, by `npm run parity:update`
  (`UPDATE_FIXTURES=1 vitest run parity`) from the cases declared in the
  matching `parity/<module>.test.ts` file — never hand-edited. Hand-editing
  would let the two implementations silently drift out of sync with whatever
  the generator would have produced.
- The TypeScript side is the oracle: `parity/<module>.test.ts` files import
  the real implementation from `src/lib/`, declare cases via
  `parityModule(...)` (see `parity/harness.ts`), and `npm test` asserts the
  live implementation against the fixture on disk.
- The Swift side (`MoneyCoreTests`) reads the same JSON file from disk (via
  `Fixtures.load`, see `MoneyCore/Tests/MoneyCoreTests/Fixtures.swift`) and
  asserts the same values with `swift test`, so both implementations are
  pinned to one shared source of truth.
