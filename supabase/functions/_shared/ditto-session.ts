export type VerificationType = 'docBio' | 'dataBio' | 'dataOnly';

export interface DittoSessionRequest {
  formData: Record<string, string>;
  verificationType: VerificationType;
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

export function normalizeDob(raw: string): string {
  if (!raw) return '';
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slashDate = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (slashDate) {
    const month = slashDate[1].padStart(2, '0');
    const day = slashDate[2].padStart(2, '0');
    let year = slashDate[3];
    if (year.length === 2) {
      year = `${Number.parseInt(year, 10) > 30 ? '19' : '20'}${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
}

export function buildDittoSessionPayload(request: DittoSessionRequest, referenceId: string) {
  const formData = request.formData || {};
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = formData[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  const firstName = pick('firstName', 'first_name').toUpperCase();
  const lastName = pick('lastName', 'last_name').toUpperCase();
  const birthday = normalizeDob(pick('dateOfBirth', 'birthday', 'dob'));
  const phone = pick('phone').replace(/\D/g, '');
  const email = pick('email').toLowerCase();
  const dlNumber = pick('dlNumber', 'documentNumber');
  const dlState = pick('dlState');
  const ssn4 = pick('ssn4');
  const address = [
    pick('streetAddress', 'street_address', 'addressStreet'),
    pick('apartment'),
    pick('city', 'addressCity', 'address_city'),
    pick('state', 'addressState', 'address_state'),
    pick('zipCode', 'zip', 'zipcode', 'zip_code', 'addressZip', 'address_zip'),
  ].filter(Boolean).join(', ');

  const payload: Record<string, unknown> = {
    verificationType: request.verificationType,
    returnUrl: request.returnUrl || '',
    customerName: request.customerName || [firstName, lastName].filter(Boolean).join(' ') || 'Verification Demo',
    includeQr: request.includeQr ?? true,
    referenceId,
  };

  // Ditto's current session contract expects identity values at the top level.
  if (firstName) payload.firstName = firstName;
  if (lastName) payload.lastName = lastName;
  if (birthday) payload.birthday = birthday;
  if (address) payload.address = address;
  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (dlNumber) payload.dlNumber = dlNumber;
  if (dlState) payload.dlState = dlState;
  if (ssn4) payload.ssn4 = ssn4;
  if (request.resourceId) payload.resourceId = request.resourceId;
  if (request.logoUrl) payload.logoUrl = request.logoUrl;

  if (request.branding) {
    const branding = Object.fromEntries(
      Object.entries(request.branding).filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    if (Object.keys(branding).length) payload.branding = branding;
  }

  if (request.verificationType === 'dataBio' || request.verificationType === 'dataOnly') {
    const options = request.dataBioOptions || {};
    payload.options = {
      previousAddress: { enabled: false },
      biometrics: {
        enabled: options.biometricsEnabled ?? request.verificationType === 'dataBio',
        faceCount: options.biometricsFaceCount ?? 1,
      },
      documents: {
        enabled: options.documentsEnabled ?? true,
        count: options.documentsCount ?? 2,
      },
    };
  }

  return payload;
}