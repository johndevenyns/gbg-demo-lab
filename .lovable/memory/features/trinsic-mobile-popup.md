---
name: Trinsic Mobile Popup Verification
description: Mobile verification flow using @trinsic/web-ui popup SDK with /verify/redirect handler page and globally-editable HTML for both screens
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

## Editable HTML for Launch + Redirect Pages

Both the popup launch screen (rendered inside the verification step when
`popupMode` is on) and the `/verify/redirect` landing page support custom HTML
edited at **Global Settings → Verification → mDL provider card → "Edit Launch
Page HTML" / "Edit Redirect Page HTML"** (`MdlPageHtmlEditor.tsx`).

- HTML is stored in `global_settings` under keys `mdl_launch_html` and
  `mdl_redirect_html`. `useMdlPageHtml(key)` reads the cached value.
- On the launch screen, any element in the custom HTML carrying the attribute
  `data-popup-launch-button` triggers `launchTrinsicPopup` via event delegation
  (clicks inside `dangerouslySetInnerHTML` are caught by the wrapping div).
- On `/verify/redirect`, `signalRedirectFromPopup` always runs in `useEffect`
  regardless of the custom HTML — the HTML is purely the visible content shown
  briefly before the window closes.
- Each editor dialog includes a "Reset to default" button that restores the
  baseline markup defined in `DEFAULT_LAUNCH_HTML` / `DEFAULT_REDIRECT_HTML`.
