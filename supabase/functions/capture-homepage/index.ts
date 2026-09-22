import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface CaptureBody {
  url?: unknown;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return jsonResponse({ success: false, error: 'Site capture is not configured' }, 500);
    }

    const body = (await req.json().catch(() => ({}))) as CaptureBody;
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    if (!rawUrl) {
      return jsonResponse({ success: false, error: 'A site URL is required' }, 400);
    }

    let target: URL;
    try {
      target = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    } catch {
      return jsonResponse({ success: false, error: `Invalid URL: ${rawUrl}` }, 400);
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return jsonResponse({ success: false, error: 'Only http(s) URLs are supported' }, 400);
    }

    const requestFirecrawl = async (format: string) =>
      fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: target.toString(),
          formats: [format],
          onlyMainContent: false,
          waitFor: 4000,
          timeout: 60000,
        }),
      });

    // Prefer a full-page capture; fall back to the viewport screenshot.
    let response = await requestFirecrawl('screenshot@fullPage');
    let data = await response.json().catch(() => null);

    if (!response.ok || !(data?.data?.screenshot || data?.screenshot)) {
      console.warn('Full-page screenshot unavailable, falling back to viewport capture', {
        status: response.status,
      });
      response = await requestFirecrawl('screenshot');
      data = await response.json().catch(() => null);
    }

    if (!response.ok) {
      console.error(`Firecrawl capture failed [${response.status}]`, data);
      return jsonResponse(
        { success: false, error: data?.error || `Capture failed with status ${response.status}` },
        response.status,
      );
    }

    const screenshot: string | null = data?.data?.screenshot || data?.screenshot || null;
    if (!screenshot) {
      return jsonResponse({ success: false, error: 'No screenshot was returned for this site' }, 502);
    }

    const metadata = data?.data?.metadata || data?.metadata || {};

    return jsonResponse({
      success: true,
      data: {
        screenshot,
        url: target.toString(),
        title: typeof metadata?.title === 'string' ? metadata.title : null,
      },
    });
  } catch (error) {
    console.error('capture-homepage error', error);
    return jsonResponse(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected error' },
      500,
    );
  }
});
