---
name: Site Mirror Layout Controls
description: Inline RegionSizeBadge per region (Header/Content/Footer) and Link Header hotspot mode in live preview. No global edit mode toggle.
type: feature
---
The site mirror live preview uses **inline RegionSizeBadge** components (top-right of each region) for resizing the Header, Content, and Footer. Click the value to type, or use up/down chevrons / arrow keys. Changes auto-save immediately via `onApplyBranding({ formStyle }, true)` — no Save button, no global "Adjust Spacing" mode.

The Content badge also exposes a small gear icon opening a popover with extra controls: Vertical Padding, Vertical Alignment, Form Width, Background Color.

The "Link Header" toggle remains as a separate mode for picking CSS selectors (HTML method) or drawing hotspot rectangles (Screenshot method) over the header iframe, with a floating `HeaderLinkPanel` for use case assignment.

Footer iframe uses a `FooterPreviewFrame` sub-component: the `formStyle.footerHeight` badge is a **minimum** floor; the iframe auto-grows to its captured natural height via `postMessage` (type `mirror-footer-height`) so multi-column site footers aren't clipped. The badge still lets users force a smaller viewport when desired.

The `scrape-site-branding` edge function now (a) scrolls to the bottom and busy-waits 600ms inside its `executeJavascript` to trigger lazy-mounted footers, (b) captures `::before`/`::after` pseudo-element styles via scoped `[data-pe-id]` rules appended to `cssContent`, (c) snapshots inline `<svg><symbol>` sprite definitions and prepends them to header/footer HTML so `<use href="#id">` icons resolve, and (d) returns a measured `footerHeight` that `HtmlCaptureTab.handleApplySiteLayout` seeds into `formStyle.footerHeight` on apply.

Replaces the previous floating `ContentLayoutEditor` panel (deleted).
