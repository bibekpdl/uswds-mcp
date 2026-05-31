# AI Tool and IDE Setup

USWDS MCP is a standard stdio MCP server. Most MCP-compatible tools can run it with:

```sh
npx -y uswds-mcp
```

Use the examples below as starting points. Client configuration formats differ, so use the section that matches your tool.

## Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uswds": {
      "command": "npx",
      "args": ["-y", "uswds-mcp"]
    }
  }
}
```

Example file: [`examples/claude-desktop/claude_desktop_config.json`](../examples/claude-desktop/claude_desktop_config.json)

## Claude Code

Add the server with the Claude Code CLI:

```sh
claude mcp add --transport stdio uswds -- npx -y uswds-mcp
```

Project-scoped JSON can also use:

```json
{
  "mcpServers": {
    "uswds": {
      "command": "npx",
      "args": ["-y", "uswds-mcp"]
    }
  }
}
```

Example file: [`examples/claude-code/.mcp.json`](../examples/claude-code/.mcp.json)

## Cursor

For a project-local Cursor configuration, add this to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "uswds": {
      "command": "npx",
      "args": ["-y", "uswds-mcp"]
    }
  }
}
```

Example file: [`examples/cursor/mcp.json`](../examples/cursor/mcp.json)

## VS Code

VS Code MCP configuration uses `servers` instead of `mcpServers`. Add this to `.vscode/mcp.json` or your user MCP configuration:

```json
{
  "servers": {
    "uswds": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "uswds-mcp"]
    }
  }
}
```

Example file: [`examples/vscode/mcp.json`](../examples/vscode/mcp.json)

## Windsurf Cascade

Add this to `~/.codeium/windsurf/mcp_config.json` or through Windsurf Settings > Cascade > MCP Servers:

```json
{
  "mcpServers": {
    "uswds": {
      "command": "npx",
      "args": ["-y", "uswds-mcp"]
    }
  }
}
```

Example file: [`examples/windsurf/mcp_config.json`](../examples/windsurf/mcp_config.json)

## Generic MCP Clients

For clients that accept a stdio command directly:

```json
{
  "name": "uswds",
  "transport": {
    "type": "stdio",
    "command": "npx",
    "args": ["-y", "uswds-mcp"]
  }
}
```

Example file: [`examples/generic/stdio-server.json`](../examples/generic/stdio-server.json)

## First Prompt

After installing, try:

```text
Use the USWDS MCP server to design a task-focused federal service page for applying for a permit. Search relevant USWDS components and patterns first, generate USWDS HTML, and validate the markup before finalizing.
```

For framework integration work, ask for both the recipe and setup validation:

```text
Use the USWDS MCP server to integrate USWDS into a Next.js App Router project without a CDN. Get the integration recipe first, inspect package.json and app layout files, validate the project setup, then implement with official USWDS markup.
```

Useful tool sequence:

```text
get_uswds_integration_recipe -> search_uswds/get_component -> validate_uswds_project_setup -> validate_uswds_markup
```

For npm/bundler projects, the public CSS import path is:

```ts
import "@uswds/uswds/css/uswds.min.css";
```

Avoid the internal `@uswds/uswds/dist/css/uswds.min.css` import path in generated guidance and project code.

## Troubleshooting

- If the client cannot find `npx`, install Node.js or use an absolute path to `npx`.
- If tools return an empty-index error, reinstall the package or run `npm run ingest` from a source checkout.
- If a tool lists no MCP tools, restart the client after editing its MCP configuration.
- If your organization manages MCP allowlists, use the server ID `uswds` and package command `npx -y uswds-mcp`.
