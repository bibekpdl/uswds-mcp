---
name: uswds
description: Build, audit, or convert websites with the U.S. Web Design System (USWDS) using the unofficial uswds-mcp server. Use when work involves USWDS components, patterns, templates, accessibility guidance, design tokens, utilities, @uswds/uswds, or federal website implementation.
---

# USWDS

Use this skill when creating, auditing, or converting websites with the U.S. Web Design System. `uswds-mcp` is an unofficial independent MCP server; do not imply GSA, TTS, or the official USWDS team endorses the output.

## Workflow

1. Verify the MCP server `io.github.bibekpdl/uswds-mcp` is available by calling `find_uswds_classes` with a small query such as `usa-button`.
2. Decide structure: `recommend_uswds_structure`, and prefer official templates and patterns (`get_template`, `get_pattern`) before composing individual components.
3. **Never write `usa-*` markup from memory.** For every component you use, call `get_component_markup` and keep its DOM structure, class names, ids and ARIA wiring. Change only text, hrefs and ids that must be unique. Use `find_uswds_classes` for utilities (`margin top 2`, `tablet grid col 6`).
4. For whole pages call `compose_uswds_page` with real content in explicit sections. Use `generate_uswds_page` only as a quick start, and replace every `[bracketed]` placeholder.
5. For framework work, call `get_uswds_integration_recipe` before writing code; adapt to React, Next.js, Angular, Rails, Drupal only after preserving the documented DOM shape, classes, ARIA, ids and data attributes.
6. Run `validate_uswds_markup` and **fix every error** (and explain any remaining warning) before finalizing. Re-run until `passed` is true. Validate project setup with `validate_uswds_project_setup`.

## MCP Tools

- `get_component_markup`: official HTML for a component/page template and its variants.
- `compose_uswds_page`: complete accessible page from structured sections.
- `find_uswds_classes`: real USWDS class names, including utilities.
- `validate_uswds_markup`: real-class, structure, forms, ARIA and accessibility validation (fragment or page).
- `generate_uswds_page`: quick-start page from free-text requirements.
- `recommend_uswds_structure`: USWDS-first site or page structure.
- `search_uswds`: search docs, accessibility and usage guidance.
- `get_component` / `get_pattern` / `get_template`: structured guidance (components include canonical markup).
- `get_uswds_integration_recipe`: framework-specific setup for CSS, JavaScript, assets and migration.
- `validate_uswds_project_setup`: import path, asset, script, CDN and global CSS risks.

## Implementation Rules

- Use `@uswds/uswds` for Node/npm projects unless the user’s stack requires another distribution.
- For npm/bundler projects, import CSS from `@uswds/uswds/css/uswds.min.css`; do not use the internal `@uswds/uswds/dist/css/uswds.min.css` path.
- In Next.js App Router, put the USWDS CSS import in a layout and check whether that global CSS affects unrelated routes during progressive migration.
- Use local/approved assets for production when the user asks for no-CDN. Copy only the needed USWDS images, icons, fonts, and scripts; do not vendor the full `dist` directory by default.
- Load `uswds-init.min.js` and `uswds.min.js` for interactive components such as banner, accordion, modal, navigation, tooltip, date picker, combo box, and file input.
- Treat third-party framework implementations as optional adapters, not the source of truth.
- React component libraries can be useful adapters when the project intentionally chooses them, but still verify official USWDS guidance and validate the final rendered markup.
- Prefer USWDS design tokens, Sass settings, and utilities over custom CSS.
- Custom CSS is acceptable for application-specific layout and integration gaps, but keep it small, documented, and subordinate to USWDS tokens/utilities.
- Use skipnav, official banner, semantic `main`, clear headings, and footer patterns for public federal sites unless project context says otherwise.
- For forms, use labels for all controls, fieldset/legend for grouped questions, required/optional labeling guidance, and validation/alert patterns.
- Do not claim Section 508 compliance from component usage alone; USWDS guidance still requires project-specific accessibility testing.

## Framework Decision Rules

- Next.js or React: use official USWDS HTML/classes as the source, convert `class` to `className`, and create small local components such as `GovBanner`, `FederalHeader`, `FederalFooter`, and form sections.
- Static HTML: use local USWDS CSS/JS/assets from the npm package or official release artifact and keep snippets close to the official examples.
- Rails or Drupal: preserve official USWDS DOM in partials, ViewComponents, or Twig templates, with assets managed by the framework’s asset pipeline/theme library.
- Existing Tailwind or custom design system: treat USWDS as a migration boundary, test global CSS effects, and migrate one workflow at a time.

## Output Expectations

- Cite which USWDS components, patterns, templates, or tokens informed the implementation.
- Keep generated pages task-focused and content-led.
- Avoid generic SaaS visual language when building government services.
- Surface accessibility caveats and remaining validation steps clearly.
- Do not finalize generated markup until `validate_uswds_markup` returns `passed: true`; if warnings remain, explain why they are acceptable or what the user should fix.
- For framework implementations, include the package import path, asset strategy, and JavaScript loading strategy in the final notes.
