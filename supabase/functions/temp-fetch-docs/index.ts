import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/docs';
  const grep = url.searchParams.get('grep');
  const key = Deno.env.get('VERIFICATION_API_KEY_GLOBAL') || Deno.env.get('VERIFICATION_API_KEY')!;
  const target = `https://ditto.gbg.com${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
  const r = await fetch(target, {
    headers: {
      'Authorization': `Bearer ${key}`,
      'x-api-key': key,
      'Accept': 'text/html,application/json',
    },
  });
  const body = await r.text();
  if (grep) {
    const re = new RegExp(grep, 'gi');
    const hits: string[] = [];
    let m;
    while ((m = re.exec(body)) !== null) {
      const start = Math.max(0, m.index - 200);
      const end = Math.min(body.length, m.index + 400);
      hits.push(body.slice(start, end));
      if (hits.length > 30) break;
    }
    return new Response(JSON.stringify({ status: r.status, hits }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ status: r.status, contentType: r.headers.get('content-type'), body: body.slice(0, 200000) }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});