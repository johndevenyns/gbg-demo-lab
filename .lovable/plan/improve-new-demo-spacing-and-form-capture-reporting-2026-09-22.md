# Improve New Demo Spacing and Form Capture Reporting

## Goal
New demos should start with comfortable space above and below the form, preserve that spacing when customer styling is captured, and clearly report what the initial site build did or did not capture.

## Changes

### 1. Add reliable default form spacing
- Give newly created demos a modest vertical content padding between the mirrored header, form container, and footer.
- Keep the existing Site Appearance control as the place to adjust this later.
- Use the same default in live demos, previews, and generated review previews so the initial result matches what visitors see.
- Preserve the spacing when scraped or captured form styles replace the default styling.

### 2. Fix customer form styling application
- Reuse the full form-style mapping already used by manual Exact Capture instead of the limited initial-build mapper.
- Carry captured typography, input, label, button, container, spacing, and detected layout patterns into the generated demo form.
- Store capture provenance and metadata so the Form Style screen can identify that customer styling was captured.
- Merge captured styling into the demo’s existing page configuration rather than replacing unrelated success, failure, landing, or custom-page settings.
- Treat empty or unusable captures as failures instead of reporting them as successful.

### 3. Show an initial-build results report
- Keep the setup results visible after processing instead of immediately closing when no site preview is available.
- Show each operation as Succeeded, Not found/Skipped, or Failed, with a short actionable reason.
- Report header/footer capture, screenshot capture, colors/logo, form discovery, form styling, field mapping, use cases, and test profiles separately.
- When captures are available, retain the HTML-versus-screenshot choice beneath the results.
- Let the user finish and open the demo even when optional capture steps fail.

## Validation
- Create a mirrored demo from a site with a discoverable form and confirm its customer-specific styling is visibly applied.
- Create one from a site without a usable form and confirm the report clearly says form discovery/capture failed or found nothing.
- Confirm new demos have default top and bottom spacing, and that changing Vertical Padding still updates it.
- Confirm result-page and custom-page settings survive initial form-style capture.
- Run targeted tests and a TypeScript check.

## Technical details
- Primary files: demo creation wizard, shared form-style conversion utilities, default form style configuration, and preview rendering fallbacks.
- No database schema change is expected; the report is transient wizard state and styling remains in the existing page configuration JSON.
- Existing demos with an explicit vertical-padding value remain unchanged.
