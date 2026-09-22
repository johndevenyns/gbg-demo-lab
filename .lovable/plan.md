# Customer homepage as the default view

Add a choice for what visitors see first on a demo site: the use-case landing page (today's behaviour) or a captured copy of the customer's own homepage. Available both while creating a demo and afterwards in the demo settings. Then apply it to the Truist demo right away.

## What the user gets

**In the creation wizard** — a new "Default view" choice alongside the site URL:
- **Use cases** (current default) — the tabbed use-case landing page.
- **Customer homepage** — grabs a full-length picture of the customer's homepage and shows it as the site's home page. The wizard's progress list gains a "Capturing customer homepage" line so success or failure is reported with everything else.

**In demo settings** — next to the existing "Default landing page" selector:
- A **Capture customer homepage** button that creates the page, or **Re-capture** if it already exists (for example after the customer redesigns their site).
- Once captured, the page appears in the custom pages list like any other, so its name, background, image fit and clickable hotspots can be edited, and its direct URL is shown.

**Truist** — capture truist.com's homepage now and set it as the default view for that demo, so the demo opens on a Truist-looking home page.

## How it works

- New edge function `capture-homepage` takes a URL and returns a full-page screenshot (Firecrawl full-page screenshot format, same API key and error handling as the existing site capture function).
- The admin app uploads that image into the existing public storage bucket and creates a custom page:
  - slug `home`, name "<Customer> Home"
  - single-image page mode with the captured image, contain fit, background from the demo's header colour
  - no header/footer chrome, since the capture already includes the customer's real header and footer
- The demo's `defaultLandingPageSlug` is set to `home`; switching "Default view" back to Use cases just clears it, leaving the page in place for reuse.
- Clickable areas are added afterwards with the existing hotspot editor — nothing new needed there.

## Notes

- If the capture fails, the demo is still created and the default view stays on use cases; the wizard's results report says the homepage capture failed and that it can be retried from settings.
- Verification with a real capture of truist.com plus the existing type checks and tests.
