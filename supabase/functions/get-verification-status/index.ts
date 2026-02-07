import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const API_KEY = Deno.env.get('VERIFICATION_API_KEY');
    
    if (!API_KEY) {
      console.error('VERIFICATION_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Service configuration error' 
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

    // Get session status from API
    const response = await fetch(`${BASE_URL}/api/verification/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    const responseText = await response.text();
    console.log('Status API response:', response.status, responseText.substring(0, 500));

    if (!response.ok) {
      console.error('API Error:', response.status, responseText);
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

    console.log('Returning status result:', JSON.stringify(result, null, 2));

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
