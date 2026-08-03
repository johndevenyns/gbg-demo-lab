import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://app.art-of-sales-engineering.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let verificationId = url.searchParams.get('verificationId');
    let demoId: string | undefined;

    if (!verificationId && req.method === 'POST') {
      const body = await req.json();
      verificationId = body.verificationId;
      demoId = body.demoId;
    }

    if (!verificationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'verificationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let API_KEY: string | undefined =
      Deno.env.get('VERIFICATION_API_KEY_GLOBAL') ||
      Deno.env.get('VERIFICATION_API_KEY');

    if (demoId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: row } = await admin
          .from('demo_verification_api_keys')
          .select('api_key')
          .eq('demo_id', demoId)
          .maybeSingle();
        if (row?.api_key) API_KEY = row.api_key;
      } catch (e) {
        console.error('[get-did] failed to resolve per-demo key, using global:', e);
      }
    }

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      `${BASE_URL}/api/verification/did/${encodeURIComponent(verificationId)}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      }
    );

    const text = await response.text();

    if (!response.ok) {
      console.error('[get-did] API error', response.status, text);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            success: true,
            verificationId,
            status: 'InProgress',
            isComplete: false,
            isPassed: false,
            error: 'Rate limited, will retry',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: 'Unable to check Digital ID status.' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from verification service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const status: string = data.status || 'InProgress';
    const terminal = ['Completed', 'Failed', 'Expired'].includes(status);
    const passed = status === 'Completed';

    return new Response(
      JSON.stringify({
        success: true,
        verificationId,
        status,
        launchUrl: data.launchUrl ?? null,
        provider: data.provider ?? null,
        results: data.results ?? null,
        redirectReceived: data.redirectReceived ?? false,
        isComplete: terminal,
        isPassed: passed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[get-did] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to check Digital ID status.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});