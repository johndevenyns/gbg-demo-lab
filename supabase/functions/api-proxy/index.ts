import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProxyRequest {
  endpointUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  timeout?: number; // in milliseconds
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: ProxyRequest = await req.json();
    
    console.log('API Proxy request:', {
      url: requestData.endpointUrl,
      method: requestData.method,
      hasBody: !!requestData.body,
    });

    // Validate required fields
    if (!requestData.endpointUrl) {
      return new Response(
        JSON.stringify({ error: 'endpointUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate URL format
    try {
      new URL(requestData.endpointUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid endpointUrl format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare fetch options
    const fetchOptions: RequestInit = {
      method: requestData.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...requestData.headers,
      },
    };

    // Add body for non-GET requests
    if (requestData.method !== 'GET' && requestData.body) {
      fetchOptions.body = JSON.stringify(requestData.body);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = requestData.timeout || 30000; // Default 30s timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    fetchOptions.signal = controller.signal;

    console.log('Making request to:', requestData.endpointUrl);

    // Make the actual API call
    const response = await fetch(requestData.endpointUrl, fetchOptions);
    clearTimeout(timeoutId);

    // Get response text first
    const responseText = await response.text();
    
    console.log('API response status:', response.status);
    console.log('API response body preview:', responseText.substring(0, 500));

    // Try to parse as JSON
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      // If not JSON, wrap the text in an object
      responseData = { rawResponse: responseText };
    }

    // Return the response with appropriate status
    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data: responseData,
      }),
      { 
        status: 200, // Always return 200 from proxy, include original status in body
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('API Proxy error:', error);
    
    // Handle abort error (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Request timed out',
          details: 'The external API did not respond in time'
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to proxy API request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
