# MCP Tools

This server is intentionally non-destructive. It provides structured USWDS knowledge, generation guidance, and validation checks, but it does not clone starter apps, edit project files, install packages, or run shell commands inside a user's project.

## Documentation Tools

| Tool | Use |
| --- | --- |
| `search_uswds` | Search the bundled USWDS index for components, patterns, templates, utilities, tokens, settings, packages, accessibility tests, and implementation references. |
| `get_component` | Retrieve structured guidance for a USWDS component. |
| `get_pattern` | Retrieve structured guidance for a USWDS design pattern or workflow. |
| `get_template` | Retrieve structured guidance for a USWDS page template. |

## Markup Tools (start here)

| Tool | Use |
| --- | --- |
| `get_component_markup` | Official HTML for a component or page template. Args: `component` (omit to list all), `variant`, `all_variants`, `asset_path`. Keep the structure, classes and ARIA wiring; change only text, hrefs and ids that must be unique. |
| `find_uswds_classes` | Look up real class names, including utilities and responsive prefixes. Args: `query`, `limit`. |
| `compose_uswds_page` | Build a complete page from sections (`hero`, `content`, `alert`, `summary_box`, `card_group`, `process_list`, `step_indicator`, `accordion`, `table`, `form`, `contact`). Returns `html`, `placeholders`, and `validation`. |

## Planning and Generation Tools

| Tool | Use |
| --- | --- |
| `recommend_uswds_structure` | Recommend a USWDS-first structure for a site or service workflow. |
| `generate_uswds_page` | Quick start: infers sections from free text, returns validated HTML, an editable `spec`, bracketed `placeholders`, and notes. Prefer `compose_uswds_page` when you have real content. |
| `get_uswds_integration_recipe` | Get framework-specific setup guidance for package installation, CSS, JavaScript, assets, component strategy, and migration. |

## Validation Tools

| Tool | Use |
| --- | --- |
| `validate_uswds_markup` | Validate HTML (fragment or full page) against real USWDS class names, component structure, forms, ARIA wiring and accessibility basics. Findings include selector, snippet, suggestion, component and docs link. Args: `html`, `mode` (`auto`/`document`/`fragment`). |
| `validate_uswds_project_setup` | Check provided project files for common setup risks such as wrong CSS imports, missing USWDS scripts, CDN usage, copied `dist` assets, and global CSS migration impact. |

## Recommended Sequences

For a new service page:

```text
recommend_uswds_structure -> get_component_markup (per component) -> compose_uswds_page -> validate_uswds_markup (repeat until no errors)
```

For framework integration:

```text
get_uswds_integration_recipe -> validate_uswds_project_setup -> search_uswds/get_component -> validate_uswds_markup
```

For React adapter projects:

```text
get_uswds_integration_recipe -> validate_uswds_project_setup -> verify official USWDS guidance -> validate final rendered markup
```

React component libraries can be useful adapters when a project wants typed component APIs and a Storybook-oriented workflow. They should remain adapters around USWDS, not replacements for official USWDS guidance or project-specific accessibility testing.
