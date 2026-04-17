import { useEffect, useState } from 'react';
import { signalRedirectFromPopup } from '@trinsic/web-ui';

/**
 * Redirect landing page for the Trinsic mobile verification popup flow.
 * The popup is opened with a `returnUrl` pointing here. When the verification
 * provider redirects back to this URL with `?sessionId=...`, we forward the
 * result to the opener window via `signalRedirectFromPopup` and close ourselves.
 */
export default function VerifyRedirect() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('sessionId');

      if (!sessionId) {
        setError('Missing sessionId in URL.');
        return;
      }

      signalRedirectFromPopup({
        sessionId,
        closeWindowAfterSignal: true,
      });
    } catch (err) {
      console.error('signalRedirectFromPopup failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error signalling popup');
    }
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center space-y-3 max-w-md">
        <h1 className="text-xl font-semibold text-foreground">
          {error ? 'Verification Error' : 'Returning to Verification…'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {error
            ? error
            : 'You can close this window if it does not close automatically.'}
        </p>
      </div>
    </main>
  );
}
