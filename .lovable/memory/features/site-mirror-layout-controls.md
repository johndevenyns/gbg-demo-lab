---
name: Site Mirror Layout Controls
description: Inline RegionSizeBadge per region (Header/Content/Footer) and Link Header hotspot mode in live preview. No global edit mode toggle.
type: feature
---
The site mirror live preview uses **inline RegionSizeBadge** components (top-right of each region) for resizing the Header, Content, and Footer. Click the value to type, or use up/down chevrons / arrow keys. Changes auto-save immediately via `onApplyBranding({ formStyle }, true)` — no Save button, no global "Adjust Spacing" mode.

The Content badge also exposes a small gear icon opening a popover with extra controls: Vertical Padding, Vertical Alignment, Form Width, Background Color.

The "Link Header" toggle remains as a separate mode for picking CSS selectors (HTML method) or drawing hotspot rectangles (Screenshot method) over the header iframe, with a floating `HeaderLinkPanel` for use case assignment.

Footer iframe height is now governed strictly by `formStyle.footerHeight` (the previous auto-resize-on-load was removed so the badge value is honored).

Replaces the previous floating `ContentLayoutEditor` panel (deleted).
