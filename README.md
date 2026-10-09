# uswds-mcp

**Make AI-generated government UI actually USWDS-compliant.**

An MCP server that gives Claude, Cursor, Copilot, Windsurf and any other MCP client the **official [U.S. Web Design System](https://designsystem.digital.gov/) markup**, a **validator that knows every real USWDS class**, and a **page composer** that outputs accessible, validated pages.

> Unofficial and independent. Not affiliated with, endorsed by, or maintained by GSA, TTS, or the official USWDS team. See [NOTICE.md](./NOTICE.md).

## The problem

LLMs write USWDS from memory. They invent `usa-btn`, forget the `usa-overlay` that makes the mobile menu work, put `usa-card` markup without its container, and wire up accordions to nothing. The result *looks* plausible and is subtly broken.

`uswds-mcp` closes that loop:

```text
recommend_uswds_structure  →  get_component_markup  →  compose_uswds_page  →  validate_uswds_markup
        (what to use)          (official HTML)         (accessible page)       (fix until 0 errors)
```

| Without | With uswds-mcp |
| --- | --- |
| Class names recalled from memory | Official HTML rendered from the `@uswds/uswds` templates (178 snippets, ~70 components and page templates, every variant) |
| "Looks right" | Validator rejects any `usa-*` class that is not in the USWDS stylesheet, with a did-you-mean |
| Missing structure goes unnoticed | BEM, required children, ARIA wiring, form control structure, header overlay, scripts, heading order, duplicate ids, link/image/button names |
| Stock template output | `compose_uswds_page` builds pages from your real sections; zero axe-core violations in CI |

### What a validator finding looks like

```jsonc
{
  "severity": "error",
  "rule": "unknown-class",
  "message": "\"usa-alrt\" is not a class defined by USWDS.",
  "selector": "div.usa-alrt",
  "snippet": "<div class=\"usa-alrt usa-alert--eror\">",
  "suggestion": "Did you mean \"usa-alert\"?"
}
```

Findings carry the offending element, a fix suggestion, the component to look up, and a docs link, so the model can repair its own output.

## Quick start

```sh
npx -y uswds-mcp
```

Add it to your MCP client:

```json
{
  "mcpServers": {
    "uswds": { "command": "npx", "args": ["-y", "uswds-mcp"] }
  }
}
```

Claude Code: `claude mcp add uswds -- npx -y uswds-mcp`

Setup for Claude Desktop, Cursor, VS Code, Windsurf and others: [docs/CLIENTS.md](./docs/CLIENTS.md). Ready-made configs are in [examples/](./examples).

No network, API key, or ingest step needed: the data ships in the package.

## Tools

| Tool | Use |
| --- | --- |
| `get_component_markup` | **Official HTML** for a component/page template and its variants (`accordion`, `footer` + `slim`, `sign-in`, ...). Understands everyday names (`dropdown` → select). |
| `compose_uswds_page` | Build a full page from structured sections: hero, content, alert, summary box, cards, process list, step indicator, accordion, table, form, contact. |
| `validate_uswds_markup` | Validate fragments or full pages: real class names, component structure, forms, ARIA, accessibility basics. |
| `find_uswds_classes` | Look up real classes, including utilities and responsive variants (`margin top 2`, `tablet grid col 6`). |
| `generate_uswds_page` | Quick start from free-text requirements; returns an editable section spec, bracketed placeholders, and its own validation. |
| `recommend_uswds_structure` | USWDS-first structure for a service or page. |
| `search_uswds` | Search docs, accessibility and usage guidance (with synonym expansion). |
| `get_component` / `get_pattern` / `get_template` | Structured guidance, plus the canonical markup for components. |
| `get_uswds_integration_recipe` | Framework setup for Next.js, Vite/React, static HTML, Rails, Drupal. |
| `validate_uswds_project_setup` | Catch wrong CSS import paths, missing scripts, CDN use, copied `dist`, global CSS risk. |

All tools are read-only. See [docs/TOOLS.md](./docs/TOOLS.md) for arguments and recommended sequences.

**Resources:** `uswds://component/{slug}`, `uswds://pattern/{slug}`, `uswds://template/{slug}`, `uswds://token/{category}`, `uswds://package/{name}`
**Prompts:** `build_agency_website`, `build_service_page`, `audit_uswds_page`, `convert_page_to_uswds`, `integrate_uswds_in_project`

## Example

> *"Build a page where residents renew a fishing permit: eligibility, fees table, steps, FAQ, contact."*

The model calls `compose_uswds_page` and gets back a complete page with banner, skipnav, header (with `usa-overlay`), breadcrumbs, summary box, striped table with caption and scoped headers, process list, accordion, contact details, slim footer and identifier, plus a list of the `placeholders` that still need real content, and a validation result.

Prefer to see it first? Run the scorecard:

```sh
npm run eval
```

```text
scenario                        unknown classes  errors  warnings  axe violations
'Apply for housing assistance'  0                0       0         0
'Renew a fishing permit'        0                0       0         0
...
```

## Does it help?

In a small test (5 tasks, same model, with and without the server) pages built with `uswds-mcp` had **0 validator errors on 5 of 5 pages, versus 1 of 5 without it**. The model did not invent class names in either case; what it missed without the tools was structure, such as the header overlay that makes the mobile menu work, banner internals, and accordion button types. It is a small, single-run sample, so see the caveats and method in [docs/COMPARISON.md](./docs/COMPARISON.md).

## How it works

1. **Ingest** (`npm run ingest`): renders every official `@uswds/uswds` twig template with its JSON fixtures into canonical HTML, extracts all class names from the official stylesheet, and indexes the official docs ([`uswds-site`](https://github.com/uswds/uswds-site)).
2. **Validate against ground truth**: the validator is tested against *every* official snippet (they must pass) and against a corpus of 30 typical LLM mistakes (they must be caught).
3. **Stay current**: docs and markup come from the same USWDS version (enforced by a test), and a monthly workflow re-ingests and opens a PR.

Current data: USWDS 3.14.0.

## Limits

- Static analysis. It cannot judge color contrast, reading order on rendered pages, or real screen-reader behavior. USWDS components do not by themselves make a site Section 508 compliant; keep testing with axe, keyboard and screen readers.
- Custom (non-`usa-`) classes are allowed and not validated.
- Upstream fixture text in angle brackets (e.g. `<Project title>`) is placeholder content.

## Develop

```sh
npm install
npm test         # unit, self-consistency over official markup, MCP end-to-end, axe-core
npm run eval
npm run ingest   # refresh from upstream
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) and the [CHANGELOG](./CHANGELOG.md).

## License

MIT. See [NOTICE.md](./NOTICE.md) for USWDS attribution and the licensing notes for indexed USWDS material.
