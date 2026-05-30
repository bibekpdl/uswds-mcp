# USWDS MCP Server

USWDS MCP is a local stdio [Model Context Protocol](https://modelcontextprotocol.io/) server for the [U.S. Web Design System](https://designsystem.digital.gov/). It gives AI coding tools and IDEs structured access to USWDS components, design patterns, page templates, packages, design tokens, and accessibility guidance for building standards-based government websites.

The package includes a prebuilt USWDS index generated from:

- [`uswds/uswds-site`](https://github.com/uswds/uswds-site)
- [`uswds/uswds`](https://github.com/uswds/uswds)

USWDS is an official project of the U.S. General Services Administration (GSA), Technology Transformation Services (TTS). This MCP server is an independent tool and is not affiliated with, endorsed by, or sponsored by GSA, TTS, or the official USWDS team.

## Features

- Search USWDS documentation and implementation records.
- Retrieve structured component, pattern, template, token, and package records.
- Recommend USWDS page and service structures.
- Generate framework-neutral USWDS HTML with framework adaptation notes.
- Validate common USWDS markup, accessibility, and token-usage issues.
- Include a Codex Skill at `.agents/skills/uswds/SKILL.md` for agent workflow guidance.

## Installation

```sh
npm install
npm run build
```

The published package includes `data/records.json`, so documentation-backed tools work without running an ingest step. To refresh the bundled index from upstream USWDS repositories:

```sh
npm run ingest
```

## MCP Configuration

Use the package with an MCP client that supports stdio servers:

```json
{
  "mcpServers": {
    "uswds": {
      "command": "npx",
      "args": ["uswds-mcp"]
    }
  }
}
```

Registry name:

```text
io.github.bibekpdl/uswds-mcp
```

## AI Tool and IDE Setup

USWDS MCP uses the standard stdio MCP transport and can be used by MCP-compatible AI tools and IDEs. See [docs/CLIENTS.md](./docs/CLIENTS.md) for examples covering:

- Claude Desktop
- Claude Code
- Cursor
- VS Code with GitHub Copilot MCP support
- Windsurf Cascade
- Generic MCP clients

Example configs are also available in [examples/](./examples).

## Development

```sh
npm run typecheck
npm test
npm run build
npm run dev
```

## Tools

- `search_uswds`
- `get_component`
- `get_pattern`
- `get_template`
- `recommend_uswds_structure`
- `generate_uswds_page`
- `validate_uswds_markup`

## Resources

- `uswds://component/{slug}`
- `uswds://pattern/{slug}`
- `uswds://template/{slug}`
- `uswds://token/{category}`
- `uswds://package/{name}`

## Prompts

- `build_agency_website`
- `build_service_page`
- `audit_uswds_page`
- `convert_page_to_uswds`

## License

MIT

See [NOTICE.md](./NOTICE.md) for USWDS attribution, upstream source links, and licensing notes for indexed USWDS material.
