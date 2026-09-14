# Enable all requested Digital ID launch flows

## Goal
Make MitID, BankID Norway, CLEAR, LA Wallet, and SPID selectable wherever Digital ID providers appear, and ensure each selection creates a real Ditto session with a launch link and QR code.

## Changes
- Standardize the five provider records on Ditto’s working scope values:
  - MitID: `denmark-mitid`
  - BankID Norway: `norway-bankid`
  - CLEAR: `clear`
  - LA Wallet: `la-wallet`
  - SPID: `italy-spid`
- Keep all five enabled globally and add SPID to the legacy provider catalog so older form configurations can display it.
- Normalize legacy provider keys (`mitid`, `bankid_no`, `la_wallet`, `spid`) to the current Ditto scopes, so existing saved demos keep working without manual reconfiguration.
- Replace the older Digital ID selection fallback, which currently starts Data + Biometric, with the same dedicated Digital ID launch flow used by Unified Verification.
- Preserve the existing launch-link screen: same-device link, live QR code, expandable URL, copy action, and status polling.

## Data compatibility
- Add a database migration that updates the existing provider rows and inserts SPID if missing.
- Match saved provider selections against both legacy and canonical keys to prevent currently configured cards from appearing disabled.

## Validation
- Run focused checks for provider-key normalization and selection behavior.
- Deploy the Digital ID functions only if implementation changes require it.
- Call the live Ditto session endpoint for all five scopes and confirm each returns a verification ID and launch URL.
- Verify one provider-selection flow in the browser, including the visible QR/link screen.

## Confirmed before implementation
All five current Ditto scopes returned successful live sessions and launch links during investigation, so no additional provider-specific fields are required.
