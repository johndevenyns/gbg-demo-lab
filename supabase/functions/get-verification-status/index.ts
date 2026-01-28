import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://app.art-of-sales-engineering.com';

interface StatusResponse {
  success: boolean;
  sessionId?: string;
  status?: string;
  isComplete?: boolean;
  isPassed?: boolean;
  error?: string;
  verificationResult?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const VERIFICATION_API_KEY = Deno.env.get('VERIFICATION_API_KEY');
    
    if (!VERIFICATION_API_KEY) {
      console.error('VERIFICATION_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Verification service not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get sessionId from query params or body
    const url = new URL(req.url);
    let sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId && req.method === 'POST') {
      const body = await req.json();
      sessionId = body.sessionId;
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

    console.log('Getting verification status for session:', sessionId);

    // Call the verification status API
    const response = await fetch(`${BASE_URL}/api/verification/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERIFICATION_API_KEY}`,
      },
    });

    const responseText = await response.text();
    console.log('Status API response:', response.status, responseText.substring(0, 500));

    let apiResponse;
    try {
      apiResponse = JSON.parse(responseText);
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

    if (!response.ok) {
      console.error('Status API error:', apiResponse);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiResponse.error || `Verification service error: ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if verification is complete and result
    const status = apiResponse.status || 'pending';
    const isComplete = ['completed', 'failed', 'expired'].includes(status);
    const isPassed = status === 'completed';

    const result: StatusResponse = {
      success: true,
      sessionId,
      status,
      isComplete,
      isPassed,
      verificationResult: apiResponse.result || undefined,
    };

    console.log('Returning status result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get verification status error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get verification status'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
