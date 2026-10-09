# Changelog

## 0.2.0

Focus: make AI-generated output actually USWDS-compliant by grounding it in the official markup.

### Added
- **`get_component_markup`**: canonical HTML for ~70 components and page templates, rendered from the official `@uswds/uswds` twig templates and JSON fixtures (178 snippets, all variants), plus curated form/layout primitives.
- **`compose_uswds_page`**: build a complete page from structured sections (hero, content, alert, summary box, cards, process list, step indicator, accordion, table, form, contact). Output mirrors official markup, uses a consistent heading outline, and validates itself.
- **`find_uswds_classes`**: look up real class names including utilities and responsive variants.
- Class whitelist (`data/classes.json`, ~5.4k classes) extracted from the USWDS stylesheet; `validate_uswds_markup` rejects invented `usa-*` classes with did-you-mean suggestions.
- `get_component` now includes the canonical default markup.
- Search synonyms (dropdown → select/combo box, toast → alert, wizard → step indicator, ...).
- Tool annotations (`readOnlyHint`) on every tool.
- `npm run eval` scorecard and a regression corpus of 30 typical LLM mistakes.
- CI, monthly data-refresh workflow, issue templates, CONTRIBUTING.

### Changed
- **Validator rewritten** as a rule engine: fragment-aware, BEM structure, required component children, ARIA reference integrity, forms (radio/checkbox/select/textarea structure), tables, modals, cards, headers (overlay), document-level rules (lang, title, main, scripts), heading order, duplicate ids, link/image/button names. Findings now include selector, offending snippet, canonical component and docs link.
- `generate_uswds_page` now honours the requested content instead of collapsing to a stock form, returns an editable section spec, lists placeholders, and self-validates. Fixed missing `usa-overlay`, dangling anchors, inconsistent asset paths, and a "renew" → form misclassification.
- Asset paths are consistent (`/uswds/{css,js,img,fonts}`, overridable with `asset_path`).
- Bumped `@uswds/uswds` to 3.14; docs and markup now come from the same version (enforced by a test).
- Server version is read from `package.json`.

### Fixed
- Validator false positives: skipnav/banner warnings on every fragment; `<input type="submit">` and wrapped labels flagged as unlabeled.
