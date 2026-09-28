# Align Hosted Journey configuration

## What will change
- Make the Hosted Journey card follow the same configuration pattern as the other verification steps.
- When **GBG GO hosted journey** is selected, show the actual supported launch choices: new-window button, mobile QR code, visible URL, and editable launch copy. Remove the misleading iframe choice for GO while retaining iframe/popup choices for fixed URLs.
- Add a **Resource ID** selector to the GO card with the same hierarchy used elsewhere: step override, demo default, admin default, then global default. Clearly show which value is active and where each default is managed.
- Add a dedicated demo-level GO Resource ID setting under Workflow Builder → Verification Types, while continuing to use the existing global and admin Resource ID settings for the `hosted_journey` verification type.
- Pass the resolved Resource ID and configured version when starting GO instead of always forcing the backend secret's Resource ID.
- Add the standard success/failure completion controls to the Hosted Journey card so its post-verification behavior is configured consistently with other verification steps.

## Data and security
- Add a nullable `resource_id_hosted_journey` field to demo environments for the demo-level default.
- Keep the GO client ID and secret backend-only. The browser may send the selected Resource ID, but never receives or handles the GO credentials.
- The backend secret remains the final safety fallback for existing demos.

## Validation
- Confirm existing fixed-URL hosted steps still work unchanged.
- Confirm GO cards show only valid display choices and resolve Resource IDs in the documented order.
- Test saving at global, admin, demo, and step levels; verify a GO start request uses the expected ID.
- Check the builder and public launch screen at desktop and mobile widths, then run the relevant automated checks.
