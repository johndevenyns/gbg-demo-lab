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
  // DataBio-only capture options. Sent to the verification API under `options`.
  dataBioOptions?: {
    documentsEnabled?: boolean;
    documentsCount?: number;
    biometricsEnabled?: boolean;
    biometricsFaceCount?: number;
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
 * Only fields documented in the IVS API reference are emitted upstream:
 *   - dataBio: flat top-level identity fields + options block
 *   - docBio / dataOnly: identity fields nested under customerData
 * Any other keys received in `formData` (legacy aliases, raw form scratch
 * fields, etc.) are dropped and never forwarded.
 */
function buildPayload(req: CreateSessionRequest, referenceId: string) {
  const fd = req.formData || {};
  // Resolve canonical identity values, tolerating common input aliases.
  // Only canonical keys ever leave this function.
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = fd[k];
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return '';
  };

  const firstName = pick('firstName', 'first_name').toUpperCase();
  const lastName = pick('lastName', 'last_name').toUpperCase();
  const dateOfBirth = pick('dateOfBirth', 'birthday');
  const phoneDigits = pick('phone').replace(/\D/g, '');
  const email = pick('email').toLowerCase();
  const dlNumber = pick('dlNumber', 'documentNumber');
  const dlState = pick('dlState');
  const ssn4 = pick('ssn4');

  // Combine address components into the single `address` string the API
  // documents. Variants like street_address / addressZip / zip_code are
  // accepted as input aliases but never forwarded as separate fields.
  const street = pick('streetAddress', 'street_address', 'addressStreet');
  const apartment = pick('apartment');
  const city = pick('city', 'addressCity', 'address_city');
  const state = pick('state', 'addressState', 'address_state');
  const zip = pick('zipCode', 'zip', 'zipcode', 'zip_code', 'addressZip', 'address_zip');
  const combinedAddress = [street, apartment, city, state, zip]
    .filter(Boolean)
    .join(', ');

  const identity: Record<string, string> = {};
  if (firstName) identity.firstName = firstName;
  if (lastName) identity.lastName = lastName;
  if (dateOfBirth) identity.dateOfBirth = dateOfBirth; // YYYY-MM-DD
  if (combinedAddress) identity.address = combinedAddress;
  if (phoneDigits) identity.phone = phoneDigits;
  if (email) identity.email = email;
  if (dlNumber) identity.dlNumber = dlNumber;
  if (dlState) identity.dlState = dlState;
  if (ssn4) identity.ssn4 = ssn4;

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

  // dataBio expects flat top-level identity fields per the API reference
  // (https://ditto.gbg.com/docs → Data & Bio → Example Request). docBio
  // and dataOnly continue to use the nested `customerData` wrapper.
  if (Object.keys(identity).length > 0) {
    if (req.verificationType === 'dataBio') {
      Object.assign(base, identity);
    } else {
      base.customerData = identity;
    }
  }

  // Branding is nested-only per the current spec (flat fields are deprecated).
  if (req.branding) {
    const branding: Record<string, string> = {};
    if (req.branding.headerTextColor) branding.headerTextColor = req.branding.headerTextColor;
    if (req.branding.headerBgColor) branding.headerBgColor = req.branding.headerBgColor;
    if (req.branding.buttonColor) branding.buttonColor = req.branding.buttonColor;
    if (Object.keys(branding).length > 0) base.branding = branding;
  }

  // DataBio capture options → nested `options` block per IVS API reference.
  if (req.verificationType === 'dataBio' && req.dataBioOptions) {
    const opts = req.dataBioOptions;
    const options: Record<string, unknown> = {
      previousAddress: { enabled: false },
      biometrics: {
        enabled: opts.biometricsEnabled ?? true,
        faceCount: opts.biometricsFaceCount ?? 1,
      },
      documents: {
        enabled: opts.documentsEnabled ?? true,
        count: opts.documentsCount ?? 2,
      },
    };
    base.options = options;
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
    console.log('formDataKeyCount:', Object.keys(requestData.formData || {}).length);

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
