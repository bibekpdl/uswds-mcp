---
title: Accordion
slug: accordion
description: An accordion is a list of headers that hide or reveal additional content when selected.
---

## Guidance

### When to use the accordion component

- If users will only need a few specific pieces of content within a page.
- If you have only a small space to display a lot of content.

### When to consider something else

- If users need to see most or all of the information on a page.

### Accessibility guidance

- Code header areas in the accordion as buttons.
- Use `aria-controls` to associate an accordion button with its related content.

### Accordion variants

Variant | Description
--- | ---
`.usa-accordion--bordered` | Display a border around accordion content.

## Package

- Package usage: `@forward "usa-accordion";`
- Dependencies: `uswds-fonts`, `usa-icon`

## Latest updates

Date | USWDS version | Affects | Breaking | Description
--- | --- | --- | --- | ---
2022-08-05 | 3.1.0 | Markup | Yes | Added `type="button"` to all non-form buttons.
