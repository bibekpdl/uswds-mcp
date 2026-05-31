# USWDS Integration Notes

Use USWDS as the source of truth for markup, classes, assets, and accessibility behavior. Framework components should wrap official USWDS structure, not replace it with custom approximations.

## Next.js App Router

Install the official package:

```sh
npm install @uswds/uswds
```

Import CSS from the public package export path:

```tsx
import "@uswds/uswds/css/uswds.min.css";
```

Do not use:

```tsx
import "@uswds/uswds/dist/css/uswds.min.css";
```

For interactive components, serve USWDS JavaScript from the app or approved asset host and load it with `next/script`:

```tsx
<Script src="/uswds/js/uswds-init.min.js" strategy="beforeInteractive" />
<Script src="/uswds/js/uswds.min.js" strategy="afterInteractive" />
```

For progressive migration, check the effect of global USWDS CSS on non-USWDS routes. If the app allows route-specific layouts, prefer a USWDS route group layout for isolated adoption.

## React and Vite

Install `@uswds/uswds`, import CSS once from `@uswds/uswds/css/uswds.min.css`, and copy only the JavaScript and image assets required by the implemented components.

Convert HTML `class` attributes to `className`, but preserve the official DOM order, ids, ARIA attributes, and data attributes.

USWDS-based React component libraries can be useful when a project wants typed component APIs, reusable local composition, or Storybook-driven development. Treat those libraries as adapters. Keep official USWDS guidance as the source of truth, install/configure `@uswds/uswds` as required by the adapter, and validate the final rendered DOM.

## Static HTML

Use a local copy of USWDS CSS, JavaScript, fonts, and images from the official npm package or release artifact. Load `uswds-init.min.js` in the head and `uswds.min.js` before the closing body tag when interactive components are present.

## Rails and Drupal

Use partials, ViewComponents, or Twig templates to encapsulate official USWDS component markup. Keep assets managed through the framework's asset pipeline or theme library and document any copy step used to update USWDS.

## Asset Guidance

Do not copy the full USWDS `dist` directory by default. Copy only assets required by the implemented components, or add a documented asset-copy script if the deployment model requires local static assets.

## Validation Loop

Before finalizing implementation work:

1. Run `get_uswds_integration_recipe` for the target framework.
2. Use `search_uswds`, `get_component`, `get_pattern`, or `get_template` for the UI being built.
3. Run `validate_uswds_project_setup` with relevant project files.
4. Run `validate_uswds_markup` against generated HTML.
5. Run the project's own build, tests, and accessibility checks.
