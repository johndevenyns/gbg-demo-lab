import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://ditto.gbg.com';

interface CreateDidRequest {
  scope: string;
  resourceId?: string;
  referenceId?: string;
  referenceIdPrefix?: string;
  customerName?: string;
  timeoutMs?: number;
  environment?: 'us' | 'eu';
  identityOverrides?: Record<string, unknown>;
  branding?: {
    headerBgColor?: string;
    headerTextColor?: string;
    buttonColor?: string;
    logoUrl?: string;
  };
  demoId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreateDidRequest = await req.json();

    if (!body.scope || typeof body.scope !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'scope is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve API key (per-demo override -> global)
    let API_KEY: string | undefined =
      Deno.env.get('VERIFICATION_API_KEY_GLOBAL') ||
      Deno.env.get('VERIFICATION_API_KEY');
    let keySource: 'demo' | 'global' = 'global';

    if (body.demoId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: row } = await admin
          .from('demo_verification_api_keys')
          .select('api_key')
          .eq('demo_id', body.demoId)
          .maybeSingle();
        if (row?.api_key) {
          API_KEY = row.api_key;
          keySource = 'demo';
        }
      } catch (e) {
        console.error('Failed to resolve per-demo API key, falling back to global:', e);
      }
    }

    if (!API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referenceId =
      body.referenceId || `${body.referenceIdPrefix || 'demo'}-${Date.now()}`;

    const payload: Record<string, unknown> = {
      scope: body.scope,
      referenceId,
    };
    if (body.resourceId) payload.resourceId = body.resourceId;
    if (body.timeoutMs) payload.timeoutMs = body.timeoutMs;
    if (body.environment) payload.environment = body.environment;
    if (body.identityOverrides) payload.identityOverrides = body.identityOverrides;
    if (body.customerName) payload.customerName = body.customerName;
    if (body.branding) {
      const b = body.branding;
      // Send both nested and legacy top-level for compatibility.
      payload.branding = {
        headerBgColor: b.headerBgColor,
        headerTextColor: b.headerTextColor,
        buttonColor: b.buttonColor,
        logoUrl: b.logoUrl,
      };
      if (b.headerBgColor) payload.headerBgColor = b.headerBgColor;
      if (b.headerTextColor) payload.headerTextColor = b.headerTextColor;
      if (b.buttonColor) payload.buttonColor = b.buttonColor;
      if (b.logoUrl) payload.logoUrl = b.logoUrl;
    }

    console.log('[create-did] keySource=', keySource, 'scope=', body.scope, 'demoId=', body.demoId);

    const response = await fetch(`${BASE_URL}/api/verification/did`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error('[create-did] API error', response.status, text);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unable to start Digital ID verification.',
          apiStatus: response.status,
          apiResponse: text?.slice(0, 800) || null,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let api: any;
    try {
      api = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from verification service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verificationId: api.verificationId,
        status: api.status || 'InProgress',
        launchUrl: api.launchUrl ?? null,
        pollUrl: api.pollUrl ?? null,
        referenceId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-did] error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to start Digital ID verification.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});