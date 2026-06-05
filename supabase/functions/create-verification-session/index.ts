import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://ditto.gbg.com';
// Legacy host still emitted by older deployments of the verification API.
// Per the IVS API reference (2026-05-10), the canonical host is ditto.gbg.com
// and app.art-of-sales-engineering.com continues to be accepted during the
// transition. Rewrite any legacy host we receive in URLs to the canonical one.
const LEGACY_HOSTS = [
  'https://app.art-of-sales-engineering.com',
  'https://paulandcarolynn.com',
];
const normalizeUrl = (url?: string) => {
  if (typeof url !== 'string' || url.length === 0) return url;
  let out = url;
  for (const legacy of LEGACY_HOSTS) out = out.split(legacy).join(BASE_URL);
  return out;
};

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
  demoId?: string;
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

  // Per the IVS API reference, every verification type uses the same
  // top-level envelope. `customerData` is required for dataBio/dataOnly,
  // optional for docBio. Unknown top-level keys are silently dropped.
  const customerData: Record<string, string> = {};
  if (firstName) customerData.firstName = firstName;
  if (lastName) customerData.lastName = lastName;
  if (fd.dateOfBirth) customerData.dateOfBirth = fd.dateOfBirth; // YYYY-MM-DD
  if (combinedAddress) customerData.address = combinedAddress;
  if (fd.phone) customerData.phone = fd.phone.replace(/\D/g, '');
  if (fd.email) customerData.email = fd.email.trim();
  const dlNumber = fd.dlNumber || fd.documentNumber;
  if (dlNumber) customerData.dlNumber = dlNumber;
  if (fd.dlState) customerData.dlState = fd.dlState;
  if (fd.ssn4) customerData.ssn4 = fd.ssn4;

  const base: Record<string, unknown> = {
    verificationType: req.verificationType,
    returnUrl: req.returnUrl || '',
    customerName:
      req.customerName ||
      [firstName, lastName].filter(Boolean).join(' ') ||
      'Verification Demo',
    includeQr: req.includeQr ?? true,
    referenceId,
  };

  if (req.resourceId) base.resourceId = req.resourceId;
  if (req.logoUrl) base.logoUrl = req.logoUrl;

  // customerData is required for dataBio/dataOnly and optional for docBio.
  if (Object.keys(customerData).length > 0) {
    base.customerData = customerData;
  }

  // Branding is nested-only per the current spec (flat fields are deprecated).
  if (req.branding) {
    const branding: Record<string, string> = {};
    if (req.branding.headerTextColor) branding.headerTextColor = req.branding.headerTextColor;
    if (req.branding.headerBgColor) branding.headerBgColor = req.branding.headerBgColor;
    if (req.branding.buttonColor) branding.buttonColor = req.branding.buttonColor;
    if (Object.keys(branding).length > 0) base.branding = branding;
  }

  return base;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GLOBAL_API_KEY =
      Deno.env.get('VERIFICATION_API_KEY_GLOBAL') ||
      Deno.env.get('VERIFICATION_API_KEY');

    const requestData: CreateSessionRequest = await req.json();

    // Resolve demo-specific override (if any) using service role
    let API_KEY: string | undefined = GLOBAL_API_KEY;
    let keySource: 'demo' | 'global' = 'global';
    if (requestData.demoId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: row } = await admin
          .from('demo_verification_api_keys')
          .select('api_key')
          .eq('demo_id', requestData.demoId)
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
      console.error('No verification API key configured (demo or global)');
      return new Response(
        JSON.stringify({ success: false, error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Verification API key source:', keySource);

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
