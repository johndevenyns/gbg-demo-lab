import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE_URL = 'https://app.art-of-sales-engineering.com';
const LEGACY_HOSTS = [
  'https://ditto.gbg.com',
  'https://paulandcarolynn.com',
];
const normalizeUrl = (url?: string) => {
  if (typeof url !== 'string' || url.length === 0) return url;
  let out = url;
  for (const legacy of LEGACY_HOSTS) out = out.split(legacy).join(BASE_URL);
  return out;
};

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

function buildPayload(req: CreateSessionRequest, referenceId: string) {
  // Normalize various date inputs (MM/DD/YYYY, M/D/YY, YYYY-MM-DD, Date strings) to ISO YYYY-MM-DD
  function normalizeDob(raw: string): string {
    if (!raw) return '';
    const s = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slash) {
      const mm = slash[1].padStart(2, '0');
      const dd = slash[2].padStart(2, '0');
      let yyyy = slash[3];
      if (yyyy.length === 2) {
        const n = parseInt(yyyy, 10);
        yyyy = (n > 30 ? '19' : '20') + yyyy;
      }
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return s;
  }

  const fd = req.formData || {};
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = fd[k];
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
    return '';
  };

  const firstName = pick('firstName', 'first_name').toUpperCase();
  const lastName = pick('lastName', 'last_name').toUpperCase();
  const dateOfBirth = normalizeDob(pick('dateOfBirth', 'birthday', 'dob'));
  const phoneDigits = pick('phone').replace(/\D/g, '');
  const email = pick('email').toLowerCase();
  const dlNumber = pick('dlNumber', 'documentNumber');
  const dlState = pick('dlState');
  const ssn4 = pick('ssn4');

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
  if (dateOfBirth) identity.birthday = dateOfBirth;
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

  if (Object.keys(identity).length > 0) {
    if (req.verificationType === 'dataBio') {
      Object.assign(base, identity);
    } else {
      base.customerData = identity;
    }
  }

  if (req.branding) {
    const branding: Record<string, string> = {};
    if (req.branding.headerTextColor) branding.headerTextColor = req.branding.headerTextColor;
    if (req.branding.headerBgColor) branding.headerBgColor = req.branding.headerBgColor;
    if (req.branding.buttonColor) branding.buttonColor = req.branding.buttonColor;
    if (Object.keys(branding).length > 0) base.branding = branding;
  }

  if (req.verificationType === 'dataBio') {
    const opts = req.dataBioOptions || {};
    base.options = {
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

    // Diagnostic: confirm dateOfBirth format without leaking value
    const dobVal = (requestPayload as any).birthday ?? (requestPayload as any).customerData?.birthday;
    if (dobVal) {
      const isIso = /^\d{4}-\d{2}-\d{2}$/.test(String(dobVal));
      console.log('birthday format check:', { isIso, length: String(dobVal).length });
    } else {
      console.log('birthday missing from payload');
    }

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
