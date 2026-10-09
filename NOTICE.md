# Notices and Attribution

`uswds-mcp` indexes and summarizes public materials from the official U.S. Web Design System (USWDS).

## Official USWDS Sources

- USWDS website: https://designsystem.digital.gov/
- USWDS documentation repository: https://github.com/uswds/uswds-site
- USWDS source repository: https://github.com/uswds/uswds
- USWDS npm package: https://www.npmjs.com/package/@uswds/uswds

For authoritative guidance, use the official USWDS website and source repositories listed above.

USWDS is a project of the U.S. General Services Administration (GSA), Technology Transformation Services (TTS).

## Independence

`uswds-mcp` is an independent open source project. It is not affiliated with, endorsed by, sponsored by, or maintained by GSA, TTS, or the official USWDS team.

## Indexed Source Snapshot

The packaged USWDS data (`data/records.json` documentation records, `data/markup.json` canonical HTML rendered from the official `@uswds/uswds` twig templates and fixtures, and `data/classes.json` class names extracted from the official stylesheet) was generated from the source repositories and commits recorded in `data/manifest.json`.

At the time of the current packaged index:

- `uswds-site`: `69c76d6c85b3c8c322dc38e4613e43451a34a06a`
- `uswds`: `ec801339fa287d26ef0e1b3a19291eeaa0b3b634`
- USWDS version: `3.14.0`

Run `npm run ingest` to regenerate the local index from upstream sources.

## Upstream Licensing

USWDS source and documentation include public domain material and third-party open source material. Refer to the official upstream repositories for complete attribution and licensing information:

- https://github.com/uswds/uswds
- https://github.com/uswds/uswds-site

This project's own source code is licensed under the MIT License. The MIT License for this project does not alter the licensing, attribution, or notice requirements of upstream USWDS material or third-party dependencies.
