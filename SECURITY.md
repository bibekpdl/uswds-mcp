# Security Policy

## Supported versions

Only the latest published version of `uswds-mcp` receives security fixes. Upgrade to the newest release before reporting.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through [GitHub Security Advisories](https://github.com/bibekpdl/uswds-mcp/security/advisories/new). Include:

- the affected version and how you run the server (client, transport, Node.js version)
- steps to reproduce, or a proof of concept
- the impact you expect

You should get an acknowledgement within 5 business days. Confirmed issues are fixed in a new release and disclosed in a GitHub Security Advisory, crediting the reporter unless they prefer otherwise.

## Scope

`uswds-mcp` is a read-only stdio MCP server: its tools return information and never modify the user's project. In scope:

- the server code in `src/` and the published npm package
- vulnerable dependencies that are reachable from the published package

Out of scope: the upstream USWDS project (report those to [uswds/uswds](https://github.com/uswds/uswds/security)) and the content of AI-generated code produced by clients using this server.

## Supply chain

Releases are published from GitHub Actions with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), so each version on npm can be traced to the commit and workflow that built it. Dependencies are monitored by Dependabot and `npm audit` runs in CI.
