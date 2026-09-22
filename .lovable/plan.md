# Apply GBG Branding to Demo Manager

## Goal
Make the GBG Demo Manager and its account screens feel like part of the current GBG brand, while leaving customer demo branding unchanged.

## Changes
- Replace the generic shield and gradient icon in the manager header, sign-in screen, password-reset screen, reporting header, and settings header with the existing official GBG logo assets.
- Match the current gbg.com palette across manager-only surfaces: GBG blue for primary actions and focus states, dark ink for navigation and headings, bright supporting accent colors where appropriate, and clean white/light-neutral surfaces.
- Remove the current purple/indigo visual treatment from manager pages, including primary gradients and glow effects.
- Refresh the sign-in screen with a GBG-branded background, logo presentation, input focus treatment, primary button, and supporting copy while preserving all existing login and password-reset behavior.
- Apply the same header identity and color treatment consistently across the dashboard, global settings, reporting, and password-reset pages.
- Scope the brand treatment to administrative/account pages so each public customer demo continues using its own configured colors and logo.

## Validation
- Compare the updated manager and sign-in screen against the current public GBG site at desktop and mobile sizes.
- Verify the GBG logo remains clear on light and dark surfaces.
- Confirm sign-in, forgot-password, manager navigation, theme switching, and customer demo colors are unchanged functionally.
- Run the TypeScript check and targeted tests.

## Technical details
- Use shared semantic theme tokens and a reusable GBG manager logo element rather than page-specific hardcoded colors.
- Reuse the existing static GBG image assets; no runtime logo service is needed.
- Update only manager/account presentation files and shared theme tokens used by them; do not alter demo-specific branding data.
