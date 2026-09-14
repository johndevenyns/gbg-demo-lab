# Digital ID QR screen

## What will change
- Replace the shared Digital ID QR content with the supplied two-column layout: same-device action on the left, divider, QR code on the right, and a collapsible URL row below.
- Keep the configured Digital ID title and description above this area.
- Apply the change only while a Digital ID session is active, so document, biometric, data, and other verification screens remain unchanged.

## Behavior
- **Continue on this device** opens the live provider URL in a new tab.
- **Show URL** expands and collapses the actual provider URL, with a copy action.
- The QR code encodes the same live provider URL for phone scanning.
- Live polling continues in the background and the screen responds to completed, failed, and expired results as it does today.

## Responsive layout
- Desktop displays action and QR code side by side.
- Narrow screens stack them vertically while retaining the same actions and labels.

## Technical details
- Update the central Digital ID session rendering in the shared verification flow renderer.
- Reuse the existing button and QR components and current branding color.
- Verify the layout at desktop and mobile sizes and confirm URL expansion, copying, and provider launch behavior.
