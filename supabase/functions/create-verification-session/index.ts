import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://app.art-of-sales-engineering.com';

// Field mappings from form field types to API customerData field names
const FIELD_MAPPINGS: Record<string, string> = {
  // Personal fields
  firstName: 'firstName',
  lastName: 'lastName',
  middleName: 'middleName',
  email: 'email',
  phone: 'phone',
  dateOfBirth: 'dateOfBirth',
  
  // Address fields
  addressStreet: 'address',
  addressCity: 'city',
  addressState: 'state',
  addressZip: 'postalCode',
  addressCountry: 'country',
  
  // Identity fields
  ssn: 'ssn',
  documentNumber: 'documentNumber',
  documentType: 'documentType',
  nationality: 'nationality',
  gender: 'gender',
};

interface CreateSessionRequest {
  // Form data from all steps
  formData: Record<string, string>;
  
  // Verification configuration
  verificationType: 'docBio' | 'dataBio' | 'dataOnly';
  
  // Demo environment settings
  customerName: string;
  returnUrl?: string;
  includeQr?: boolean;
  
  // Optional reference ID prefix
  referenceIdPrefix?: string;
}

interface SessionResponse {
  success: boolean;
  sessionId?: string;
  verifyUrl?: string;
  shortUrl?: string;
  qrCodeUrl?: string;
  status?: string;
  error?: string;
  referenceId?: string;
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

    const requestData: CreateSessionRequest = await req.json();
    
    console.log('Create verification session request:', {
      verificationType: requestData.verificationType,
      customerName: requestData.customerName,
      includeQr: requestData.includeQr,
      formDataKeys: Object.keys(requestData.formData || {}),
    });

    // Build customerData by mapping form fields to API-expected format
    const customerData: Record<string, string> = {};
    
    if (requestData.formData) {
      for (const [fieldName, value] of Object.entries(requestData.formData)) {
        const apiFieldName = FIELD_MAPPINGS[fieldName];
        if (apiFieldName && value) {
          customerData[apiFieldName] = value;
        }
      }
      
      // Combine address fields into a single address string if components exist
      const addressParts = [];
      if (requestData.formData.addressStreet) addressParts.push(requestData.formData.addressStreet);
      if (requestData.formData.addressCity) addressParts.push(requestData.formData.addressCity);
      if (requestData.formData.addressState) addressParts.push(requestData.formData.addressState);
      if (requestData.formData.addressZip) addressParts.push(requestData.formData.addressZip);
      if (requestData.formData.addressCountry) addressParts.push(requestData.formData.addressCountry);
      
      if (addressParts.length > 0) {
        customerData.address = addressParts.join(', ');
      }
    }

    // Add verification type to customerData for dataOnly flow
    if (requestData.verificationType === 'dataOnly') {
      customerData.verificationType = 'dataOnly';
    }

    // Build API request body
    const apiBody = {
      returnUrl: requestData.returnUrl || '',
      customerName: requestData.customerName || 'Verification Demo',
      includeQr: requestData.includeQr ?? true,
      customerData,
      verificationType: requestData.verificationType,
    };

    console.log('Calling verification API with body:', JSON.stringify(apiBody, null, 2));

    // Call the verification session API
    const response = await fetch(`${BASE_URL}/api/verification/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VERIFICATION_API_KEY}`,
      },
      body: JSON.stringify(apiBody),
    });

    const responseText = await response.text();
    console.log('Verification API response status:', response.status);
    console.log('Verification API response:', responseText.substring(0, 1000));

    let apiResponse;
    try {
      apiResponse = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse API response:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid response from verification service' 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('Verification API error:', apiResponse);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiResponse.error || `Verification service error: ${response.status}` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build response with relevant fields
    const result: SessionResponse = {
      success: true,
      sessionId: apiResponse.sessionId,
      verifyUrl: apiResponse.verifyUrl,
      shortUrl: apiResponse.qrCode?.shortUrl,
      qrCodeUrl: apiResponse.qrCode?.imageUrl || `${BASE_URL}/api/verification/sessions/${apiResponse.sessionId}/qr`,
      status: apiResponse.status || 'pending',
    };

    // Add reference ID if provided
    if (requestData.referenceIdPrefix && apiResponse.sessionId) {
      const refId = `${requestData.referenceIdPrefix}-${apiResponse.sessionId.substring(0, 8).toUpperCase()}`;
      result.referenceId = refId;
    }

    console.log('Returning session result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create verification session error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create verification session'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
