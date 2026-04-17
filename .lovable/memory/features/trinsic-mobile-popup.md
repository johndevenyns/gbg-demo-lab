---
name: Trinsic Mobile Popup Verification
description: Mobile verification flow using @trinsic/web-ui popup SDK with /verify/redirect handler page
type: feature
---

The unified verification step supports a per-type `popupMode` toggle (in
`VerificationTypeOverride`) that switches the runtime from QR/redirect to a
Trinsic popup window flow:

1. The verification step renders a "Start Mobile Verification" button (popup
   creation requires a user gesture or browsers block `window.open`).
2. On click, `launchTrinsicPopup` in `DemoFlowRenderer` calls Trinsic's
   `createPopupAndWaitForResults` with a `sessionCreationFunction` that invokes
   the existing `create-verification-session` edge function and returns
   `data.verifyUrl` as the launchUrl.
3. `returnUrl` is overridden to `${origin}/verify/redirect` (a public route
   served by `src/pages/VerifyRedirect.tsx`). That page reads `?sessionId=...`
   and calls `signalRedirectFromPopup({ sessionId, closeWindowAfterSignal: true })`
   to forward the result back to the opener.
4. After `waitForCompletion` resolves with `SignalReceived` or
   `PollingFunctionIndicatedCompletion`, the renderer fetches final status via
   `get-verification-status` and redirects the parent window to the demo's
   `approvedUrl` or `rejectedUrl`.

The Trinsic SDK is dynamically imported (`await import('@trinsic/web-ui')`) so
the bundle is only loaded when popup mode is actually used. The launch endpoint
reuses the existing `create-verification-session` flow — `verifyUrl` is treated
as the Trinsic launchUrl, so no new edge function was added.
