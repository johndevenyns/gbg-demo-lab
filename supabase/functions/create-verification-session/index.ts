import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Get the verification API base URL from environment or use placeholder
const getBaseUrl = () => Deno.env.get('VERIFICATION_API_URL') || 'https://api.verification-service.example';

// Normalize URLs to use the configured base URL
const normalizeUrl = (url?: string) =>
  typeof url === 'string' && url.length > 0
    ? url
    : url;

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
  
  // Resource ID for the verification journey
  resourceId?: string;
  
  // Demo environment settings
  customerName: string;
  returnUrl?: string;
  includeQr?: boolean;
  
  // Optional reference ID prefix
  referenceIdPrefix?: string;
  
  // Logo URL (top level in API request)
  logoUrl?: string;
  
  // Branding configuration
  branding?: {
    headerTextColor?: string;
    headerBgColor?: string;
    buttonColor?: string;
  };
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
  expiresAt?: string;
}

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

    const requestData: CreateSessionRequest = await req.json();
    
    console.log('=== CREATE VERIFICATION SESSION REQUEST ===');
    console.log('verificationType:', requestData.verificationType);
    console.log('customerName:', requestData.customerName);
    console.log('resourceId:', requestData.resourceId);
    console.log('includeQr:', requestData.includeQr);
    console.log('formDataKeys:', Object.keys(requestData.formData || {}));

    // Validate required fields
    const firstName = requestData.formData?.firstName?.trim();
    const lastName = requestData.formData?.lastName?.trim();
    
    if (!firstName || !lastName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'firstName and lastName are required' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build customerData by mapping form fields to API-expected format
    const customerData: Record<string, string> = {};
    
    if (requestData.formData) {
      for (const [fieldName, value] of Object.entries(requestData.formData)) {
        const apiFieldName = FIELD_MAPPINGS[fieldName];
        if (apiFieldName && value) {
          customerData[apiFieldName] = value.trim();
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

    // Generate reference ID
    const referenceIdPrefix = requestData.referenceIdPrefix || 'demo';
    const referenceId = `${referenceIdPrefix}-${Date.now()}`;

    // Build API request payload
    const requestPayload: Record<string, any> = {
      returnUrl: requestData.returnUrl || '',
      customerName: requestData.customerName || 'Verification Demo',
      includeQr: requestData.includeQr ?? true,
      verificationType: requestData.verificationType,
      referenceId,
      // firstName and lastName at top level (required by API)
      firstName,
      lastName,
      customerData,
    };

    // Add resource ID if provided
    if (requestData.resourceId) {
      requestPayload.resourceId = requestData.resourceId;
    }

    // Add branding if provided
    if (requestData.branding) {
      requestPayload.branding = {
        headerTextColor: requestData.branding.headerTextColor,
        headerBgColor: requestData.branding.headerBgColor,
        buttonColor: requestData.branding.buttonColor,
      };
    }
    
    // Add logoUrl at top level if provided
    if (requestData.logoUrl) {
      requestPayload.logoUrl = requestData.logoUrl;
    }

    console.log('=== FULL API REQUEST PAYLOAD ===');
    console.log(JSON.stringify(requestPayload, null, 2));
    console.log('=== END PAYLOAD ===');

    // Call the verification session API
    const response = await fetch(`${getBaseUrl()}/api/verification/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(requestPayload),
    });

    const responseText = await response.text();
    console.log('Verification API response status:', response.status);
    console.log('Verification API response:', responseText.substring(0, 1000));

    if (!response.ok) {
      console.error('API Error:', response.status, responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to create verification session. Please try again.',
          apiStatus: response.status,
          apiResponse: responseText?.slice(0, 500) || null,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Normalize URLs (handle legacy domain)
    const verifyUrl = normalizeUrl(apiResponse.verifyUrl);
    const shortUrl = normalizeUrl(apiResponse.qrCode?.shortUrl);
    
    // Generate QR code URL - use API response or fallback to QR server
    const qrCodeUrl = normalizeUrl(apiResponse.qrCode?.imageUrl) ||
      `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl ?? apiResponse.verifyUrl)}`;

    // Build response with relevant fields
    const result: SessionResponse = {
      success: true,
      sessionId: apiResponse.sessionId,
      verifyUrl,
      shortUrl,
      qrCodeUrl,
      status: apiResponse.status || 'pending',
      referenceId,
      expiresAt: apiResponse.expiresAt,
    };

    console.log('=== SESSION CREATED SUCCESSFULLY ===');
    console.log(JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create verification session error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unable to create verification session. Please try again.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
