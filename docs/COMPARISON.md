# Does it help? A with/without comparison

An informal experiment, not a benchmark. Read the caveats.

## Method
- Client and model: OpenCode, default model (the same for both conditions).
- Five tasks (pothole report, fishing permit renewal, outage notice, small business grant program, public records request), each asking for a complete USWDS `page.html`.
- **without**: no MCP server. **with**: `uswds-mcp` 0.2.0 available, plus the sentence "The uswds MCP tools are available; use them."
- Every page was scored by the same code after the fact: `node scripts/score-pages.mjs <dir>` (validator errors/warnings, unknown classes, and axe-core violations with color contrast disabled).

## Results (5 pages per condition, single run each)

| | pages with 0 validator errors | validator errors | validator warnings | unknown `usa-*` classes | axe violations |
| --- | --- | --- | --- | --- | --- |
| without | 1 / 5 | 7 | 6 | 0 | 1 |
| with | 5 / 5 | 0 | 2 | 0 | 1 |

What the errors were, without the MCP: missing `usa-overlay` and menu button on the header (mobile navigation would not open), accordion buttons without `type="button"`, a government banner missing its toggle and content, and USWDS scripts not loaded.

## What this does and doesn't show
- The model did **not** invent class names in either condition. Its USWDS vocabulary is good; the failures were structural and easy to miss by eye. That is where the tools help most.
- The two warnings in the "with" condition are heading-order notices from the official step-indicator snippet, which uses an `h4`. The model copied it unchanged, as the tools tell it to.
- Small sample, one model, one run each, and the "with" prompt told the model to use the tools. Results will vary by model and prompt. The validator is also this project's own, so "errors" means "differs from what uswds-mcp considers correct", which is checked against the official markup but is not an official USWDS conformance test.
- axe-core cannot check color contrast, focus order on a rendered page, or screen reader behavior.

Reproduce it with your own client and tasks, and open an issue if you see something different.
