import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://app.art-of-sales-engineering.com';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GLOBAL_API_KEY =
      Deno.env.get('VERIFICATION_API_KEY_GLOBAL') ||
      Deno.env.get('VERIFICATION_API_KEY');

    // Get sessionId from query params or body
    const url = new URL(req.url);
    let sessionId = url.searchParams.get('sessionId');
    let demoId: string | undefined;

    if (!sessionId && req.method === 'POST') {
      const body = await req.json();
      sessionId = body.sessionId;
      demoId = body.demoId;
    }
    
    if (!sessionId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'sessionId is required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Resolve demo-specific override (if any)
    let API_KEY: string | undefined = GLOBAL_API_KEY;
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
        console.error('Failed to resolve per-demo API key, falling back to global:', e);
      }
    }

    if (!API_KEY) {
      console.error('No verification API key configured (demo or global)');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting verification status for session');

    // Get session status from API
    const response = await fetch(`${BASE_URL}/api/verification/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    const responseText = await response.text();
    console.log('Status API response status:', response.status);

    if (!response.ok) {
      console.error('API Error:', response.status, responseText);
      
      // For rate limiting, return a retriable response (not 500)
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            status: 'pending',
            sessionId: sessionId,
            isComplete: false,
            isPassed: false,
            error: 'Rate limited, will retry' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to check verification status. Please try again.' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse status response:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid response from verification service' 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the full response data with success flag
    // The status field indicates: pending, completed, failed, expired
    const result = {
      success: true,
      sessionId: data.sessionId || sessionId,
      status: data.status || 'pending',
      instanceId: data.instanceId || null,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      referenceId: data.referenceId || null,
      result: data.result || null,
      rawResponse: data.rawResponse || null,
      createdAt: data.createdAt || null,
      completedAt: data.completedAt || null,
      // Computed fields for easier frontend handling
      isComplete: ['completed', 'failed', 'expired'].includes(data.status),
      isPassed: data.status === 'completed',
    };

    console.log('Returning status:', result.status, 'isComplete:', result.isComplete);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verify status error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unable to check verification status. Please try again.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
