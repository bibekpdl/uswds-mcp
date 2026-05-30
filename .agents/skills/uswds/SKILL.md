---
name: uswds
description: Build, audit, or convert websites with the U.S. Web Design System (USWDS) using the unofficial uswds-mcp server. Use when work involves USWDS components, patterns, templates, accessibility guidance, design tokens, utilities, @uswds/uswds, or federal website implementation.
---

# USWDS

Use this Skill when creating, auditing, or converting websites with the U.S. Web Design System. `uswds-mcp` is an unofficial independent MCP server; do not imply GSA, TTS, or the official USWDS team endorses the output.

## Workflow

1. Verify the MCP server `io.github.bibekpdl/uswds-mcp` is available by calling `search_uswds` with a small query such as `button`.
2. If tools return an empty-index error, tell the user to run `npm run ingest` in the package checkout or reinstall a package that includes `data/records.json`.
3. Query the USWDS MCP before choosing UI patterns.
4. Prefer official templates and patterns before composing individual components.
5. Use official USWDS HTML structure and classes as the canonical output.
6. Adapt to React, Next.js, Angular, Rails, Drupal, or other frameworks only after preserving the documented USWDS DOM shape, classes, ARIA, ids, and data attributes.
7. Validate generated markup with `validate_uswds_markup` before finalizing.

## MCP Tools

- `search_uswds`: Search components, patterns, templates, utilities, tokens, settings, packages, and accessibility guidance.
- `get_component`: Load full component guidance before using a component.
- `get_pattern`: Load pattern guidance for workflows such as forms, authentication, language selection, and navigation.
- `get_template`: Load page/template guidance for common layouts.
- `recommend_uswds_structure`: Get a USWDS-first site or page structure.
- `generate_uswds_page`: Generate framework-neutral USWDS HTML and adaptation notes.
- `validate_uswds_markup`: Check markup for common USWDS structure, accessibility, and token drift issues.

## Implementation Rules

- Use `@uswds/uswds` for Node/npm projects unless the user’s stack requires another distribution.
- Treat third-party framework implementations as optional adapters, not the source of truth.
- Prefer USWDS design tokens, Sass settings, and utilities over custom CSS.
- Use skipnav, official banner, semantic `main`, clear headings, and footer patterns for public federal sites unless project context says otherwise.
- For forms, use labels for all controls, fieldset/legend for grouped questions, required/optional labeling guidance, and validation/alert patterns.
- Do not claim Section 508 compliance from component usage alone; USWDS guidance still requires project-specific accessibility testing.

## Output Expectations

- Cite which USWDS components, patterns, templates, or tokens informed the implementation.
- Keep generated pages task-focused and content-led.
- Avoid generic SaaS visual language when building government services.
- Surface accessibility caveats and remaining validation steps clearly.
- Do not finalize generated markup until the MCP validator reports no errors; if warnings remain, explain why they are acceptable or what the user should fix.
