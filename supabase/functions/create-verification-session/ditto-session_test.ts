import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildDittoSessionPayload, normalizeDob } from '../_shared/ditto-session.ts';

Deno.test('normalizes US dates for Ditto', () => {
  assertEquals(normalizeDob('2/28/1975'), '1975-02-28');
  assertEquals(normalizeDob('2026-09-10'), '2026-09-10');
});

Deno.test('builds current top-level Docs and Bio identity payload', () => {
  const payload = buildDittoSessionPayload({
    formData: {
      firstName: 'Jane',
      lastName: 'Cooper',
      dateOfBirth: '2/28/1975',
      addressStreet: '123 Main St',
      addressCity: 'Atlanta',
      addressState: 'GA',
      addressZip: '30318',
      phone: '(404) 555-0100',
      email: 'JANE@EXAMPLE.COM',
    },
    verificationType: 'docBio',
    customerName: 'GBank',
    resourceId: 'resource-id',
  }, 'gbank-123');

  assertEquals(payload.firstName, 'JANE');
  assertEquals(payload.lastName, 'COOPER');
  assertEquals(payload.birthday, '1975-02-28');
  assertEquals(payload.address, '123 Main St, Atlanta, GA, 30318');
  assertEquals(payload.phone, '4045550100');
  assertEquals(payload.email, 'jane@example.com');
  assertEquals(payload.resourceId, 'resource-id');
  assertEquals('customerData' in payload, false);
});