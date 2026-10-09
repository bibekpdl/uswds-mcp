# Contributing

Thanks for helping make USWDS output better. The project's one rule: **the official USWDS markup is the ground truth.**

## Setup

```sh
npm install
npm test            # unit, self-consistency, MCP end-to-end, axe-core
npm run eval        # scorecard of generated pages
```

## Where things live

| Path | What |
| --- | --- |
| `src/ingest/markup.ts` | Renders the official twig templates + JSON fixtures into canonical HTML |
| `src/ingest/indexer.ts` | Builds `data/` (docs records, `markup.json`, `classes.json`) |
| `src/validator.ts` | Rule engine behind `validate_uswds_markup` |
| `src/composer.ts` | Section builders behind `compose_uswds_page` |
| `src/foundations.ts` | Hand-curated form/layout snippets not shipped as twig upstream |
| `src/eval/` | Regression corpus of LLM mistakes + scorecard |

## Adding or changing a validator rule

1. Add the rule in `src/validator.ts` with a stable `rule` id and, when relevant, `component` so findings link to the docs.
2. Add a failing example to `src/eval/mistakes.test.ts`.
3. Run `npm test`. `canonical.test.ts` validates **every official USWDS snippet**; if it fails, your rule is too strict for real USWDS markup. Loosen the rule rather than adding a snippet exception, unless the upstream fixture is genuinely a demo artifact (document why in `fixtureQuirks`).

## Adding a composer section

Add the zod schema and builder in `src/composer.ts`, include it in `composer.test.ts`'s `everything` page, and make sure the validator and axe-core tests stay clean.

## Refreshing USWDS data

```sh
npm install @uswds/uswds@latest
npm run ingest          # use `npm run ingest:offline` to reuse cached sources
npm test
```

A monthly workflow does this automatically and opens a PR.

## Style

TypeScript, ESM, no extra runtime dependencies without discussion. Keep the package non-destructive: tools return information, they never modify the user's project.
