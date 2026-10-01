# Hide customer homepage capture

## Changes
- Add a reversible feature flag for customer homepage capture.
- Remove the “Default view” homepage choice from new demo creation while the flag is off.
- Prevent the wizard from adding or running the homepage-capture task, so new demos always open on use cases.
- Preserve existing captured homepages and underlying capture code for later re-enablement.

## Verification
- Open the new-demo wizard with website mirroring enabled and confirm no customer-homepage option appears.
- Confirm the wizard still offers site scanning and use-case setup without errors.

## Technical detail
- Record the reversible feature-flag decision in the project guidance.
