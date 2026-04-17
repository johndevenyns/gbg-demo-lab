import { useEffect, useState } from 'react';
import { signalRedirectFromPopup } from '@trinsic/web-ui';
import { useMdlPageHtml, MDL_REDIRECT_HTML_KEY, DEFAULT_REDIRECT_HTML } from '@/components/admin/MdlPageHtmlEditor';

/**
 * Redirect landing page for the Trinsic mobile verification popup flow.
 * The popup is opened with a `returnUrl` pointing here. When the verification
 * provider redirects back to this URL with `?sessionId=...`, we forward the
 * result to the opener window via `signalRedirectFromPopup` and close ourselves.
 *
 * The visible HTML is configurable at the Global Settings → Verification → mDL
 * level (key: `mdl_redirect_html`). The signalling logic always runs.
 */
export default function VerifyRedirect() {
  const [error, setError] = useState<string | null>(null);
  const { data: customHtml, isLoading } = useMdlPageHtml(MDL_REDIRECT_HTML_KEY);

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

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-xl font-semibold text-foreground">Verification Error</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return <main className="min-h-screen bg-background" />;
  }

  const html = customHtml ?? DEFAULT_REDIRECT_HTML;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
