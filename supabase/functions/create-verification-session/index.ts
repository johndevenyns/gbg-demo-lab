import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://app.art-of-sales-engineering.com';
const LEGACY_BASE_URL = 'https://paulandcarolynn.com';

const normalizeUrl = (url?: string) =>
  typeof url === 'string' && url.length > 0
    ? url.replace(LEGACY_BASE_URL, BASE_URL)
    : url;

/** Redact sensitive fields before logging. */
const SENSITIVE_KEYS = new Set([
  'ssn', 'ssn4', 'dateOfBirth', 'birthday', 'dlNumber', 'documentNumber',
  'address', 'streetAddress', 'apartment', 'phone', 'email', 'lqtkey',
  'resourceId', 'authorization',
]);
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : redact(v);
    }
    return out;
  }
  return value;
}

interface CreateSessionRequest {
  formData: Record<string, string>;
  verificationType: 'docBio' | 'dataBio' | 'dataOnly';
  resourceId?: string;
  customerName: string;
  returnUrl?: string;
  includeQr?: boolean;
  referenceIdPrefix?: string;
  logoUrl?: string;
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

/**
 * Build the flat API payload matching the external verification service format.
 * DataBio uses a flat structure with ssn4, dlNumber, dlState, birthday, address,
 * phone, and an options object. DocBio/DataOnly use a nested customerData approach.
 */
function buildPayload(req: CreateSessionRequest, referenceId: string) {
  const fd = req.formData || {};
  const firstName = (fd.firstName || fd.first_name || '').trim().toUpperCase();
  const lastName = (fd.lastName || fd.last_name || '').trim().toUpperCase();

  // Combine address components into a single string
  const addressParts: string[] = [];
  if (fd.streetAddress) addressParts.push(fd.streetAddress);
  if (fd.apartment) addressParts.push(fd.apartment);
  if (fd.city) addressParts.push(fd.city);
  if (fd.state) addressParts.push(fd.state);
  if (fd.zipCode) addressParts.push(fd.zipCode);
  const combinedAddress = addressParts.join(', ');

  // Common fields shared by all verification types
  const base: Record<string, unknown> = {
    verificationType: req.verificationType,
    firstName,
    lastName,
    returnUrl: req.returnUrl || '',
    includeQr: req.includeQr ?? true,
    referenceId,
    environment: 'us',
    // Branding — flat at top level
    headerTextColor: req.branding?.headerTextColor || '',
    headerBgColor: req.branding?.headerBgColor || '',
    buttonColor: req.branding?.buttonColor || '',
  };

  if (req.resourceId) base.resourceId = req.resourceId;
  if (req.logoUrl) base.logoUrl = req.logoUrl;

  if (req.verificationType === 'dataBio') {
    // DataBio: flat fields + options object
    base.customerName = `${firstName} ${lastName}`;
    if (fd.email) base.email = fd.email.trim();
    if (fd.ssn4) base.ssn4 = fd.ssn4;
    if (fd.phone) base.phone = fd.phone.replace(/\D/g, '');
    if (fd.dateOfBirth) base.birthday = fd.dateOfBirth;
    if (combinedAddress) base.address = combinedAddress;
    if (fd.dlNumber || fd.documentNumber) base.dlNumber = fd.dlNumber || fd.documentNumber;
    if (fd.dlState || fd.state) base.dlState = fd.dlState || fd.state;

    base.options = {
      biometrics: { enabled: true, faceCount: 1 },
      documents: { enabled: true, count: 2 },
      previousAddress: { enabled: false },
    };
  } else {
    // DocBio / DataOnly: nested customerData
    base.customerName = req.customerName || 'Verification Demo';

    const customerData: Record<string, string> = {};
    const fieldMap: Record<string, string> = {
      firstName: 'firstName', first_name: 'firstName',
      lastName: 'lastName', last_name: 'lastName',
      middleName: 'middleName',
      email: 'email', phone: 'phone', dateOfBirth: 'dateOfBirth',
      streetAddress: 'address', city: 'city', state: 'state',
      zipCode: 'postalCode',
      ssn4: 'ssn', ssn: 'ssn', documentNumber: 'documentNumber', documentType: 'documentType',
      nationality: 'nationality', gender: 'gender',
    };

    for (const [field, apiKey] of Object.entries(fieldMap)) {
      if (fd[field]) customerData[apiKey] = fd[field].trim();
    }
    if (combinedAddress) customerData.address = combinedAddress;

    base.customerData = customerData;

    if (req.branding) {
      base.branding = {
        headerTextColor: req.branding.headerTextColor,
        headerBgColor: req.branding.headerBgColor,
        buttonColor: req.branding.buttonColor,
      };
    }
  }

  return base;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get('VERIFICATION_API_KEY');

    if (!API_KEY) {
      console.error('VERIFICATION_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: CreateSessionRequest = await req.json();

    console.log('=== CREATE VERIFICATION SESSION REQUEST ===');
    console.log('verificationType:', requestData.verificationType);
    console.log('customerName:', requestData.customerName);
    console.log('hasResourceId:', Boolean(requestData.resourceId));
    console.log('includeQr:', requestData.includeQr);
    console.log('formDataKeys:', Object.keys(requestData.formData || {}));

    const firstName = requestData.formData?.firstName?.trim() || '';
    const lastName = requestData.formData?.lastName?.trim() || '';

    if (!firstName && !lastName) {
      console.warn('No firstName/lastName provided in formData — proceeding with empty names');
    }

    const referenceIdPrefix = requestData.referenceIdPrefix || 'demo';
    const referenceId = `${referenceIdPrefix}-${Date.now()}`;

    const requestPayload = buildPayload(requestData, referenceId);

    console.log('=== API REQUEST PAYLOAD (redacted) ===');
    console.log(JSON.stringify(redact(requestPayload), null, 2));
    console.log('=== END PAYLOAD ===');

    const response = await fetch(`${BASE_URL}/api/verification/sessions`, {
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
        JSON.stringify({ success: false, error: 'Invalid response from verification service' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifyUrl = normalizeUrl(apiResponse.verifyUrl);
    const shortUrl = normalizeUrl(apiResponse.qrCode?.shortUrl);
    const qrCodeUrl = normalizeUrl(apiResponse.qrCode?.imageUrl) ||
      `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verifyUrl ?? apiResponse.verifyUrl)}`;

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
    console.log('sessionId:', result.sessionId, 'status:', result.status);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Create verification session error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Unable to create verification session. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
