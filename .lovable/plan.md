# Update the Ditto verification integration

## Goal
Bring the app’s Ditto integration in line with the current `https://ditto.gbg.com/docs` contract and restore Docs + Bio journey creation.

## Changes
- Replace the retired verification host in every Ditto journey function with `https://ditto.gbg.com`, including session creation, session status, Digital ID creation, and Digital ID status.
- Update verification-session payload construction to use Ditto’s current top-level identity fields for Docs + Bio, Data + Bio, and Data Only rather than the older nested `customerData` shape.
- Preserve the app’s existing field normalization, branding, resource-ID hierarchy, QR behavior, return URLs, and per-demo API-key overrides.
- Align response handling and error forwarding with the documented session response while keeping sensitive values out of logs.
- Update the admin Ditto link to the current host.

## Validation
- Add focused tests for the current Docs + Bio request shape and identity/date normalization.
- Run the edge-function tests.
- Invoke the updated session function against Ditto and confirm journey creation no longer fails at the retired host/TLS step.
- Review fresh function logs for request, upstream response, and redaction behavior.

## Technical details
The current failure is consistent with the deployed function still calling `https://app.art-of-sales-engineering.com/api/verification/sessions`; its log records a TLS handshake EOF. Ditto’s current reference creates sessions at `POST https://ditto.gbg.com/api/verification/sessions` with bearer authentication and top-level fields such as `firstName`, `lastName`, `birthday`, `address`, `phone`, and `email`.
