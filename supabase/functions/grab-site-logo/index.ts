import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireAdmin, unauthorizedResponse } from '../_shared/auth.ts';

// Lightweight logo + brand colour lookup. Reads only the page's HTML (no
// browser rendering), so it works even on sites too large to fully capture.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return m ? m[1].replace(/&amp;/g, '&') : '';
};

function isPrivateHost(host: string) {
  return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?)/i.test(host);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const admin = await requireAdmin(req);
    if (!admin) return unauthorizedResponse(corsHeaders);

    const { url } = await req.json().catch(() => ({}));
    if (typeof url !== 'string' || !url.trim()) return json({ success: false, error: 'URL is required' }, 400);
    let base: URL;
    try {
      base = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
    } catch {
      return json({ success: false, error: 'Invalid URL' }, 400);
    }
    if (!/^https?:$/.test(base.protocol) || isPrivateHost(base.hostname)) {
      return json({ success: false, error: 'URL not allowed' }, 400);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let html = '';
    try {
      const res = await fetch(base.toString(), {
        signal: ctrl.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (!res.ok) {
        return json({ success: false, error: `The site returned HTTP ${res.status} (it may block automated visits)` });
      }
      // Only read the first ~400KB — the head and header live there.
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let bytes = 0;
      while (reader && bytes < 400_000) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        html += dec.decode(value, { stream: true });
      }
      try { await reader?.cancel(); } catch { /* ignore */ }
      if (res.url) base = new URL(res.url);
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === 'AbortError';
      return json({ success: false, error: aborted ? 'The site took too long to respond' : 'Could not reach the site' });
    } finally {
      clearTimeout(timer);
    }

    const abs = (u: string) => { try { return new URL(u, base).toString(); } catch { return ''; } };
    const candidates: Array<{ url: string; score: number; source: string }> = [];

    // <img> tags that look like logos
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
      const tag = m[0];
      const src = attr(tag, 'src') || attr(tag, 'data-src');
      if (!src || src.startsWith('data:image/gif')) continue;
      const hay = `${src} ${attr(tag, 'alt')} ${attr(tag, 'class')} ${attr(tag, 'id')}`.toLowerCase();
      if (!hay.includes('logo')) continue;
      if (/hero|banner|cover|background|sprite/.test(hay)) continue;
      let score = 60;
      if (/\.svg(\?|$)/i.test(src)) score += 15;
      if (m.index !== undefined && m.index < html.length * 0.4) score += 10;
      candidates.push({ url: abs(src), score, source: 'page logo image' });
    }

    // <link rel=...icon>
    for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
      const tag = m[0];
      const rel = attr(tag, 'rel').toLowerCase();
      const href = attr(tag, 'href');
      if (!href) continue;
      if (rel.includes('apple-touch-icon')) candidates.push({ url: abs(href), score: 40, source: 'app icon' });
      else if (rel.includes('icon')) {
        const sizes = parseInt(attr(tag, 'sizes')) || 0;
        candidates.push({ url: abs(href), score: /\.svg/i.test(href) ? 35 : sizes >= 96 ? 30 : 15, source: 'site icon' });
      }
    }

    // og:image as weak fallback (often a marketing image)
    const og = html.match(/<meta\b[^>]*property=["']og:logo["'][^>]*>/i);
    if (og) candidates.push({ url: abs(attr(og[0], 'content')), score: 45, source: 'og:logo' });

    candidates.push({ url: abs('/favicon.ico'), score: 5, source: 'favicon' });

    const theme = html.match(/<meta\b[^>]*name=["']theme-color["'][^>]*>/i);
    const themeColor = theme ? attr(theme[0], 'content') : null;

    const best = candidates.filter((c) => c.url).sort((a, b) => b.score - a.score)[0] || null;
    return json({
      success: true,
      data: {
        logoUrl: best?.url || null,
        logoSource: best?.source || null,
        themeColor: themeColor && /^#[0-9a-f]{3,8}$/i.test(themeColor) ? themeColor : null,
      },
    });
  } catch (e) {
    console.error('grab-site-logo error', e);
    return json({ success: false, error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
