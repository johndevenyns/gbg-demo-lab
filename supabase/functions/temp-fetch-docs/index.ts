import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '/docs';
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
  return new Response(JSON.stringify({ status: r.status, contentType: r.headers.get('content-type'), body: body.slice(0, 200000) }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});