---
name: Site Mirror Layout Controls
description: Inline RegionSizeBadge per region (Header/Content/Footer) and Link Header hotspot mode in live preview. No global edit mode toggle.
type: feature
---
The site mirror live preview uses **inline RegionSizeBadge** components (top-right of each region) for resizing the Header, Content, and Footer. Click the value to type, or use up/down chevrons / arrow keys. Changes auto-save immediately via `onApplyBranding({ formStyle }, true)` — no Save button, no global "Adjust Spacing" mode.

The Content badge also exposes a small gear icon opening a popover with extra controls: Vertical Padding, Vertical Alignment, Form Width, Background Color.

The "Link Header" toggle remains as a separate mode for picking CSS selectors (HTML method) or drawing hotspot rectangles (Screenshot method) over the header iframe, with a floating `HeaderLinkPanel` for use case assignment.

Footer iframe uses a `FooterPreviewFrame` sub-component: the `formStyle.footerHeight` badge is a **minimum** floor; the iframe auto-grows to its captured natural height via `postMessage` so multi-column site footers aren't clipped.

The header iframe now uses the **same auto-fit pattern** via the shared `useNaturalIframeHeight` hook + `buildHeightReporterScript` helper, listening for `mirror-region-height` postMessages. The `formStyle.headerHeight` badge acts as a floor, and the iframe expands to fit mega-menus / stacked top-bars. The header iframe's sandbox includes `allow-scripts` so the height-reporter can run; captured `<script>` tags are stripped server-side during clone, so this is safe.

The `scrape-site-branding` edge function now: (a) measures the header at `scrollTop=0` BEFORE scrolling for footer lazy-load, then scrolls back to top + 150ms settle so scroll-shrink headers revert to their unscrolled state before capture; (b) force-resolves lazy-loaded header logos and flattens `<picture>`/`srcset` to a concrete `src`; (c) neutralizes `position: fixed/sticky/absolute` and any `transform` on the header tree (added to inlined styles) so the cloned tree lays out inline inside the iframe; (d) scrolls to the bottom + busy-waits 600ms to trigger lazy-mounted footers; (e) captures `::before`/`::after` pseudo-element styles via scoped `[data-pe-id]` rules; (f) snapshots inline `<svg><symbol>` sprite definitions; and (g) returns measured `headerHeight` and `footerHeight` that `HtmlCaptureTab.handleApplySiteLayout` seeds into `formStyle` on apply.

Replaces the previous floating `ContentLayoutEditor` panel (deleted).
