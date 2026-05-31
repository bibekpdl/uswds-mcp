# MCP Tools

This server is intentionally non-destructive. It provides structured USWDS knowledge, generation guidance, and validation checks, but it does not clone starter apps, edit project files, install packages, or run shell commands inside a user's project.

## Documentation Tools

| Tool | Use |
| --- | --- |
| `search_uswds` | Search the bundled USWDS index for components, patterns, templates, utilities, tokens, settings, packages, accessibility tests, and implementation references. |
| `get_component` | Retrieve structured guidance for a USWDS component. |
| `get_pattern` | Retrieve structured guidance for a USWDS design pattern or workflow. |
| `get_template` | Retrieve structured guidance for a USWDS page template. |

## Planning and Generation Tools

| Tool | Use |
| --- | --- |
| `recommend_uswds_structure` | Recommend a USWDS-first structure for a site or service workflow. |
| `generate_uswds_page` | Generate framework-neutral USWDS HTML with implementation notes. |
| `get_uswds_integration_recipe` | Get framework-specific setup guidance for package installation, CSS, JavaScript, assets, component strategy, and migration. |

## Validation Tools

| Tool | Use |
| --- | --- |
| `validate_uswds_markup` | Check HTML for common USWDS markup, accessibility, and token drift issues. |
| `validate_uswds_project_setup` | Check provided project files for common setup risks such as wrong CSS imports, missing USWDS scripts, CDN usage, copied `dist` assets, and global CSS migration impact. |

## Recommended Sequences

For a new service page:

```text
search_uswds -> get_template/get_pattern/get_component -> recommend_uswds_structure -> generate_uswds_page -> validate_uswds_markup
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
