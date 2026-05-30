import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseSiteRecords } from "./parser.js";

describe("parseSiteRecords", () => {
  it("extracts component guidance, package metadata, variants, and updates", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "uswds-site-"));
    const componentDir = path.join(root, "_components", "accordion");
    await mkdir(componentDir, { recursive: true });
    await writeFile(
      path.join(componentDir, "index.md"),
      `---
title: Accordion
slug: accordion
description: Hide and reveal related content.
---

### When to use the accordion component

- If users need a few specific pieces of content.

### Accessibility guidance

- Code header areas as buttons.

### Accordion variants

Variant | Description
--- | ---
\`.usa-accordion--bordered\` | Display a border.

## Package

- Package usage: \`@forward "usa-accordion";\`
- Dependencies: \`uswds-fonts\`, \`usa-icon\`

## Latest updates

Date | USWDS version | Affects | Breaking | Description
--- | --- | --- | --- | ---
2022-08-05 | 3.1.0 | Markup | Yes | Added type button.
`
    );

    const records = await parseSiteRecords(root);
    expect(records).toHaveLength(1);
    expect(records[0].type).toBe("component");
    expect(records[0].whenToUse).toContain("If users need a few specific pieces of content.");
    expect(records[0].accessibilityGuidance).toContain("Code header areas as buttons.");
    expect(records[0].package?.usage).toBe('@forward "usa-accordion";');
    expect(records[0].package?.dependencies).toContain("usa-icon");
  });
});
